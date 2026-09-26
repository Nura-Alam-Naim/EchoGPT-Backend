import { Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
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

  chatStream(
    apiKey: string,
    model: string,
    messages: Array<{ role: string; content: string }>,
    config?: Record<string, any>,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const abortController = new AbortController();

      (async () => {
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
              stream: true,
            }),
            signal: abortController.signal,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error('No response body');

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6);
              if (data === '[DONE]') {
                subscriber.next({ data: JSON.stringify({ done: true }) } as MessageEvent);
                subscriber.complete();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  subscriber.next({
                    data: JSON.stringify({ content, model: parsed.model }),
                  } as MessageEvent);
                }
              } catch {
              }
            }
          }

          subscriber.next({ data: JSON.stringify({ done: true }) } as MessageEvent);
          subscriber.complete();
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            subscriber.next({
              data: JSON.stringify({ error: error.message }),
            } as MessageEvent);
            subscriber.complete();
          }
        }
      })();

      return () => abortController.abort();
    });
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
