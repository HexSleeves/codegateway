import { Project, SyntaxKind, SourceFile } from 'ts-morph';
import type { DetectedPattern, PatternType, SupportedLanguage } from '@codegateway/shared';
import { SECRET_PATTERNS } from '@codegateway/shared';
import { BaseDetector } from './base.js';

/**
 * Detects security issues in code
 */
export class SecurityDetector extends BaseDetector {
  readonly id = 'security';
  readonly patterns: PatternType[] = [
    'hardcoded_secret',
    'sql_concatenation',
    'unsafe_eval',
    'insecure_random',
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

    // Skip test files and config files that commonly have mock secrets
    if (this.shouldSkipFile(filePath)) {
      return patterns;
    }

    const sourceFile = this.project.createSourceFile(filePath, content, { overwrite: true });

    try {
      patterns.push(...this.detectHardcodedSecrets(sourceFile, filePath, content));
      patterns.push(...this.detectSqlConcatenation(sourceFile, filePath));
      patterns.push(...this.detectUnsafeEval(sourceFile, filePath));
      patterns.push(...this.detectInsecureRandom(sourceFile, filePath));
    } finally {
      this.project.removeSourceFile(sourceFile);
    }

    return patterns;
  }

  private shouldSkipFile(filePath: string): boolean {
    const skipPatterns = [
      /\.test\.[tj]sx?$/,
      /\.spec\.[tj]sx?$/,
      /__tests__/,
      /\.config\.[tj]s$/,
      /\.example\./,
      /\.sample\./,
    ];
    return skipPatterns.some((p) => p.test(filePath));
  }

  private detectHardcodedSecrets(
    sourceFile: SourceFile,
    filePath: string,
    content: string
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const lines = content.split('\n');

    // Check each line for secret patterns
    lines.forEach((line, index) => {
      for (const pattern of SECRET_PATTERNS) {
        const match = pattern.exec(line);
        if (match) {
          // Verify it's not an environment variable reference
          if (this.isEnvironmentVariable(line)) {
            continue;
          }

          // Mask the secret in the snippet
          const maskedLine = this.maskSecret(line, match[0]);

          patterns.push(
            this.createPattern(
              'hardcoded_secret',
              filePath,
              index + 1,
              index + 1,
              'Potential hardcoded secret detected',
              'Hardcoded secrets will be exposed in version control history. ' +
                'Use environment variables or a secrets manager instead.',
              maskedLine,
              {
                severity: 'critical',
                suggestion:
                  'Move this secret to an environment variable or secrets manager (e.g., process.env.API_KEY)',
                confidence: 0.9,
              }
            )
          );
          break; // Only report once per line
        }
      }
    });

    // Also check string literals in the AST for common secret patterns
    sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral).forEach((literal) => {
      const text = literal.getLiteralText();

      // Check for JWT tokens
      if (/^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(text)) {
        patterns.push(
          this.createPattern(
            'hardcoded_secret',
            filePath,
            literal.getStartLineNumber(),
            literal.getEndLineNumber(),
            'Hardcoded JWT token detected',
            'JWT tokens should not be hardcoded. They will be exposed in version control.',
            `"${text.slice(0, 20)}...[MASKED]"`,
            {
              severity: 'critical',
              suggestion: 'Store tokens securely and retrieve them at runtime',
              confidence: 0.95,
            }
          )
        );
      }

      // Check for AWS keys
      if (/^AKIA[0-9A-Z]{16}$/.test(text)) {
        patterns.push(
          this.createPattern(
            'hardcoded_secret',
            filePath,
            literal.getStartLineNumber(),
            literal.getEndLineNumber(),
            'Hardcoded AWS access key detected',
            'AWS credentials should never be in source code.',
            `"${text.slice(0, 8)}...[MASKED]"`,
            {
              severity: 'critical',
              suggestion: 'Use AWS SDK credential providers or environment variables',
              confidence: 0.98,
            }
          )
        );
      }
    });

