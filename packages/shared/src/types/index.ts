/**
 * Core domain types for CodeGateway
 */

// ============================================
// SUPPORTED LANGUAGES
// ============================================

export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'rust'
  | 'go'
  | 'java'
  | 'csharp';

// ============================================
// PATTERN TYPES
// ============================================

export type PatternType =
  // Naming patterns
  | 'generic_variable_name'
  | 'inconsistent_naming'
  // Error handling
  | 'empty_catch_block'
  | 'swallowed_error'
  | 'missing_error_boundary'
  | 'generic_error_message'
  | 'try_without_catch'
  // Security
  | 'hardcoded_secret'
  | 'sql_concatenation'
  | 'unsafe_eval'
  | 'insecure_random'
  | 'missing_input_validation'
  // Code quality
  | 'copy_paste_pattern'
  | 'magic_number'
  | 'todo_without_context'
  | 'commented_out_code'
  | 'overly_complex_function'
  // AI-specific patterns
  | 'placeholder_implementation'
  | 'incomplete_edge_case'
  | 'mock_data_in_production'
  | 'framework_version_mismatch'
  | 'unnecessary_abstraction'
  | 'context_mismatch';

export type Severity = 'info' | 'warning' | 'critical';

// ============================================
// DETECTED PATTERNS
// ============================================

export interface DetectedPattern {
  id: string;
  type: PatternType;
  severity: Severity;

  // Location in source
  file: string;
  startLine: number;
  endLine: number;
  startColumn?: number | undefined;
  endColumn?: number | undefined;

  // Pattern details
  description: string;
  explanation: string;
  codeSnippet: string;

  // Suggested action
  suggestion?: string | undefined;
  autoFixAvailable: boolean;

  // Detection metadata
  confidence: number; // 0-1
  detectorId: string;
  detectedAt: Date;
}

// ============================================
// CHECKPOINTS
// ============================================

export type CheckpointType = 'pre_commit' | 'pre_push' | 'on_demand' | 'scheduled';

export type CheckpointStatus = 'pending' | 'passed' | 'failed' | 'skipped';

export type QuestionType = 'multiple_choice' | 'free_text' | 'code_trace';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface CheckpointQuestion {
  id: string;
  type: QuestionType;
  question: string;
  context?: string;

  // For multiple choice
  options?: string[];
  correctAnswer?: string | string[];

  // For code trace
  tracePoints?: { line: number; prompt: string }[];

  // Metadata
  difficulty: QuestionDifficulty;
  focusArea: string;
}

export interface CheckpointResponse {
  questionId: string;
  answer: string | string[];
  isCorrect?: boolean;
  answeredAt: Date;
}

export interface ComprehensionCheckpoint {
  id: string;
  type: CheckpointType;

  // Context
  patterns: DetectedPattern[];
  file: string;
  functionName?: string;

  // Questions
  questions: CheckpointQuestion[];

  // Result
  status: CheckpointStatus;
  responses?: CheckpointResponse[];
  completedAt?: Date;
  timeSpentMs?: number;
}

// ============================================
// METRICS
// ============================================

export interface WeeklyMetrics {
  weekStart: Date;
  commitsAnalyzed: number;
  patternsDetected: number;
  checkpointsTriggered: number;
  checkpointPassRate: number;
  skippedCount: number;
}

export interface DeveloperMetrics {
  developerId: string;

  // Checkpoint metrics
  totalCheckpoints: number;
  passedCheckpoints: number;
  failedCheckpoints: number;
  skippedCheckpoints: number;
  averageTimePerCheckpoint: number;

  // Pattern metrics
  patternsByType: Record<PatternType, number>;
  patternsBySeverity: Record<Severity, number>;

  // Time series
  weeklyActivity: WeeklyMetrics[];

  // Incident correlation
  incidentsLinkedToAI: number;
  incidentsLinkedToSkipped: number;
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * CodeGateway configuration file schema.
 * This is the structure of codegateway.config.json or .codegaterc.json
 */
export interface CodeGatewayConfig {
  // ============================================
  // PATTERN DETECTION
  // ============================================

  /** Pattern types to detect. If not specified, all patterns are enabled. */
  enabledPatterns?: PatternType[];

  /** Minimum severity level to report: 'info', 'warning', or 'critical' */
  minSeverity?: Severity;

  /** Override severity for specific patterns */
  severityOverrides?: Partial<Record<PatternType, Severity>>;

  /** Glob patterns for paths to exclude from analysis */
  exclude?: string[];

  // ============================================
  // DETECTOR CUSTOMIZATION
  // ============================================

  /** Additional variable names to flag as generic (added to built-in list) */
  genericVariableNames?: string[];

  /** Additional single-letter variable names allowed in loops (added to i,j,k,n,m) */
  loopVariableNames?: string[];

  /** Additional variable names allowed for coordinates/math (added to x,y,z,w) */
  coordinateVariableNames?: string[];

  /** Additional error message patterns to flag as generic */
  genericErrorMessages?: string[];

  /** Additional regex patterns to detect hardcoded secrets */
  secretPatterns?: string[];

  // ============================================
  // GIT INTEGRATION
  // ============================================

  /** Block git commit when critical issues are found */
  blockOnCritical?: boolean;

  /** Block git commit when warnings are found */
  blockOnWarning?: boolean;

  /** Show comprehension checkpoint before commit */
  showCheckpoint?: boolean;

  // ============================================
  // UI SETTINGS (VS Code only)
  // ============================================

  /** Show inline decorations (wavy underlines) */
  showInlineHints?: boolean;

  /** Analysis debounce delay in milliseconds */
  debounceMs?: number;

  /** Analyze files when opened */
  analyzeOnOpen?: boolean;

  /** Analyze files when saved */
  analyzeOnSave?: boolean;
}

/**
 * Detector-specific settings passed to analyze() methods.
 */
export interface DetectorSettings {
  genericVariableNames: string[];
  loopVariableNames: string[];
  coordinateVariableNames: string[];
  genericErrorMessages: string[];
  secretPatterns: string[];
}

/**
 * Resolved configuration with all defaults applied.
 * This is what the analyzer and detectors actually use.
 */
export interface ResolvedConfig {
  enabledPatterns: PatternType[];
  minSeverity: Severity;
  severityOverrides: Partial<Record<PatternType, Severity>>;
  exclude: string[];

  // Detector settings
  genericVariableNames: string[];
  loopVariableNames: string[];
  coordinateVariableNames: string[];
  genericErrorMessages: string[];
  secretPatterns: string[];

  // Git settings
  blockOnCritical: boolean;
  blockOnWarning: boolean;
  showCheckpoint: boolean;

  // UI settings
  showInlineHints: boolean;
  debounceMs: number;
  analyzeOnOpen: boolean;
  analyzeOnSave: boolean;
}

// ============================================
// ANALYZED FILE
// ============================================

export type GitStatus = 'staged' | 'modified' | 'untracked' | 'committed';

export interface AnalyzedFile {
  path: string;
  language: SupportedLanguage;
  content: string;
  gitStatus: GitStatus;
  lastAnalyzedAt: Date;
}
