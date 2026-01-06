import type { LLMConfig } from '@codegateway/shared';
import type { ChatMessage, CompletionOptions, CompletionResponse } from '../types.js';
import { BaseLLMProvider } from './base.js';

/** Ollama local LLM provider */
export class OllamaProvider extends BaseLLMProvider {
  readonly name = 'ollama';

  private readonly baseUrl: string;

  constructor(config: LLMConfig) {
    super(config);
    this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async complete(
    messages: ChatMessage[],
    options?: CompletionOptions,
  ): Promise<CompletionResponse> {
    const opts = { ...this.getDefaultOptions(), ...options };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
        options: {
          num_predict: opts.maxTokens,
          temperature: opts.temperature,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as OllamaResponse;

    return {
      content: data.message?.content ?? '',
      promptTokens: data.prompt_eval_count,
      completionTokens: data.eval_count,
      model: data.model,
    };
  }
}

interface OllamaResponse {
  message?: {
    content?: string;
  };
  model: string;
  prompt_eval_count?: number;
  eval_count?: number;
}
