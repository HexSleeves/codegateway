import { type AnalysisResult, Analyzer } from '@codegateway/core';
import * as vscode from 'vscode';
import { getDebounceMs, getResolvedConfig, isInlineHintsEnabled } from '../core/config.js';
import type { DecorationManager, DiagnosticsManager, StatusBarManager } from '../ui/index.js';
import { isSupportedLanguage } from '../utils/index.js';

/**
 * Manages file analysis and result presentation
 */
export class FileAnalyzer {
  private readonly analyzer: Analyzer;
  private readonly diagnosticsManager: DiagnosticsManager;
  private readonly decorationManager: DecorationManager;
  private readonly statusBarManager: StatusBarManager;
  private readonly analysisCache = new Map<string, AnalysisResult>();
  private readonly debounceTimers = new Map<string, NodeJS.Timeout>();

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

  /** Analyze a document with debouncing */
  async analyzeDocument(document: vscode.TextDocument): Promise<void> {
    const uri = document.uri.toString();

    const existingTimer = this.debounceTimers.get(uri);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      await this.doAnalyze(document);
      this.debounceTimers.delete(uri);
    }, getDebounceMs());

    this.debounceTimers.set(uri, timer);
  }

  /** Analyze a document immediately (no debounce) */
  async analyzeDocumentNow(document: vscode.TextDocument): Promise<AnalysisResult | null> {
    const uri = document.uri.toString();
    const existingTimer = this.debounceTimers.get(uri);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.debounceTimers.delete(uri);
    }

    return this.doAnalyze(document);
  }

  /** Get cached analysis result for a document */
  getCachedResult(document: vscode.TextDocument): AnalysisResult | undefined {
    return this.analysisCache.get(document.uri.toString());
  }

  /** Clear analysis for a document */
  clearAnalysis(document: vscode.TextDocument): void {
    const uri = document.uri.toString();
    this.analysisCache.delete(uri);
    this.diagnosticsManager.clearDiagnostics(document.uri);

    const editor = vscode.window.visibleTextEditors.find((e) => e.document.uri.toString() === uri);
    if (editor) {
      this.decorationManager.clearDecorations(editor);
    }
  }

  /** Clear all analyses */
  clearAll(): void {
    this.analysisCache.clear();
    this.diagnosticsManager.clearAll();

    for (const editor of vscode.window.visibleTextEditors) {
      this.decorationManager.clearDecorations(editor);
    }

    this.statusBarManager.reset();
  }

  /** Update decorations when editor becomes visible */
  updateDecorationsForEditor(editor: vscode.TextEditor): void {
    const result = this.analysisCache.get(editor.document.uri.toString());
    if (result) {
      this.decorationManager.applyDecorations(editor, result.patterns);
    }
  }

  /** Dispose of resources */
  dispose(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  private async doAnalyze(document: vscode.TextDocument): Promise<AnalysisResult | null> {
    if (!isSupportedLanguage(document.languageId)) {
      return null;
    }

    const config = getResolvedConfig();
    this.statusBarManager.showAnalyzing();

    try {
      const result = await this.analyzer.analyzeFile(document.getText(), document.uri.fsPath, {
        config,
        minSeverity: config.minSeverity,
      });

      this.analysisCache.set(document.uri.toString(), result);
      this.diagnosticsManager.updateDiagnostics(document.uri, result.patterns);

      const editor = vscode.window.visibleTextEditors.find(
        (e) => e.document.uri.toString() === document.uri.toString(),
      );
      if (editor && isInlineHintsEnabled()) {
        this.decorationManager.applyDecorations(editor, result.patterns);
      }

      this.statusBarManager.update(result.patterns);
      return result;
    } catch (error) {
      console.error('CodeGateway analysis error:', error);
      this.statusBarManager.reset();
      return null;
    }
  }
}
