import { type AnalysisResult, Analyzer, EnhancedAnalyzer } from '@codegateway/core';
import {
  type DetectedPattern,
  type EnhancedPattern,
  findConfigFile,
  loadConfig,
  type Severity,
} from '@codegateway/shared';
import type { Command } from 'commander';
import { collectFiles, readFileContent } from '../utils/files.js';
import { printPatterns, printSummary, shouldFailOnSeverity } from '../utils/output.js';

interface AnalyzeOptions {
  severity?: Severity;
  json: boolean;
  failOn?: Severity;
  config?: string;
  llm?: boolean;
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
    .option('--llm', 'Enable LLM enhancement for better explanations')
    .action(async (paths: string[], options: AnalyzeOptions) => {
      const config = loadConfig(process.cwd());
      const configPath = options.config ?? findConfigFile(process.cwd());

      if (configPath && !options.json) {
        console.error(`Using config: ${configPath}`);
      }

      // Enable LLM if flag is passed
      if (options.llm) {
        config.llm.enabled = true;
      }

      const minSeverity = options.severity ?? config.minSeverity;
      const files = await collectFiles(paths, config.exclude);

      if (files.length === 0) {
        console.log('No files found to analyze');
        process.exit(0);
      }

      if (!options.json) {
        console.error(`Analyzing ${files.length} file(s)...`);
        if (config.llm.enabled) {
          console.error(`LLM enhancement enabled (${config.llm.provider}/${config.llm.model})`);
        }
        console.error('');
      }

      // Use enhanced analyzer if LLM is enabled
      const analyzer = config.llm.enabled ? new EnhancedAnalyzer(config) : new Analyzer(config);

      const results = await analyzeFiles(analyzer, files, minSeverity, config);
      const allPatterns = results.flatMap((r) => r.patterns);
      const allEnhancements = results.flatMap((r) => r.enhancements ?? []);

      if (options.json) {
        printJsonWithEnhancements(allPatterns, allEnhancements);
      } else {
        printPatterns(allPatterns, allEnhancements);
        printSummary(analyzer, allPatterns);

        if (config.llm.enabled && allEnhancements.length > 0) {
          console.log(`\n💡 LLM provided ${allEnhancements.length} enhanced explanation(s)`);
        }
      }

      if (options.failOn && shouldFailOnSeverity(allPatterns, options.failOn)) {
        process.exit(1);
      }
    });
}

async function analyzeFiles(
  analyzer: Analyzer | EnhancedAnalyzer,
  files: string[],
  minSeverity: Severity,
  config: ReturnType<typeof loadConfig>,
): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];

  for (const file of files) {
    const content = readFileContent(file);

    let analysisResult: AnalysisResult;
    if (analyzer instanceof EnhancedAnalyzer) {
      analysisResult = await analyzer.analyzeFileEnhanced(content, file, {
        minSeverity,
        patternTypes: config.enabledPatterns,
        config,
      });
    } else {
      analysisResult = await analyzer.analyzeFile(content, file, {
        minSeverity,
        patternTypes: config.enabledPatterns,
        config,
      });
    }

    results.push(analysisResult);
  }

  return results;
}

function printJsonWithEnhancements(
  patterns: DetectedPattern[],
  enhancements: EnhancedPattern[],
): void {
  const enhancementMap = new Map(enhancements.map((e) => [e.patternId, e]));

  const enrichedPatterns = patterns.map((p) => {
    const enhancement = enhancementMap.get(p.id);
    if (enhancement) {
      return {
        ...p,
        enhancedExplanation: enhancement.enhancedExplanation,
        specificSuggestion: enhancement.specificSuggestion,
        questions: enhancement.questions,
      };
    }
    return p;
  });

  console.log(JSON.stringify(enrichedPatterns, null, 2));
}
