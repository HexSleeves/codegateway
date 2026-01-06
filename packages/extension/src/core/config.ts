import type { PatternType, ResolvedConfig } from '@codegateway/shared';
import { findConfigFile, loadConfig } from '@codegateway/shared';
import { getWorkspaceRoot } from '../utils/index.js';

// Cache for resolved config
let cachedConfig: ResolvedConfig | null = null;
let cachedConfigPath: string | null = null;

/** Load configuration from config file (cached) */
export function getResolvedConfig(): ResolvedConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const workspaceRoot = getWorkspaceRoot();
  cachedConfigPath = findConfigFile(workspaceRoot);
  cachedConfig = loadConfig(workspaceRoot);

  return cachedConfig;
}

/** Invalidate the config cache (call when config file changes) */
export function invalidateConfigCache(): void {
  cachedConfig = null;
  cachedConfigPath = null;
}

/** Get the path to the active config file, or null if using defaults */
export function getConfigFilePath(): string | null {
  if (!cachedConfig) {
    getResolvedConfig();
  }
  return cachedConfigPath;
}

/** Check if a pattern type is enabled */
export function isPatternEnabled(type: PatternType): boolean {
  return getResolvedConfig().enabledPatterns.includes(type);
}

/** Get analysis debounce delay */
export function getDebounceMs(): number {
  return getResolvedConfig().debounceMs;
}

/** Check if analyze on save is enabled */
export function isAnalyzeOnSaveEnabled(): boolean {
  return getResolvedConfig().analyzeOnSave;
}

/** Check if analyze on open is enabled */
export function isAnalyzeOnOpenEnabled(): boolean {
  return getResolvedConfig().analyzeOnOpen;
}

/** Check if inline hints are enabled */
export function isInlineHintsEnabled(): boolean {
  return getResolvedConfig().showInlineHints;
}

/** Get git integration settings */
export function getGitSettings() {
  const config = getResolvedConfig();
  return {
    blockOnCritical: config.blockOnCritical,
    blockOnWarning: config.blockOnWarning,
    showCheckpoint: config.showCheckpoint,
  };
}