    return patterns;
  }

  private detectSqlConcatenation(
    sourceFile: SourceFile,
    filePath: string
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Find template literals and string concatenations that look like SQL
    const sqlKeywords = /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|AND|OR)\b/i;

    // Check template literals
    sourceFile.getDescendantsOfKind(SyntaxKind.TemplateExpression).forEach((template) => {
      const text = template.getText();
      if (sqlKeywords.test(text)) {
        // Check if it has expressions (interpolations)
        const spans = template.getTemplateSpans();
        if (spans.length > 0) {
          patterns.push(
            this.createPattern(
              'sql_concatenation',
              filePath,
              template.getStartLineNumber(),
              template.getEndLineNumber(),
              'SQL query with string interpolation - potential SQL injection',
              'Building SQL queries with string interpolation can lead to SQL injection vulnerabilities. ' +
                'Use parameterized queries instead.',
              this.truncateCode(text, 150),
              {
                severity: 'critical',
                suggestion: 'Use parameterized queries or an ORM with proper escaping',
                confidence: 0.85,
              }
            )
          );
        }
      }
    });

    // Check binary expressions (string concatenation)
    sourceFile.getDescendantsOfKind(SyntaxKind.BinaryExpression).forEach((expr) => {
      if (expr.getOperatorToken().getKind() !== SyntaxKind.PlusToken) return;

      const text = expr.getText();
      if (sqlKeywords.test(text)) {
        // Look for variable concatenation
        const hasVariable =
          expr.getDescendantsOfKind(SyntaxKind.Identifier).length > 0 ||
          expr.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression).length > 0;

        if (hasVariable) {
          patterns.push(
            this.createPattern(
              'sql_concatenation',
              filePath,
              expr.getStartLineNumber(),
              expr.getEndLineNumber(),
              'SQL query built with string concatenation - potential SQL injection',
              'Building SQL queries with string concatenation can lead to SQL injection vulnerabilities.',
              this.truncateCode(text, 150),
              {
                severity: 'critical',
                suggestion: 'Use parameterized queries or an ORM',
                confidence: 0.8,
              }
            )
          );
        }
      }
    });

    return patterns;
  }

  private detectUnsafeEval(
    sourceFile: SourceFile,
    filePath: string
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call) => {
      const expr = call.getExpression();
      const funcName = expr.getText();

      // Check for eval()
      if (funcName === 'eval') {
        patterns.push(
          this.createPattern(
            'unsafe_eval',
            filePath,
            call.getStartLineNumber(),
            call.getEndLineNumber(),
            'Use of eval() is a security risk',
            'eval() can execute arbitrary code and is a common source of security vulnerabilities. ' +
              'It also prevents JavaScript engine optimizations.',
            call.getText(),
            {
              severity: 'critical',
              suggestion: 'Use JSON.parse() for JSON data, or restructure code to avoid dynamic evaluation',
              confidence: 0.95,
            }
          )
        );
      }

      // Check for Function constructor
      if (funcName === 'Function') {
        patterns.push(
          this.createPattern(
            'unsafe_eval',
            filePath,
            call.getStartLineNumber(),
            call.getEndLineNumber(),
            'Use of Function constructor is similar to eval()',
            'The Function constructor creates a function from a string, which has similar security risks to eval().',
            call.getText(),
            {
              severity: 'critical',
              suggestion: 'Use regular function declarations or arrow functions',
              confidence: 0.9,
            }
          )
        );
      }

      // Check for setTimeout/setInterval with string argument
      if (funcName === 'setTimeout' || funcName === 'setInterval') {
        const args = call.getArguments();
        if (args.length > 0 && args[0]?.getKind() === SyntaxKind.StringLiteral) {
          patterns.push(
            this.createPattern(
              'unsafe_eval',
              filePath,
              call.getStartLineNumber(),
              call.getEndLineNumber(),
              `${funcName} with string argument is similar to eval()`,
              'Passing a string to setTimeout/setInterval causes it to be evaluated, which is a security risk.',
              call.getText(),
              {
                severity: 'warning',
                suggestion: 'Pass a function reference instead of a string',
                confidence: 0.9,
              }
            )
          );
        }
      }
    });

    // Check for new Function()
    sourceFile.getDescendantsOfKind(SyntaxKind.NewExpression).forEach((newExpr) => {
      const expr = newExpr.getExpression();
      if (expr.getText() === 'Function') {
        patterns.push(
          this.createPattern(
            'unsafe_eval',
            filePath,
            newExpr.getStartLineNumber(),
            newExpr.getEndLineNumber(),
            'Use of new Function() is similar to eval()',
            'The Function constructor creates a function from a string, which has similar security risks to eval().',
            newExpr.getText(),
            {
              severity: 'critical',
              suggestion: 'Use regular function declarations or arrow functions',
              confidence: 0.9,
            }
          )
        );
      }
    });

    return patterns;
  }

  private detectInsecureRandom(
    sourceFile: SourceFile,
    filePath: string
  ): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call) => {
      const expr = call.getExpression();
      const text = expr.getText();

      if (text === 'Math.random') {
        // Check if it's used in a security-sensitive context
        const parent = call.getParent();
        const grandparent = parent?.getParent();
        const context = grandparent?.getText() ?? parent?.getText() ?? '';

        const securityKeywords =
          /\b(token|secret|key|password|auth|session|csrf|nonce|salt|hash|id|uuid)\b/i;

        if (securityKeywords.test(context)) {
          patterns.push(
            this.createPattern(
              'insecure_random',
              filePath,
              call.getStartLineNumber(),
              call.getEndLineNumber(),
              'Math.random() used in potentially security-sensitive context',
              'Math.random() is not cryptographically secure. ' +
                'For security purposes, use crypto.randomBytes() or crypto.getRandomValues().',
              this.truncateCode(context, 100),
              {
                severity: 'warning',
                suggestion: "Use crypto.randomUUID() or crypto.randomBytes() for security-sensitive operations",
                confidence: 0.75,
              }
            )
          );
        }
      }
    });

    return patterns;
  }

  private isEnvironmentVariable(line: string): boolean {
    return /process\.env\.|import\.meta\.env\.|\$\{.*env.*\}/i.test(line);
  }

  private maskSecret(line: string, secret: string): string {
    // Find the value part and mask it
    const valueMatch = secret.match(/['"]([^'"]+)['"]/)?.[1];
    if (valueMatch && valueMatch.length > 4) {
      const masked = valueMatch.slice(0, 4) + '***MASKED***';
      return line.replace(valueMatch, masked);
    }
    return line;
  }

  private truncateCode(code: string, maxLength: number): string {
    if (code.length <= maxLength) return code;
    return code.slice(0, maxLength - 3) + '...';
  }
}
