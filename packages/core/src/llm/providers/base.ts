import type { LLMConfig } from '@codegateway/shared';
import type {
  ChatMessage,
  CompletionOptions,
  CompletionResponse,
  LLMProviderInterface,
} from '../types.js';

/** Base class for LLM providers */
export abstract class BaseLLMProvider implements LLMProviderInterface {
  abstract readonly name: string;

  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract isAvailable(): Promise<boolean>;

  abstract complete(
    messages: ChatMessage[],
    options?: CompletionOptions,
  ): Promise<CompletionResponse>;

  /** Get the API key from config or environment */
  protected getApiKey(): string | undefined {
    if (this.config.apiKey) {
      return this.config.apiKey;
    }

    // Check environment variables based on provider
    const envVarMap: Record<string, string> = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
    };

    const envVar = envVarMap[this.config.provider];
    return envVar ? process.env[envVar] : undefined;
  }

  /** Get default completion options */
  protected getDefaultOptions(): CompletionOptions {
    return {
      maxTokens: this.config.maxTokens ?? 1024,
      temperature: this.config.temperature ?? 0.3,
    };
  }
}
