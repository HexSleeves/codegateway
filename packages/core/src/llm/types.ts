import type {
  DetectedPattern,
} from '@codegateway/shared';

/** Message for LLM chat completion */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Options for LLM completion */
export interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
  /** Stop sequences */
  stop?: string[];
}

/** Response from LLM completion */
export interface CompletionResponse {
  content: string;
  /** Tokens used in prompt */
  promptTokens: number | undefined;
  /** Tokens used in completion */
  completionTokens: number | undefined;
  /** Model used */
  model: string;
}

/** Abstract LLM provider interface */
export interface LLMProviderInterface {
  /** Provider name */
  readonly name: string;

  /** Check if provider is configured and available */
  isAvailable(): Promise<boolean>;

  /** Complete a chat conversation */
  complete(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResponse>;
}

/** Request to enhance patterns */
export interface EnhanceRequest {
  /** The code being analyzed */
  code: string;
  /** File path for context */
  filePath: string;
  /** Patterns detected by static analysis */
  patterns: DetectedPattern[];
  /** What enhancements to generate */
  features: {
    explanations?: boolean;
    questions?: boolean;
    riskAssessment?: boolean;
  };
}

/** Request for semantic review */
export interface SemanticReviewRequest {
  /** The code to review */
  code: string;
  /** File path for context */
  filePath: string;
  /** Patterns already detected (to avoid duplicates) */
  existingPatterns?: DetectedPattern[];
  /** Focus areas for review */
  focusAreas?: ('security' | 'logic' | 'performance' | 'maintainability')[];
}
