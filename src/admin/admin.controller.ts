import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin')
@ApiBearerAuth('JWT-Auth')
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Dashboard statistics',
    description: 'Get an overview of system statistics including user counts, message volumes, and API usage.',
  })
  @ApiResponse({ status: 200, description: 'Dashboard stats', type: DashboardStatsDto })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({
    summary: 'List all users',
    description: 'Get a paginated list of all users with their subscription and usage data.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  async getUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.adminService.getUsers(page, limit);
  }

  @Patch('users/:id/role')
  @ApiOperation({
    summary: 'Change user role',
    description: 'Change a user\'s role (e.g., USER to ADMIN or vice versa).',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 404, description: 'User or role not found' })
  async changeUserRole(
    @Param('id') userId: string,
    @Body() body: { role: string },
  ) {
    return this.adminService.changeUserRole(userId, body.role);
  }

  @Delete('users/:id')
  @ApiOperation({
    summary: 'Delete user',
    description: 'Permanently delete a user and all their data.',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') userId: string) {
    return this.adminService.deleteUser(userId);
  }

  @Get('subscriptions')
  @ApiOperation({
    summary: 'List all subscriptions',
    description: 'Get a paginated list of all user subscriptions.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated subscription list' })
  async getSubscriptions(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.adminService.getSubscriptions(page, limit);
  }

  @Get('usage-analytics')
  @ApiOperation({
    summary: 'API usage analytics',
    description: 'Get detailed analytics on API usage, top models, average response times, and token consumption.',
  })
  @ApiResponse({ status: 200, description: 'Usage analytics data' })
  async getUsageAnalytics() {
    return this.adminService.getUsageAnalytics();
  }

  @Get('request-logs')
  @ApiOperation({
    summary: 'View request logs',
    description: 'Get paginated API request logs showing endpoint usage, status codes, and response times.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiResponse({ status: 200, description: 'Paginated request logs' })
  async getRequestLogs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    return this.adminService.getRequestLogs(page, limit);
  }

  @Get('system-health')
  @ApiOperation({
    summary: 'System health check',
    description: 'Get overall system health including database status, AI provider statuses, memory usage, and uptime.',
  })
  @ApiResponse({ status: 200, description: 'System health status' })
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }
}
