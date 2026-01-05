import { GitService, generatePreCommitHook, generatePrePushHook } from '@codegateway/core';
import * as vscode from 'vscode';
import { CheckpointPanel } from '../webview/index.js';

/**
 * Register git-related commands
 */
export function registerGitCommands(context: vscode.ExtensionContext): void {
  // Install pre-commit hook
  context.subscriptions.push(
    vscode.commands.registerCommand('codegateway.installGitHook', async () => {
      await installGitHook();
    }),
    vscode.commands.registerCommand('codegateway.uninstallGitHook', async () => {
      await uninstallGitHook();
    }),
    vscode.commands.registerCommand('codegateway.analyzeStagedFiles', async () => {
      await analyzeStagedFiles();
    }),
    vscode.commands.registerCommand('codegateway.triggerCheckpoint', async () => {
      await triggerCheckpoint(context);
    }),
  );
}

/**
 * Install the pre-commit hook
 */
async function installGitHook(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const gitService = new GitService(workspaceFolder.uri.fsPath);

  try {
    const isRepo = await gitService.isGitRepo();
    if (!isRepo) {
      vscode.window.showErrorMessage('Not a git repository');
      return;
    }

    // Check if already installed
    const isInstalled = await gitService.isHookInstalled('pre-commit');
    if (isInstalled) {
      const choice = await vscode.window.showQuickPick(['Update hook', 'Cancel'], {
        placeHolder: 'CodeGateway hook is already installed',
      });
      if (choice !== 'Update hook') {
        return;
      }
    }

    // Get configuration
    const config = vscode.workspace.getConfiguration('codegateway');
    const blockOnCritical = config.get<boolean>('blockOnCritical', true);
    const blockOnWarning = config.get<boolean>('blockOnWarning', false);
    const showCheckpoint = config.get<boolean>('showCheckpoint', true);
    const minSeverity = config.get<'info' | 'warning' | 'critical'>('minSeverity', 'warning');

    const hookContent = generatePreCommitHook({
      blockOnCritical,
      blockOnWarning,
      showCheckpoint,
      minSeverity,
    });

    await gitService.installHook('pre-commit', hookContent);

    // Ask about pre-push hook
    const installPrePush = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: 'Also install pre-push hook?',
    });

    if (installPrePush === 'Yes') {
      const prePushContent = generatePrePushHook({
        blockOnCritical,
        minSeverity: 'critical',
      });
      await gitService.installHook('pre-push', prePushContent);
    }

    vscode.window.showInformationMessage(
      'CodeGateway: Git hook installed successfully! Your commits will now be analyzed.',
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to install git hook: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Uninstall the pre-commit hook
 */
async function uninstallGitHook(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const gitService = new GitService(workspaceFolder.uri.fsPath);

  try {
    const isRepo = await gitService.isGitRepo();
    if (!isRepo) {
      vscode.window.showErrorMessage('Not a git repository');
      return;
    }

    const isInstalled = await gitService.isHookInstalled('pre-commit');
    if (!isInstalled) {
      vscode.window.showInformationMessage('CodeGateway hook is not installed');
      return;
    }

    const confirm = await vscode.window.showQuickPick(['Yes, uninstall', 'Cancel'], {
      placeHolder: 'Are you sure you want to uninstall the CodeGateway hook?',
    });

    if (confirm !== 'Yes, uninstall') {
      return;
    }

    await gitService.uninstallHook('pre-commit');
    await gitService.uninstallHook('pre-push');

    vscode.window.showInformationMessage('CodeGateway: Git hooks uninstalled');
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to uninstall git hook: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Analyze staged files
 */
async function analyzeStagedFiles(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder open');
    return;
  }

  const gitService = new GitService(workspaceFolder.uri.fsPath);

  try {
    const isRepo = await gitService.isGitRepo();
    if (!isRepo) {
      vscode.window.showErrorMessage('Not a git repository');
      return;
    }

    const stagedFiles = await gitService.getStagedFilesWithContent();

    if (stagedFiles.length === 0) {
      vscode.window.showInformationMessage('No staged files to analyze');
      return;
    }

    // Filter to supported file types
    const supportedFiles = stagedFiles.filter((f) => /\.(ts|tsx|js|jsx)$/.test(f.path));

    if (supportedFiles.length === 0) {
      vscode.window.showInformationMessage('No TypeScript/JavaScript files staged');
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'CodeGateway: Analyzing staged files',
      },
      async (_progress) => {
        const { Analyzer } = await import('@codegateway/core');
        const analyzer = new Analyzer();

        const files = supportedFiles.map((f) => ({
          path: f.path,
          content: f.content,
        }));

        const results = await analyzer.analyzeFiles(files);
        const summary = analyzer.summarize(results);

        // Show results
        const message = [
          `Analyzed ${supportedFiles.length} staged file(s)`,
          `Found: ${summary.bySeverity.critical} critical, ${summary.bySeverity.warning} warnings, ${summary.bySeverity.info} info`,
        ].join('\n');

        if (summary.totalPatterns > 0) {
          vscode.window.showWarningMessage(message, 'Show Details').then((choice) => {
            if (choice === 'Show Details') {
              // Open the Problems panel
              vscode.commands.executeCommand('workbench.action.problems.focus');
            }
          });
        } else {
          vscode.window.showInformationMessage('CodeGateway: No issues found in staged files!');
        }
      },
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to analyze staged files: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Trigger a comprehension checkpoint for the current file
 */
async function triggerCheckpoint(context: vscode.ExtensionContext): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  const document = editor.document;
  const filePath = document.uri.fsPath;
  const content = document.getText();

  // Analyze the current file
  const { Analyzer } = await import('@codegateway/core');
  const analyzer = new Analyzer();

  const result = await analyzer.analyzeFile(content, filePath);

  if (result.patterns.length === 0) {
    vscode.window.showInformationMessage('CodeGateway: No patterns detected in this file!');
    return;
  }

  // Show checkpoint panel
  const checkpointResult = await CheckpointPanel.createOrShow(
    context.extensionUri,
    result.patterns,
    filePath,
  );

  // Handle result
  switch (checkpointResult.status) {
    case 'passed':
      vscode.window.showInformationMessage(
        `CodeGateway: Checkpoint passed! ${checkpointResult.acknowledgedPatterns?.length ?? 0} patterns acknowledged.`,
      );
      break;
    case 'skipped':
      vscode.window.showWarningMessage(
        `CodeGateway: Checkpoint skipped${checkpointResult.skipReason ? `: ${checkpointResult.skipReason}` : ''}`,
      );
      break;
    case 'failed':
      vscode.window.showErrorMessage('CodeGateway: Checkpoint cancelled');
      break;
  }
}
