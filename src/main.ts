import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ApiLoggerInterceptor } from './common/interceptors/api-logger.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');

  app.use(helmet());

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error if unknown properties
      transform: true,        // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(new ApiLoggerInterceptor());

  const config = new DocumentBuilder()
    .setTitle('EchoGPT API')
    .setDescription(
      `## EchoGPT Backend REST API

A production-ready backend for the EchoGPT Chrome Extension.
Supports multiple AI providers (OpenAI, Claude, Gemini), chat management,
web search, subscription management, and admin analytics.

### Authentication
Most endpoints require JWT Bearer token authentication.
Use the \`/api/auth/login\` endpoint to obtain tokens.`,
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token',
      },
      'JWT-Auth',
    )
    .addTag('Authentication', 'User registration, login, logout, and token management')
    .addTag('Users', 'User profile and account management')
    .addTag('Subscriptions', 'Subscription plans, usage limits, and billing')
    .addTag('AI Providers', 'Manage AI providers (OpenAI, Claude, Gemini)')
    .addTag('Chat', 'Chat conversations and AI messaging')
    .addTag('Web Search', 'AI-powered web search')
    .addTag('Admin', 'Admin dashboard and system management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'EchoGPT API Documentation',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`EchoGPT API is running on: http://localhost:${port}`);
  logger.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();
