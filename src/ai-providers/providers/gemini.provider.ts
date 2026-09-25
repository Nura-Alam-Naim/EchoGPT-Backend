import { Injectable, Logger } from '@nestjs/common';
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

      // Convert messages to Gemini format
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
