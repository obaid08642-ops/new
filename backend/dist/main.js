"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Sentry = __importStar(require("@sentry/node"));
Sentry.init({
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const openapi_config_1 = require("./config/openapi.config");
const configured_io_adapter_1 = require("./config/configured-io.adapter");
const express_1 = require("express");
const helmet_1 = __importDefault(require("helmet"));
const sentry_filter_1 = require("./common/sentry.filter");
const cookieParser = require('cookie-parser');
const compression = require('compression');
const nest_winston_1 = require("nest-winston");
const winston = __importStar(require("winston"));
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
            const { MongoMemoryServer } = await Promise.resolve().then(() => __importStar(require('mongodb-memory-server')));
            const mongod = await MongoMemoryServer.create();
            process.env.MONGO_URL = mongod.getUri();
            console.log(`[MongoMemoryServer] Started at ${process.env.MONGO_URL}`);
        }
        catch (e) {
            console.error('[MongoMemoryServer] Error:', e);
        }
    }
    const configuredOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean);
    if (process.env.NODE_ENV === 'production' && !configuredOrigins?.length) {
        throw new Error('FATAL: ALLOWED_ORIGINS is required in production');
    }
    const allowedOrigins = configuredOrigins?.length ? configuredOrigins : true;
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        cors: typeof allowedOrigins === 'boolean' ? allowedOrigins : {
            origin: allowedOrigins,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        },
        logger: nest_winston_1.WinstonModule.createLogger({
            transports: [
                new winston.transports.Console({ format: loggerConfig }),
            ],
        }),
    });
    const logger = new common_1.Logger('Bootstrap');
    app.getHttpAdapter().getInstance().set('trust proxy', 2);
    app.use((0, helmet_1.default)({
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
    app.useWebSocketAdapter(new configured_io_adapter_1.ConfiguredIoAdapter(app, allowedOrigins));
    app.useGlobalFilters(new sentry_filter_1.SentryExceptionFilter(app.getHttpAdapter()));
    app.use((0, express_1.json)({
        limit: '25mb',
        verify: (req, res, buf) => {
            req.rawBody = buf.toString();
        }
    }));
    app.use((0, express_1.urlencoded)({ limit: '25mb', extended: true }));
    app.setGlobalPrefix('api');
    app.enableVersioning({
        type: common_1.VersioningType.URI,
        defaultVersion: '1',
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
    }));
    const swaggerEnabled = process.env.SWAGGER_ENABLED === 'true' || process.env.NODE_ENV !== 'production';
    if (swaggerEnabled) {
        const document = (0, openapi_config_1.createNabdahOpenApiDocument)(app);
        swagger_1.SwaggerModule.setup('api/docs', app, document, {
            jsonDocumentUrl: 'api/docs-json',
            yamlDocumentUrl: 'api/docs-yaml',
        });
    }
    app.enableShutdownHooks();
    const port = parseInt(process.env.PORT || '8002', 10);
    await app.listen(port, '0.0.0.0');
    logger.log(`Nabd NestJS Backend listening on http://0.0.0.0:${port}`);
    if (swaggerEnabled)
        logger.log(`Swagger UI available at http://0.0.0.0:${port}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map