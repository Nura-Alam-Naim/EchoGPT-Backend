import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'FREE' })
  plan: string;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({ example: 20 })
  maxRequestsPerDay: number;

  @ApiProperty({ example: 5 })
  usedRequestsToday: number;

  @ApiProperty({ example: 15 })
  remainingRequests: number;
}
