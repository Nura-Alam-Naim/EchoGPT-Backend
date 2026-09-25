import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { WebSearchService } from './web-search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResponseDto } from './dto/search-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Web Search')
@ApiBearerAuth('JWT-Auth')
@Controller('search')
export class WebSearchController {
  constructor(private readonly webSearchService: WebSearchService) {}

  @Post()
  @ApiOperation({
    summary: 'Perform AI-powered web search',
    description:
      'Submit a search query and receive an AI-generated summary along with relevant results. Results are cached for 1 hour.',
  })
  @ApiResponse({ status: 201, description: 'Search results', type: SearchResponseDto })
  @ApiResponse({ status: 400, description: 'Usage limit reached' })
  async search(
    @CurrentUser('id') userId: string,
    @Body() dto: SearchQueryDto,
  ) {
    return this.webSearchService.search(userId, dto);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get search history',
    description: 'Returns the last 50 searches performed by the current user.',
  })
  @ApiResponse({ status: 200, description: 'Search history list' })
  async getHistory(@CurrentUser('id') userId: string) {
    return this.webSearchService.getHistory(userId);
  }

  @Get('recent')
  @ApiOperation({
    summary: 'Get recent searches',
    description: 'Returns the 10 most recent searches.',
  })
  @ApiResponse({ status: 200, description: 'Recent searches' })
  async getRecent(@CurrentUser('id') userId: string) {
    return this.webSearchService.getRecent(userId);
  }

  @Get('suggestions')
  @ApiOperation({
    summary: 'Get search suggestions',
    description: 'Get autocomplete suggestions based on past searches.',
  })
  @ApiQuery({ name: 'q', description: 'Partial search query (min 2 chars)', example: 'quantum' })
  @ApiResponse({ status: 200, description: 'Search suggestions array' })
  async getSuggestions(
    @CurrentUser('id') userId: string,
    @Query('q') query: string,
  ) {
    return this.webSearchService.getSuggestions(userId, query);
  }

  @Delete('history/:id')
  @ApiOperation({
    summary: 'Delete search from history',
    description: 'Remove a specific search entry from history.',
  })
  @ApiParam({ name: 'id', description: 'Search UUID' })
  @ApiResponse({ status: 200, description: 'Search deleted' })
  @ApiResponse({ status: 404, description: 'Search not found' })
  async deleteSearch(
    @CurrentUser('id') userId: string,
    @Param('id') searchId: string,
  ) {
    return this.webSearchService.deleteSearch(userId, searchId);
  }
}
