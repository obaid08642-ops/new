import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { trace, context, propagation, SpanStatusCode } from '@opentelemetry/api';
import { v4 as uuidv4 } from 'uuid';
import { StructuredLoggerService } from '../modules/observability/structured-logger.service';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  private readonly tracer = trace.getTracer('nabd-backend');

  constructor(private readonly logger: StructuredLoggerService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Extract or generate trace context
    const parentContext = propagation.extract(context.active(), req.headers);
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    
    // Set response header for client correlation
    res.setHeader('x-request-id', requestId);
    
    // Create span for the request
    const span = this.tracer.startSpan(`${req.method} ${req.route?.path || req.path}`, {
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.route': req.route?.path || req.path,
        'http.request_id': requestId,
        'http.user_agent': req.get('user-agent') || '',
      },
    }, parentContext);

    // Add request ID to request for downstream use
    (req as any).requestId = requestId;
    (req as any).span = span;

    // Log request start
    this.logger.logHttpRequest({
      requestId,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
    });

    // Track response
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000;
      const statusCode = res.statusCode;

      // Set span attributes
      span.setAttribute('http.status_code', statusCode);
      span.setAttribute('http.response_duration_ms', duration * 1000);

      if (statusCode >= 400) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: `HTTP ${statusCode}` });
      }

      span.end();

      // Log response
      this.logger.logHttpResponse({
        requestId,
        method: req.method,
        url: req.url,
        statusCode,
        duration,
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
      });
    });

    // Run next middleware in the span context
    context.with(trace.setSpan(parentContext, span), () => {
      next();
    });
  }
}