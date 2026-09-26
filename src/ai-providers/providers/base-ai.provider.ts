import { Observable } from 'rxjs';

export abstract class BaseAiProvider {
  abstract readonly providerType: string;

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

  abstract chatStream(
    apiKey: string,
    model: string,
    messages: Array<{ role: string; content: string }>,
    config?: Record<string, any>,
  ): Observable<MessageEvent>;

  abstract healthCheck(apiKey: string): Promise<{
    status: 'HEALTHY' | 'UNHEALTHY' | 'ERROR';
    message: string;
    responseTimeMs: number;
  }>;
}
