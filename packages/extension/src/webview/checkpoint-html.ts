import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DetectedPattern, Severity } from '@codegateway/shared';

// Load templates once at module initialization
// Templates are copied to dist/templates during build
const TEMPLATES_DIR = join(__dirname, 'templates');
const checkpointTemplate = readFileSync(join(TEMPLATES_DIR, 'checkpoint.html'), 'utf-8');
const patternTemplate = readFileSync(join(TEMPLATES_DIR, 'pattern.html'), 'utf-8');

const SEVERITY_ICONS: Record<Severity, string> = {
  critical: '🔴',
  warning: '🟡',
  info: '🔵',
};

/** Generate the checkpoint webview HTML from template */
export function generateCheckpointHtml(patterns: DetectedPattern[], file: string): string {
  const counts = countBySeverity(patterns);
  const patternsHtml = patterns.map((p, i) => renderPattern(p, i)).join('\n');

  const hasCritical = counts.critical > 0;

  return checkpointTemplate
    .replaceAll('{{FILE_NAME}}', escapeHtml(file))
    .replaceAll('{{CRITICAL_COUNT}}', String(counts.critical))
    .replaceAll('{{WARNING_COUNT}}', String(counts.warning))
    .replaceAll('{{INFO_COUNT}}', String(counts.info))
    .replace('{{PATTERNS_LIST}}', patternsHtml)
    .replace('{{PROCEED_DISABLED}}', hasCritical ? 'disabled' : '')
    .replace(
      '{{PROCEED_TEXT}}',
      hasCritical ? 'Acknowledge all critical issues to proceed' : 'Proceed with commit',
    );
}

function renderPattern(pattern: DetectedPattern, index: number): string {
  const suggestionHtml = pattern.suggestion
    ? `<div class="pattern-suggestion"><strong>Suggestion:</strong> ${escapeHtml(pattern.suggestion)}</div>`
    : '';

  return patternTemplate
    .replaceAll('{{SEVERITY}}', pattern.severity)
    .replace('{{SEVERITY_ICON}}', SEVERITY_ICONS[pattern.severity])
    .replace('{{SEVERITY_UPPER}}', pattern.severity.toUpperCase())
    .replace('{{PATTERN_TYPE}}', formatPatternType(pattern.type))
    .replace('{{LINE_NUMBER}}', String(pattern.startLine))
    .replace('{{DESCRIPTION}}', escapeHtml(pattern.description))
    .replace('{{CODE_SNIPPET}}', escapeHtml(pattern.codeSnippet))
    .replace('{{EXPLANATION}}', escapeHtml(pattern.explanation))
    .replace('{{SUGGESTION_HTML}}', suggestionHtml)
    .replace('{{INDEX}}', String(index))
    .replace('{{CHECKED}}', pattern.severity !== 'critical' ? 'checked' : '');
}

function countBySeverity(patterns: DetectedPattern[]): Record<Severity, number> {
  return {
    critical: patterns.filter((p) => p.severity === 'critical').length,
    warning: patterns.filter((p) => p.severity === 'warning').length,
    info: patterns.filter((p) => p.severity === 'info').length,
  };
}

function formatPatternType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
