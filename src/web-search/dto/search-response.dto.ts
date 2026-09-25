import { ApiProperty } from '@nestjs/swagger';

export class SearchResultDto {
  @ApiProperty({ example: 'Quantum Computing Breakthrough' })
  title: string;

  @ApiProperty({ example: 'https://example.com/article' })
  url: string;

  @ApiProperty({ example: 'Researchers have achieved a major breakthrough in...' })
  snippet: string;
}

export class SearchResponseDto {
  @ApiProperty({ example: 'Latest developments in quantum computing 2024' })
  query: string;

  @ApiProperty({ example: 'Based on recent developments, quantum computing has...' })
  aiSummary: string;

  @ApiProperty({ type: [SearchResultDto] })
  results: SearchResultDto[];

  @ApiProperty({ example: false })
  isCached: boolean;

  @ApiProperty({ example: 1250 })
  responseTimeMs: number;
}
