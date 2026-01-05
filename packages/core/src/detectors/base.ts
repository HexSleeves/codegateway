import type {
  DetectedPattern,
  DetectorSettings,
  PatternType,
  SupportedLanguage,
} from '@codegateway/shared';

/**
 * Base interface for all pattern detectors
 */
export interface Detector {
  /** Unique identifier for this detector */
  readonly id: string;

  /** Pattern types this detector can find */
  readonly patterns: PatternType[];

  /** Languages this detector supports */
  readonly languages: SupportedLanguage[];

  /**
   * Analyze source code and return detected patterns
   * @param content The source code content
   * @param filePath The file path
   * @param settings Optional detector-specific settings from user configuration
   */
  analyze(
    content: string,
    filePath: string,
    settings?: DetectorSettings,
  ): Promise<DetectedPattern[]>;
}

/**
 * Abstract base class with common detector functionality
 */
export abstract class BaseDetector implements Detector {
  abstract readonly id: string;
  abstract readonly patterns: PatternType[];
  abstract readonly languages: SupportedLanguage[];

  abstract analyze(
    content: string,
    filePath: string,
    settings?: DetectorSettings,
  ): Promise<DetectedPattern[]>;

  /**
   * Create a DetectedPattern with common fields filled in
   */
  protected createPattern(
    type: PatternType,
    file: string,
    startLine: number,
    endLine: number,
    description: string,
    explanation: string,
    codeSnippet: string,
    options: {
      severity?: 'info' | 'warning' | 'critical';
      startColumn?: number;
      endColumn?: number;
      suggestion?: string;
      confidence?: number;
      autoFixAvailable?: boolean;
    } = {},
  ): DetectedPattern {
    return {
      id: `${this.id}-${file}-${startLine}-${Date.now()}`,
      type,
      severity: options.severity ?? 'warning',
      file,
      startLine,
      endLine,
      startColumn: options.startColumn,
      endColumn: options.endColumn,
      description,
      explanation,
      codeSnippet,
      suggestion: options.suggestion,
      autoFixAvailable: options.autoFixAvailable ?? false,
      confidence: options.confidence ?? 0.8,
      detectorId: this.id,
      detectedAt: new Date(),
    };
  }
}
