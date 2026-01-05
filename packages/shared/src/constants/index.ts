import type { ExtensionConfig, PatternType, Severity } from '../types/index.js';

/**
 * Pattern metadata with descriptions and default severities
 */
export const PATTERN_METADATA: Record<
  PatternType,
  { description: string; defaultSeverity: Severity }
> = {
  // Naming patterns
  generic_variable_name: {
    description: 'Variable has a generic, non-descriptive name',
    defaultSeverity: 'warning',
  },
  inconsistent_naming: {
    description: 'Naming convention inconsistent within scope',
    defaultSeverity: 'info',
  },

  // Error handling
  empty_catch_block: {
    description: 'Catch block is empty or only has comments',
    defaultSeverity: 'critical',
  },
  swallowed_error: {
    description: 'Error is caught but not logged or rethrown',
    defaultSeverity: 'warning',
  },
  missing_error_boundary: {
    description: 'Async code without try-catch or .catch()',
    defaultSeverity: 'warning',
  },
  generic_error_message: {
    description: 'Error message provides no debugging context',
    defaultSeverity: 'info',
  },
  try_without_catch: {
    description: 'try...finally without catch clause',
    defaultSeverity: 'info',
  },

  // Security
  hardcoded_secret: {
    description: 'Potential secret/API key hardcoded in source',
    defaultSeverity: 'critical',
  },
  sql_concatenation: {
    description: 'SQL query built with string concatenation',
    defaultSeverity: 'critical',
  },
  unsafe_eval: {
    description: 'Use of eval() or equivalent',
    defaultSeverity: 'critical',
  },
  insecure_random: {
    description: 'Math.random() used for security purposes',
    defaultSeverity: 'warning',
  },
  missing_input_validation: {
    description: 'User input used without validation',
    defaultSeverity: 'warning',
  },

  // Code quality
  copy_paste_pattern: {
    description: 'Duplicated code blocks detected',
    defaultSeverity: 'warning',
  },
  magic_number: {
    description: 'Numeric literal without explanation',
    defaultSeverity: 'info',
  },
  todo_without_context: {
    description: 'TODO/FIXME comment lacks detail',
    defaultSeverity: 'info',
  },
  commented_out_code: {
    description: 'Large block of commented-out code',
    defaultSeverity: 'info',
  },
  overly_complex_function: {
    description: 'Function has high cyclomatic complexity',
    defaultSeverity: 'warning',
  },

  // AI-specific patterns
  placeholder_implementation: {
    description: 'Function body is TODO/pass/NotImplemented',
    defaultSeverity: 'critical',
  },
  incomplete_edge_case: {
    description: 'Missing null check or boundary condition',
    defaultSeverity: 'warning',
  },
  mock_data_in_production: {
    description: 'Hardcoded test/mock data in production code',
    defaultSeverity: 'critical',
  },
  framework_version_mismatch: {
    description: 'Using deprecated API or old syntax',
    defaultSeverity: 'warning',
  },
  unnecessary_abstraction: {
    description: 'Over-engineered solution for simple problem',
    defaultSeverity: 'info',
  },
  context_mismatch: {
    description: 'Code style inconsistent with project',
    defaultSeverity: 'warning',
  },
};

/**
 * All pattern types
 */
export const ALL_PATTERN_TYPES: PatternType[] = Object.keys(PATTERN_METADATA) as PatternType[];

/**
 * Default extension configuration
 */
export const DEFAULT_CONFIG: ExtensionConfig = {
  enabledPatterns: ALL_PATTERN_TYPES,
  customPatterns: [],
  severityOverrides: {},
  excludePaths: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
  excludeFiles: ['*.min.js', '*.bundle.js'],

  checkpointTrigger: 'pre_commit',
  minSeverityForCheckpoint: 'warning',
  allowSkip: true,
  skipRequiresReason: false,

  cloudSyncEnabled: false,

  showInlineHints: true,
  showStatusBarSummary: true,
  notificationLevel: 'warnings',
};

/**
 * File extension to language mapping
 */
export const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.cs': 'csharp',
};

/**
 * Default generic variable names that indicate potential AI-generated code.
 * These are the built-in defaults that can be extended via VS Code settings.
 */
export const DEFAULT_GENERIC_VARIABLE_NAMES: readonly string[] = [
  'data',
  'result',
  'results',
  'response',
  'res',
  'resp',
  'value',
  'val',
  'item',
  'items',
  'element',
  'elem',
  'temp',
  'tmp',
  'foo',
  'bar',
  'baz',
  'obj',
  'object',
  'thing',
  'stuff',
  'arr',
  'array',
  'list',
  'str',
  'string',
  'num',
  'number',
  'ret',
  'return',
  'output',
  'out',
];

/**
 * @deprecated Use DEFAULT_GENERIC_VARIABLE_NAMES with configuration. This Set is kept for backwards compatibility.
 */
export const GENERIC_VARIABLE_NAMES = new Set(DEFAULT_GENERIC_VARIABLE_NAMES);

/**
 * Default acceptable single-letter variable names in loop contexts.
 * These are the built-in defaults that can be extended via VS Code settings.
 */
export const DEFAULT_LOOP_VARIABLE_NAMES: readonly string[] = ['i', 'j', 'k', 'n', 'm'];

/**
 * @deprecated Use DEFAULT_LOOP_VARIABLE_NAMES with configuration. This Set is kept for backwards compatibility.
 */
export const LOOP_VARIABLE_NAMES = new Set(DEFAULT_LOOP_VARIABLE_NAMES);

/**
 * Default acceptable single-letter variable names in coordinate/math contexts.
 * These are the built-in defaults that can be extended via VS Code settings.
 */
export const DEFAULT_COORDINATE_VARIABLE_NAMES: readonly string[] = ['x', 'y', 'z', 'w'];

/**
 * @deprecated Use DEFAULT_COORDINATE_VARIABLE_NAMES with configuration. This Set is kept for backwards compatibility.
 */
export const COORDINATE_VARIABLE_NAMES = new Set(DEFAULT_COORDINATE_VARIABLE_NAMES);

/**
 * Default patterns that indicate hardcoded secrets.
 * These are the built-in defaults that can be extended via VS Code settings.
 */
export const DEFAULT_SECRET_PATTERNS: readonly RegExp[] = [
  /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]+['"]/i,
  /(?:secret|password|passwd|pwd)\s*[:=]\s*['"][^'"]+['"]/i,
  /(?:token|auth)\s*[:=]\s*['"][^'"]+['"]/i,
  /(?:private[_-]?key)\s*[:=]\s*['"][^'"]+['"]/i,
  /Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
];

/**
 * @deprecated Use DEFAULT_SECRET_PATTERNS with configuration. This array is kept for backwards compatibility.
 */
export const SECRET_PATTERNS = DEFAULT_SECRET_PATTERNS;

/**
 * Default generic error messages that provide no debugging context.
 * These are the built-in defaults that can be extended via VS Code settings.
 */
export const DEFAULT_GENERIC_ERROR_MESSAGES: readonly string[] = [
  'an error occurred',
  'something went wrong',
  'error',
  'failed',
  'oops',
  'unknown error',
  'internal error',
  'unexpected error',
];

/**
 * @deprecated Use DEFAULT_GENERIC_ERROR_MESSAGES with configuration. This array is kept for backwards compatibility.
 */
export const GENERIC_ERROR_MESSAGES = DEFAULT_GENERIC_ERROR_MESSAGES;
