import type { DetectedPattern, Severity } from '@codegateway/shared';
import * as vscode from 'vscode';

/**
 * Manages inline decorations for detected patterns
 */
export class DecorationManager {
  private readonly decorationTypes: Map<Severity, vscode.TextEditorDecorationType> = new Map();
  private readonly activeDecorations: Map<string, vscode.Range[]> = new Map();

  constructor() {
    this.initializeDecorationTypes();
  }

  private initializeDecorationTypes(): void {
    // Critical severity - red underline with icon
    this.decorationTypes.set(
      'critical',
      vscode.window.createTextEditorDecorationType({
        textDecoration: 'underline wavy #f44336',
        overviewRulerColor: '#f44336',
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        gutterIconPath: this.getIconPath('error'),
        gutterIconSize: 'contain',
      }),
    );

    // Warning severity - yellow underline
    this.decorationTypes.set(
      'warning',
      vscode.window.createTextEditorDecorationType({
        textDecoration: 'underline wavy #ff9800',
        overviewRulerColor: '#ff9800',
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        gutterIconPath: this.getIconPath('warning'),
        gutterIconSize: 'contain',
      }),
    );

    // Info severity - blue underline
    this.decorationTypes.set(
      'info',
      vscode.window.createTextEditorDecorationType({
        textDecoration: 'underline dotted #2196f3',
        overviewRulerColor: '#2196f3',
        overviewRulerLane: vscode.OverviewRulerLane.Right,
      }),
    );
  }

  /**
   * Apply decorations to an editor based on patterns
   */
  applyDecorations(editor: vscode.TextEditor, patterns: DetectedPattern[]): void {
    const fileUri = editor.document.uri.toString();

    // Group patterns by severity
    const bySeverity: Record<Severity, vscode.Range[]> = {
      critical: [],
      warning: [],
      info: [],
    };

    patterns.forEach((pattern) => {
      const range = this.getPatternRange(editor, pattern);
      if (range) {
        bySeverity[pattern.severity].push(range);
      }
    });

    // Apply decorations
    for (const [severity, ranges] of Object.entries(bySeverity) as [Severity, vscode.Range[]][]) {
      const decorationType = this.decorationTypes.get(severity);
      if (decorationType) {
        editor.setDecorations(decorationType, ranges);
      }
    }

    // Store active decorations for cleanup
    this.activeDecorations.set(fileUri, [
      ...bySeverity.critical,
      ...bySeverity.warning,
      ...bySeverity.info,
    ]);
  }

  /**
   * Clear decorations from an editor
   */
  clearDecorations(editor: vscode.TextEditor): void {
    const fileUri = editor.document.uri.toString();
    this.activeDecorations.delete(fileUri);

    for (const decorationType of this.decorationTypes.values()) {
      editor.setDecorations(decorationType, []);
    }
  }

  /**
   * Dispose of all decoration types
   */
  dispose(): void {
    for (const decorationType of this.decorationTypes.values()) {
      decorationType.dispose();
    }
    this.decorationTypes.clear();
    this.activeDecorations.clear();
  }

  private getIconPath(_type: 'error' | 'warning'): string {
    // Use VS Code's built-in icons via ThemeIcon (not actual file paths)
    // For gutter icons, we'd need to bundle actual icon files
    // For now, we'll skip gutter icons and rely on underlines
    return '';
  }

  /**
   * Get the range for a pattern, handling missing column info
   */
  private getPatternRange(
    editor: vscode.TextEditor,
    pattern: DetectedPattern,
  ): vscode.Range | null {
    const lineIndex = pattern.startLine - 1;

    // Validate line index
    if (lineIndex < 0 || lineIndex >= editor.document.lineCount) {
      return null;
    }

    const line = editor.document.lineAt(lineIndex);

    // If we have explicit column info, use it
    if (pattern.startColumn !== undefined && pattern.endColumn !== undefined) {
      return new vscode.Range(
        new vscode.Position(lineIndex, pattern.startColumn),
        new vscode.Position(pattern.endLine - 1, pattern.endColumn),
      );
    }

    // Try to find the code snippet in the line to get precise positioning
    if (pattern.codeSnippet !== undefined && pattern.codeSnippet !== null) {
      // Get first line of snippet (in case it's multiline)
      const snippetFirstLine = pattern.codeSnippet.split('\n')[0]!.trim();
      const lineText = line.text;

      // Try to find the snippet in the line
      const snippetIndex = lineText.indexOf(snippetFirstLine);
      if (snippetIndex !== -1) {
        return new vscode.Range(
          new vscode.Position(lineIndex, snippetIndex),
          new vscode.Position(lineIndex, snippetIndex + snippetFirstLine.length),
        );
      }
    }

    // Fallback: use the non-whitespace portion of the line
    const firstNonWhitespace = line.firstNonWhitespaceCharacterIndex;
    const lastNonWhitespace = line.text.trimEnd().length;

    return new vscode.Range(
      new vscode.Position(lineIndex, firstNonWhitespace),
      new vscode.Position(pattern.endLine - 1, lastNonWhitespace),
    );
  }
}
