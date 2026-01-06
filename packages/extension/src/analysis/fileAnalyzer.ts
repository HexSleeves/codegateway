import { type AnalysisResult, Analyzer } from '@codegateway/core';
import * as vscode from 'vscode';
import { getConfig, getDebounceMs } from '../core/config';
import type { DecorationManager, DiagnosticsManager, StatusBarManager } from '../ui';

/**
 * Manages file analysis and result presentation
 */
export class FileAnalyzer {
  private readonly analyzer: Analyzer;
  private readonly diagnosticsManager: DiagnosticsManager;
  private readonly decorationManager: DecorationManager;
  private readonly statusBarManager: StatusBarManager;
  private readonly analysisCache: Map<string, AnalysisResult> = new Map();
  private readonly debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    diagnosticsManager: DiagnosticsManager,
    decorationManager: DecorationManager,
    statusBarManager: StatusBarManager,
  ) {
    this.analyzer = new Analyzer();
    this.diagnosticsManager = diagnosticsManager;
    this.decorationManager = decorationManager;
    this.statusBarManager = statusBarManager;
  }

  /**
   * Analyze a document with debouncing
   */
  async analyzeDocument(document: vscode.TextDocument): Promise<void> {
    const uri = document.uri.toString();

    // Clear existing timer
    const existingTimer = this.debounceTimers.get(uri);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced analysis
    const timer = setTimeout(async () => {
      await this.doAnalyze(document);
      this.debounceTimers.delete(uri);
    }, getDebounceMs());

    this.debounceTimers.set(uri, timer);
  }

  /**
   * Analyze a document immediately (no debounce)
   */
  async analyzeDocumentNow(document: vscode.TextDocument): Promise<AnalysisResult | null> {
    // Cancel any pending debounced analysis
    const uri = document.uri.toString();
    const existingTimer = this.debounceTimers.get(uri);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.debounceTimers.delete(uri);
    }

    return this.doAnalyze(document);
  }

  /**
   * Get cached analysis result for a document
   */
  getCachedResult(document: vscode.TextDocument): AnalysisResult | undefined {
    return this.analysisCache.get(document.uri.toString());
  }

  /**
   * Clear analysis for a document
   */
  clearAnalysis(document: vscode.TextDocument): void {
    const uri = document.uri.toString();
    this.analysisCache.delete(uri);
    this.diagnosticsManager.clearDiagnostics(document.uri);

    const editor = vscode.window.visibleTextEditors.find((e) => e.document.uri.toString() === uri);
    if (editor) {
      this.decorationManager.clearDecorations(editor);
    }
  }

  /**
   * Clear all analyses
   */
  clearAll(): void {
    this.analysisCache.clear();
    this.diagnosticsManager.clearAll();

    for (const editor of vscode.window.visibleTextEditors) {
      this.decorationManager.clearDecorations(editor);
    }

    this.statusBarManager.reset();
  }

  /**
   * Update decorations when editor becomes visible
   */
  updateDecorationsForEditor(editor: vscode.TextEditor): void {
    const result = this.analysisCache.get(editor.document.uri.toString());
    if (result) {
      this.decorationManager.applyDecorations(editor, result.patterns);
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    // Clear all timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  private async doAnalyze(document: vscode.TextDocument): Promise<AnalysisResult | null> {
    // Check if this is a supported language
    const supportedLanguages = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'];
    if (!supportedLanguages.includes(document.languageId)) {
      return null;
    }

    const config = getConfig();

    // Update status bar to show analyzing
    this.statusBarManager.showAnalyzing();

    try {
      const result = await this.analyzer.analyzeFile(document.getText(), document.uri.fsPath, {
        config,
        minSeverity: config.minSeverityForCheckpoint,
      });

      // Cache result
      this.analysisCache.set(document.uri.toString(), result);

      // Update diagnostics
      this.diagnosticsManager.updateDiagnostics(document.uri, result.patterns);

      // Update decorations if editor is visible
      const editor = vscode.window.visibleTextEditors.find(
        (e) => e.document.uri.toString() === document.uri.toString(),
      );
      if (editor && config.showInlineHints) {
        this.decorationManager.applyDecorations(editor, result.patterns);
      }

      // Update status bar
      this.statusBarManager.update(result.patterns);

      return result;
    } catch (error) {
      console.error('CodeGateway analysis error:', error);
      this.statusBarManager.reset();
      return null;
    }
  }
}
