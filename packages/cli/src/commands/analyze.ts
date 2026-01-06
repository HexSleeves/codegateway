import { Analyzer } from '@codegateway/core';
import {
  type DetectedPattern,
  findConfigFile,
  loadConfig,
  type Severity,
} from '@codegateway/shared';
import type { Command } from 'commander';
import { collectFiles, readFileContent } from '../utils/files.js';
import { printJson, printPatterns, printSummary, shouldFailOnSeverity } from '../utils/output.js';

interface AnalyzeOptions {
  severity?: Severity;
  json: boolean;
  failOn?: Severity;
  config?: string;
}

export function registerAnalyzeCommand(program: Command): void {
  program
    .command('analyze')
    .description('Analyze files for AI code patterns')
    .argument('[paths...]', 'Files or directories to analyze', ['.'])
    .option('-s, --severity <level>', 'Minimum severity (info, warning, critical)')
    .option('--json', 'Output as JSON')
    .option('--fail-on <level>', 'Exit with error if patterns at this severity found')
    .option('-c, --config <path>', 'Path to config file')
    .action(async (paths: string[], options: AnalyzeOptions) => {
      const config = loadConfig(process.cwd());
      const configPath = options.config ?? findConfigFile(process.cwd());

      if (configPath && !options.json) {
        console.error(`Using config: ${configPath}`);
      }

      const minSeverity = options.severity ?? config.minSeverity;
      const files = await collectFiles(paths, config.exclude);

      if (files.length === 0) {
        console.log('No files found to analyze');
        process.exit(0);
      }

      if (!options.json) {
        console.error(`Analyzing ${files.length} file(s)...\n`);
      }

      const analyzer = new Analyzer();
      const allPatterns = await analyzeFiles(analyzer, files, minSeverity, config);

      if (options.json) {
        printJson(allPatterns);
      } else {
        printPatterns(allPatterns);
        printSummary(analyzer, allPatterns);
      }

      if (options.failOn && shouldFailOnSeverity(allPatterns, options.failOn)) {
        process.exit(1);
      }
    });
}

async function analyzeFiles(
  analyzer: Analyzer,
  files: string[],
  minSeverity: Severity,
  config: ReturnType<typeof loadConfig>,
): Promise<DetectedPattern[]> {
  const allPatterns: DetectedPattern[] = [];

  for (const file of files) {
    const content = readFileContent(file);
    const analysisResult = await analyzer.analyzeFile(content, file, {
      minSeverity,
      patternTypes: config.enabledPatterns,
      config,
    });
    allPatterns.push(...analysisResult.patterns);
  }

  return allPatterns;
}
