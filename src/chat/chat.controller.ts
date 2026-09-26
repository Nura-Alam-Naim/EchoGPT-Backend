import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Sse,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SendMessageResponseDto } from './dto/chat-response.dto';
import {
  CreateConversationDto,
  UpdateConversationDto,
} from './dto/conversation-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Chat')
@ApiBearerAuth('JWT-Auth')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  @ApiOperation({
    summary: 'Send a message to AI',
    description:
      'Send a prompt to an AI provider and receive a response. Optionally specify a conversation ID to continue an existing chat, or omit to start a new one. You can also choose a specific provider and model.',
  })
  @ApiResponse({ status: 201, description: 'AI response received', type: SendMessageResponseDto })
  @ApiResponse({ status: 400, description: 'Usage limit reached or provider error' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(userId, dto);
  }

  @Post('send/stream')
  @Sse()
  @ApiOperation({
    summary: 'Send a message to AI (Streaming)',
    description:
      'Send a prompt and receive the AI response as a real-time Server-Sent Events (SSE) stream. Each event contains a partial content chunk. The final event has `{ "done": true }`. This is ideal for displaying the response as it is being generated.',
  })
  @ApiResponse({ status: 200, description: 'SSE stream of AI response chunks' })
  @ApiResponse({ status: 400, description: 'Usage limit reached or provider error' })
  async sendMessageStream(
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ): Promise<Observable<MessageEvent>> {
    return this.chatService.sendMessageStream(userId, dto);
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'List all conversations',
    description: 'Get all chat conversations for the current user, ordered by most recent.',
  })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async getConversations(@CurrentUser('id') userId: string) {
    return this.chatService.getConversations(userId);
  }

  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Get conversation messages',
    description: 'Get all messages in a specific conversation.',
  })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Conversation with messages' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversationMessages(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.chatService.getConversationMessages(userId, conversationId);
  }

  @Post('conversations')
  @ApiOperation({
    summary: 'Create new conversation',
    description: 'Create a new empty conversation.',
  })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  async createConversation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createConversation(userId, dto.title);
  }

  @Delete('conversations/:id')
  @ApiOperation({
    summary: 'Delete conversation',
    description: 'Delete a conversation and all its messages.',
  })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Conversation deleted' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async deleteConversation(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.chatService.deleteConversation(userId, conversationId);
  }

  @Patch('conversations/:id')
  @ApiOperation({
    summary: 'Rename conversation',
    description: 'Update the title of an existing conversation.',
  })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Conversation updated' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async updateConversation(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.chatService.updateConversation(userId, conversationId, dto.title);
  }
}
