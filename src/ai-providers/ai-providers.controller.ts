import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AiProvidersService } from './ai-providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProviderResponseDto } from './dto/provider-response.dto';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('AI Providers')
@ApiBearerAuth('JWT-Auth')
@Controller('providers')
export class AiProvidersController {
  constructor(private readonly aiProvidersService: AiProvidersService) {}

  @Get()
  @ApiOperation({
    summary: 'List all AI providers',
    description: 'Returns all configured AI providers. API keys are never exposed.',
  })
  @ApiResponse({ status: 200, description: 'List of providers', type: [ProviderResponseDto] })
  async findAll() {
    return this.aiProvidersService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get provider details (Admin)',
    description: 'Get detailed information about a specific AI provider.',
  })
  @ApiParam({ name: 'id', description: 'Provider UUID' })
  @ApiResponse({ status: 200, description: 'Provider details', type: ProviderResponseDto })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async findOne(@Param('id') id: string) {
    return this.aiProvidersService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Add new AI provider (Admin)',
    description: 'Create a new AI provider. API keys are encrypted before storage.',
  })
  @ApiResponse({ status: 201, description: 'Provider created' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async create(@Body() dto: CreateProviderDto) {
    return this.aiProvidersService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Update AI provider (Admin)',
    description: 'Update an existing AI provider configuration.',
  })
  @ApiParam({ name: 'id', description: 'Provider UUID' })
  @ApiResponse({ status: 200, description: 'Provider updated' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateProviderDto) {
    return this.aiProvidersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Delete AI provider (Admin)',
    description: 'Permanently delete an AI provider.',
  })
  @ApiParam({ name: 'id', description: 'Provider UUID' })
  @ApiResponse({ status: 200, description: 'Provider deleted' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async remove(@Param('id') id: string) {
    return this.aiProvidersService.remove(id);
  }

  @Patch(':id/toggle')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Toggle provider (Admin)',
    description: 'Enable or disable an AI provider.',
  })
  @ApiParam({ name: 'id', description: 'Provider UUID' })
  @ApiResponse({ status: 200, description: 'Provider toggled' })
  async toggle(@Param('id') id: string) {
    return this.aiProvidersService.toggle(id);
  }

  @Get(':id/health')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Health check (Admin)',
    description: 'Test if the AI provider API is reachable and the API key is valid.',
  })
  @ApiParam({ name: 'id', description: 'Provider UUID' })
  @ApiResponse({ status: 200, description: 'Health check result' })
  async healthCheck(@Param('id') id: string) {
    return this.aiProvidersService.healthCheck(id);
  }
}
