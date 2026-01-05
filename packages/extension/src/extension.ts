import * as vscode from 'vscode';
import { FileAnalyzer } from './analysis/fileAnalyzer';
import { registerCommands, registerGitCommands } from './commands';
import { isAnalyzeOnOpenEnabled, isAnalyzeOnSaveEnabled } from './core/config';
import { DecorationManager, DiagnosticsManager, StatusBarManager } from './ui';

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
  registerGitCommands(context);

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
    }),
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (isAnalyzeOnSaveEnabled() && isSupportedDocument(document)) {
        fileAnalyzer.analyzeDocumentNow(document);
      }
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (isSupportedDocument(event.document)) {
        fileAnalyzer.analyzeDocument(event.document);
      }
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && isSupportedDocument(editor.document)) {
        fileAnalyzer.updateDecorationsForEditor(editor);
      }
    }),
    vscode.workspace.onDidCloseTextDocument((document) => {
      fileAnalyzer.clearAnalysis(document);
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('codegateway')) {
        analyzeOpenDocuments();
      }
    }),
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
  const supportedLanguages = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'];
  return supportedLanguages.includes(document.languageId);
}
