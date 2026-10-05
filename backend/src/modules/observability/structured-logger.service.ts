import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

interface LogContext {
  requestId?: string;
  userId?: string;
  traceId?: string;
  spanId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
}

const PII_FIELDS = [
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'set-cookie',
  'email',
  'phone',
  'phonenumber',
  'nationalid',
  'ssn',
  'creditcard',
  'cardnumber',
  'cvv',
  'pin',
  'secret',
  'apikey',
  'apisecret',
  'privatekey',
  'mfacode',
  'otp',
  'verificationcode',
  'resettoken',
  'confirmationtoken',
];

const PII_PATTERNS = [
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
  /\b(?:\+?966|0)?5\d{8}\b/g, // Saudi phone
  /\b\d{10,15}\b/g, // National ID / Phone
];

function maskPii(obj: unknown, depth = 0): unknown {
  if (depth > 10) return '[MAX_DEPTH]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    let masked = obj;
    for (const pattern of PII_PATTERNS) {
      masked = masked.replace(pattern, '[REDACTED]');
    }
    return masked;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => maskPii(item, depth + 1));
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isPii = PII_FIELDS.some(f => lowerKey === f || lowerKey.includes(f));
      if (isPii) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = maskPii(value, depth + 1);
      }
    }
    return result;
  }
  return obj;
}

function createLogger(): winston.Logger {
  const isProduction = process.env.NODE_ENV === 'production';

  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
      const ctx = context ? ` [${JSON.stringify(context)}]` : '';
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} [${level.toUpperCase()}]${ctx}: ${message}${metaStr}`;
    }),
  );

  const jsonFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  );

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isProduction ? jsonFormat : consoleFormat,
      level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    }),
  ];

  if (process.env.LOKI_URL) {
    transports.push(
      new winston.transports.Http({
        host: new URL(process.env.LOKI_URL).hostname,
        port: parseInt(new URL(process.env.LOKI_URL).port || '443', 10),
        path: '/loki/api/v1/push',
        ssl: new URL(process.env.LOKI_URL).protocol === 'https:',
        format: jsonFormat,
        level: process.env.LOG_LEVEL || 'info',
      }),
    );
  }

  return winston.createLogger({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    format: jsonFormat,
    defaultMeta: {
      service: process.env.OTEL_SERVICE_NAME || 'nabd-backend',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    },
    transports,
    exceptionHandlers: [
      new winston.transports.Console({ format: jsonFormat }),
    ],
    rejectionHandlers: [
      new winston.transports.Console({ format: jsonFormat }),
    ],
  });
}

const logger = createLogger();

@Injectable()
export class StructuredLoggerService implements LoggerService {
  private requestIdMap = new Map<string, string>();

  log(message: string, context?: LogContext): void {
    logger.info(message, { context: this.enrichContext(context) });
  }

  error(message: string, trace?: string, context?: LogContext): void {
    logger.error(message, { context: this.enrichContext(context), stack: trace });
  }

  warn(message: string, context?: LogContext): void {
    logger.warn(message, { context: this.enrichContext(context) });
  }

  debug(message: string, context?: LogContext): void {
    logger.debug(message, { context: this.enrichContext(context) });
  }

  verbose(message: string, context?: LogContext): void {
    logger.verbose(message, { context: this.enrichContext(context) });
  }

  private enrichContext(context?: LogContext): LogContext {
    const enriched: LogContext = { ...context };
    if (!enriched.requestId) {
      enriched.requestId = this.getCurrentRequestId();
    }
    return maskPii(enriched) as LogContext;
  }

  getCurrentRequestId(): string {
    // In a real implementation, this would use AsyncLocalStorage
    // For now, generate a new one if not available
    return uuidv4();
  }

  setRequestId(requestId: string): void {
    // Store requestId for current async context
    // This is a simplified version - production would use AsyncLocalStorage
    this.requestIdMap.set('current', requestId);
  }

  clearRequestId(): void {
    this.requestIdMap.delete('current');
  }

  child(context: LogContext): StructuredLoggerService {
    const childLogger = new StructuredLoggerService();
    childLogger.requestIdMap = this.requestIdMap;
    return childLogger;
  }

  // Structured logging helpers
  logHttpRequest(context: LogContext): void {
    this.log('HTTP Request', {
      ...context,
      type: 'http_request',
      timestamp: new Date().toISOString(),
    });
  }

  logHttpResponse(context: LogContext): void {
    this.log('HTTP Response', {
      ...context,
      type: 'http_response',
      timestamp: new Date().toISOString(),
    });
  }

  logDatabaseQuery(query: string, params: unknown[], duration: number, collection: string): void {
    this.debug('Database Query', {
      type: 'db_query',
      collection,
      query: query.substring(0, 500),
      params: maskPii(params),
      duration,
      timestamp: new Date().toISOString(),
    });
  }

  logCacheOperation(operation: 'hit' | 'miss' | 'set' | 'delete', key: string, cacheName: string): void {
    this.debug('Cache Operation', {
      type: 'cache_operation',
      operation,
      key: maskPii(key),
      cacheName,
      timestamp: new Date().toISOString(),
    });
  }

  logQueueOperation(operation: 'enqueue' | 'dequeue' | 'complete' | 'failed', queue: string, jobId: string, data?: unknown): void {
    this.debug('Queue Operation', {
      type: 'queue_operation',
      operation,
      queue,
      jobId,
      data: maskPii(data),
      timestamp: new Date().toISOString(),
    });
  }

  logExternalCall(service: string, method: string, url: string, duration: number, statusCode?: number): void {
    this.log('External API Call', {
      type: 'external_call',
      service,
      method,
      url: maskPii(url) as string,
      duration,
      statusCode,
      timestamp: new Date().toISOString(),
    });
  }

  logBusinessEvent(event: string, data: Record<string, unknown>): void {
    this.log(`Business Event: ${event}`, {
      type: 'business_event',
      event,
      data: maskPii(data),
      timestamp: new Date().toISOString(),
    });
  }

  logSecurityEvent(event: string, data: Record<string, unknown>, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    this.warn(`Security Event: ${event}`, {
      type: 'security_event',
      event,
      severity,
      data: maskPii(data),
      timestamp: new Date().toISOString(),
    });
  }

  logAuditEvent(action: string, resource: string, resourceId: string, userId: string, metadata?: Record<string, unknown>): void {
    this.log(`Audit: ${action} on ${resource}`, {
      type: 'audit',
      action,
      resource,
      resourceId,
      userId,
      metadata: maskPii(metadata),
      timestamp: new Date().toISOString(),
    });
  }
}

export { maskPii };