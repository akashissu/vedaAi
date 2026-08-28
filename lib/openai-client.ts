// OpenAI API Client (Singleton)

import OpenAI from 'openai';
import { OPENAI_CONFIG } from './constants';
import { retryWithBackoff, sleep } from './utils';

/**
 * Singleton OpenAI client instance
 */
class OpenAIClient {
  private static instance: OpenAIClient;
  private client: OpenAI;
  private lastCallTime: number = 0;

  private constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: OPENAI_CONFIG.TIMEOUT_MS,
      maxRetries: OPENAI_CONFIG.MAX_RETRIES,
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): OpenAIClient {
    if (!OpenAIClient.instance) {
      OpenAIClient.instance = new OpenAIClient();
    }
    return OpenAIClient.instance;
  }

  /**
   * Rate limiting: ensure minimum delay between API calls
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    
    if (timeSinceLastCall < OPENAI_CONFIG.MIN_DELAY_MS) {
      const delay = OPENAI_CONFIG.MIN_DELAY_MS - timeSinceLastCall;
      await sleep(delay);
    }
    
    this.lastCallTime = Date.now();
  }

  /**
   * Call OpenAI Chat Completions API with vision support
   */
  public async chatCompletion(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      responseFormat?: 'text' | 'json_object';
    }
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    await this.enforceRateLimit();

    return retryWithBackoff(async () => {
      const response = await this.client.chat.completions.create({
        model: options?.model || OPENAI_CONFIG.VISION_MODEL,
        messages,
        temperature: options?.temperature ?? OPENAI_CONFIG.TEMPERATURE,
        max_tokens: options?.maxTokens || OPENAI_CONFIG.MAX_TOKENS,
        ...(options?.responseFormat === 'json_object' && {
          response_format: { type: 'json_object' },
        }),
      });

      return response;
    }, OPENAI_CONFIG.MAX_RETRIES);
  }

  /**
   * Extract text content from chat completion response
   */
  public extractTextContent(
    response: OpenAI.Chat.Completions.ChatCompletion
  ): string {
    return response.choices[0]?.message?.content || '';
  }

  /**
   * Parse JSON response from chat completion
   */
  public parseJsonResponse<T>(
    response: OpenAI.Chat.Completions.ChatCompletion
  ): T {
    const content = this.extractTextContent(response);
    try {
      return JSON.parse(content) as T;
    } catch (error) {
      console.error('Failed to parse JSON response:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }
  }

  /**
   * Create a vision message with image
   */
  public createVisionMessage(
    prompt: string,
    imageBase64: string
  ): OpenAI.Chat.Completions.ChatCompletionUserMessageParam {
    return {
      role: 'user',
      content: [
        {
          type: 'text',
          text: prompt,
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${imageBase64}`,
            detail: 'high',
          },
        },
      ],
    };
  }

  /**
   * Create a vision message with multiple images
   */
  public createMultiImageVisionMessage(
    prompt: string,
    imagesBase64: string[]
  ): OpenAI.Chat.Completions.ChatCompletionUserMessageParam {
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      {
        type: 'text',
        text: prompt,
      },
    ];

    for (const imageBase64 of imagesBase64) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:image/png;base64,${imageBase64}`,
          detail: 'high',
        },
      });
    }

    return {
      role: 'user',
      content,
    };
  }

  /**
   * Get raw OpenAI client (for advanced usage)
   */
  public getRawClient(): OpenAI {
    return this.client;
  }
}

// Lazy proxy — instance is created only on first actual method call at runtime,
// not at module load time (which would crash Vercel's build when env vars aren't present).
export const openaiClient = new Proxy({} as OpenAIClient, {
  get(_target, prop: string) {
    const instance = OpenAIClient.getInstance();
    const value = (instance as unknown as Record<string, unknown>)[prop];
    if (typeof value === 'function') {
      return (value as Function).bind(instance);
    }
    return value;
  },
});
