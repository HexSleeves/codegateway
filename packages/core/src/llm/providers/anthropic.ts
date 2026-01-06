import type { LLMConfig } from '@codegateway/shared';
import type { ChatMessage, CompletionOptions, CompletionResponse } from '../types.js';
import { BaseLLMProvider } from './base.js';

/** Anthropic Claude API provider */
export class AnthropicProvider extends BaseLLMProvider {
  readonly name = 'anthropic';

  private readonly baseUrl: string;

  constructor(config: LLMConfig) {
    super(config);
    this.baseUrl = config.baseUrl ?? 'https://api.anthropic.com/v1';
  }

  async isAvailable(): Promise<boolean> {
    const apiKey = this.getApiKey();
    return !!apiKey;
  }

  async complete(
    messages: ChatMessage[],
    options?: CompletionOptions,
  ): Promise<CompletionResponse> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error(
        'Anthropic API key not configured. Set ANTHROPIC_API_KEY or config.llm.apiKey',
      );
    }

    const opts = { ...this.getDefaultOptions(), ...options };

    // Convert messages to Anthropic format
    const systemMessage = messages.find((m) => m.role === 'system');
    const otherMessages = messages.filter((m) => m.role !== 'system');

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: opts.maxTokens,
        system: systemMessage?.content,
        messages: otherMessages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as AnthropicResponse;

    return {
      content: data.content[0]?.text ?? '',
      promptTokens: data.usage?.input_tokens,
      completionTokens: data.usage?.output_tokens,
      model: data.model,
    };
  }
}

interface AnthropicResponse {
  content: Array<{
    type: string;
    text?: string;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  model: string;
}
