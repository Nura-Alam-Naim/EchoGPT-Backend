import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    example: 'Explain quantum computing in simple terms',
    description: 'The message/prompt to send to the AI',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Conversation ID (omit to create a new conversation)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'AI Provider ID (omit to use default provider)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @ApiProperty({
    example: 'gpt-4o-mini',
    description: 'Specific model to use (overrides provider default)',
    required: false,
  })
  @IsOptional()
  @IsString()
  model?: string;
}
