import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsObject } from 'class-validator';

export class UpdateProviderDto {
  @ApiProperty({ example: 'OpenAI GPT-4 Turbo', description: 'Updated provider name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'sk-new-api-key', description: 'Updated API key', required: false })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiProperty({ example: 'gpt-4-turbo', description: 'Updated default model', required: false })
  @IsOptional()
  @IsString()
  defaultModel?: string;

  @ApiProperty({ example: true, description: 'Enable/disable provider', required: false })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiProperty({ example: true, description: 'Set as default provider', required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ example: { maxTokens: 8192 }, description: 'Updated configuration', required: false })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
