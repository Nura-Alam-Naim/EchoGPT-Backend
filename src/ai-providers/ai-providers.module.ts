import { Module } from '@nestjs/common';
import { AiProvidersController } from './ai-providers.controller';
import { AiProvidersService } from './ai-providers.service';
import { OpenAiProvider } from './providers/openai.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { GeminiProvider } from './providers/gemini.provider';

@Module({
  controllers: [AiProvidersController],
  providers: [
    AiProvidersService,
    OpenAiProvider,
    ClaudeProvider,
    GeminiProvider,
  ],
  exports: [AiProvidersService],
})
export class AiProvidersModule {}
