import type { Analyzer } from '@codegateway/core';
import type { DetectedPattern, Severity } from '@codegateway/shared';

const SEVERITY_ICONS: Record<Severity, string> = {
  critical: '\u274c',
  warning: '\u26a0\ufe0f',
  info: '\u2139\ufe0f',
};

const SUMMARY_WIDTH = 50;

export function printPatterns(patterns: DetectedPattern[]): void {
  const byFile = groupByFile(patterns);

  for (const [file, filePatterns] of byFile) {
    console.log(`\n${file}`);
    console.log('='.repeat(file.length));
    for (const pattern of filePatterns) {
      console.log(
        `  ${SEVERITY_ICONS[pattern.severity]} Line ${pattern.startLine}: ${pattern.description}`,
      );
      console.log(`     ${pattern.explanation}`);
      if (pattern.suggestion) {
        console.log(`     \u2794 ${pattern.suggestion}`);
      }
    }
  }
}

export function printSummary(analyzer: Analyzer, patterns: DetectedPattern[]): void {
  const summary = analyzer.summarize([
    {
      file: '',
      language: null,
      patterns,
      analyzedAt: new Date(),
      durationMs: 0,
    },
  ]);

  console.log(`\n${'='.repeat(SUMMARY_WIDTH)}`);
  console.log(`Summary: ${summary.totalPatterns} pattern(s) found`);
  console.log(`  Critical: ${summary.bySeverity.critical}`);
  console.log(`  Warning: ${summary.bySeverity.warning}`);
  console.log(`  Info: ${summary.bySeverity.info}`);
}

export function printJson(patterns: DetectedPattern[]): void {
  console.log(JSON.stringify(patterns, null, 2));
}

function groupByFile(patterns: DetectedPattern[]): Map<string, DetectedPattern[]> {
  const byFile = new Map<string, DetectedPattern[]>();
  for (const pattern of patterns) {
    const existing = byFile.get(pattern.file) ?? [];
    existing.push(pattern);
    byFile.set(pattern.file, existing);
  }
  return byFile;
}

export function shouldFailOnSeverity(patterns: DetectedPattern[], failOn: Severity): boolean {
  const severityOrder: Record<Severity, number> = { info: 0, warning: 1, critical: 2 };
  const failLevel = severityOrder[failOn];
  return patterns.some((pattern) => severityOrder[pattern.severity] >= failLevel);
}
