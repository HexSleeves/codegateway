import type { DetectedPattern, Severity } from '@codegateway/shared';
import * as vscode from 'vscode';

/**
 * Manages VS Code diagnostics (Problems panel) for CodeGateway
 */
export class DiagnosticsManager {
  private readonly diagnosticCollection: vscode.DiagnosticCollection;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('codegateway');
  }

  /**
   * Update diagnostics for a file based on detected patterns
   */
  updateDiagnostics(uri: vscode.Uri, patterns: DetectedPattern[]): void {
    const diagnostics: vscode.Diagnostic[] = patterns.map((pattern) => {
      const range = new vscode.Range(
        new vscode.Position(pattern.startLine - 1, pattern.startColumn ?? 0),
        new vscode.Position(pattern.endLine - 1, pattern.endColumn ?? Number.MAX_SAFE_INTEGER),
      );

      const diagnostic = new vscode.Diagnostic(
        range,
        `${pattern.description}\n\n${pattern.explanation}`,
        this.severityToDiagnosticSeverity(pattern.severity),
      );

      diagnostic.source = 'CodeGateway';
      diagnostic.code = pattern.type;

      // Add related information if there's a suggestion
      if (pattern.suggestion) {
        diagnostic.relatedInformation = [
          new vscode.DiagnosticRelatedInformation(
            new vscode.Location(uri, range),
            `Suggestion: ${pattern.suggestion}`,
          ),
        ];
      }

      return diagnostic;
    });

    this.diagnosticCollection.set(uri, diagnostics);
  }

  /**
   * Clear diagnostics for a specific file
   */
  clearDiagnostics(uri: vscode.Uri): void {
    this.diagnosticCollection.delete(uri);
  }

  /**
   * Clear all diagnostics
   */
  clearAll(): void {
    this.diagnosticCollection.clear();
  }

  /**
   * Dispose of the diagnostic collection
   */
  dispose(): void {
    this.diagnosticCollection.dispose();
  }

  private severityToDiagnosticSeverity(severity: Severity): vscode.DiagnosticSeverity {
    switch (severity) {
      case 'critical':
        return vscode.DiagnosticSeverity.Error;
      case 'warning':
        return vscode.DiagnosticSeverity.Warning;
      default:
        return vscode.DiagnosticSeverity.Information;
    }
  }
}
