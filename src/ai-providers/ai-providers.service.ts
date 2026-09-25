import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionUtil } from '../common/utils/encryption.util';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { OpenAiProvider } from './providers/openai.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { BaseAiProvider } from './providers/base-ai.provider';

@Injectable()
export class AiProvidersService {
  private readonly logger = new Logger(AiProvidersService.name);
  private readonly encryptionKey: string;
  private readonly providers: Map<string, BaseAiProvider>;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private openAiProvider: OpenAiProvider,
    private claudeProvider: ClaudeProvider,
    private geminiProvider: GeminiProvider,
  ) {
    this.encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') || 'default-key-change-in-production!!';

    // Map provider types to their implementations
    this.providers = new Map<string, BaseAiProvider>([
      ['OPENAI', this.openAiProvider],
      ['CLAUDE', this.claudeProvider],
      ['GEMINI', this.geminiProvider],
    ]);
  }

  /**
   * List all AI providers (hides API keys)
   */
  async findAll() {
    const providers = await this.prisma.aiProvider.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return providers.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      type: p.type,
      defaultModel: p.defaultModel,
      isEnabled: p.isEnabled,
      isDefault: p.isDefault,
      healthStatus: p.healthStatus,
      lastHealthCheck: p.lastHealthCheck,
      config: p.config,
      hasApiKey: !!p.apiKeyEncrypted,
      createdAt: p.createdAt,
    }));
  }

  /**
   * Get a single provider by ID
   */
  async findOne(id: string) {
    const provider = await this.prisma.aiProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException('AI Provider not found');
    }

    return {
      ...provider,
      apiKeyEncrypted: undefined,
      hasApiKey: !!provider.apiKeyEncrypted,
    };
  }

  /**
   * Create a new AI provider
   */
  async create(dto: CreateProviderDto) {
    // Encrypt API key if provided
    let apiKeyEncrypted: string | null = null;
    if (dto.apiKey) {
      apiKeyEncrypted = EncryptionUtil.encrypt(dto.apiKey, this.encryptionKey);
    }

    // If this provider is set as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.aiProvider.updateMany({
        data: { isDefault: false },
      });
    }

    const provider = await this.prisma.aiProvider.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        type: dto.type as any,
        apiKeyEncrypted,
        defaultModel: dto.defaultModel,
        isEnabled: dto.isEnabled ?? true,
        isDefault: dto.isDefault ?? false,
        config: dto.config || {},
      },
    });

    this.logger.log(`AI Provider created: ${provider.name}`);

    return {
      message: 'AI Provider created successfully',
      provider: {
        id: provider.id,
        name: provider.name,
        slug: provider.slug,
        type: provider.type,
        isEnabled: provider.isEnabled,
        isDefault: provider.isDefault,
      },
    };
  }

  /**
   * Update an AI provider
   */
  async update(id: string, dto: UpdateProviderDto) {
    const existing = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('AI Provider not found');
    }

    const updateData: any = {};

    if (dto.name) updateData.name = dto.name;
    if (dto.defaultModel) updateData.defaultModel = dto.defaultModel;
    if (dto.isEnabled !== undefined) updateData.isEnabled = dto.isEnabled;
    if (dto.config) updateData.config = dto.config;

    if (dto.apiKey) {
      updateData.apiKeyEncrypted = EncryptionUtil.encrypt(dto.apiKey, this.encryptionKey);
    }

    if (dto.isDefault) {
      await this.prisma.aiProvider.updateMany({
        data: { isDefault: false },
      });
      updateData.isDefault = true;
    }

    const provider = await this.prisma.aiProvider.update({
      where: { id },
      data: updateData,
    });

    return {
      message: 'AI Provider updated successfully',
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        isEnabled: provider.isEnabled,
        isDefault: provider.isDefault,
      },
    };
  }

  /**
   * Delete an AI provider
   */
  async remove(id: string) {
    const existing = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('AI Provider not found');
    }

    await this.prisma.aiProvider.delete({ where: { id } });

    this.logger.log(`AI Provider deleted: ${existing.name}`);

    return { message: 'AI Provider deleted successfully' };
  }

  /**
   * Enable or disable a provider
   */
  async toggle(id: string) {
    const existing = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('AI Provider not found');
    }

    const provider = await this.prisma.aiProvider.update({
      where: { id },
      data: { isEnabled: !existing.isEnabled },
    });

    return {
      message: `Provider ${provider.isEnabled ? 'enabled' : 'disabled'} successfully`,
      isEnabled: provider.isEnabled,
    };
  }

  /**
   * Run health check on a provider
   */
  async healthCheck(id: string) {
    const dbProvider = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!dbProvider) {
      throw new NotFoundException('AI Provider not found');
    }

    if (!dbProvider.apiKeyEncrypted) {
      throw new BadRequestException('No API key configured for this provider');
    }

    // Decrypt API key
    const apiKey = EncryptionUtil.decrypt(dbProvider.apiKeyEncrypted, this.encryptionKey);

    // Get the provider implementation
    const providerImpl = this.providers.get(dbProvider.type);
    if (!providerImpl) {
      throw new BadRequestException(`Unknown provider type: ${dbProvider.type}`);
    }

    // Run health check
    const result = await providerImpl.healthCheck(apiKey);

    // Update health status in DB
    await this.prisma.aiProvider.update({
      where: { id },
      data: {
        healthStatus: result.status,
        lastHealthCheck: new Date(),
      },
    });

    return {
      provider: dbProvider.name,
      ...result,
    };
  }

  /**
   * Get provider implementation and API key for chat (used internally by ChatService)
   */
  async getProviderForChat(providerId?: string) {
    let dbProvider;

    if (providerId) {
      dbProvider = await this.prisma.aiProvider.findUnique({
        where: { id: providerId },
      });
    } else {
      // Use default provider
      dbProvider = await this.prisma.aiProvider.findFirst({
        where: { isDefault: true, isEnabled: true },
      });

      // Fallback to any enabled provider
      if (!dbProvider) {
        dbProvider = await this.prisma.aiProvider.findFirst({
          where: { isEnabled: true },
        });
      }
    }

    if (!dbProvider) {
      throw new NotFoundException('No AI provider available');
    }

    if (!dbProvider.isEnabled) {
      throw new BadRequestException('Selected AI provider is disabled');
    }

    if (!dbProvider.apiKeyEncrypted) {
      throw new BadRequestException('No API key configured for this provider');
    }

    const apiKey = EncryptionUtil.decrypt(dbProvider.apiKeyEncrypted, this.encryptionKey);
    const providerImpl = this.providers.get(dbProvider.type);

    if (!providerImpl) {
      throw new BadRequestException(`Unknown provider type: ${dbProvider.type}`);
    }

    return {
      provider: dbProvider,
      apiKey,
      implementation: providerImpl,
    };
  }
}
