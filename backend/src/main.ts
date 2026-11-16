import 'reflect-metadata';

import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  validateEnvironment();

  const isProduction = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule, {
    logger: isProduction
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Security headers
  app.use(helmet());

  // Parse cookies if you use authentication/session cookies
  app.use(cookieParser());

  // Response compression
  app.use(compression());

  // CORS: set an explicit allowlist in production
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map((origin) =>
    origin.trim(),
  );

  app.enableCors({
    origin: allowedOrigins?.length ? allowedOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Reject unknown and malformed request data
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove properties not defined in DTO
      forbidNonWhitelisted: true, // throw an error instead of silently removing
      transform: true, // convert payloads to DTO instances/types
      transformOptions: {
        enableImplicitConversion: true,
      },
      validationError: {
        target: false, // do not leak DTO internals in errors
        value: false,
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Transportation Management System API')
    .setDescription('TMS Backend API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api/docs', app, document);

  // Optional but useful for API clients
  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/live', 'health/ready'],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Run onModuleDestroy/beforeApplicationShutdown/onApplicationShutdown
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen(port, host);

  logger.log(
    `Backend is running on http://${host}:${port} [${process.env.NODE_ENV ?? 'development'}]`,
  );

  console.log(`Swagger: http://localhost:${port}/api/docs`);

}



function validateEnvironment(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  // const isProduction = process.env.NODE_ENV === 'development';

  console.log('process.env.NODE_ENV ===========> ', process.env.NODE_ENV);
  console.log('isProduction ===========> ', isProduction);

  const required = isProduction
    ? ['NODE_ENV', 'PORT', 'DATABASE_URL', 'CORS_ORIGINS']
    : ['NODE_ENV', 'PORT'];

  console.log('required ===========> ', required);

  const missing = required.filter((key) => !process.env[key]);

  console.log('missing ===========> ', missing);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}

await bootstrap();
