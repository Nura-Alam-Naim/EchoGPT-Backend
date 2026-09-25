import { Module } from '@nestjs/common';
import { WebSearchController } from './web-search.controller';
import { WebSearchService } from './web-search.service';
import { AiProvidersModule } from '../ai-providers/ai-providers.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [AiProvidersModule, SubscriptionsModule],
  controllers: [WebSearchController],
  providers: [WebSearchService],
})
export class WebSearchModule {}
