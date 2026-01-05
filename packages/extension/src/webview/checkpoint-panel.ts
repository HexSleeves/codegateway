import type {
  CheckpointStatus,
  ComprehensionCheckpoint,
  DetectedPattern,
} from '@codegateway/shared';
import * as vscode from 'vscode';

/**
 * Manages the checkpoint webview panel
 */
export class CheckpointPanel {
  public static currentPanel: CheckpointPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private checkpoint: ComprehensionCheckpoint | null = null;
  private resolvePromise: ((result: CheckpointResult) => void) | null = null;

  public static readonly viewType = 'codegateway.checkpoint';

  private constructor(panel: vscode.WebviewPanel, _extensionUri: vscode.Uri) {
    this.panel = panel;

    // Set up message handler
    this.panel.webview.onDidReceiveMessage(
      (message) => this.handleMessage(message),
      null,
      this.disposables,
    );

    // Handle panel disposal
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  /**
   * Show or create the checkpoint panel
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    patterns: DetectedPattern[],
    file: string,
  ): Promise<CheckpointResult> {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (CheckpointPanel.currentPanel) {
      CheckpointPanel.currentPanel.panel.reveal(column);
      return CheckpointPanel.currentPanel.showCheckpoint(patterns, file);
    }

    // Otherwise create a new panel
    const panel = vscode.window.createWebviewPanel(
      CheckpointPanel.viewType,
      'CodeGateway Checkpoint',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    CheckpointPanel.currentPanel = new CheckpointPanel(panel, extensionUri);
    return CheckpointPanel.currentPanel.showCheckpoint(patterns, file);
  }

  /**
   * Show a checkpoint for the given patterns
   */
  private showCheckpoint(patterns: DetectedPattern[], file: string): Promise<CheckpointResult> {
    this.checkpoint = {
      id: generateId(),
      type: 'pre_commit',
      patterns,
      file,
      questions: [], // Questions will be generated in Phase 4
      status: 'pending',
    };

    this.updateContent();

    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  /**
   * Handle messages from the webview
   */
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
          skipReason: message.reason,
        });
        this.dispose();
        break;

      case 'cancel':
        this.resolvePromise?.({
          status: 'failed',
        });
        this.dispose();
        break;
    }
  }

  /**
   * Update the webview content
   */
  private updateContent(): void {
    if (!this.checkpoint) return;

    this.panel.webview.html = this.getHtmlContent(this.checkpoint.patterns, this.checkpoint.file);
  }

  /**
   * Generate HTML content for the webview
   */
  private getHtmlContent(patterns: DetectedPattern[], file: string): string {
    const criticalPatterns = patterns.filter((p) => p.severity === 'critical');
    const warningPatterns = patterns.filter((p) => p.severity === 'warning');
    const infoPatterns = patterns.filter((p) => p.severity === 'info');

    const patternsList = patterns
      .map(
        (p, i) => `
      <div class="pattern ${p.severity}">
        <div class="pattern-header">
          <span class="severity-badge ${p.severity}">${getSeverityIcon(p.severity)} ${p.severity.toUpperCase()}</span>
          <span class="pattern-type">${formatPatternType(p.type)}</span>
        </div>
        <div class="pattern-location">Line ${p.startLine}</div>
        <div class="pattern-description">${escapeHtml(p.description)}</div>
        <pre class="code-snippet"><code>${escapeHtml(p.codeSnippet)}</code></pre>
        <div class="pattern-explanation">${escapeHtml(p.explanation)}</div>
        ${p.suggestion ? `<div class="pattern-suggestion"><strong>Suggestion:</strong> ${escapeHtml(p.suggestion)}</div>` : ''}
        <label class="acknowledge-checkbox">
          <input type="checkbox" name="acknowledge" value="${i}" ${p.severity !== 'critical' ? 'checked' : ''}>
          I understand this issue
        </label>
      </div>
    `,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeGateway Checkpoint</title>
  <style>
    :root {
      --vscode-font-family: var(--vscode-editor-font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
      --critical-color: #f14c4c;
      --warning-color: #cca700;
      --info-color: #3794ff;
    }
    
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    
    h1 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 5px;
    }
    
    .subtitle {
      color: var(--vscode-descriptionForeground);
      margin-bottom: 20px;
    }
    
    .summary {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      padding: 15px;
      background: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 6px;
    }
    
    .summary-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .summary-count {
      font-size: 24px;
      font-weight: bold;
    }
    
    .summary-count.critical { color: var(--critical-color); }
    .summary-count.warning { color: var(--warning-color); }
    .summary-count.info { color: var(--info-color); }
    
    .pattern {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 15px;
      background: var(--vscode-editor-background);
    }
    
    .pattern.critical {
      border-left: 4px solid var(--critical-color);
    }
    
    .pattern.warning {
      border-left: 4px solid var(--warning-color);
    }
    
    .pattern.info {
      border-left: 4px solid var(--info-color);
    }
    
    .pattern-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    
    .severity-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    
    .severity-badge.critical {
      background: var(--critical-color);
      color: white;
    }
    
    .severity-badge.warning {
      background: var(--warning-color);
      color: black;
    }
    
    .severity-badge.info {
      background: var(--info-color);
      color: white;
    }
    
    .pattern-type {
      font-weight: 500;
    }
    
    .pattern-location {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }
    
    .pattern-description {
      margin-bottom: 10px;
    }
    
    .code-snippet {
      background: var(--vscode-textCodeBlock-background);
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
      font-family: var(--vscode-editor-font-family);
      font-size: 13px;
      margin: 10px 0;
    }
    
    .pattern-explanation {
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
      margin-bottom: 10px;
    }
    
    .pattern-suggestion {
      background: var(--vscode-inputValidation-infoBackground);
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 13px;
      margin-bottom: 10px;
    }
    
    .acknowledge-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 13px;
    }
    
    .actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--vscode-panel-border);
    }
    
    button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-family: var(--vscode-font-family);
    }
    
    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    
    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
    }
    
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    
    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    
    .btn-danger {
      background: var(--critical-color);
      color: white;
    }
    
    .skip-reason {
      margin-top: 10px;
      display: none;
    }
    
    .skip-reason.show {
      display: block;
    }
    
    .skip-reason textarea {
      width: 100%;
      min-height: 60px;
      padding: 8px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
      font-family: var(--vscode-font-family);
      resize: vertical;
    }
  </style>
