import type { DetectorSettings, ExtensionConfig, PatternType, Severity } from '@codegateway/shared';
import { DEFAULT_CONFIG } from '@codegateway/shared';
import * as vscode from 'vscode';

/**
 * Get detector-specific settings from VS Code settings
 */
export function getDetectorSettings(): DetectorSettings {
  const config = vscode.workspace.getConfiguration('codegateway');
  return {
    genericVariableNames: config.get<string[]>('genericVariableNames') ?? [],
    loopVariableNames: config.get<string[]>('loopVariableNames') ?? [],
    coordinateVariableNames: config.get<string[]>('coordinateVariableNames') ?? [],
    genericErrorMessages: config.get<string[]>('genericErrorMessages') ?? [],
    secretPatterns: config.get<string[]>('secretPatterns') ?? [],
  };
}

/**
 * Get extension configuration from VS Code settings
 */
export function getConfig(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('codegateway');

  return {
    allowSkip: true,
    checkpointTrigger: 'pre_commit',
    cloudSyncEnabled: false,
    customPatterns: [],
    minSeverityForCheckpoint: config.get<Severity>('minSeverity') ?? 'info',
    notificationLevel: 'warnings',
    severityOverrides: {},
    showInlineHints: config.get<boolean>('showInlineHints') ?? true,
    showStatusBarSummary: true,
    skipRequiresReason: false,
    enabledPatterns: config.get<PatternType[]>('enabledPatterns') ?? DEFAULT_CONFIG.enabledPatterns,
    excludeFiles: config.get<string[]>('excludeFiles') ?? DEFAULT_CONFIG.excludeFiles,
    excludePaths: config.get<string[]>('excludePaths') ?? DEFAULT_CONFIG.excludePaths,
    detectorSettings: getDetectorSettings(),
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
