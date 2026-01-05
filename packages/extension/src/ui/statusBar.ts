import type { DetectedPattern } from '@codegateway/shared';
import * as vscode from 'vscode';

/**
 * Manages the status bar item showing pattern counts
 */
export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'codegateway.showDashboard';
    this.statusBarItem.tooltip = 'CodeGateway - Click to open dashboard';
    this.reset();
    this.statusBarItem.show();
  }

  /**
   * Update status bar with current pattern counts
   */
  update(patterns: DetectedPattern[]): void {
    const counts = {
      critical: 0,
      warning: 0,
      info: 0,
    };

    patterns.forEach((p) => {
      counts[p.severity]++;
    });

    if (patterns.length === 0) {
      this.statusBarItem.text = '$(check) CodeGateway';
      this.statusBarItem.backgroundColor = undefined;
    } else if (counts.critical > 0) {
      this.statusBarItem.text = `$(error) ${counts.critical} critical`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    } else if (counts.warning > 0) {
      this.statusBarItem.text = `$(warning) ${counts.warning} warnings`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      this.statusBarItem.text = `$(info) ${counts.info} info`;
      this.statusBarItem.backgroundColor = undefined;
    }

    const total = patterns.length;
    this.statusBarItem.tooltip =
      `CodeGateway: ${total} pattern${total !== 1 ? 's' : ''} detected\n` +
      `Critical: ${counts.critical}\n` +
      `Warning: ${counts.warning}\n` +
      `Info: ${counts.info}\n\n` +
      'Click to open dashboard';
  }

  /**
   * Reset to default state
   */
  reset(): void {
    this.statusBarItem.text = '$(check) CodeGateway';
    this.statusBarItem.backgroundColor = undefined;
  }

  /**
   * Show analyzing indicator
   */
  showAnalyzing(): void {
    this.statusBarItem.text = '$(sync~spin) CodeGateway';
  }

  /**
   * Dispose of the status bar item
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }
}
