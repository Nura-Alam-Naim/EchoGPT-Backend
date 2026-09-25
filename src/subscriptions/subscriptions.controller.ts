import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Subscriptions')
@ApiBearerAuth('JWT-Auth')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Get subscription status',
    description: 'Returns the current subscription plan, status, and usage limits.',
  })
  @ApiResponse({ status: 200, description: 'Subscription status', type: SubscriptionResponseDto })
  async getStatus(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getStatus(userId);
  }

  @Post('upgrade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upgrade to Premium',
    description: 'Upgrade the current subscription to the Premium plan (1000 requests/day).',
  })
  @ApiResponse({ status: 200, description: 'Upgraded successfully' })
  @ApiResponse({ status: 400, description: 'Already on Premium' })
  async upgrade(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.upgrade(userId);
  }

  @Post('downgrade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Downgrade to Free',
    description: 'Downgrade the current subscription to the Free plan (20 requests/day).',
  })
  @ApiResponse({ status: 200, description: 'Downgraded successfully' })
  @ApiResponse({ status: 400, description: 'Already on Free' })
  async downgrade(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.downgrade(userId);
  }

  @Get('usage')
  @ApiOperation({
    summary: 'Get usage statistics',
    description: 'Returns today\'s API usage count and percentage against daily limit.',
  })
  @ApiResponse({ status: 200, description: 'Usage statistics' })
  async getUsage(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getUsage(userId);
  }

  @Get('remaining')
  @ApiOperation({
    summary: 'Get remaining requests',
    description: 'Returns the number of API requests remaining for today.',
  })
  @ApiResponse({ status: 200, description: 'Remaining requests count' })
  async getRemaining(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getRemaining(userId);
  }
}
