import type {
  ComprehensionQuestion,
  DetectedPattern,
  EnhancedPattern,
  PatternType,
  ResolvedConfig,
  SemanticReviewResult,
  Severity,
  SupportedLanguage,
} from '@codegateway/shared';
import {
  compareSeverity,
  DEFAULT_CONFIG,
  detectLanguage,
  matchesGlob,
  meetsSeverityThreshold,
  toDetectorSettings,
} from '@codegateway/shared';
import {
  CodeQualityDetector,
  type Detector,
  ErrorHandlingDetector,
  NamingPatternDetector,
  SecurityDetector,
} from './detectors/index.js';

export interface AnalyzerOptions {
  /** Override default configuration */
  config?: Partial<ResolvedConfig>;
  /** Only analyze specific pattern types */
  patternTypes?: PatternType[];
  /** Minimum severity to report */
  minSeverity?: Severity;
}

export interface AnalysisResult {
  file: string;
  language: SupportedLanguage | null;
  patterns: DetectedPattern[];
  analyzedAt: Date;
  durationMs: number;
  /** LLM-enhanced pattern data (if LLM enabled) */
  enhancements?: EnhancedPattern[];
  /** LLM-generated comprehension questions (if LLM enabled) */
  questions?: ComprehensionQuestion[];
  /** LLM semantic review result (if LLM enabled) */
  semanticReview?: SemanticReviewResult;
}

/**
 * Main code analyzer that orchestrates all detectors
 */
export class Analyzer {
  private detectors: Detector[] = [];
  private config: ResolvedConfig;

  constructor(config?: Partial<ResolvedConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeDetectors();
  }

  private initializeDetectors(): void {
    // Add all built-in detectors
    this.detectors = [
      new NamingPatternDetector(),
      new ErrorHandlingDetector(),
      new SecurityDetector(),
      new CodeQualityDetector(),
    ];
  }

