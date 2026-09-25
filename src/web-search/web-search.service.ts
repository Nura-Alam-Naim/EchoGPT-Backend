import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiProvidersService } from '../ai-providers/ai-providers.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);

  // Simple in-memory cache for search results (TTL: 1 hour)
  private searchCache = new Map<string, { results: any; timestamp: number }>();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor(
    private prisma: PrismaService,
    private aiProvidersService: AiProvidersService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * Perform an AI-powered web search
   */
  async search(userId: string, dto: SearchQueryDto) {
    // Check usage limits
    const canProceed = await this.subscriptionsService.incrementUsage(userId);
    if (!canProceed) {
      throw new BadRequestException(
        'Daily request limit reached. Upgrade to Premium for more requests.',
      );
    }

    const startTime = Date.now();

    // Check cache first
    const cacheKey = dto.query.toLowerCase().trim();
    const cached = this.searchCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      // Save cached search to history
      await this.prisma.webSearch.create({
        data: {
          userId,
          query: dto.query,
          results: cached.results,
          isCached: true,
          responseTimeMs: Date.now() - startTime,
        },
      });

      return {
        query: dto.query,
        ...cached.results,
        isCached: true,
        responseTimeMs: Date.now() - startTime,
      };
    }

    // Get AI provider for generating search summary
    const { provider, apiKey, implementation } =
      await this.aiProvidersService.getProviderForChat(dto.providerId);

    try {
      // Use AI to generate a comprehensive search response
      const searchPrompt = [
        {
          role: 'system',
          content: `You are a helpful web search assistant. When given a search query, provide:
1. A comprehensive summary of what you know about the topic
2. Key facts and recent developments
3. Provide your response in a clear, well-structured format.

Format your response as a helpful, informative summary that answers the user's search query.`,
        },
        {
          role: 'user',
          content: `Search query: "${dto.query}"\n\nProvide a comprehensive, informative response about this topic.`,
        },
      ];

      const aiResult = await implementation.chat(
        apiKey,
        provider.defaultModel || 'gpt-4o-mini',
        searchPrompt,
        { maxTokens: 2048, temperature: 0.5 },
      );

      const responseTimeMs = Date.now() - startTime;

      // Create structured results
      const searchResults = {
        aiSummary: aiResult.content,
        results: [
          {
            title: `AI-Generated Summary: ${dto.query}`,
            url: '#ai-summary',
            snippet: aiResult.content.substring(0, 200) + '...',
          },
        ],
        provider: provider.name,
        modelUsed: aiResult.model,
        tokensUsed: aiResult.tokensUsed,
      };

      // Cache the results
      this.searchCache.set(cacheKey, {
        results: searchResults,
        timestamp: Date.now(),
      });

      // Save to database
      await this.prisma.webSearch.create({
        data: {
          userId,
          providerId: provider.id,
          query: dto.query,
          results: searchResults,
          isCached: false,
          responseTimeMs,
        },
      });

      this.logger.log(
        `Search: user=${userId} query="${dto.query.substring(0, 30)}..." time=${responseTimeMs}ms`,
      );

      return {
        query: dto.query,
        ...searchResults,
        isCached: false,
        responseTimeMs,
      };
    } catch (error: any) {
      this.logger.error(`Search error: ${error.message}`);
      throw new BadRequestException(`Search failed: ${error.message}`);
    }
  }

  /**
   * Get search history for a user
   */
  async getHistory(userId: string) {
    const searches = await this.prisma.webSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        provider: { select: { name: true } },
      },
    });

    return searches.map((s) => ({
      id: s.id,
      query: s.query,
      isCached: s.isCached,
      responseTimeMs: s.responseTimeMs,
      provider: s.provider?.name || null,
      createdAt: s.createdAt,
    }));
  }

  /**
   * Get recent searches (last 10)
   */
  async getRecent(userId: string) {
    const searches = await this.prisma.webSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        query: true,
        createdAt: true,
      },
    });

    return searches;
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSuggestions(userId: string, query: string) {
    if (!query || query.length < 2) {
      return [];
    }

    // Find similar past searches
    const suggestions = await this.prisma.webSearch.findMany({
      where: {
        userId,
        query: {
          contains: query,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        query: true,
      },
      distinct: ['query'],
    });

    return suggestions.map((s) => s.query);
  }

  /**
   * Delete a search from history
   */
  async deleteSearch(userId: string, searchId: string) {
    const search = await this.prisma.webSearch.findFirst({
      where: { id: searchId, userId },
    });

    if (!search) {
      throw new NotFoundException('Search not found');
    }

    await this.prisma.webSearch.delete({
      where: { id: searchId },
    });

    return { message: 'Search deleted from history' };
  }
}
