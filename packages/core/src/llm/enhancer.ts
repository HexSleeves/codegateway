import type {
  ComprehensionQuestion,
  DetectedPattern,
  EnhancedPattern,
  LLMConfig,
  SemanticReviewResult,
} from '@codegateway/shared';
import { AnthropicProvider, OllamaProvider, OpenAIProvider } from './providers/index.js';
import type { ChatMessage, LLMProviderInterface } from './types.js';

/**
 * Enhances static analysis results with LLM-generated content
 */
export class PatternEnhancer {
  private readonly provider: LLMProviderInterface;
  private readonly config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.provider = this.createProvider(config);
  }

  private createProvider(config: LLMConfig): LLMProviderInterface {
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'ollama':
        return new OllamaProvider(config);
      default:
        throw new Error(`Unknown LLM provider: ${config.provider}`);
    }
  }

  /** Check if the LLM provider is available */
  async isAvailable(): Promise<boolean> {
    return this.provider.isAvailable();
  }

  /**
   * Enhance patterns with better explanations and suggestions
   */
  async enhancePatterns(
    code: string,
    filePath: string,
    patterns: DetectedPattern[],
  ): Promise<EnhancedPattern[]> {
    if (patterns.length === 0) {
      return [];
    }

    const shouldExplain = this.config.features.includes('explanations');
    const shouldQuestion = this.config.features.includes('questions');

    if (!shouldExplain && !shouldQuestion) {
      return [];
    }

    const messages = this.buildEnhancePrompt(code, filePath, patterns, {
      explanations: shouldExplain,
      questions: shouldQuestion,
    });

    try {
      const response = await this.provider.complete(messages);
      return this.parseEnhanceResponse(response.content, patterns);
    } catch (error) {
      console.error('LLM enhancement failed:', error);
      return [];
    }
  }

  /**
   * Generate comprehension questions for a set of patterns
   */
  async generateQuestions(
    code: string,
    filePath: string,
    patterns: DetectedPattern[],
    count: number = 3,
  ): Promise<ComprehensionQuestion[]> {
    if (patterns.length === 0) {
      return [];
    }

    const messages = this.buildQuestionsPrompt(code, filePath, patterns, count);

    try {
      const response = await this.provider.complete(messages);
      return this.parseQuestionsResponse(response.content);
    } catch (error) {
      console.error('LLM question generation failed:', error);
      return [];
    }
  }

  /**
   * Perform semantic review to find issues static analysis missed
   */
  async semanticReview(
    code: string,
    filePath: string,
    existingPatterns?: DetectedPattern[],
  ): Promise<SemanticReviewResult | null> {
    if (!this.config.features.includes('semantic_review')) {
      return null;
    }

    const messages = this.buildSemanticReviewPrompt(code, filePath, existingPatterns);

    try {
      const response = await this.provider.complete(messages, {
        maxTokens: 2048,
      });
      return this.parseSemanticReviewResponse(response.content);
    } catch (error) {
      console.error('LLM semantic review failed:', error);
      return null;
    }
  }

  private buildEnhancePrompt(
    code: string,
    filePath: string,
    patterns: DetectedPattern[],
    features: { explanations?: boolean; questions?: boolean },
  ): ChatMessage[] {
    const patternSummary = patterns
      .map(
        (p, i) =>
          `${i + 1}. [${p.severity.toUpperCase()}] Line ${p.startLine}: ${p.type}\n   ${p.description}\n   Code: ${p.codeSnippet}`,
      )
      .join('\n\n');

    let requestedOutput = '';
    if (features.explanations) {
      requestedOutput += `
- "enhancedExplanation": A more detailed, context-specific explanation of why this is problematic in THIS code
- "specificSuggestion": A concrete fix suggestion with actual code if possible`;
    }
    if (features.questions) {
      requestedOutput += `
- "questions": 1-2 comprehension questions about this pattern`;
    }

    return [
      {
        role: 'system',
        content: `You are a code review assistant. Analyze the detected patterns and provide enhanced explanations and suggestions specific to this code. Be concise but helpful.

Respond with a JSON array of enhanced patterns. Each object should have:
- "patternIndex": The 1-based index of the pattern being enhanced
${requestedOutput}

Respond ONLY with valid JSON, no markdown or explanation.`,
      },
      {
        role: 'user',
        content: `File: ${filePath}

Code:
\`\`\`
${code}
\`\`\`

Detected patterns:
${patternSummary}

Provide enhanced analysis for each pattern.`,
      },
    ];
  }

  private buildQuestionsPrompt(
    code: string,
    filePath: string,
    patterns: DetectedPattern[],
    count: number,
  ): ChatMessage[] {
    const patternSummary = patterns
      .map((p) => `- Line ${p.startLine}: ${p.type} - ${p.description}`)
      .join('\n');

    return [
      {
        role: 'system',
        content: `You are a code comprehension assistant. Generate questions to verify the developer understands the code and its issues.

Generate ${count} questions of varying difficulty. Include a mix of:
- Multiple choice questions about what the code does
- True/false questions about the detected issues
- Questions about what would happen in certain scenarios

Respond with a JSON array of questions. Each question should have:
- "id": A unique identifier (e.g., "q1", "q2")
- "question": The question text
- "type": "multiple_choice", "true_false", or "free_text"
- "options": Array of options (for multiple_choice, 4 options)
- "correctAnswer": The correct answer (index for multiple_choice, true/false for true_false, or expected keywords for free_text)
- "answerExplanation": Brief explanation of why this is correct
- "difficulty": "easy", "medium", or "hard"

Respond ONLY with valid JSON, no markdown.`,
      },
      {
        role: 'user',
        content: `File: ${filePath}

Code:
\`\`\`
${code}
\`\`\`

Issues detected:
${patternSummary}

Generate ${count} comprehension questions about this code.`,
      },
    ];
  }

  private buildSemanticReviewPrompt(
    code: string,
    filePath: string,
    existingPatterns?: DetectedPattern[],
  ): ChatMessage[] {
    const existingIssues = existingPatterns?.length
      ? `\nAlready detected issues (don't duplicate these):\n${existingPatterns.map((p) => `- ${p.type}: ${p.description}`).join('\n')}`
      : '';

    return [
      {
        role: 'system',
        content: `You are a senior code reviewer. Analyze the code for issues that static analysis might miss:
- Logic errors
- Edge cases not handled
- Security vulnerabilities
- Performance issues
- Maintainability concerns

Respond with a JSON object:
{
  "summary": "Brief overall assessment",
  "additionalIssues": [
    {
      "description": "Issue description",
      "severity": "info" | "warning" | "critical",
      "line": line number if applicable,
      "suggestion": "How to fix"
    }
  ],
  "positives": ["Good things about this code"],
  "confidence": 0.0-1.0
}

Be conservative - only report issues you're confident about. Respond ONLY with valid JSON.`,
      },
      {
        role: 'user',
        content: `File: ${filePath}

Code:
\`\`\`
${code}
\`\`\`
${existingIssues}

Review this code for issues static analysis might miss.`,
      },
    ];
  }

  private parseEnhanceResponse(content: string, patterns: DetectedPattern[]): EnhancedPattern[] {
    try {
      const parsed = JSON.parse(content) as Array<{
        patternIndex: number;
        enhancedExplanation?: string;
        specificSuggestion?: string;
        questions?: Array<{
          question: string;
          type: string;
          options?: string[];
          correctAnswer?: string | number;
          difficulty: string;
        }>;
      }>;

      return parsed.map((item): EnhancedPattern => {
        const pattern = patterns[item.patternIndex - 1];
        const result: EnhancedPattern = {
          patternId: pattern?.id ?? `pattern-${item.patternIndex}`,
        };

        if (item.enhancedExplanation) {
          result.enhancedExplanation = item.enhancedExplanation;
        }
        if (item.specificSuggestion) {
          result.specificSuggestion = item.specificSuggestion;
        }
        if (item.questions && item.questions.length > 0) {
          result.questions = item.questions.map((q, i): ComprehensionQuestion => {
            const question: ComprehensionQuestion = {
              id: `q-${item.patternIndex}-${i}`,
              question: q.question,
              type: q.type as ComprehensionQuestion['type'],
              difficulty: q.difficulty as ComprehensionQuestion['difficulty'],
            };
            if (q.options) {
              question.options = q.options;
            }
            if (q.correctAnswer !== undefined) {
              question.correctAnswer = String(q.correctAnswer);
            }
            if (pattern?.id) {
              question.relatedPatternId = pattern.id;
            }
            return question;
          });
        }

        return result;
      });
    } catch (error) {
      console.error('Failed to parse LLM enhance response:', error);
      return [];
    }
  }

  private parseQuestionsResponse(content: string): ComprehensionQuestion[] {
    try {
      const parsed = JSON.parse(content) as Array<{
        id: string;
        question: string;
        type: string;
        options?: string[];
        correctAnswer?: string | number | boolean;
        answerExplanation?: string;
        difficulty: string;
      }>;

      return parsed.map((q): ComprehensionQuestion => {
        const question: ComprehensionQuestion = {
          id: q.id,
          question: q.question,
          type: q.type as ComprehensionQuestion['type'],
          difficulty: q.difficulty as ComprehensionQuestion['difficulty'],
        };

        if (q.options) {
          question.options = q.options;
        }
        if (q.correctAnswer !== undefined) {
          question.correctAnswer =
            typeof q.correctAnswer === 'boolean'
              ? q.correctAnswer
                ? 'true'
                : 'false'
              : String(q.correctAnswer);
        }
        if (q.answerExplanation) {
          question.answerExplanation = q.answerExplanation;
        }

        return question;
      });
    } catch (error) {
      console.error('Failed to parse LLM questions response:', error);
      return [];
    }
  }

  private parseSemanticReviewResponse(content: string): SemanticReviewResult | null {
    try {
      const parsed = JSON.parse(content) as {
        summary: string;
        additionalIssues: Array<{
          description: string;
          severity: string;
          line?: number;
          suggestion?: string;
        }>;
        positives?: string[];
        confidence: number;
      };

      const result: SemanticReviewResult = {
        summary: parsed.summary,
        additionalIssues: parsed.additionalIssues.map((issue) => {
          const mapped: SemanticReviewResult['additionalIssues'][number] = {
            description: issue.description,
            severity: issue.severity as 'info' | 'warning' | 'critical',
          };
          if (issue.line !== undefined) {
            mapped.line = issue.line;
          }
          if (issue.suggestion) {
            mapped.suggestion = issue.suggestion;
          }
          return mapped;
        }),
        confidence: parsed.confidence,
      };

      if (parsed.positives) {
        result.positives = parsed.positives;
      }

      return result;
    } catch (error) {
      console.error('Failed to parse LLM semantic review response:', error);
      return null;
    }
  }
}
