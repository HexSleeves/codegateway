import type { DetectedPattern, PatternType, SupportedLanguage } from '@codegateway/shared';
import { GENERIC_ERROR_MESSAGES } from '@codegateway/shared';
import { type Block, type Node, Project, type SourceFile, SyntaxKind } from 'ts-morph';
import { BaseDetector } from './base.js';

/**
 * Detects error handling issues that may indicate AI-generated code
 */
export class ErrorHandlingDetector extends BaseDetector {
  readonly id = 'error_handling';
  readonly patterns: PatternType[] = [
    'empty_catch_block',
    'swallowed_error',
    'missing_error_boundary',
    'generic_error_message',
    'try_without_catch',
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

    const sourceFile = this.project.createSourceFile(filePath, content, {
      overwrite: true,
    });

    try {
      patterns.push(...this.detectEmptyCatchBlocks(sourceFile, filePath));
      patterns.push(...this.detectSwallowedErrors(sourceFile, filePath));
      patterns.push(...this.detectTryWithoutCatch(sourceFile, filePath));
      patterns.push(...this.detectMissingErrorBoundaries(sourceFile, filePath));
      patterns.push(...this.detectGenericErrorMessages(sourceFile, filePath));
    } finally {
      this.project.removeSourceFile(sourceFile);
    }

    return patterns;
  }

  private detectEmptyCatchBlocks(sourceFile: SourceFile, filePath: string): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    sourceFile.getDescendantsOfKind(SyntaxKind.CatchClause).forEach((catchClause) => {
      const block = catchClause.getBlock();

      if (this.isEffectivelyEmpty(block)) {
        const errorParam = catchClause.getVariableDeclaration()?.getName() ?? 'error';

        patterns.push(
          this.createPattern(
            'empty_catch_block',
            filePath,
            catchClause.getStartLineNumber(),
            catchClause.getEndLineNumber(),
            'Empty catch block silently swallows errors',
            'Empty catch blocks hide errors and make debugging extremely difficult. ' +
              "At minimum, log the error or add a comment explaining why it's intentionally ignored.",
            catchClause.getText(),
            {
              severity: 'critical',
              suggestion: `catch (${errorParam}) {\n  console.error('Operation failed:', ${errorParam});\n  throw ${errorParam}; // or handle appropriately\n}`,
              confidence: 0.95,
              autoFixAvailable: true,
            },
          ),
        );
      }
    });

