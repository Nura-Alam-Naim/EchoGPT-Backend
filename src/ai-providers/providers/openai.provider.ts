import { Injectable, Logger } from '@nestjs/common';
import { BaseAiProvider } from './base-ai.provider';

@Injectable()
export class OpenAiProvider extends BaseAiProvider {
  readonly providerType = 'OPENAI';
  private readonly logger = new Logger(OpenAiProvider.name);

  async chat(
    apiKey: string,
    model: string,
    messages: Array<{ role: string; content: string }>,
    config?: Record<string, any>,
  ) {
    const startTime = Date.now();

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages,
          max_tokens: config?.maxTokens || 4096,
          temperature: config?.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        content: data.choices[0]?.message?.content || '',
        model: data.model,
        tokensUsed: data.usage?.total_tokens || 0,
      };
    } catch (error: any) {
      this.logger.error(`OpenAI chat error: ${error.message}`);
      throw error;
    }
  }

  async healthCheck(apiKey: string) {
    const startTime = Date.now();

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      const responseTimeMs = Date.now() - startTime;

      if (response.ok) {
        return { status: 'HEALTHY' as const, message: 'OpenAI API is reachable', responseTimeMs };
      } else {
        return { status: 'UNHEALTHY' as const, message: `API returned ${response.status}`, responseTimeMs };
      }
    } catch (error: any) {
      return {
        status: 'ERROR' as const,
        message: error.message,
        responseTimeMs: Date.now() - startTime,
      };
    }
  }
}
