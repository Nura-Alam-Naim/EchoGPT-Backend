import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({ example: 1250 })
  totalUsers: number;

  @ApiProperty({ example: 350 })
  premiumUsers: number;

  @ApiProperty({ example: 15230 })
  totalChats: number;

  @ApiProperty({ example: 4521 })
  totalSearches: number;

  @ApiProperty({ example: 3 })
  activeProviders: number;

  @ApiProperty({ example: 98.5 })
  systemHealthPercent: number;

  @ApiProperty({
    example: { today: 542, thisWeek: 3210, thisMonth: 12400 },
  })
  apiUsage: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}
