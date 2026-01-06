import type {
  CheckpointStatus,
  ComprehensionCheckpoint,
  DetectedPattern,
} from '@codegateway/shared';
import * as vscode from 'vscode';
import { generateCheckpointHtml } from './checkpoint-html.js';

/** Result from a checkpoint interaction */
export interface CheckpointResult {
  status: CheckpointStatus;
  acknowledgedPatterns?: number[];
  skipReason?: string;
}

interface WebviewMessage {
  type: 'proceed' | 'skip' | 'cancel';
  acknowledged?: number[];
  reason?: string;
}

/**
 * Manages the checkpoint webview panel
 */
export class CheckpointPanel {
  public static currentPanel: CheckpointPanel | undefined;
  public static readonly viewType = 'codegateway.checkpoint';

  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];
  private checkpoint: ComprehensionCheckpoint | null = null;
  private resolvePromise: ((result: CheckpointResult) => void) | null = null;

  private constructor(panel: vscode.WebviewPanel) {
    this.panel = panel;

    this.panel.webview.onDidReceiveMessage(
      (message) => this.handleMessage(message),
      null,
      this.disposables,
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  /** Show or create the checkpoint panel */
  public static createOrShow(
    extensionUri: vscode.Uri,
    patterns: DetectedPattern[],
    file: string,
  ): Promise<CheckpointResult> {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (CheckpointPanel.currentPanel) {
      CheckpointPanel.currentPanel.panel.reveal(column);
      return CheckpointPanel.currentPanel.showCheckpoint(patterns, file);
    }

    const panel = vscode.window.createWebviewPanel(
      CheckpointPanel.viewType,
      'CodeGateway Checkpoint',
      column || vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true },
    );

    CheckpointPanel.currentPanel = new CheckpointPanel(panel);
    return CheckpointPanel.currentPanel.showCheckpoint(patterns, file);
  }

  private showCheckpoint(patterns: DetectedPattern[], file: string): Promise<CheckpointResult> {
    this.checkpoint = {
      id: `ckpt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: 'pre_commit',
      patterns,
      file,
      questions: [],
      status: 'pending',
    };

    this.panel.webview.html = generateCheckpointHtml(patterns, file);

    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  private handleMessage(message: WebviewMessage): void {
    switch (message.type) {
      case 'proceed':
        this.resolvePromise?.({
          status: 'passed',
          acknowledgedPatterns: message.acknowledged ?? [],
        });
        this.dispose();
        break;

      case 'skip':
        this.resolvePromise?.({
          status: 'skipped',
          skipReason: message.reason ?? '',
        });
        this.dispose();
        break;

      case 'cancel':
        this.resolvePromise?.({ status: 'failed' });
        this.dispose();
        break;
    }
  }

  public dispose(): void {
    CheckpointPanel.currentPanel = undefined;
    this.panel.dispose();

    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }
}
