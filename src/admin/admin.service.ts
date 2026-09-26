import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalUsers,
      premiumUsers,
      totalChats,
      totalMessages,
      totalSearches,
      activeProviders,
      todayUsage,
      weekUsage,
      monthUsage,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.subscription.count({ where: { plan: 'PREMIUM' } }),
      this.prisma.chatConversation.count(),
      this.prisma.chatMessage.count(),
      this.prisma.webSearch.count(),
      this.prisma.aiProvider.count({ where: { isEnabled: true } }),
      this.getUsageCount('today'),
      this.getUsageCount('week'),
      this.getUsageCount('month'),
    ]);

    return {
      totalUsers,
      premiumUsers,
      freeUsers: totalUsers - premiumUsers,
      totalConversations: totalChats,
      totalMessages,
      totalSearches,
      activeProviders,
      apiUsage: {
        today: todayUsage,
        thisWeek: weekUsage,
        thisMonth: monthUsage,
      },
    };
  }

  async getUsers(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          role: true,
          subscription: true,
          _count: {
            select: {
              conversations: true,
              webSearches: true,
            },
          },
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role.name,
        isEmailVerified: u.isEmailVerified,
        subscription: u.subscription
          ? { plan: u.subscription.plan, status: u.subscription.status }
          : null,
        conversationCount: u._count.conversations,
        searchCount: u._count.webSearches,
        createdAt: u.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async changeUserRole(userId: string, roleName: string) {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { roleId: role.id },
      include: { role: true },
    });

    this.logger.log(`User ${user.email} role changed to ${roleName}`);

    return {
      message: `User role updated to ${roleName}`,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
      },
    };
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id: userId } });

    this.logger.log(`Admin deleted user: ${user.email}`);

    return { message: 'User deleted successfully' };
  }

  async getSubscriptions(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.subscription.count(),
    ]);

    return {
      subscriptions: subscriptions.map((s) => ({
        id: s.id,
        userEmail: s.user.email,
        userName: `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim(),
        plan: s.plan,
        status: s.status,
        maxRequestsPerDay: s.maxRequestsPerDay,
        usedRequestsToday: s.usedRequestsToday,
        currentPeriodEnd: s.currentPeriodEnd,
        createdAt: s.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUsageAnalytics() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const dailyMessages = await this.prisma.chatMessage.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: weekAgo } },
      _count: true,
    });

    const topModels = await this.prisma.chatMessage.groupBy({
      by: ['modelUsed'],
      where: { modelUsed: { not: null } },
      _count: { modelUsed: true },
      orderBy: { _count: { modelUsed: 'desc' } },
      take: 5,
    });

    const avgResponseTime = await this.prisma.chatMessage.aggregate({
      where: { responseTimeMs: { not: null } },
      _avg: { responseTimeMs: true, tokensUsed: true },
    });

    return {
      topModels: topModels.map((m) => ({
        model: m.modelUsed,
        count: m._count.modelUsed,
      })),
      averageResponseTimeMs: Math.round(avgResponseTime._avg.responseTimeMs || 0),
      averageTokensUsed: Math.round(avgResponseTime._avg.tokensUsed || 0),
      totalMessagesToday: await this.prisma.chatMessage.count({
        where: { createdAt: { gte: today } },
      }),
      totalSearchesToday: await this.prisma.webSearch.count({
        where: { createdAt: { gte: today } },
      }),
    };
  }

  async getRequestLogs(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.apiUsageLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true } },
        },
      }),
      this.prisma.apiUsageLog.count(),
    ]);

    return {
      logs: logs.map((l) => ({
        id: l.id,
        userEmail: l.user?.email || 'anonymous',
        endpoint: l.endpoint,
        method: l.method,
        statusCode: l.statusCode,
        responseTimeMs: l.responseTimeMs,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSystemHealth() {
    const startTime = Date.now();

    let dbStatus = 'HEALTHY';
    let dbResponseMs = 0;
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbResponseMs = Date.now() - dbStart;
    } catch {
      dbStatus = 'UNHEALTHY';
    }

    const providers = await this.prisma.aiProvider.findMany({
      where: { isEnabled: true },
      select: {
        name: true,
        healthStatus: true,
        lastHealthCheck: true,
      },
    });

    const memoryUsage = process.memoryUsage();

    return {
      status: dbStatus === 'HEALTHY' ? 'HEALTHY' : 'DEGRADED',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        responseTimeMs: dbResponseMs,
      },
      aiProviders: providers.map((p) => ({
        name: p.name,
        status: p.healthStatus || 'UNKNOWN',
        lastCheck: p.lastHealthCheck,
      })),
      memory: {
        heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      },
      responseTimeMs: Date.now() - startTime,
    };
  }

  private async getUsageCount(period: 'today' | 'week' | 'month') {
    const now = new Date();
    let since: Date;

    switch (period) {
      case 'today':
        since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        since = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    return this.prisma.chatMessage.count({
      where: { createdAt: { gte: since } },
    });
  }
}
