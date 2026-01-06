#!/usr/bin/env node

import * as fs from 'node:fs';
import { Analyzer } from '@codegateway/core';
import {
  createDefaultConfigFile,
  type DetectedPattern,
  findConfigFile,
  loadConfig,
  matchesGlob,
  type Severity,
} from '@codegateway/shared';
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
  .option('-s, --severity <level>', 'Minimum severity (info, warning, critical)')
  .option('--json', 'Output as JSON')
  .option('--fail-on <level>', 'Exit with error if patterns at this severity found')
  .option('-c, --config <path>', 'Path to config file')
  .action(
    async (
      paths: string[],
      options: { severity?: Severity; json: boolean; failOn?: Severity; config?: string },
    ) => {
      // Load configuration
      const configPath = options.config ?? findConfigFile(process.cwd());
      const config = loadConfig(process.cwd());

      if (configPath && !options.json) {
        console.error(`Using config: ${configPath}`);
      }

      // CLI options override config file
      const minSeverity = options.severity ?? config.minSeverity;
      const excludePatterns = config.exclude;

      const analyzer = new Analyzer();
      const files: string[] = [];

      // Collect files to analyze
      for (const p of paths) {
        const stat = fs.statSync(p, { throwIfNoEntry: false });
        if (stat?.isDirectory()) {
          const found = await glob(`${p}/**/*.{ts,tsx,js,jsx}`, {
            ignore: excludePatterns,
          });
          files.push(...found);
        } else if (stat?.isFile()) {
          files.push(p);
        }
      }

      // Filter out excluded files
      const filteredFiles = files.filter((f) => !matchesGlob(f, excludePatterns));

      if (filteredFiles.length === 0) {
        console.log('No files found to analyze');
        process.exit(0);
      }

      if (!options.json) {
        console.error(`Analyzing ${filteredFiles.length} file(s)...\n`);
      }

      const allPatterns: DetectedPattern[] = [];

      for (const file of filteredFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const result = await analyzer.analyzeFile(content, file, {
          minSeverity,
          patternTypes: config.enabledPatterns,
          config,
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

program
  .command('init')
  .description('Create a codegateway.config.json file')
  .option('-f, --force', 'Overwrite existing config file')
  .action((options: { force?: boolean }) => {
    const existingConfig = findConfigFile(process.cwd());

    if (existingConfig && !options.force) {
      console.error(`Config file already exists: ${existingConfig}`);
      console.error('Use --force to overwrite.');
      process.exit(1);
    }

    const configPath = createDefaultConfigFile(process.cwd());
    console.log(`Created config file: ${configPath}`);
  });

program.parse();
