import * as vscode from 'vscode';
import { FileAnalyzer } from '../analysis/fileAnalyzer';

/**
 * Register all extension commands
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  fileAnalyzer: FileAnalyzer
): void {
  // Analyze current file
  context.subscriptions.push(
    vscode.commands.registerCommand('codegateway.analyzeFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor');
        return;
      }

      const result = await fileAnalyzer.analyzeDocumentNow(editor.document);
      if (result) {
        const count = result.patterns.length;
        if (count === 0) {
          vscode.window.showInformationMessage('CodeGateway: No patterns detected!');
        } else {
          vscode.window.showInformationMessage(
            `CodeGateway: Found ${count} pattern${count !== 1 ? 's' : ''}`
          );
        }
      }
    })
  );

  // Analyze workspace
  context.subscriptions.push(
    vscode.commands.registerCommand('codegateway.analyzeWorkspace', async () => {
      const files = await vscode.workspace.findFiles(
        '**/*.{ts,tsx,js,jsx}',
        '**/node_modules/**'
      );

      if (files.length === 0) {
        vscode.window.showInformationMessage('No TypeScript/JavaScript files found');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'CodeGateway: Analyzing workspace',
          cancellable: true,
        },
        async (progress, token) => {
          let analyzed = 0;
          let totalPatterns = 0;

          for (const file of files) {
            if (token.isCancellationRequested) {
              break;
            }

            const document = await vscode.workspace.openTextDocument(file);
            const result = await fileAnalyzer.analyzeDocumentNow(document);
            if (result) {
              totalPatterns += result.patterns.length;
            }

            analyzed++;
            progress.report({
              message: `${analyzed}/${files.length} files`,
              increment: 100 / files.length,
            });
          }

          vscode.window.showInformationMessage(
            `CodeGateway: Analyzed ${analyzed} files, found ${totalPatterns} patterns`
          );
        }
      );
    })
  );

  // Clear all diagnostics
  context.subscriptions.push(
    vscode.commands.registerCommand('codegateway.clearDiagnostics', () => {
      fileAnalyzer.clearAll();
      vscode.window.showInformationMessage('CodeGateway: Diagnostics cleared');
    })
  );

  // Show dashboard (placeholder for now)
  context.subscriptions.push(
    vscode.commands.registerCommand('codegateway.showDashboard', () => {
      vscode.window.showInformationMessage(
        'CodeGateway Dashboard coming soon! Check the Problems panel for detected patterns.'
      );
    })
  );
}
