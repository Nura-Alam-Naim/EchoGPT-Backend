import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Register a new user account
   */
  async register(dto: RegisterDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Get default USER role
    const userRole = await this.prisma.role.findUnique({
      where: { name: 'USER' },
    });

    if (!userRole) {
      throw new BadRequestException('System error: Default role not found. Please run database seed.');
    }

    // Hash password with bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create user with a FREE subscription
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: userRole.id,
        emailVerificationToken,
        subscription: {
          create: {
            plan: 'FREE',
            status: 'ACTIVE',
            maxRequestsPerDay: 20,
          },
        },
      },
      include: { role: true },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role.name);

    // Create session
    await this.createSession(user.id, tokens.refreshToken);

    this.logger.log(`New user registered: ${user.email}`);

    return {
      message: 'Registration successful',
      tokens,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Log in with email and password
   */
  async login(dto: LoginDto) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role.name);

    // Create session
    await this.createSession(user.id, tokens.refreshToken);

    this.logger.log(`User logged in: ${user.email}`);

    return {
      message: 'Login successful',
      tokens,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Log out - invalidate the refresh token
   */
  async logout(userId: string) {
    // Delete all sessions for this user
    await this.prisma.session.deleteMany({
      where: { userId },
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Refresh access token using a valid refresh token
   */
  async refreshTokens(userId: string, refreshToken: string) {
    // Hash the incoming refresh token to compare with stored hash
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // Find the session with this refresh token
    const session = await this.prisma.session.findFirst({
      where: {
        userId,
        refreshTokenHash,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Get user data
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role.name);

    // Update session with new refresh token
    const newRefreshTokenHash = crypto
      .createHash('sha256')
      .update(tokens.refreshToken)
      .digest('hex');

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      message: 'Tokens refreshed successfully',
      tokens,
    };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  // ─── Private Helper Methods ───

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: 900, // 15 minutes in seconds
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: 604800, // 7 days in seconds
      }),
    ]);

    // Calculate expiration time for the access token
    const decoded = this.jwtService.decode(accessToken) as any;
    const expiresAt = new Date(decoded.exp * 1000).toISOString();

    return { accessToken, refreshToken, expiresAt };
  }

  /**
   * Create a new session (stores hashed refresh token)
   */
  private async createSession(userId: string, refreshToken: string) {
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  }

  /**
   * Remove sensitive fields from user object before returning
   */
  private sanitizeUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role?.name || 'USER',
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };
  }
}
