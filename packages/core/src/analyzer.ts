import type {
  DetectedPattern,
  ExtensionConfig,
  PatternType,
  Severity,
  SupportedLanguage,
} from '@codegateway/shared';
import {
  compareSeverity,
  DEFAULT_CONFIG,
  detectLanguage,
  matchesGlob,
  meetsSeverityThreshold,
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
  config?: Partial<ExtensionConfig>;
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
}

/**
 * Main code analyzer that orchestrates all detectors
 */
export class Analyzer {
  private detectors: Detector[] = [];
  private config: ExtensionConfig;

  constructor(config?: Partial<ExtensionConfig>) {
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
    const detectorSettings = mergedConfig.detectorSettings;
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
    const minSeverity = options.minSeverity ?? mergedConfig.minSeverityForCheckpoint;
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
  updateConfig(config: Partial<ExtensionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ExtensionConfig {
    return { ...this.config };
  }

  private shouldExcludeFile(filePath: string, config: ExtensionConfig): boolean {
    // Check exclude paths
    if (matchesGlob(filePath, config.excludePaths)) {
      return true;
    }

    // Check exclude files
    const fileName = filePath.split('/').pop() ?? '';
    if (
      config.excludeFiles.some((pattern) => {
        // Simple wildcard matching
        const regex = new RegExp(`^${pattern.replaceAll('.', '\\.').replaceAll('*', '.*')}$`);
        return regex.test(fileName);
      })
    ) {
      return true;
    }

    return false;
  }

  private getApplicableDetectors(
    language: SupportedLanguage | null,
    patternTypes?: PatternType[],
    config?: ExtensionConfig,
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
