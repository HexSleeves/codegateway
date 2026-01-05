import type {
  DetectedPattern,
  DetectorSettings,
  PatternType,
  SupportedLanguage,
} from '@codegateway/shared';
import {
  DEFAULT_COORDINATE_VARIABLE_NAMES,
  DEFAULT_GENERIC_VARIABLE_NAMES,
  DEFAULT_LOOP_VARIABLE_NAMES,
} from '@codegateway/shared';
import { type Node, Project, type SourceFile, SyntaxKind } from 'ts-morph';
import { BaseDetector } from './base.js';

/**
 * Detects generic variable names that may indicate AI-generated code
 */
export class NamingPatternDetector extends BaseDetector {
  readonly id = 'naming';
  readonly patterns: PatternType[] = ['generic_variable_name', 'inconsistent_naming'];
  readonly languages: SupportedLanguage[] = ['typescript', 'javascript'];

  private readonly project: Project;

  // Cached sets that may be modified by settings
  private genericVariableNames!: Set<string>;
  private loopVariableNames!: Set<string>;
  private coordinateVariableNames!: Set<string>;

  constructor() {
    super();
    this.project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        allowJs: true,
        checkJs: false,
      },
    });
    // Initialize with defaults
    this.initializeSets();
  }

  private initializeSets(settings?: DetectorSettings): void {
    // Build sets from defaults + user settings
    this.genericVariableNames = new Set([
      ...DEFAULT_GENERIC_VARIABLE_NAMES,
      ...(settings?.genericVariableNames?.map((s) => s.toLowerCase()) ?? []),
    ]);

    this.loopVariableNames = new Set([
      ...DEFAULT_LOOP_VARIABLE_NAMES,
      ...(settings?.loopVariableNames ?? []),
    ]);

    this.coordinateVariableNames = new Set([
      ...DEFAULT_COORDINATE_VARIABLE_NAMES,
      ...(settings?.coordinateVariableNames ?? []),
    ]);
  }

  async analyze(
    content: string,
    filePath: string,
    settings?: DetectorSettings,
  ): Promise<DetectedPattern[]> {
    // Update sets based on settings
    this.initializeSets(settings);

    const patterns: DetectedPattern[] = [];

    // Create a source file from the content
    const sourceFile = this.project.createSourceFile(filePath, content, {
      overwrite: true,
    });

    try {
      // Check variable declarations
      patterns.push(
        ...this.analyzeVariableDeclarations(sourceFile, filePath),
        ...this.analyzeFunctionParameters(sourceFile, filePath),
        ...this.analyzeNamingConsistency(sourceFile, filePath),
      );
    } finally {
      // Clean up
      this.project.removeSourceFile(sourceFile);
    }

    return patterns;
  }

  private analyzeVariableDeclarations(sourceFile: SourceFile, filePath: string): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach((decl) => {
      const name = decl.getName();

      if (!this.isGenericName(name)) return;
      if (this.isAcceptableContext(decl, name)) return;

      const initializer = decl.getInitializer();
      const initializerText = initializer?.getText()?.slice(0, 50);

      patterns.push(
        this.createPattern(
          'generic_variable_name',
          filePath,
          decl.getStartLineNumber(),
          decl.getEndLineNumber(),
          `Variable "${name}" is a generic name`,
          `Consider renaming to describe what "${name}" contains. ` +
            (initializerText ? `It's assigned: ${initializerText}...` : ''),
          decl.getText(),
          {
            severity: 'warning',
            suggestion: this.suggestBetterName(name, decl),
            confidence: 0.85,
          },
        ),
      );
    });

    return patterns;
  }

  private analyzeFunctionParameters(sourceFile: SourceFile, filePath: string): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    sourceFile.getDescendantsOfKind(SyntaxKind.Parameter).forEach((param) => {
      const name = param.getName();

      if (!this.isGenericName(name)) return;
      if (this.isAcceptableContext(param, name)) return;

      // Get parent function for context
      const parentFunc =
        param.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) ??
        param.getFirstAncestorByKind(SyntaxKind.ArrowFunction) ??
        param.getFirstAncestorByKind(SyntaxKind.MethodDeclaration);

      const funcName = parentFunc?.getSymbol()?.getName() ?? 'anonymous function';

      patterns.push(
        this.createPattern(
          'generic_variable_name',
          filePath,
          param.getStartLineNumber(),
          param.getEndLineNumber(),
          `Parameter "${name}" in ${funcName} is a generic name`,
          `Consider a more descriptive name that indicates the parameter's purpose`,
          param.getText(),
          {
            severity: 'warning',
            confidence: 0.8,
          },
        ),
      );
    });

    return patterns;
  }

  private analyzeNamingConsistency(sourceFile: SourceFile, filePath: string): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Collect all identifiers and their naming conventions
    const identifiers: { name: string; convention: string; line: number }[] = [];

    sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach((decl) => {
      const name = decl.getName();
      identifiers.push({
        name,
        convention: this.detectNamingConvention(name),
        line: decl.getStartLineNumber(),
      });
    });

    // Check for mixed conventions in the same file
    const conventions = new Set(identifiers.map((i) => i.convention));
    conventions.delete('unknown');

    if (conventions.size > 1) {
      // Find the minority convention
      const conventionCounts = new Map<string, number>();
      identifiers.forEach((i) => {
        if (i.convention !== 'unknown') {
          conventionCounts.set(i.convention, (conventionCounts.get(i.convention) ?? 0) + 1);
        }
      });

      // Find the dominant convention
      let dominantConvention = '';
      let maxCount = 0;
      conventionCounts.forEach((count, conv) => {
        if (count > maxCount) {
          maxCount = count;
          dominantConvention = conv;
        }
      });

      // Flag identifiers that don't match the dominant convention
      identifiers
        .filter((i) => i.convention !== 'unknown' && i.convention !== dominantConvention)
        .forEach((i) => {
          patterns.push(
            this.createPattern(
              'inconsistent_naming',
              filePath,
              i.line,
              i.line,
              `Variable "${i.name}" uses ${i.convention} but file predominantly uses ${dominantConvention}`,
              `Consistent naming conventions improve code readability. Consider renaming to match the ${dominantConvention} convention used elsewhere.`,
              i.name,
              {
                severity: 'info',
                confidence: 0.7,
              },
            ),
          );
        });
    }

    return patterns;
  }

  private isGenericName(name: string): boolean {
    return (
      this.genericVariableNames.has(name.toLowerCase()) ||
      (name.length === 1 &&
        !this.loopVariableNames.has(name) &&
        !this.coordinateVariableNames.has(name))
    );
  }

  private isAcceptableContext(node: Node, name: string): boolean {
    // Loop variables in for loops
    if (this.loopVariableNames.has(name)) {
      const forStatement = node.getFirstAncestorByKind(SyntaxKind.ForStatement);
      const forOfStatement = node.getFirstAncestorByKind(SyntaxKind.ForOfStatement);
      const forInStatement = node.getFirstAncestorByKind(SyntaxKind.ForInStatement);
      if (forStatement ?? forOfStatement ?? forInStatement) return true;
    }

    // Coordinate variables
    if (this.coordinateVariableNames.has(name)) {
      return true; // Allow x, y, z without context check for now
    }

    // Catch clause variables
    const catchClause = node.getFirstAncestorByKind(SyntaxKind.CatchClause);
    if (catchClause && ['e', 'err', 'error'].includes(name.toLowerCase())) {
      return true;
    }

    // Array destructuring with common names
    const arrayBinding = node.getFirstAncestorByKind(SyntaxKind.ArrayBindingPattern);
    if (arrayBinding && name.length === 1) {
      return true;
    }

    // Callback parameters like .map(item => ...)
    const arrowFunc = node.getFirstAncestorByKind(SyntaxKind.ArrowFunction);
    if (arrowFunc) {
      const callExpr = arrowFunc.getFirstAncestorByKind(SyntaxKind.CallExpression);
      if (callExpr) {
        const methodName = callExpr
          .getFirstDescendantByKind(SyntaxKind.PropertyAccessExpression)
          ?.getName();
        if (
          ['map', 'filter', 'forEach', 'reduce', 'find', 'some', 'every'].includes(methodName ?? '')
        ) {
          return true;
        }
      }
    }

    return false;
  }

  private detectNamingConvention(name: string): string {
    if (name.includes('_') && name === name.toLowerCase()) {
      return 'snake_case';
    }
    if (name.includes('_') && name === name.toUpperCase()) {
      return 'SCREAMING_SNAKE_CASE';
    }
    if (/^[a-z][a-zA-Z0-9]*$/.test(name) && name !== name.toLowerCase()) {
      return 'camelCase';
    }
    if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      return 'PascalCase';
    }
    return 'unknown';
  }

  private suggestBetterName(name: string, node: Node): string {
    // Try to infer a better name from context
    const varDecl = node.asKind(SyntaxKind.VariableDeclaration);
    if (varDecl) {
      const initializer = varDecl.getInitializer();
      if (initializer) {
        // If it's a function call, suggest based on function name
        const callExpr = initializer.asKind(SyntaxKind.CallExpression);
        if (callExpr) {
          const funcName = callExpr.getExpression().getText();
          if (funcName.startsWith('get')) {
            return `Consider: ${funcName.replace('get', '').toLowerCase()} or ${funcName}Result`;
          }
          if (funcName.startsWith('fetch')) {
            return `Consider: ${funcName.replace('fetch', '').toLowerCase()} or ${funcName}Response`;
          }
          return `Consider naming based on what ${funcName}() returns`;
        }

        // If it's an await expression
        const awaitExpr = initializer.asKind(SyntaxKind.AwaitExpression);
        if (awaitExpr) {
          const inner = awaitExpr.getExpression();
          const innerCall = inner.asKind(SyntaxKind.CallExpression);
          if (innerCall) {
            const funcName = innerCall.getExpression().getText();
            return `Consider naming based on the async operation: ${funcName}`;
          }
        }
      }
    }

    return `Consider a name that describes the purpose or content of this ${name}`;
  }
}
