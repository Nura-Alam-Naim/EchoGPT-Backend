import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { AiProvidersService } from '../ai-providers/ai-providers.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private aiProvidersService: AiProvidersService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * Send a message and get an AI response
   */
  async sendMessage(userId: string, dto: SendMessageDto) {
    // Check usage limits
    const canProceed = await this.subscriptionsService.incrementUsage(userId);
    if (!canProceed) {
      throw new BadRequestException(
        'Daily request limit reached. Upgrade to Premium for more requests.',
      );
    }

    // Get or create conversation
    let conversationId = dto.conversationId;
    if (!conversationId) {
      const conversation = await this.prisma.chatConversation.create({
        data: {
          userId,
          title: dto.message.substring(0, 50) + (dto.message.length > 50 ? '...' : ''),
        },
      });
      conversationId = conversation.id;
    } else {
      // Verify conversation belongs to user
      const conversation = await this.prisma.chatConversation.findFirst({
        where: { id: conversationId, userId },
      });
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }
    }

    // Save user message
    const userMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'USER',
        content: dto.message,
      },
    });

    // Get conversation history for context
    const history = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20, // Last 20 messages for context
    });

    // Format messages for the AI provider
    const messages = history.map((msg) => ({
      role: msg.role.toLowerCase(),
      content: msg.content,
    }));

    // Get the AI provider
    const { provider, apiKey, implementation } =
      await this.aiProvidersService.getProviderForChat(dto.providerId);

    const model = dto.model || provider.defaultModel || 'gpt-4o-mini';
    const config = (provider.config as Record<string, any>) || {};

    // Send to AI and measure response time
    const startTime = Date.now();

    try {
      const aiResult = await implementation.chat(apiKey, model, messages, config);
      const responseTimeMs = Date.now() - startTime;

      // Save AI response
      const aiMessage = await this.prisma.chatMessage.create({
        data: {
          conversationId,
          providerId: provider.id,
          role: 'ASSISTANT',
          content: aiResult.content,
          modelUsed: aiResult.model,
          tokensUsed: aiResult.tokensUsed,
          responseTimeMs,
        },
      });

      this.logger.log(
        `Chat: user=${userId} provider=${provider.name} model=${aiResult.model} tokens=${aiResult.tokensUsed} time=${responseTimeMs}ms`,
      );

      return {
        message: 'Message sent successfully',
        conversationId,
        userMessage: {
          id: userMessage.id,
          role: userMessage.role,
          content: userMessage.content,
          createdAt: userMessage.createdAt,
        },
        aiResponse: {
          id: aiMessage.id,
          role: aiMessage.role,
          content: aiMessage.content,
          modelUsed: aiMessage.modelUsed,
          tokensUsed: aiMessage.tokensUsed,
          responseTimeMs: aiMessage.responseTimeMs,
          provider: provider.name,
          createdAt: aiMessage.createdAt,
        },
      };
    } catch (error: any) {
      this.logger.error(`Chat error: ${error.message}`);
      throw new BadRequestException(`AI Provider error: ${error.message}`);
    }
  }

  /**
   * Stream a message response from an AI provider using Server-Sent Events (SSE).
   * Returns an Observable that emits partial content chunks.
   */
  async sendMessageStream(userId: string, dto: SendMessageDto): Promise<Observable<MessageEvent>> {
    // Check usage limits
    const canProceed = await this.subscriptionsService.incrementUsage(userId);
    if (!canProceed) {
      throw new BadRequestException(
        'Daily request limit reached. Upgrade to Premium for more requests.',
      );
    }

    // Get or create conversation
    let conversationId = dto.conversationId;
    if (!conversationId) {
      const conversation = await this.prisma.chatConversation.create({
        data: {
          userId,
          title: dto.message.substring(0, 50) + (dto.message.length > 50 ? '...' : ''),
        },
      });
      conversationId = conversation.id;
    } else {
      const conversation = await this.prisma.chatConversation.findFirst({
        where: { id: conversationId, userId },
      });
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }
    }

    // Save user message
    await this.prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'USER',
        content: dto.message,
      },
    });

    // Get conversation history for context
    const history = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const messages = history.map((msg) => ({
      role: msg.role.toLowerCase(),
      content: msg.content,
    }));

    // Get the AI provider
    const { provider, apiKey, implementation } =
      await this.aiProvidersService.getProviderForChat(dto.providerId);

    const model = dto.model || provider.defaultModel || 'gpt-4o-mini';
    const config = (provider.config as Record<string, any>) || {};

    this.logger.log(
      `Stream Chat: user=${userId} provider=${provider.name} model=${model} conversationId=${conversationId}`,
    );

    // Collect streamed content to save the complete message after streaming ends
    let fullContent = '';
    const startTime = Date.now();
    const prisma = this.prisma;
    const logger = this.logger;
    const providerRecord = provider;

    const sourceObservable = implementation.chatStream(apiKey, model, messages, config);

    // Wrap the observable to intercept completion and save the full AI response
    return new Observable<MessageEvent>((subscriber) => {
      const sub = sourceObservable.subscribe({
        next(event: MessageEvent) {
          try {
            const parsed = JSON.parse(event.data);
            if (parsed.content) {
              fullContent += parsed.content;
            }
          } catch {
            // ignore parse errors
          }
          subscriber.next(event);
        },
        error(err) {
          subscriber.error(err);
        },
        async complete() {
          // Save the complete AI response to the database
          try {
            const responseTimeMs = Date.now() - startTime;
            await prisma.chatMessage.create({
              data: {
                conversationId: conversationId!,
                providerId: providerRecord.id,
                role: 'ASSISTANT',
                content: fullContent,
                modelUsed: model,
                tokensUsed: null,
                responseTimeMs,
              },
            });
            logger.log(
              `Stream complete: provider=${providerRecord.name} model=${model} time=${responseTimeMs}ms chars=${fullContent.length}`,
            );
          } catch (e: any) {
            logger.error(`Failed to save streamed message: ${e.message}`);
          }
          subscriber.complete();
        },
      });

      return () => sub.unsubscribe();
    });
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string) {
    const conversations = await this.prisma.chatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
      },
    });

    return conversations.map((c) => ({
      id: c.id,
      title: c.title,
      messageCount: c._count.messages,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * Get all messages in a conversation
   */
  async getConversationMessages(userId: string, conversationId: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        provider: { select: { name: true, type: true } },
      },
    });

    return {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
      },
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        modelUsed: m.modelUsed,
        tokensUsed: m.tokensUsed,
        responseTimeMs: m.responseTimeMs,
        provider: m.provider?.name || null,
        createdAt: m.createdAt,
      })),
    };
  }

  /**
   * Create a new empty conversation
   */
  async createConversation(userId: string, title?: string) {
    const conversation = await this.prisma.chatConversation.create({
      data: {
        userId,
        title: title || 'New Conversation',
      },
    });

    return {
      message: 'Conversation created',
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
      },
    };
  }

  /**
   * Delete a conversation and all its messages
   */
  async deleteConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.chatConversation.delete({
      where: { id: conversationId },
    });

    return { message: 'Conversation deleted successfully' };
  }

  /**
   * Rename a conversation
   */
  async updateConversation(userId: string, conversationId: string, title: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const updated = await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { title },
    });

    return {
      message: 'Conversation updated',
      conversation: {
        id: updated.id,
        title: updated.title,
      },
    };
  }
}
