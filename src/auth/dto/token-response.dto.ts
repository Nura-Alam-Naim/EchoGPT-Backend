import { ApiProperty } from '@nestjs/swagger';

export class TokenResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...', description: 'JWT access token (short-lived)' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...', description: 'JWT refresh token (long-lived)' })
  refreshToken: string;

  @ApiProperty({ example: '2024-12-31T23:59:59.000Z', description: 'Access token expiration time' })
  expiresAt: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'Login successful' })
  message: string;

  @ApiProperty({ type: TokenResponseDto })
  tokens: TokenResponseDto;

  @ApiProperty({
    example: {
      id: 'uuid',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'USER',
    },
  })
  user: any;
}
