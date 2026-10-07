import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrometheusMetricsService } from './prometheus-metrics.service';
import { StructuredLoggerService } from './structured-logger.service';

@Injectable()
export class ObservabilityService implements OnModuleInit {
  constructor(
    private readonly metrics: PrometheusMetricsService,
    private readonly logger: StructuredLoggerService,
  ) {}

  onModuleInit(): void {
    this.logger.log('Observability module initialized', {
      service: 'observability',
      metricsEnabled: true,
      tracingEnabled: !!process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      loggingEnabled: true,
    });
  }

  getMetrics(): Promise<string> {
    return this.metrics.getMetrics();
  }

  getMetricsContentType(): Promise<string> {
    return this.metrics.getContentType();
  }

  getRegistry() {
    return this.metrics.getRegistry();
  }

  // Metrics recording helpers
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number, reqSize?: number, resSize?: number): void {
    this.metrics.recordHttpRequest(method, route, statusCode, duration, reqSize, resSize);
  }

  recordMongoQuery(operation: string, collection: string, duration: number, success: boolean): void {
    this.metrics.recordMongoQuery(operation, collection, duration, success);
  }

  recordRedisCommand(command: string, duration: number, success: boolean): void {
    this.metrics.recordRedisCommand(command, duration, success);
  }

  recordCacheHit(cacheName: string): void {
    this.metrics.recordCacheHit(cacheName);
  }

  recordCacheMiss(cacheName: string): void {
    this.metrics.recordCacheMiss(cacheName);
  }

  recordQueueJob(queue: string, duration: number, success: boolean): void {
    this.metrics.recordQueueJob(queue, duration, success);
  }

  setQueueDepth(queue: string, depth: number): void {
    this.metrics.setQueueDepth(queue, depth);
  }

  setQueueJobAge(queue: string, ageSeconds: number): void {
    this.metrics.setQueueJobAge(queue, ageSeconds);
  }

  recordPushNotification(provider: string, success: boolean): void {
    this.metrics.recordPushNotification(provider, success);
  }

  recordSms(provider: string, success: boolean): void {
    this.metrics.recordSms(provider, success);
  }

  recordEmail(provider: string, success: boolean): void {
    this.metrics.recordEmail(provider, success);
  }

  recordCheckoutAttempt(paymentMethod: string): void {
    this.metrics.recordCheckoutAttempt(paymentMethod);
  }

  recordCheckoutSuccess(paymentMethod: string): void {
    this.metrics.recordCheckoutSuccess(paymentMethod);
  }

  recordCheckoutFailed(paymentMethod: string, reason: string): void {
    this.metrics.recordCheckoutFailed(paymentMethod, reason);
  }

  recordDoctorSlotsViewed(doctorId: string, specialty: string): void {
    this.metrics.recordDoctorSlotsViewed(doctorId, specialty);
  }

  recordDoctorSlotsBooked(doctorId: string, specialty: string): void {
    this.metrics.recordDoctorSlotsBooked(doctorId, specialty);
  }

  recordSearchQuery(queryType: string): void {
    this.metrics.recordSearchQuery(queryType);
  }

  setActiveUsers(type: string, count: number): void {
    this.metrics.setActiveUsers(type, count);
  }

  setLivekitMetrics(rooms: number, participants: number, cpu: number, bandwidthIn: number, bandwidthOut: number): void {
    this.metrics.setLivekitMetrics(rooms, participants, cpu, bandwidthIn, bandwidthOut);
  }

  setRedisMetrics(memoryUsed: number, memoryPeak: number, evictions: number, connectedClients: number, rejectedConnections: number): void {
    this.metrics.setRedisMetrics(memoryUsed, memoryPeak, evictions, connectedClients, rejectedConnections);
  }

  setMongoConnections(active: number, idle: number): void {
    this.metrics.setMongoConnections(active, idle);
  }

  // Logging helpers
  logHttpRequest(context: Record<string, unknown>): void {
    this.logger.logHttpRequest(context);
  }

  logHttpResponse(context: Record<string, unknown>): void {
    this.logger.logHttpResponse(context);
  }

  logDatabaseQuery(query: string, params: unknown[], duration: number, collection: string): void {
    this.logger.logDatabaseQuery(query, params, duration, collection);
  }

  logCacheOperation(operation: 'hit' | 'miss' | 'set' | 'delete', key: string, cacheName: string): void {
    this.logger.logCacheOperation(operation, key, cacheName);
  }

  logQueueOperation(operation: 'enqueue' | 'dequeue' | 'complete' | 'failed', queue: string, jobId: string, data?: unknown): void {
    this.logger.logQueueOperation(operation, queue, jobId, data);
  }

  logExternalCall(service: string, method: string, url: string, duration: number, statusCode?: number): void {
    this.logger.logExternalCall(service, method, url, duration, statusCode);
  }

  logBusinessEvent(event: string, data: Record<string, unknown>): void {
    this.logger.logBusinessEvent(event, data);
  }

  logSecurityEvent(event: string, data: Record<string, unknown>, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    this.logger.logSecurityEvent(event, data, severity);
  }

  logAuditEvent(action: string, resource: string, resourceId: string, userId: string, metadata?: Record<string, unknown>): void {
    this.logger.logAuditEvent(action, resource, resourceId, userId, metadata);
  }

  // Direct logger access
  getLogger(): StructuredLoggerService {
    return this.logger;
  }

  getMetricsService(): PrometheusMetricsService {
    return this.metrics;
  }
}