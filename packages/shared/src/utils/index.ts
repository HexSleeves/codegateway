import { EXTENSION_TO_LANGUAGE } from '../constants/index.js';
import type { SupportedLanguage, Severity } from '../types/index.js';

/**
 * Detect language from file path
 */
export function detectLanguage(filePath: string): SupportedLanguage | null {
  const ext = '.' + filePath.split('.').pop();
  const language = EXTENSION_TO_LANGUAGE[ext];
  return (language as SupportedLanguage) ?? null;
}

/**
 * Check if a file path matches any of the glob patterns
 */
export function matchesGlob(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // Simple glob matching - supports ** and *
    const regex = globToRegex(pattern);
    if (regex.test(filePath)) {
      return true;
    }
  }
  return false;
}

/**
 * Convert a simple glob pattern to regex
 */
function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '<<<DOUBLESTAR>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<<DOUBLESTAR>>>/g, '.*');
  return new RegExp(`^${escaped}$`);
}

/**
 * Generate a unique ID
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Compare severities for sorting
 */
export function compareSeverity(a: Severity, b: Severity): number {
  const order: Record<Severity, number> = {
    info: 0,
    warning: 1,
    critical: 2,
  };
  return order[b] - order[a];
}

/**
 * Check if severity meets minimum threshold
 */
export function meetsSeverityThreshold(severity: Severity, minSeverity: Severity): boolean {
  const order: Record<Severity, number> = {
    info: 0,
    warning: 1,
    critical: 2,
  };
  return order[severity] >= order[minSeverity];
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Extract a code snippet with context lines
 */
export function extractSnippet(
  content: string,
  startLine: number,
  endLine: number,
  contextLines: number = 2
): string {
  const lines = content.split('\n');
  const start = Math.max(0, startLine - 1 - contextLines);
  const end = Math.min(lines.length, endLine + contextLines);
  return lines.slice(start, end).join('\n');
}
