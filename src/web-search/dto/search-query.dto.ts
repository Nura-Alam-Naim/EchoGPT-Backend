import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({
    example: 'Latest developments in quantum computing 2024',
    description: 'The search query to process',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'AI Provider ID for generating search summary (optional)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  providerId?: string;
}
