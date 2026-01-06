import type { ExtensionConfig, PatternType, ResolvedConfig } from '@codegateway/shared';
import {
  loadConfig,
  findConfigFile,
  toDetectorSettings,
  DEFAULT_CONFIG,
} from '@codegateway/shared';
import * as vscode from 'vscode';

// Cache for resolved config
let cachedConfig: ResolvedConfig | null = null;
let cachedConfigPath: string | null = null;

/**
 * Get the workspace root directory
 */
function getWorkspaceRoot(): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    return workspaceFolders[0].uri.fsPath;
  }
  return process.cwd();
}

/**
 * Load configuration from config file.
 * Caches the result until invalidateConfigCache() is called.
 */
export function getResolvedConfig(): ResolvedConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  const workspaceRoot = getWorkspaceRoot();
  cachedConfigPath = findConfigFile(workspaceRoot);
  cachedConfig = loadConfig(workspaceRoot);
  
  return cachedConfig;
}

/**
 * Invalidate the config cache (call when config file changes)
 */
export function invalidateConfigCache(): void {
  cachedConfig = null;
  cachedConfigPath = null;
}

/**
 * Get the path to the active config file, or null if using defaults
 */
export function getConfigFilePath(): string | null {
  if (!cachedConfig) {
    getResolvedConfig(); // Populate cache
  }
  return cachedConfigPath;
}

/**
 * Get extension configuration in the old ExtensionConfig format.
 * This is for backward compatibility with existing code.
 */
export function getConfig(): ExtensionConfig {
  const resolved = getResolvedConfig();
  
  return {
    enabledPatterns: resolved.enabledPatterns,
    customPatterns: [],
    severityOverrides: resolved.severityOverrides,
    excludePaths: resolved.exclude,
    excludeFiles: [],
    detectorSettings: toDetectorSettings(resolved),
    checkpointTrigger: 'pre_commit',
    minSeverityForCheckpoint: resolved.minSeverity,
    allowSkip: true,
    skipRequiresReason: false,
    cloudSyncEnabled: false,
    showInlineHints: resolved.showInlineHints,
    showStatusBarSummary: true,
    notificationLevel: 'warnings',
  };
}

/**
 * Check if a pattern type is enabled
 */
export function isPatternEnabled(type: PatternType): boolean {
  const config = getResolvedConfig();
  return config.enabledPatterns.includes(type);
}

/**
 * Get analysis debounce delay
 */
export function getDebounceMs(): number {
  return getResolvedConfig().debounceMs;
}

/**
 * Check if analyze on save is enabled
 */
export function isAnalyzeOnSaveEnabled(): boolean {
  return getResolvedConfig().analyzeOnSave;
}

/**
 * Check if analyze on open is enabled
 */
export function isAnalyzeOnOpenEnabled(): boolean {
  return getResolvedConfig().analyzeOnOpen;
}

/**
 * Check if inline hints are enabled
 */
export function isInlineHintsEnabled(): boolean {
  return getResolvedConfig().showInlineHints;
}

/**
 * Get git integration settings
 */
export function getGitSettings() {
  const config = getResolvedConfig();
  return {
    blockOnCritical: config.blockOnCritical,
    blockOnWarning: config.blockOnWarning,
    showCheckpoint: config.showCheckpoint,
  };
}
