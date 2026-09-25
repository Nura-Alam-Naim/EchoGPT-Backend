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
   * Check if the provider API is reachable and the API key is valid
   */
  abstract healthCheck(apiKey: string): Promise<{
    status: 'HEALTHY' | 'UNHEALTHY' | 'ERROR';
    message: string;
    responseTimeMs: number;
  }>;
}
