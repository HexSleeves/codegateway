import * as vscode from 'vscode';
import type { PatternType, Severity, ExtensionConfig } from '@codegateway/shared';
import { DEFAULT_CONFIG, ALL_PATTERN_TYPES } from '@codegateway/shared';

/**
 * Get extension configuration from VS Code settings
 */
export function getConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('codegateway');

  return {
    enabledPatterns: config.get<PatternType[]>('enabledPatterns') ?? DEFAULT_CONFIG.enabledPatterns,
    customPatterns: [],
    severityOverrides: {},
    excludePaths: config.get<string[]>('excludePaths') ?? DEFAULT_CONFIG.excludePaths,
    excludeFiles: config.get<string[]>('excludeFiles') ?? DEFAULT_CONFIG.excludeFiles,
    checkpointTrigger: 'pre_commit',
    minSeverityForCheckpoint: config.get<Severity>('minSeverity') ?? 'info',
    allowSkip: true,
    skipRequiresReason: false,
    cloudSyncEnabled: false,
    showInlineHints: config.get<boolean>('showInlineHints') ?? true,
    showStatusBarSummary: true,
    notificationLevel: 'warnings',
  };
}

/**
 * Check if a pattern type is enabled
 */
export function isPatternEnabled(type: PatternType): boolean {
  const config = getConfig();
  return config.enabledPatterns.includes(type);
}

/**
 * Get analysis debounce delay
 */
export function getDebounceMs(): number {
  const config = vscode.workspace.getConfiguration('codegateway');
  return config.get<number>('debounceMs') ?? 500;
}

/**
 * Check if analyze on save is enabled
 */
export function isAnalyzeOnSaveEnabled(): boolean {
  const config = vscode.workspace.getConfiguration('codegateway');
  return config.get<boolean>('analyzeOnSave') ?? true;
}

/**
 * Check if analyze on open is enabled
 */
export function isAnalyzeOnOpenEnabled(): boolean {
  const config = vscode.workspace.getConfiguration('codegateway');
  return config.get<boolean>('analyzeOnOpen') ?? true;
}
