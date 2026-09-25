import { ApiProperty } from '@nestjs/swagger';

export class ChatMessageResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'ASSISTANT' })
  role: string;

  @ApiProperty({ example: 'Quantum computing uses qubits instead of classical bits...' })
  content: string;

  @ApiProperty({ example: 'gpt-4o-mini' })
  modelUsed: string;

  @ApiProperty({ example: 245 })
  tokensUsed: number;

  @ApiProperty({ example: 1250 })
  responseTimeMs: number;
}

export class SendMessageResponseDto {
  @ApiProperty({ example: 'Message sent successfully' })
  message: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  conversationId: string;

  @ApiProperty({ type: ChatMessageResponseDto })
  userMessage: ChatMessageResponseDto;

  @ApiProperty({ type: ChatMessageResponseDto })
  aiResponse: ChatMessageResponseDto;
}
