import { Observable } from 'rxjs';

/**
 * Abstract base class for AI providers.
 * All providers (OpenAI, Claude, Gemini) implement this interface.
 */
export abstract class BaseAiProvider {
  abstract readonly providerType: string;

  /**
   * Send a chat completion request to the AI provider
   */
  abstract chat(
    apiKey: string,
    model: string,
    messages: Array<{ role: string; content: string }>,
    config?: Record<string, any>,
  ): Promise<{
    content: string;
    model: string;
    tokensUsed: number;
  }>;

  /**
   * Stream a chat completion response from the AI provider via Server-Sent Events.
   * Emits partial content chunks as MessageEvent objects.
   */
  abstract chatStream(
    apiKey: string,
    model: string,
    messages: Array<{ role: string; content: string }>,
    config?: Record<string, any>,
  ): Observable<MessageEvent>;

  /**
   * Check if the provider API is reachable and the API key is valid
   */
  abstract healthCheck(apiKey: string): Promise<{
    status: 'HEALTHY' | 'UNHEALTHY' | 'ERROR';
    message: string;
    responseTimeMs: number;
  }>;
}
