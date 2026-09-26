import { PrismaClient, ProviderType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrator with full access',
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      description: 'Regular user with standard access',
    },
  });

  const hashedPassword = await bcrypt.hash('Admin@123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@echogpt.com' },
    update: {},
    create: {
      email: 'admin@echogpt.com',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isEmailVerified: true,
      roleId: adminRole.id,
      subscription: {
        create: {
          plan: 'PREMIUM',
          status: 'ACTIVE',
          maxRequestsPerDay: 10000,
        },
      },
    },
  });

  const providers = [
    {
      name: 'OpenAI',
      slug: 'openai',
      type: ProviderType.OPENAI,
      defaultModel: 'gpt-4o-mini',
      isEnabled: true,
      isDefault: true,
      config: { maxTokens: 4096, temperature: 0.7 },
    },
    {
      name: 'Claude (Anthropic)',
      slug: 'claude',
      type: ProviderType.CLAUDE,
      defaultModel: 'claude-3-5-sonnet-20241022',
      isEnabled: true,
      isDefault: false,
      config: { maxTokens: 4096, temperature: 0.7 },
    },
    {
      name: 'Google Gemini',
      slug: 'gemini',
      type: ProviderType.GEMINI,
      defaultModel: 'gemini-1.5-flash',
      isEnabled: true,
      isDefault: false,
      config: { maxTokens: 4096, temperature: 0.7 },
    },
  ];

  for (const provider of providers) {
    await prisma.aiProvider.upsert({
      where: { slug: provider.slug },
      update: {},
      create: provider,
    });
  }
}

main()
  .catch((e) => {
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
