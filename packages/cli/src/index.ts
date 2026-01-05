#!/usr/bin/env node

import * as fs from 'node:fs';
import { Analyzer } from '@codegateway/core';
import type { DetectedPattern, Severity } from '@codegateway/shared';
import { Command } from 'commander';
import { glob } from 'glob';

const program = new Command();

program
  .name('codegateway')
  .description('CodeGateway - AI Code Review Trust Layer')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze files for AI code patterns')
  .argument('[paths...]', 'Files or directories to analyze', ['.'])
  .option('-s, --severity <level>', 'Minimum severity (info, warning, critical)', 'info')
  .option('--json', 'Output as JSON')
  .option('--fail-on <level>', 'Exit with error if patterns at this severity found')
  .action(
    async (paths: string[], options: { severity: Severity; json: boolean; failOn?: Severity }) => {
      const analyzer = new Analyzer();
      const files: string[] = [];

      // Collect files to analyze
      for (const p of paths) {
        const stat = fs.statSync(p, { throwIfNoEntry: false });
        if (stat?.isDirectory()) {
          const found = await glob(`${p}/**/*.{ts,tsx,js,jsx}`, {
            ignore: ['**/node_modules/**', '**/dist/**'],
          });
          files.push(...found);
        } else if (stat?.isFile()) {
          files.push(p);
        }
      }

      if (files.length === 0) {
        console.log('No files found to analyze');
        process.exit(0);
      }

      console.error(`Analyzing ${files.length} file(s)...\n`);

      const allPatterns: DetectedPattern[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const result = await analyzer.analyzeFile(content, file, {
          minSeverity: options.severity,
        });
        allPatterns.push(...result.patterns);
      }

      if (options.json) {
        console.log(JSON.stringify(allPatterns, null, 2));
      } else {
        // Group by file
        const byFile = new Map<string, DetectedPattern[]>();
        for (const pattern of allPatterns) {
          const patterns = byFile.get(pattern.file) ?? [];
          patterns.push(pattern);
          byFile.set(pattern.file, patterns);
        }

        for (const [file, patterns] of byFile) {
          console.log(`\n${file}`);
          console.log('='.repeat(file.length));
          for (const p of patterns) {
            const icon =
              p.severity === 'critical'
                ? '\u274c'
                : p.severity === 'warning'
                  ? '\u26a0\ufe0f'
                  : '\u2139\ufe0f';
            console.log(`  ${icon} Line ${p.startLine}: ${p.description}`);
            console.log(`     ${p.explanation}`);
            if (p.suggestion) {
              console.log(`     \u2794 ${p.suggestion}`);
            }
          }
        }

        // Summary
        const summary = analyzer.summarize([
          {
            file: '',
            language: null,
            patterns: allPatterns,
            analyzedAt: new Date(),
            durationMs: 0,
          },
        ]);
        console.log(`\n${'='.repeat(50)}`);
        console.log(`Summary: ${summary.totalPatterns} pattern(s) found`);
        console.log(`  Critical: ${summary.bySeverity.critical}`);
        console.log(`  Warning: ${summary.bySeverity.warning}`);
        console.log(`  Info: ${summary.bySeverity.info}`);
      }

      // Exit with error if fail-on threshold met
      if (options.failOn) {
        const severityOrder: Record<Severity, number> = { info: 0, warning: 1, critical: 2 };
        const failLevel = severityOrder[options.failOn];
        const shouldFail = allPatterns.some((p) => severityOrder[p.severity] >= failLevel);
        if (shouldFail) {
          process.exit(1);
        }
      }
    },
  );

program.parse();
