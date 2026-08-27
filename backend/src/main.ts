import * as Sentry from '@sentry/node';
Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { createNabdahOpenApiDocument } from './config/openapi.config';
import { ConfiguredIoAdapter } from './config/configured-io.adapter';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { SentryExceptionFilter } from './common/sentry.filter';
const cookieParser = require('cookie-parser');
const compression = require('compression');
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

async function bootstrap() {
  const loggerConfig = process.env.NODE_ENV === 'production'
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.simple());

  // M0-07: in-memory Mongo is a dev/test convenience — it must never run in production,
  // because it silently replaces the real database with an empty ephemeral one.
  if (process.env.USE_MEMORY_MONGO === 'true') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: USE_MEMORY_MONGO must not be enabled in production');
    }
    console.log('[MongoMemoryServer] Starting (non-production only)...');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      process.env.MONGO_URL = mongod.getUri();
      console.log(`[MongoMemoryServer] Started at ${process.env.MONGO_URL}`);
    } catch (e) {
      console.error('[MongoMemoryServer] Error:', e);
    }
  }

  const configuredOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean);
  if (process.env.NODE_ENV === 'production' && !configuredOrigins?.length) {
    throw new Error('FATAL: ALLOWED_ORIGINS is required in production');
  }
  const allowedOrigins = configuredOrigins?.length ? configuredOrigins : true;

  const app = await NestFactory.create(AppModule, { 
    cors: typeof allowedOrigins === 'boolean' ? allowedOrigins : {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    },
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({ format: loggerConfig }),
      ],
    }),
  });
  const logger = new Logger('Bootstrap');

  // Trust TWO proxy hops (Cloudflare → nginx → app) so req.ip is the REAL
  // client IP, not a shared Cloudflare edge IP. With only 1 hop, every user
  // behind the same CF edge node shares one rate-limit bucket (5 logins/min
  // across thousands of users) and one bot can ban them all.
  app.getHttpAdapter().getInstance().set('trust proxy', 2);

  // Apply helmet security headers
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    } : false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(compression());
  app.use(cookieParser());
  app.useWebSocketAdapter(new ConfiguredIoAdapter(app, allowedOrigins));
  
  // Register global Sentry Exception Filter
  app.useGlobalFilters(new SentryExceptionFilter(app.getHttpAdapter()));

  // Raise body limit to 25mb to support base64 images (Rx scans, medicine box photos)
  app.use(json({
    limit: '25mb',
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString();
    }
  }));
  app.use(urlencoded({ limit: '25mb', extended: true }));
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  
  // Strict Validation Pipe (forbidNonWhitelisted blocks injections)
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    forbidNonWhitelisted: true, 
    transform: true 
  }));

  // Swagger Configuration — E5-F3: in production the full API surface must not be
  // publicly enumerable; serve docs only when explicitly enabled (SWAGGER_ENABLED=true).
  const swaggerEnabled = process.env.SWAGGER_ENABLED === 'true' || process.env.NODE_ENV !== 'production';
  if (swaggerEnabled) {
    const document = createNabdahOpenApiDocument(app);
    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: 'api/docs-json',
      yamlDocumentUrl: 'api/docs-yaml',
    });
  }

  // E5-F3 graceful shutdown: lets BullMQ workers/queues, mongoose, and the Redis
  // client finish in-flight work and close cleanly on SIGTERM (deploys, autoscaling).
  // Without this, container stops killed in-flight queue jobs mid-processing.
  app.enableShutdownHooks();

  const port = parseInt(process.env.PORT || '8002', 10);
  await app.listen(port, '0.0.0.0');
  logger.log(`Nabd NestJS Backend listening on http://0.0.0.0:${port}`);
  if (swaggerEnabled) logger.log(`Swagger UI available at http://0.0.0.0:${port}/api/docs`);
}
bootstrap();
