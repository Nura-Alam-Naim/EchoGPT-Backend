import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ConversationResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Quantum Computing Discussion' })
  title: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: 2 })
  messageCount: number;
}

export class CreateConversationDto {
  @ApiProperty({ example: 'My New Chat', description: 'Conversation title', required: false })
  @IsOptional()
  @IsString()
  title?: string;
}

export class UpdateConversationDto {
  @ApiProperty({ example: 'Renamed Conversation', description: 'New conversation title' })
  @IsString()
  title: string;
}
