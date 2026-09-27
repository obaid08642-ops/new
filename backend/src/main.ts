// IMPORTANT: instrument.ts must be the first import (tracing setup).
import './instrument';
import './config/strip-placeholder-secrets';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { createNabdahOpenApiDocument } from './config/openapi.config';
import { ConfiguredIoAdapter } from './config/configured-io.adapter';
import helmet from 'helmet';

// Fastify adapter — activated only when USE_FASTIFY=true (staging test, opt-in)
const useFastify = process.env.USE_FASTIFY === 'true';
let FastifyAdapter: any = null;
let fastifyCookie: any = null;
let fastifyMultipart: any = null;
if (useFastify) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  FastifyAdapter = require('@nestjs/platform-fastify').FastifyAdapter;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  fastifyCookie = require('@fastify/cookie');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  fastifyMultipart = require('@fastify/multipart');
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cluster = require('node:cluster');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const os = require('node:os');
// Phase 5.3: NoSQL injection guard — strips $-operators/dots from req payloads
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mongoSanitize = require('express-mongo-sanitize');
import { SentryExceptionFilter } from './common/sentry.filter';
const cookieParser = require('cookie-parser');
const compression = require('compression');
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

// ── Cluster Mode: spawn one worker per CPU core ──────────────────────────────
// Enabled by default in production; set CLUSTER_MODE=false to disable (e.g. in tests).
const clusterEnabled =
  process.env.CLUSTER_MODE !== 'false' &&
  process.env.NODE_ENV === 'production' &&
  (cluster as any).isPrimary;

if (clusterEnabled) {
  const numCPUs = parseInt(process.env.CLUSTER_WORKERS || String(os.cpus().length), 10);
  const primaryLogger = new Logger('ClusterPrimary');
  primaryLogger.log(`Starting ${numCPUs} worker(s) (${os.cpus().length} CPU cores detected)`);

  for (let i = 0; i < numCPUs; i++) {
    (cluster as any).fork();
  }

  (cluster as any).on('exit', (worker: any, code: number, signal: string) => {
    primaryLogger.warn(`Worker ${worker.process.pid} exited (code=${code}, signal=${signal}). Restarting...`);
    (cluster as any).fork();
  });

  (cluster as any).on('online', (worker: any) => {
    primaryLogger.log(`Worker ${worker.process.pid} is online`);
  });
} else {
  // Worker process or non-production: run the NestJS app normally
  bootstrap().catch((err) => {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  });
}

async function bootstrap() {
  const loggerConfig = process.env.NODE_ENV === 'production'
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.simple());

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

  const app = useFastify
    ? await NestFactory.create(AppModule, new FastifyAdapter({
        logger: false, trustProxy: true, connectionTimeout: 30000, keepAliveTimeout: 65000, bodyLimit: 10 * 1024 * 1024,
      }), {
        cors: typeof allowedOrigins === 'boolean' ? allowedOrigins : {
          origin: allowedOrigins, credentials: true,
          methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        },
        logger: WinstonModule.createLogger({ transports: [new winston.transports.Console({ format: loggerConfig })] }),
      })
    : await NestFactory.create(AppModule, {
        cors: typeof allowedOrigins === 'boolean' ? allowedOrigins : {
          origin: allowedOrigins, credentials: true,
          methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        },
        logger: WinstonModule.createLogger({ transports: [new winston.transports.Console({ format: loggerConfig })] }),
      });
  const logger = new Logger('Bootstrap');

  if (useFastify) {
    await (app as any).register(fastifyCookie);
    await (app as any).register(fastifyMultipart, { limits: { fileSize: 10 * 1024 * 1024 } });
    logger.log('Fastify adapter enabled (USE_FASTIFY=true)');
  } else {
    const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS || '2', 10);
    app.getHttpAdapter().getInstance().set('trust proxy', Number.isFinite(trustProxyHops) ? trustProxyHops : 2);
    app.use((req: any, _res: any, next: any) => {
      if (req.body && typeof req.body === 'object') {
        mongoSanitize.sanitize(req.body, { replaceWith: '_' });
      }
      if (req.params && typeof req.params === 'object') {
        mongoSanitize.sanitize(req.params, { replaceWith: '_' });
      }
      if (req.query && typeof req.query === 'object') {
        mongoSanitize.sanitize(req.query, { replaceWith: '_' });
      }
      next();
    });
  }
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
  app.useGlobalFilters(new SentryExceptionFilter(app.getHttpAdapter()));

  app.use(require('express').json({
    limit: '25mb',
    verify: (req: any, res: any, buf: any) => {
      req.rawBody = buf.toString();
    }
  }));
  app.use(require('express').urlencoded({ limit: '25mb', extended: true }));
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    forbidNonWhitelisted: true, 
    transform: true 
  }));

  const swaggerEnabled = process.env.SWAGGER_ENABLED === 'true' || process.env.NODE_ENV !== 'production';
  if (swaggerEnabled) {
    const document = createNabdahOpenApiDocument(app);
    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: 'api/docs-json',
      yamlDocumentUrl: 'api/docs-yaml',
    });
  }

  app.enableShutdownHooks();

  const port = parseInt(process.env.PORT || '8002', 10);
  const workerId = (cluster as any).worker?.id ?? 'standalone';
  await app.listen(port, '0.0.0.0');
  logger.log(`Nabd NestJS Backend [worker ${workerId}] listening on http://0.0.0.0:${port}`);
  if (swaggerEnabled) logger.log(`Swagger UI available at http://0.0.0.0:${port}/api/docs`);

  // Cache Warming (non-blocking) — fills Redis so first requests are cache hits
  if (process.env.NODE_ENV === 'production' && !(cluster as any).isPrimary) {
    setImmediate(async () => {
      try {
        const warmLogger = new Logger('CacheWarming');
        warmLogger.log('Starting cache warming...');
        // Dynamic imports to avoid circular deps at startup
        try {
          const { MedicinesService } = await import('./modules/medicines/medicines.service');
          const medSvc = app.get(MedicinesService, { strict: false });
          await Promise.allSettled([
            medSvc?.list?.('', 'all'),
            medSvc?.list?.('', 'pharma'),
          ]);
        } catch { /* medicines warming optional */ }
        try {
          const { LabsService } = await import('./modules/labs/labs.service');
          const labSvc = app.get(LabsService, { strict: false });
          await labSvc?.list?.({});
        } catch { /* labs warming optional */ }
        warmLogger.log('Cache warming complete');
      } catch (e) {
        new Logger('CacheWarming').warn(`Cache warming failed (non-critical): ${String((e as Error)?.message || e)}`);
      }
    });
  }
}
