import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum SubscriptionPlanDto {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
}

export class CreateSubscriptionDto {
  @ApiProperty({ enum: SubscriptionPlanDto, example: 'PREMIUM', description: 'Subscription plan' })
  @IsEnum(SubscriptionPlanDto)
  plan: SubscriptionPlanDto;
}
