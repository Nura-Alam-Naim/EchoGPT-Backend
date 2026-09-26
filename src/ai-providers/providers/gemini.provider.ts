import { Injectable, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { BaseAiProvider } from './base-ai.provider';

@Injectable()
export class GeminiProvider extends BaseAiProvider {
  readonly providerType = 'GEMINI';
  private readonly logger = new Logger(GeminiProvider.name);

  async chat(
    apiKey: string,
    model: string,
    messages: Array<{ role: string; content: string }>,
    config?: Record<string, any>,
  ) {
    try {
      const modelName = model || 'gemini-1.5-flash';

      const contents = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'USER' || m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        }));

      const systemInstruction = messages.find(
        (m) => m.role === 'system' || m.role === 'SYSTEM',
      );

      const body: any = {
        contents,
        generationConfig: {
          maxOutputTokens: config?.maxTokens || 4096,
          temperature: config?.temperature || 0.7,
        },
      };

      if (systemInstruction) {
        body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        model: modelName,
        tokensUsed: (data.usageMetadata?.totalTokenCount) || 0,
      };
    } catch (error: any) {
      this.logger.error(`Gemini chat error: ${error.message}`);
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
          const modelName = model || 'gemini-1.5-flash';

          const contents = messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
              role: m.role === 'USER' || m.role === 'user' ? 'user' : 'model',
              parts: [{ text: m.content }],
            }));

          const systemInstruction = messages.find(
            (m) => m.role === 'system' || m.role === 'SYSTEM',
          );

          const body: any = {
            contents,
            generationConfig: {
              maxOutputTokens: config?.maxTokens || 4096,
              temperature: config?.temperature || 0.7,
            },
          };

          if (systemInstruction) {
            body.systemInstruction = { parts: [{ text: systemInstruction.content }] };
          }

          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: abortController.signal,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
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
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  subscriber.next({
                    data: JSON.stringify({ content: text, model: modelName }),
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
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const response = await fetch(url);

      const responseTimeMs = Date.now() - startTime;

      if (response.ok) {
        return { status: 'HEALTHY' as const, message: 'Gemini API is reachable', responseTimeMs };
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
