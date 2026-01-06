import { CONFIG_FILE_NAMES } from '@codegateway/shared';
import * as vscode from 'vscode';
import { FileAnalyzer } from './analysis/fileAnalyzer.js';
import { registerCommands, registerGitCommands } from './commands/index.js';
import {
  invalidateConfigCache,
  isAnalyzeOnOpenEnabled,
  isAnalyzeOnSaveEnabled,
} from './core/config.js';
import { DecorationManager, DiagnosticsManager, StatusBarManager } from './ui/index.js';
import { isConfigFile, isSupportedDocument } from './utils/index.js';

let fileAnalyzer: FileAnalyzer;
let diagnosticsManager: DiagnosticsManager;
let decorationManager: DecorationManager;
let statusBarManager: StatusBarManager;

/** Extension activation */
export function activate(context: vscode.ExtensionContext): void {
  console.log('CodeGateway extension activated');

  // Initialize managers
  diagnosticsManager = new DiagnosticsManager();
  decorationManager = new DecorationManager();
  statusBarManager = new StatusBarManager();
  fileAnalyzer = new FileAnalyzer(diagnosticsManager, decorationManager, statusBarManager);

  // Register commands and events
  registerCommands(context, fileAnalyzer);
  registerGitCommands(context);
  registerEventListeners(context);

  // Analyze already open documents
  analyzeOpenDocuments();
}

/** Extension deactivation */
export function deactivate(): void {
  console.log('CodeGateway extension deactivated');
  fileAnalyzer?.dispose();
  diagnosticsManager?.dispose();
  decorationManager?.dispose();
  statusBarManager?.dispose();
}

function registerEventListeners(context: vscode.ExtensionContext): void {
  const configWatcher = vscode.workspace.createFileSystemWatcher(
    `**/{${CONFIG_FILE_NAMES.join(',')}}`,
  );

  const onConfigChange = () => {
    invalidateConfigCache();
    vscode.window.showInformationMessage('CodeGateway: Config reloaded');
    analyzeOpenDocuments();
  };

  context.subscriptions.push(
    configWatcher,
    configWatcher.onDidChange(onConfigChange),
    configWatcher.onDidCreate(onConfigChange),
    configWatcher.onDidDelete(onConfigChange),

    vscode.workspace.onDidOpenTextDocument((document) => {
      if (isAnalyzeOnOpenEnabled() && isSupportedDocument(document)) {
        fileAnalyzer.analyzeDocument(document);
      }
    }),

    vscode.workspace.onDidSaveTextDocument((document) => {
      if (isConfigFile(document)) {
        invalidateConfigCache();
        analyzeOpenDocuments();
        return;
      }
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
  );
}

function analyzeOpenDocuments(): void {
  for (const document of vscode.workspace.textDocuments) {
    if (isSupportedDocument(document)) {
      fileAnalyzer.analyzeDocument(document);
    }
  }
}
