import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SubscriptionPlanDto } from './create-subscription.dto';

export class UpdateSubscriptionDto {
  @ApiProperty({ enum: SubscriptionPlanDto, example: 'FREE', description: 'New subscription plan' })
  @IsEnum(SubscriptionPlanDto)
  plan: SubscriptionPlanDto;
}
