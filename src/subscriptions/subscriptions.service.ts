import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  private readonly PLAN_LIMITS = {
    FREE: { maxRequestsPerDay: 20 },
    PREMIUM: { maxRequestsPerDay: 1000 },
  };

  constructor(private prisma: PrismaService) {}

  async getStatus(userId: string) {
    const subscription = await this.findSubscription(userId);

    await this.resetDailyUsageIfNeeded(subscription);

    return {
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      maxRequestsPerDay: subscription.maxRequestsPerDay,
      usedRequestsToday: subscription.usedRequestsToday,
      remainingRequests: subscription.maxRequestsPerDay - subscription.usedRequestsToday,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }

  async upgrade(userId: string) {
    const subscription = await this.findSubscription(userId);

    if (subscription.plan === 'PREMIUM') {
      throw new BadRequestException('You are already on the Premium plan');
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        plan: 'PREMIUM',
        status: 'ACTIVE',
        maxRequestsPerDay: this.PLAN_LIMITS.PREMIUM.maxRequestsPerDay,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    this.logger.log(`User ${userId} upgraded to PREMIUM`);

    return {
      message: 'Successfully upgraded to Premium!',
      subscription: {
        plan: updated.plan,
        status: updated.status,
        maxRequestsPerDay: updated.maxRequestsPerDay,
        currentPeriodEnd: updated.currentPeriodEnd,
      },
    };
  }

  async downgrade(userId: string) {
    const subscription = await this.findSubscription(userId);

    if (subscription.plan === 'FREE') {
      throw new BadRequestException('You are already on the Free plan');
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        plan: 'FREE',
        status: 'ACTIVE',
        maxRequestsPerDay: this.PLAN_LIMITS.FREE.maxRequestsPerDay,
        currentPeriodEnd: null,
      },
    });

    this.logger.log(`User ${userId} downgraded to FREE`);

    return {
      message: 'Downgraded to Free plan',
      subscription: {
        plan: updated.plan,
        status: updated.status,
        maxRequestsPerDay: updated.maxRequestsPerDay,
      },
    };
  }

  async getUsage(userId: string) {
    const subscription = await this.findSubscription(userId);
    await this.resetDailyUsageIfNeeded(subscription);

    return {
      plan: subscription.plan,
      usedRequestsToday: subscription.usedRequestsToday,
      maxRequestsPerDay: subscription.maxRequestsPerDay,
      remainingRequests: subscription.maxRequestsPerDay - subscription.usedRequestsToday,
      usagePercentage: Math.round(
        (subscription.usedRequestsToday / subscription.maxRequestsPerDay) * 100,
      ),
    };
  }

  async getRemaining(userId: string) {
    const subscription = await this.findSubscription(userId);
    await this.resetDailyUsageIfNeeded(subscription);

    const remaining = subscription.maxRequestsPerDay - subscription.usedRequestsToday;

    return {
      remainingRequests: remaining,
      maxRequestsPerDay: subscription.maxRequestsPerDay,
      canMakeRequest: remaining > 0,
    };
  }

  async incrementUsage(userId: string): Promise<boolean> {
    const subscription = await this.findSubscription(userId);
    await this.resetDailyUsageIfNeeded(subscription);

    if (subscription.usedRequestsToday >= subscription.maxRequestsPerDay) {
      return false; // Usage limit reached
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { usedRequestsToday: { increment: 1 } },
    });

    return true;
  }

  private async findSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  private async resetDailyUsageIfNeeded(subscription: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastUpdate = new Date(subscription.updatedAt);
    lastUpdate.setHours(0, 0, 0, 0);

    if (today > lastUpdate) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { usedRequestsToday: 0 },
      });
      subscription.usedRequestsToday = 0;
    }
  }
}
