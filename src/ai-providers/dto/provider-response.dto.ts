import { ApiProperty } from '@nestjs/swagger';

export class ProviderResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'OpenAI' })
  name: string;

  @ApiProperty({ example: 'openai' })
  slug: string;

  @ApiProperty({ example: 'OPENAI' })
  type: string;

  @ApiProperty({ example: 'gpt-4o-mini' })
  defaultModel: string;

  @ApiProperty({ example: true })
  isEnabled: boolean;

  @ApiProperty({ example: true })
  isDefault: boolean;

  @ApiProperty({ example: 'HEALTHY' })
  healthStatus: string;
}
