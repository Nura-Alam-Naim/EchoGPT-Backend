import { Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { BaseAiProvider } from './base-ai.provider';

@Injectable()
export class ClaudeProvider extends BaseAiProvider {
  readonly providerType = 'CLAUDE';
  private readonly logger = new Logger(ClaudeProvider.name);

  async chat(
    apiKey: string,
    model: string,
    messages: Array<{ role: string; content: string }>,
    config?: Record<string, any>,
  ) {
    try {
      // Separate system messages from user/assistant messages for Claude API
      const systemMessage = messages.find((m) => m.role === 'system');
      const chatMessages = messages.filter((m) => m.role !== 'system');

      const body: any = {
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: config?.maxTokens || 4096,
        messages: chatMessages.map((m) => ({
          role: m.role === 'USER' ? 'user' : m.role === 'ASSISTANT' ? 'assistant' : m.role.toLowerCase(),
          content: m.content,
        })),
      };

      if (systemMessage) {
        body.system = systemMessage.content;
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `Claude API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        content: data.content?.[0]?.text || '',
        model: data.model,
        tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      };
    } catch (error: any) {
      this.logger.error(`Claude chat error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stream chat completion from Claude using Server-Sent Events.
   * Uses the native `stream: true` option of the Anthropic API.
   */
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
          const systemMessage = messages.find((m) => m.role === 'system');
          const chatMessages = messages.filter((m) => m.role !== 'system');

          const body: any = {
            model: model || 'claude-3-5-sonnet-20241022',
            max_tokens: config?.maxTokens || 4096,
            stream: true,
            messages: chatMessages.map((m) => ({
              role: m.role === 'USER' ? 'user' : m.role === 'ASSISTANT' ? 'assistant' : m.role.toLowerCase(),
              content: m.content,
            })),
          };

          if (systemMessage) {
            body.system = systemMessage.content;
          }

          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(body),
            signal: abortController.signal,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `Claude API error: ${response.status}`);
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

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  subscriber.next({
                    data: JSON.stringify({ content: parsed.delta.text, model: model }),
                  } as MessageEvent);
                }

                if (parsed.type === 'message_stop') {
                  subscriber.next({ data: JSON.stringify({ done: true }) } as MessageEvent);
                  subscriber.complete();
                  return;
                }
              } catch {
                // Skip malformed chunks
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
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });

      const responseTimeMs = Date.now() - startTime;

      if (response.ok) {
        return { status: 'HEALTHY' as const, message: 'Claude API is reachable', responseTimeMs };
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