  /**
   * Analyze a single file
   */
  async analyzeFile(
    content: string,
    filePath: string,
    options: AnalyzerOptions = {},
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    const mergedConfig = { ...this.config, ...options.config };

    // Detect language
    const language = detectLanguage(filePath);

    // Check if file should be excluded
    if (this.shouldExcludeFile(filePath, mergedConfig)) {
      return {
        file: filePath,
        language,
        patterns: [],
        analyzedAt: new Date(),
        durationMs: Date.now() - startTime,
      };
    }

    // Get applicable detectors
    const applicableDetectors = this.getApplicableDetectors(
      language,
      options.patternTypes,
      mergedConfig,
    );

    // Run all detectors in parallel, passing detector settings
    const detectorSettings = toDetectorSettings(mergedConfig);
    const detectorResults = await Promise.all(
      applicableDetectors.map((detector) =>
        detector.analyze(content, filePath, detectorSettings).catch((error) => {
          console.error(`Detector ${detector.id} failed:`, error);
          return [] as DetectedPattern[];
        }),
      ),
    );

    // Flatten and filter results
    let patterns = detectorResults.flat();

    // Apply severity filter
    const minSeverity = options.minSeverity ?? mergedConfig.minSeverity;
    patterns = patterns.filter((p) => meetsSeverityThreshold(p.severity, minSeverity));

    // Apply severity overrides
    patterns = patterns.map((p) => {
      const override = mergedConfig.severityOverrides[p.type];
      if (override) {
        return { ...p, severity: override };
      }
      return p;
    });

    // Sort by severity (critical first) then by line number
    patterns.sort((a, b) => {
      const severityDiff = compareSeverity(a.severity, b.severity);
      if (severityDiff !== 0) return severityDiff;
      return a.startLine - b.startLine;
    });

    return {
      file: filePath,
      language,
      patterns,
      analyzedAt: new Date(),
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Analyze multiple files
   */
  async analyzeFiles(
    files: { path: string; content: string }[],
    options: AnalyzerOptions = {},
  ): Promise<AnalysisResult[]> {
    return Promise.all(files.map((file) => this.analyzeFile(file.content, file.path, options)));
  }

  /**
   * Get summary statistics from analysis results
   */
  summarize(results: AnalysisResult[]): AnalysisSummary {
    const allPatterns = results.flatMap((r) => r.patterns);

    const bySeverity: Record<Severity, number> = {
      info: 0,
      warning: 0,
      critical: 0,
    };

    const byType: Partial<Record<PatternType, number>> = {};

    allPatterns.forEach((p) => {
      bySeverity[p.severity]++;
      byType[p.type] = (byType[p.type] ?? 0) + 1;
    });

    return {
      totalFiles: results.length,
      totalPatterns: allPatterns.length,
      bySeverity,
      byType: byType as Record<PatternType, number>,
      totalDurationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ResolvedConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ResolvedConfig {
    return { ...this.config };
  }

  private shouldExcludeFile(filePath: string, config: ResolvedConfig): boolean {
    // Check exclude paths
    if (matchesGlob(filePath, config.exclude)) {
      return true;
    }

    return false;
  }

  private getApplicableDetectors(
    language: SupportedLanguage | null,
    patternTypes?: PatternType[],
    config?: ResolvedConfig,
  ): Detector[] {
    return this.detectors.filter((detector) => {
      // Check if detector supports the language
      if (language && !detector.languages.includes(language)) {
        return false;
      }

      // Check if any of the detector's patterns are enabled
      const hasEnabledPattern = detector.patterns.some((p) => {
        if (patternTypes && !patternTypes.includes(p)) {
          return false;
        }
        if (config && !config.enabledPatterns.includes(p)) {
          return false;
        }
        return true;
      });

      return hasEnabledPattern;
    });
  }
}

export interface AnalysisSummary {
  totalFiles: number;
  totalPatterns: number;
  bySeverity: Record<Severity, number>;
  byType: Record<PatternType, number>;
  totalDurationMs: number;
}

// Import LLM enhancer for optional enhancement
import { PatternEnhancer } from './llm/index.js';

/**
 * Enhanced analyzer that can use LLM for better explanations and questions
 */
export class EnhancedAnalyzer extends Analyzer {
  private readonly enhancer: PatternEnhancer | null = null;

  constructor(config?: Partial<ResolvedConfig>) {
    super(config);
    const resolvedConfig = this.getConfig();
    if (resolvedConfig.llm?.enabled) {
      this.enhancer = new PatternEnhancer(resolvedConfig.llm);
    }
  }

  /**
   * Check if LLM enhancement is available
   */
  async isLLMAvailable(): Promise<boolean> {
    if (!this.enhancer) return false;
    return this.enhancer.isAvailable();
  }

  /**
   * Analyze a file with optional LLM enhancement
   */
  async analyzeFileEnhanced(
    content: string,
    filePath: string,
    options: AnalyzerOptions & {
      /** Skip LLM enhancement even if configured */
      skipLLM?: boolean;
    } = {},
  ): Promise<AnalysisResult> {
    // First, run static analysis
    const result = await this.analyzeFile(content, filePath, options);

    // If no patterns or LLM disabled, return static result
    if (result.patterns.length === 0 || options.skipLLM || !this.enhancer) {
      return result;
    }

    // Enhance with LLM
    try {
      const config = this.getConfig();

      // Run enhancements in parallel
      const [enhancements, questions, semanticReview] = await Promise.all([
        config.llm.features.includes('explanations') || config.llm.features.includes('questions')
          ? this.enhancer.enhancePatterns(content, filePath, result.patterns)
          : Promise.resolve([]),
        config.llm.features.includes('questions')
          ? this.enhancer.generateQuestions(content, filePath, result.patterns, 3)
          : Promise.resolve([]),
        config.llm.features.includes('semantic_review')
          ? this.enhancer.semanticReview(content, filePath, result.patterns)
          : Promise.resolve(null),
      ]);

      const enhancedResult: AnalysisResult = {
        ...result,
      };

      if (enhancements.length > 0) {
        enhancedResult.enhancements = enhancements;
      }
      if (questions.length > 0) {
        enhancedResult.questions = questions;
      }
      if (semanticReview) {
        enhancedResult.semanticReview = semanticReview;
      }

      return enhancedResult;
    } catch (error) {
      console.error('LLM enhancement failed, returning static results:', error);
      return result;
    }
  }

  /**
   * Generate comprehension questions for patterns
   */
  async generateQuestions(
    content: string,
    filePath: string,
    patterns: DetectedPattern[],
    count: number = 3,
  ): Promise<ComprehensionQuestion[]> {
    if (!this.enhancer) {
      return [];
    }
    return this.enhancer.generateQuestions(content, filePath, patterns, count);
  }

  /**
   * Perform semantic review of code
   */
  async semanticReview(
    content: string,
    filePath: string,
    existingPatterns?: DetectedPattern[],
  ): Promise<SemanticReviewResult | null> {
    if (!this.enhancer) {
      return null;
    }
    return this.enhancer.semanticReview(content, filePath, existingPatterns);
  }
}
