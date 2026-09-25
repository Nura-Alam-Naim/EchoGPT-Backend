import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsOptional, IsBoolean, IsObject } from 'class-validator';

export enum ProviderTypeDto {
  OPENAI = 'OPENAI',
  CLAUDE = 'CLAUDE',
  GEMINI = 'GEMINI',
}

export class CreateProviderDto {
  @ApiProperty({ example: 'OpenAI GPT-4', description: 'Provider display name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'openai-gpt4', description: 'URL-friendly slug' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ enum: ProviderTypeDto, example: 'OPENAI', description: 'Provider type' })
  @IsEnum(ProviderTypeDto)
  type: ProviderTypeDto;

  @ApiProperty({ example: 'sk-your-api-key', description: 'API key for the provider', required: false })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiProperty({ example: 'gpt-4o-mini', description: 'Default model to use', required: false })
  @IsOptional()
  @IsString()
  defaultModel?: string;

  @ApiProperty({ example: true, description: 'Whether the provider is enabled', required: false })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiProperty({ example: false, description: 'Set as default provider', required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ example: { maxTokens: 4096, temperature: 0.7 }, description: 'Provider configuration', required: false })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
