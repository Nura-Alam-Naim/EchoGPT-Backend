import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AiProvidersModule } from '../ai-providers/ai-providers.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [AiProvidersModule, SubscriptionsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
