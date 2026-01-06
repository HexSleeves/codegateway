import * as fs from 'node:fs';
import * as path from 'node:path';
import { ALL_PATTERN_TYPES } from '../constants/index.js';
import type { CodeGatewayConfig, ResolvedConfig } from '../types/index.js';

/**
 * Config file names to search for, in order of priority
 */
export const CONFIG_FILE_NAMES: readonly string[] = [
  'codegateway.config.json',
  '.codegaterc.json',
  '.codegaterc',
];

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: ResolvedConfig = {
  enabledPatterns: ALL_PATTERN_TYPES,
  minSeverity: 'info',
  severityOverrides: {},
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/*.min.js',
    '**/*.bundle.js',
  ],

  // Detector settings (empty = use built-in defaults only)
  genericVariableNames: [],
  loopVariableNames: [],
  coordinateVariableNames: [],
  genericErrorMessages: [],
  secretPatterns: [],

  // Git settings
  blockOnCritical: true,
  blockOnWarning: false,
  showCheckpoint: true,

  // UI settings
  showInlineHints: true,
  debounceMs: 500,
  analyzeOnOpen: true,
  analyzeOnSave: true,
};

/**
 * Find config file by traversing up from the given directory
 */
export function findConfigFile(startDir: string): string | null {
  let currentDir = path.resolve(startDir);
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    for (const fileName of CONFIG_FILE_NAMES) {
      const configPath = path.join(currentDir, fileName);
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }

    // Also check package.json for "codegateway" key
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.codegateway) {
          return packageJsonPath;
        }
      } catch {
        // Ignore parse errors
      }
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Load configuration from a file
 */
export function loadConfigFile(configPath: string): CodeGatewayConfig {
  const content = fs.readFileSync(configPath, 'utf-8');

  // If it's package.json, extract the codegateway key
  if (path.basename(configPath) === 'package.json') {
    const packageJson = JSON.parse(content);
    return packageJson.codegateway ?? {};
  }

  return JSON.parse(content);
}

/**
 * Resolve configuration by merging user config with defaults
 */
export function resolveConfig(userConfig: CodeGatewayConfig): ResolvedConfig {
  return {
    enabledPatterns: userConfig.enabledPatterns ?? DEFAULT_CONFIG.enabledPatterns,
    minSeverity: userConfig.minSeverity ?? DEFAULT_CONFIG.minSeverity,
    severityOverrides: userConfig.severityOverrides ?? DEFAULT_CONFIG.severityOverrides,
    exclude: userConfig.exclude ?? DEFAULT_CONFIG.exclude,

    genericVariableNames: userConfig.genericVariableNames ?? DEFAULT_CONFIG.genericVariableNames,
    loopVariableNames: userConfig.loopVariableNames ?? DEFAULT_CONFIG.loopVariableNames,
    coordinateVariableNames:
      userConfig.coordinateVariableNames ?? DEFAULT_CONFIG.coordinateVariableNames,
    genericErrorMessages: userConfig.genericErrorMessages ?? DEFAULT_CONFIG.genericErrorMessages,
    secretPatterns: userConfig.secretPatterns ?? DEFAULT_CONFIG.secretPatterns,

    blockOnCritical: userConfig.blockOnCritical ?? DEFAULT_CONFIG.blockOnCritical,
    blockOnWarning: userConfig.blockOnWarning ?? DEFAULT_CONFIG.blockOnWarning,
    showCheckpoint: userConfig.showCheckpoint ?? DEFAULT_CONFIG.showCheckpoint,

    showInlineHints: userConfig.showInlineHints ?? DEFAULT_CONFIG.showInlineHints,
    debounceMs: userConfig.debounceMs ?? DEFAULT_CONFIG.debounceMs,
    analyzeOnOpen: userConfig.analyzeOnOpen ?? DEFAULT_CONFIG.analyzeOnOpen,
    analyzeOnSave: userConfig.analyzeOnSave ?? DEFAULT_CONFIG.analyzeOnSave,
  };
}

/**
 * Load and resolve configuration from the given directory.
 * If no config file is found, returns default configuration.
 */
export function loadConfig(startDir: string = process.cwd()): ResolvedConfig {
  const configPath = findConfigFile(startDir);

  if (!configPath) {
    return DEFAULT_CONFIG;
  }

  try {
    const userConfig = loadConfigFile(configPath);
    return resolveConfig(userConfig);
  } catch (error) {
    console.warn(`Warning: Failed to load config from ${configPath}:`, error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Get the path where a config file would be created
 */
export function getDefaultConfigPath(dir: string = process.cwd()): string {
  return path.join(dir, CONFIG_FILE_NAMES[0]!);
}

/**
 * Create a default config file
 */
export function createDefaultConfigFile(dir: string = process.cwd()): string {
  const configPath = getDefaultConfigPath(dir);

  const defaultConfig: CodeGatewayConfig = {
    minSeverity: 'info',
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    blockOnCritical: true,
    blockOnWarning: false,
  };

  fs.writeFileSync(configPath, `${JSON.stringify(defaultConfig, null, 2)}\n`);
  return configPath;
}

/**
 * Convert ResolvedConfig to DetectorSettings for backward compatibility
 */
export function toDetectorSettings(config: ResolvedConfig) {
  return {
    genericVariableNames: config.genericVariableNames,
    loopVariableNames: config.loopVariableNames,
    coordinateVariableNames: config.coordinateVariableNames,
    genericErrorMessages: config.genericErrorMessages,
    secretPatterns: config.secretPatterns,
  };
}
