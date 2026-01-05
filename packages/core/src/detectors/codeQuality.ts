import type { DetectedPattern, PatternType, SupportedLanguage } from '@codegateway/shared';
import { type Node, Project, type SourceFile, SyntaxKind } from 'ts-morph';
import { BaseDetector } from './base.js';

/**
 * Detects code quality issues
 */
export class CodeQualityDetector extends BaseDetector {
  readonly id = 'code_quality';
  readonly patterns: PatternType[] = [
    'magic_number',
    'todo_without_context',
    'commented_out_code',
    'overly_complex_function',
    'placeholder_implementation',
  ];
  readonly languages: SupportedLanguage[] = ['typescript', 'javascript'];

  private project: Project;

  constructor() {
    super();
    this.project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        allowJs: true,
        checkJs: false,
      },
    });
  }

  async analyze(content: string, filePath: string): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    const sourceFile = this.project.createSourceFile(filePath, content, { overwrite: true });

    try {
      patterns.push(...this.detectMagicNumbers(sourceFile, filePath));
      patterns.push(...this.detectTodoWithoutContext(sourceFile, filePath, content));
      patterns.push(...this.detectCommentedOutCode(filePath, content));
      patterns.push(...this.detectComplexFunctions(sourceFile, filePath));
      patterns.push(...this.detectPlaceholderImplementations(sourceFile, filePath));
    } finally {
      this.project.removeSourceFile(sourceFile);
    }

    return patterns;
  }

  private detectMagicNumbers(sourceFile: SourceFile, filePath: string): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Acceptable magic numbers
    const acceptableNumbers = new Set([0, 1, 2, -1, 100, 1000, 60, 24, 365]);

    sourceFile.getDescendantsOfKind(SyntaxKind.NumericLiteral).forEach((literal) => {
      const value = literal.getLiteralValue();

      // Skip acceptable numbers
      if (acceptableNumbers.has(value)) return;

      // Skip if it's in an obvious context
      const parent = literal.getParent();

      // Skip array indices
      if (parent?.getKind() === SyntaxKind.ElementAccessExpression) return;

      // Skip if it's a const declaration (likely intentional)
      const varDecl = literal.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
      if (varDecl) {
        const statement = varDecl.getFirstAncestorByKind(SyntaxKind.VariableStatement);
        if (statement?.getDeclarationKind() === 'const') {
          // This is a const, so it's likely named - check if it's a meaningful name
          const name = varDecl.getName();
          if (name.length > 3 || /[A-Z_]/.test(name)) return;
        }
      }

      // Skip if in a switch case
      if (literal.getFirstAncestorByKind(SyntaxKind.CaseClause)) return;

      // Skip if part of an object literal key
      if (parent?.getKind() === SyntaxKind.PropertyAssignment) return;

      // Check if it looks like a "magic" number
      const isMagic =
        (value > 2 && value < 100 && !Number.isInteger(Math.log10(value))) || // Non-round numbers
        (value >= 100 && value !== 100 && value !== 1000 && value !== 10000); // Large non-round numbers

      if (isMagic) {
        patterns.push(
          this.createPattern(
            'magic_number',
            filePath,
            literal.getStartLineNumber(),
            literal.getEndLineNumber(),
            `Magic number ${value} without explanation`,
            'Magic numbers make code harder to understand and maintain. ' +
              'Consider extracting to a named constant that explains its purpose.',
            literal.getParent()?.getText() ?? literal.getText(),
            {
              severity: 'info',
              suggestion: `const DESCRIPTIVE_NAME = ${value}; // Add explanation here`,
              confidence: 0.6,
            },
          ),
        );
      }
    });

    return patterns;
  }

  private detectTodoWithoutContext(
    _sourceFile: SourceFile,
    filePath: string,
    content: string,
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const lines = content.split('\n');

    const todoPattern = /\b(TODO|FIXME|XXX|HACK|BUG)\b:?\s*(.*)/i;

    lines.forEach((line, index) => {
      const match = todoPattern.exec(line);
      if (match) {
        const todoType = match[1]?.toUpperCase();
        const context = match[2]?.trim();

        // Check if TODO has meaningful context
        const hasContext =
          context &&
          context.length > 10 &&
          !/^\s*(fix|do|implement|add|remove|update|change|handle|check)\s*(this|it|later)?\s*$/i.test(
            context,
          );

        if (!hasContext) {
          patterns.push(
            this.createPattern(
              'todo_without_context',
              filePath,
              index + 1,
              index + 1,
              `${todoType} comment lacks sufficient context`,
              'TODO comments should explain what needs to be done and why. ' +
                'Include enough detail that you (or someone else) can act on it later.',
              line.trim(),
              {
                severity: 'info',
                suggestion: `${todoType}: [What needs to be done] - [Why] - [Any relevant context or links]`,
                confidence: 0.7,
              },
            ),
          );
        }
      }
    });

    return patterns;
  }

  private detectCommentedOutCode(filePath: string, content: string): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const lines = content.split('\n');

    let consecutiveCommentedCode = 0;
    let startLine = 0;
    const commentedLines: string[] = [];

    // Patterns that indicate code (not regular comments)
    const codePatterns = [
      /^\s*\/\/\s*(const|let|var|function|class|if|for|while|return|import|export)\s/,
      /^\s*\/\/\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*[=([{]/,
      /^\s*\/\/\s*[)}\]];?$/,
      /^\s*\/\/\s*\.[a-zA-Z]+\(/,
      /^\s*\/\/\s*(await|async)\s/,
    ];

    const flushCommentedCode = (endLine: number) => {
      if (consecutiveCommentedCode >= 3) {
        patterns.push(
          this.createPattern(
            'commented_out_code',
            filePath,
            startLine,
            endLine,
            `${consecutiveCommentedCode} lines of commented-out code`,
            'Large blocks of commented-out code clutter the codebase and create confusion. ' +
              "If the code is no longer needed, delete it - it's preserved in version control.",
            commentedLines.slice(0, 3).join('\n') + (commentedLines.length > 3 ? '\n// ...' : ''),
            {
              severity: 'info',
              suggestion: 'Delete commented-out code - use version control to recover it if needed',
              confidence: 0.65,
            },
          ),
        );
      }
      consecutiveCommentedCode = 0;
      commentedLines.length = 0;
    };

    lines.forEach((line, index) => {
      const isCommentedCode = codePatterns.some((p) => p.test(line));

      if (isCommentedCode) {
        if (consecutiveCommentedCode === 0) {
          startLine = index + 1;
        }
        consecutiveCommentedCode++;
        commentedLines.push(line.trim());
      } else {
        flushCommentedCode(index);
      }
    });

    flushCommentedCode(lines.length);

    return patterns;
  }

  private detectComplexFunctions(sourceFile: SourceFile, filePath: string): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const complexityThreshold = 10;

    const functions = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.MethodDeclaration),
    ];

    functions.forEach((func) => {
      const complexity = this.calculateCyclomaticComplexity(func);

      if (complexity > complexityThreshold) {
        const name = this.getFunctionName(func);

        patterns.push(
          this.createPattern(
            'overly_complex_function',
            filePath,
            func.getStartLineNumber(),
            func.getEndLineNumber(),
            `Function${name ? ` "${name}"` : ''} has cyclomatic complexity of ${complexity}`,
            `High complexity (>${complexityThreshold}) makes code harder to understand, test, and maintain. ` +
              'Consider breaking it into smaller functions.',
            this.truncateCode(func.getText(), 200),
            {
              severity: complexity > 20 ? 'critical' : 'warning',
              suggestion: 'Extract logical branches into separate functions with descriptive names',
              confidence: 0.85,
            },
          ),
        );
      }
    });

    return patterns;
  }

  private detectPlaceholderImplementations(
    sourceFile: SourceFile,
    filePath: string,
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    const functions = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.MethodDeclaration),
    ];

    functions.forEach((func) => {
      const body = func.getBody();
      if (!body) return;

      const bodyText = body.getText();

      // Check for throw not implemented
      if (/throw\s+new\s+Error\s*\(\s*['"]not\s*implemented/i.test(bodyText)) {
        patterns.push(
          this.createPattern(
            'placeholder_implementation',
            filePath,
            func.getStartLineNumber(),
            func.getEndLineNumber(),
            'Function throws "not implemented" - placeholder code',
            'This function has a placeholder implementation that will fail at runtime. ' +
              "Complete the implementation or remove it if it's not needed.",
            this.truncateCode(func.getText(), 200),
            {
              severity: 'critical',
              suggestion: 'Implement the function or remove it',
              confidence: 0.95,
            },
          ),
        );
        return;
      }

      // Check for TODO in body
      if (/\/\/\s*TODO\s*:?\s*(implement|add|fix|complete)/i.test(bodyText)) {
        patterns.push(
          this.createPattern(
            'placeholder_implementation',
            filePath,
            func.getStartLineNumber(),
            func.getEndLineNumber(),
            'Function has TODO indicating incomplete implementation',
            'This function contains a TODO suggesting it needs more work. ' +
              'Review and complete before committing.',
            this.truncateCode(func.getText(), 200),
            {
              severity: 'warning',
              suggestion: 'Complete the TODO or add a detailed explanation of what remains',
              confidence: 0.75,
            },
          ),
        );
      }

      // Check for empty body (just a block with nothing or just comments)
      if (body.getKind() === SyntaxKind.Block) {
        const block = body.asKind(SyntaxKind.Block);
        if (block) {
          const statements = block.getStatements();
          const hasCode = statements.some((s) => {
            const text = s.getText().trim();
            return !text.startsWith('//') && !text.startsWith('/*');
          });

          if (!hasCode && statements.length === 0) {
            const name = this.getFunctionName(func);
            // Skip empty arrow functions that might be intentional (e.g., noop callbacks)
            if (func.getKind() === SyntaxKind.ArrowFunction) {
              const parent = func.getParent();
              if (
                parent?.getKind() === SyntaxKind.CallExpression ||
                parent?.getKind() === SyntaxKind.PropertyAssignment
              ) {
                return; // Likely intentional noop
              }
            }

            patterns.push(
              this.createPattern(
                'placeholder_implementation',
                filePath,
                func.getStartLineNumber(),
                func.getEndLineNumber(),
                `Function${name ? ` "${name}"` : ''} has empty body`,
                'This function does nothing. Either implement it or remove it.',
                func.getText(),
                {
                  severity: 'warning',
                  suggestion: 'Add implementation or remove the function',
                  confidence: 0.8,
                },
              ),
            );
          }
        }
      }
    });

    return patterns;
  }

  private calculateCyclomaticComplexity(node: Node): number {
    let complexity = 1; // Base complexity

    // Count decision points
    const countNode = (n: Node) => {
      switch (n.getKind()) {
        case SyntaxKind.IfStatement:
        case SyntaxKind.ConditionalExpression: // ternary
        case SyntaxKind.ForStatement:
        case SyntaxKind.ForInStatement:
        case SyntaxKind.ForOfStatement:
        case SyntaxKind.WhileStatement:
        case SyntaxKind.DoStatement:
        case SyntaxKind.CaseClause:
        case SyntaxKind.CatchClause:
          complexity++;
          break;
        case SyntaxKind.BinaryExpression: {
          const binary = n.asKind(SyntaxKind.BinaryExpression);
          const op = binary?.getOperatorToken().getKind();
          if (op === SyntaxKind.AmpersandAmpersandToken || op === SyntaxKind.BarBarToken) {
            complexity++;
          }
          break;
        }
      }
    };

    node.forEachDescendant(countNode);

    return complexity;
  }

  private getFunctionName(func: Node): string | undefined {
    if (func.isKind(SyntaxKind.FunctionDeclaration)) {
      return func.asKind(SyntaxKind.FunctionDeclaration)?.getName();
    }
    if (func.isKind(SyntaxKind.MethodDeclaration)) {
      return func.asKind(SyntaxKind.MethodDeclaration)?.getName();
    }
    const varDecl = func.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
    if (varDecl) {
      return varDecl.getName();
    }
    return undefined;
  }

  private truncateCode(code: string, maxLength: number): string {
    if (code.length <= maxLength) return code;
    return `${code.slice(0, maxLength - 3)}...`;
  }
}
