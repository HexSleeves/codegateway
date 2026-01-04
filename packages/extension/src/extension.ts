import * as vscode from 'vscode';
import { DiagnosticsManager, DecorationManager, StatusBarManager } from './ui';
import { FileAnalyzer } from './analysis/fileAnalyzer';
import { registerCommands } from './commands';
import { isAnalyzeOnSaveEnabled, isAnalyzeOnOpenEnabled } from './core/config';

let fileAnalyzer: FileAnalyzer;
let diagnosticsManager: DiagnosticsManager;
let decorationManager: DecorationManager;
let statusBarManager: StatusBarManager;

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('CodeGateway extension activated');

  // Initialize managers
  diagnosticsManager = new DiagnosticsManager();
  decorationManager = new DecorationManager();
  statusBarManager = new StatusBarManager();
  fileAnalyzer = new FileAnalyzer(diagnosticsManager, decorationManager, statusBarManager);

  // Register commands
  registerCommands(context, fileAnalyzer);

  // Register event listeners
  registerEventListeners(context);

  // Analyze already open documents
  analyzeOpenDocuments();
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  console.log('CodeGateway extension deactivated');
  fileAnalyzer?.dispose();
  diagnosticsManager?.dispose();
  decorationManager?.dispose();
  statusBarManager?.dispose();
}

/**
 * Register event listeners for document changes
 */
function registerEventListeners(context: vscode.ExtensionContext): void {
  // Analyze on document open
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (isAnalyzeOnOpenEnabled() && isSupportedDocument(document)) {
        fileAnalyzer.analyzeDocument(document);
      }
    })
  );

  // Analyze on document save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (isAnalyzeOnSaveEnabled() && isSupportedDocument(document)) {
        fileAnalyzer.analyzeDocumentNow(document);
      }
    })
  );

  // Analyze on document change (with debounce)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (isSupportedDocument(event.document)) {
        fileAnalyzer.analyzeDocument(event.document);
      }
    })
  );

  // Update decorations when editor becomes visible
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && isSupportedDocument(editor.document)) {
        fileAnalyzer.updateDecorationsForEditor(editor);
      }
    })
  );

  // Clear diagnostics when document is closed
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      fileAnalyzer.clearAnalysis(document);
    })
  );

  // Re-analyze when configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('codegateway')) {
        analyzeOpenDocuments();
      }
    })
  );
}

/**
 * Analyze all currently open documents
 */
function analyzeOpenDocuments(): void {
  for (const document of vscode.workspace.textDocuments) {
    if (isSupportedDocument(document)) {
      fileAnalyzer.analyzeDocument(document);
    }
  }
}

/**
 * Check if a document is a supported language
 */
function isSupportedDocument(document: vscode.TextDocument): boolean {
  const supportedLanguages = [
    'typescript',
    'javascript',
    'typescriptreact',
    'javascriptreact',
  ];
  return supportedLanguages.includes(document.languageId);
}