</head>
<body>
  <h1>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    CodeGateway Checkpoint
  </h1>
  <p class="subtitle">Review detected patterns before committing: <strong>${escapeHtml(file)}</strong></p>
  
  <div class="summary">
    <div class="summary-item">
      <span class="summary-count critical">${criticalPatterns.length}</span>
      <span>Critical</span>
    </div>
    <div class="summary-item">
      <span class="summary-count warning">${warningPatterns.length}</span>
      <span>Warnings</span>
    </div>
    <div class="summary-item">
      <span class="summary-count info">${infoPatterns.length}</span>
      <span>Info</span>
    </div>
  </div>
  
  <div class="patterns-list">
    ${patternsList}
  </div>
  
  <div class="actions">
    <button class="btn-primary" id="proceed-btn" ${criticalPatterns.length > 0 ? 'disabled' : ''}>
      ${criticalPatterns.length > 0 ? 'Acknowledge all critical issues to proceed' : 'Proceed with commit'}
    </button>
    <button class="btn-secondary" id="skip-btn">Skip checkpoint</button>
    <button class="btn-danger" id="cancel-btn">Cancel commit</button>
  </div>
  
  <div class="skip-reason" id="skip-reason">
    <p>Why are you skipping this checkpoint? (optional)</p>
    <textarea id="skip-reason-text" placeholder="e.g., False positive, will fix later, etc."></textarea>
    <button class="btn-secondary" id="confirm-skip-btn" style="margin-top: 10px;">Confirm skip</button>
  </div>
  
  <script>
    const vscode = acquireVsCodeApi();
    
    const proceedBtn = document.getElementById('proceed-btn');
    const skipBtn = document.getElementById('skip-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const skipReasonDiv = document.getElementById('skip-reason');
    const skipReasonText = document.getElementById('skip-reason-text');
    const confirmSkipBtn = document.getElementById('confirm-skip-btn');
    
    // Track acknowledged patterns
    const checkboxes = document.querySelectorAll('input[name="acknowledge"]');
    const criticalCount = ${criticalPatterns.length};
    
    function updateProceedButton() {
      const criticalChecked = Array.from(checkboxes)
        .filter((cb, i) => i < criticalCount)
        .every(cb => cb.checked);
      
      proceedBtn.disabled = !criticalChecked;
      proceedBtn.textContent = criticalChecked 
        ? 'Proceed with commit' 
        : 'Acknowledge all critical issues to proceed';
    }
    
    checkboxes.forEach(cb => {
      cb.addEventListener('change', updateProceedButton);
    });
    
    proceedBtn.addEventListener('click', () => {
      const acknowledged = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => parseInt(cb.value));
      
      vscode.postMessage({ type: 'proceed', acknowledged });
    });
    
    skipBtn.addEventListener('click', () => {
      skipReasonDiv.classList.toggle('show');
    });
    
    confirmSkipBtn.addEventListener('click', () => {
      vscode.postMessage({ 
        type: 'skip', 
        reason: skipReasonText.value || undefined 
      });
    });
    
    cancelBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'cancel' });
    });
  </script>
</body>
</html>`;
  }

  /**
   * Dispose of the panel
   */
  public dispose(): void {
    CheckpointPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}

// Helper types and functions

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

function generateId(): string {
  return `ckpt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'warning':
      return '🟡';
    case 'info':
      return '🔵';
    default:
      return '⭕';
  }
}

function formatPatternType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