    return patterns;
  }

  private detectSwallowedErrors(sourceFile: SourceFile, filePath: string): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    sourceFile.getDescendantsOfKind(SyntaxKind.CatchClause).forEach((catchClause) => {
      const block = catchClause.getBlock();
      const errorParam = catchClause.getVariableDeclaration()?.getName();

      // Skip if no error parameter or block is empty (caught by empty_catch_block)
      if (!errorParam || this.isEffectivelyEmpty(block)) {
        return;
      }

      // Check if error is used in the block
      const errorUsages = block
        .getDescendantsOfKind(SyntaxKind.Identifier)
        .filter((id) => id.getText() === errorParam);

      if (errorUsages.length === 0) {
        patterns.push(
          this.createPattern(
            'swallowed_error',
            filePath,
            catchClause.getStartLineNumber(),
            catchClause.getEndLineNumber(),
            `Caught error "${errorParam}" is never used`,
            'The error is caught but never logged, rethrown, or otherwise handled. ' +
              'This can hide important error information.',
            catchClause.getText(),
            {
              severity: 'warning',
              suggestion: `Consider logging the error: console.error('Operation failed:', ${errorParam});`,
              confidence: 0.85,
            },
          ),
        );
      }
    });

    return patterns;
  }

  private detectTryWithoutCatch(sourceFile: SourceFile, filePath: string): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    sourceFile.getDescendantsOfKind(SyntaxKind.TryStatement).forEach((tryStmt) => {
      const catchClause = tryStmt.getCatchClause();
      const finallyBlock = tryStmt.getFinallyBlock();

      // try without catch or finally - syntax error
      if (!catchClause && !finallyBlock) {
        patterns.push(
          this.createPattern(
            'empty_catch_block',
            filePath,
            tryStmt.getStartLineNumber(),
            tryStmt.getEndLineNumber(),
            'try block without catch or finally - syntax error',
            'A try block must have either a catch clause, a finally clause, or both. ' +
              'This code will fail to parse at runtime.',
            this.truncateCode(tryStmt.getText(), 200),
            {
              severity: 'critical',
              suggestion: 'Add a catch clause to handle errors, or a finally clause for cleanup',
              confidence: 1.0,
            },
          ),
        );
        return; // Skip other checks for this try statement
      }

      // try...finally without catch
      if (!catchClause && finallyBlock) {
        const tryBlock = tryStmt.getTryBlock();

        // Check if the try block contains operations that could throw
        const hasAwait = tryBlock.getDescendantsOfKind(SyntaxKind.AwaitExpression).length > 0;
        const hasThrow = tryBlock.getDescendantsOfKind(SyntaxKind.ThrowStatement).length > 0;
        const hasCalls = tryBlock.getDescendantsOfKind(SyntaxKind.CallExpression).length > 0;

        if (hasAwait || hasThrow || hasCalls) {
          patterns.push(
            this.createPattern(
              'try_without_catch',
              filePath,
              tryStmt.getStartLineNumber(),
              tryStmt.getEndLineNumber(),
              'try...finally without catch - errors will propagate',
              'This try block has a finally clause but no catch. Errors will propagate to the caller. ' +
                'This is valid for cleanup patterns, but consider if errors should be handled here.',
              this.truncateCode(tryStmt.getText(), 200),
              {
                severity: 'info',
                suggestion:
                  'Add a catch clause if errors should be handled at this level, or document why propagation is intended',
                confidence: 0.6,
              },
            ),
          );
        }
      }
    });

    return patterns;
  }

  private detectMissingErrorBoundaries(
    sourceFile: SourceFile,
    filePath: string,
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Find async functions
    const asyncFunctions = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration).filter((f) => f.isAsync()),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction).filter((f) => f.isAsync()),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.MethodDeclaration).filter((m) => m.isAsync()),
    ];

    asyncFunctions.forEach((func) => {
      const body = func.getBody();
      if (!body) return;

      // Check if the function body contains any try-catch
      const tryStatements = body.getDescendantsOfKind(SyntaxKind.TryStatement);

      // Get all await expressions in the function
      const awaitExpressions = body.getDescendantsOfKind(SyntaxKind.AwaitExpression);

      if (awaitExpressions.length === 0) return;

      // Check which awaits are unprotected
      const unprotectedAwaits = awaitExpressions.filter((awaitExpr) => {
        // Check if this await is inside a try block
        for (const tryStmt of tryStatements) {
          const tryBlock = tryStmt.getTryBlock();
          if (this.isDescendantOf(awaitExpr, tryBlock)) {
            return false; // Protected
          }
        }
        return true; // Unprotected
      });

      if (unprotectedAwaits.length > 0) {
        const funcName = this.getFunctionName(func);

        patterns.push(
          this.createPattern(
            'missing_error_boundary',
            filePath,
            func.getStartLineNumber(),
            Math.min(func.getEndLineNumber(), func.getStartLineNumber() + 10),
            `Async function${funcName ? ` "${funcName}"` : ''} has unhandled promise rejections`,
            `This async function has ${unprotectedAwaits.length} await expression(s) without error handling. ` +
              'Unhandled rejections can crash your application or cause silent failures.',
            this.truncateCode(func.getText(), 300),
            {
              severity: 'warning',
              suggestion: 'Wrap await calls in try-catch or add .catch() handler',
              confidence: 0.75,
            },
          ),
        );
      }
    });

    return patterns;
  }

  private detectGenericErrorMessages(sourceFile: SourceFile, filePath: string): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Find string literals
    sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral).forEach((literal) => {
      const text = literal.getLiteralText().toLowerCase();

      const isGeneric = GENERIC_ERROR_MESSAGES.some(
        (msg) => text === msg || (text.length < 30 && text.includes(msg)),
      );

      if (!isGeneric) return;

      // Check if it's in an error context
      const isInErrorContext = this.isInErrorContext(literal);

      if (isInErrorContext) {
        patterns.push(
          this.createPattern(
            'generic_error_message',
            filePath,
            literal.getStartLineNumber(),
            literal.getEndLineNumber(),
            'Generic error message provides no debugging context',
            'Error messages should describe what operation failed and why. ' +
              'Generic messages make debugging difficult.',
            literal.getText(),
            {
              severity: 'info',
              suggestion: 'Include operation name, input values, and specific failure reason',
              confidence: 0.7,
            },
          ),
        );
      }
    });

    return patterns;
  }

  private isEffectivelyEmpty(block: Block): boolean {
    const statements = block.getStatements();

    if (statements.length === 0) return true;

    // Check if all statements are just comments
    const hasCode = statements.some((stmt) => {
      const text = stmt.getText().trim();
      return !text.startsWith('//') && !text.startsWith('/*');
    });

    return !hasCode;
  }

  private isDescendantOf(node: Node, ancestor: Node): boolean {
    let current: Node | undefined = node;
    while (current) {
      if (current === ancestor) return true;
      current = current.getParent();
    }
    return false;
  }

  private getFunctionName(func: Node): string | undefined {
    if (func.isKind(SyntaxKind.FunctionDeclaration)) {
      return func.asKind(SyntaxKind.FunctionDeclaration)?.getName();
    }
    if (func.isKind(SyntaxKind.MethodDeclaration)) {
      return func.asKind(SyntaxKind.MethodDeclaration)?.getName();
    }
    // Arrow functions don't have names, try to get from variable declaration
    const varDecl = func.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
    if (varDecl) {
      return varDecl.getName();
    }
    return undefined;
  }

  private isInErrorContext(node: Node): boolean {
    // Check if inside throw statement
    if (node.getFirstAncestorByKind(SyntaxKind.ThrowStatement)) {
      return true;
    }

    // Check if argument to Error constructor
    const callExpr = node.getFirstAncestorByKind(SyntaxKind.NewExpression);
    if (callExpr) {
      const expr = callExpr.getExpression();
      const name = expr.getText();
      if (name === 'Error' || name.endsWith('Error')) {
        return true;
      }
    }

    // Check if inside catch clause
    if (node.getFirstAncestorByKind(SyntaxKind.CatchClause)) {
      return true;
    }

    // Check if argument to reject()
    const call = node.getFirstAncestorByKind(SyntaxKind.CallExpression);
    if (call) {
      const expr = call.getExpression();
      if (expr.getText() === 'reject') {
        return true;
      }
    }

    return false;
  }

  private truncateCode(code: string, maxLength: number): string {
    if (code.length <= maxLength) return code;
    return `${code.slice(0, maxLength - 3)}...`;
  }
}
