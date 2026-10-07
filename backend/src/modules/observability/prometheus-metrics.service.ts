import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class PrometheusMetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly registry: Registry;
  private readonly defaultMetricsInterval: NodeJS.Timeout | null = null;
  private readonly cacheHitsMap = new Map<string, number>();
  private readonly cacheMissesMap = new Map<string, number>();

  // HTTP Metrics
  readonly httpRequestsTotal: Counter;
  readonly httpRequestDuration: Histogram;
  readonly httpRequestSize: Histogram;
  readonly httpResponseSize: Histogram;

  // Event Loop Metrics
  readonly eventLoopLag: Gauge;
  readonly eventLoopLagP50: Histogram;
  readonly eventLoopLagP95: Histogram;
  readonly eventLoopLagP99: Histogram;

  // Memory Metrics
  readonly heapUsed: Gauge;
  readonly heapTotal: Gauge;
  readonly heapLimit: Gauge;
  readonly rss: Gauge;
  readonly external: Gauge;

  // MongoDB Metrics
  readonly mongoQueriesTotal: Counter;
  readonly mongoQueryDuration: Histogram;
  readonly mongoConnectionsActive: Gauge;
  readonly mongoConnectionsIdle: Gauge;

  // Redis Metrics
  readonly redisCommandsTotal: Counter;
  readonly redisCommandDuration: Histogram;
  readonly redisMemoryUsed: Gauge;
  readonly redisMemoryPeak: Gauge;
  readonly redisEvictionsTotal: Counter;
  readonly redisConnectedClients: Gauge;
  readonly redisRejectedConnections: Counter;

  // Queue Metrics
  readonly queueJobsTotal: Counter;
  readonly queueJobDuration: Histogram;
  readonly queueJobAge: Gauge;
  readonly queueDepth: Gauge;
  readonly queueFailedJobs: Counter;

  // Cache Metrics
  readonly cacheHitsTotal: Counter;
  readonly cacheMissesTotal: Counter;
  readonly cacheHitRatio: Gauge;

  // LiveKit Metrics
  readonly livekitRoomsActive: Gauge;
  readonly livekitParticipantsActive: Gauge;
  readonly livekitCpuUsage: Gauge;
  readonly livekitBandwidthIn: Gauge;
  readonly livekitBandwidthOut: Gauge;

  // Notification Metrics
  readonly pushNotificationsTotal: Counter;
  readonly pushNotificationsSuccess: Counter;
  readonly pushNotificationsFailed: Counter;
  readonly smsTotal: Counter;
  readonly smsSuccess: Counter;
  readonly smsFailed: Counter;
  readonly emailTotal: Counter;
  readonly emailSuccess: Counter;
  readonly emailFailed: Counter;

  // Business Metrics
  readonly checkoutAttemptsTotal: Counter;
  readonly checkoutSuccessTotal: Counter;
  readonly checkoutFailedTotal: Counter;
  readonly doctorSlotsViewed: Counter;
  readonly doctorSlotsBooked: Counter;
  readonly searchQueriesTotal: Counter;
  readonly activeUsers: Gauge;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry, prefix: 'nabd_' });

    // HTTP Metrics
    this.httpRequestsTotal = new Counter({
      name: 'nabd_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'nabd_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestSize = new Histogram({
      name: 'nabd_http_request_size_bytes',
      help: 'HTTP request size in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry],
    });

    this.httpResponseSize = new Histogram({
      name: 'nabd_http_response_size_bytes',
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.registry],
    });

    // Event Loop Metrics
    this.eventLoopLag = new Gauge({
      name: 'nabd_event_loop_lag_seconds',
      help: 'Event loop lag in seconds',
      registers: [this.registry],
    });

    this.eventLoopLagP50 = new Histogram({
      name: 'nabd_event_loop_lag_p50_seconds',
      help: 'Event loop lag p50 in seconds',
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });

    this.eventLoopLagP95 = new Histogram({
      name: 'nabd_event_loop_lag_p95_seconds',
      help: 'Event loop lag p95 in seconds',
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });

    this.eventLoopLagP99 = new Histogram({
      name: 'nabd_event_loop_lag_p99_seconds',
      help: 'Event loop lag p99 in seconds',
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });

    // Memory Metrics
    this.heapUsed = new Gauge({
      name: 'nabd_memory_heap_used_bytes',
      help: 'Heap memory used in bytes',
      registers: [this.registry],
    });

    this.heapTotal = new Gauge({
      name: 'nabd_memory_heap_total_bytes',
      help: 'Total heap memory in bytes',
      registers: [this.registry],
    });

    this.heapLimit = new Gauge({
      name: 'nabd_memory_heap_limit_bytes',
      help: 'Heap memory limit in bytes',
      registers: [this.registry],
    });

    this.rss = new Gauge({
      name: 'nabd_memory_rss_bytes',
      help: 'RSS memory in bytes',
      registers: [this.registry],
    });

    this.external = new Gauge({
      name: 'nabd_memory_external_bytes',
      help: 'External memory in bytes',
      registers: [this.registry],
    });

    // MongoDB Metrics
    this.mongoQueriesTotal = new Counter({
      name: 'nabd_mongo_queries_total',
      help: 'Total MongoDB queries',
      labelNames: ['operation', 'collection', 'status'],
      registers: [this.registry],
    });

    this.mongoQueryDuration = new Histogram({
      name: 'nabd_mongo_query_duration_seconds',
      help: 'MongoDB query duration in seconds',
      labelNames: ['operation', 'collection'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [this.registry],
    });

    this.mongoConnectionsActive = new Gauge({
      name: 'nabd_mongo_connections_active',
      help: 'Active MongoDB connections',
      registers: [this.registry],
    });

    this.mongoConnectionsIdle = new Gauge({
      name: 'nabd_mongo_connections_idle',
      help: 'Idle MongoDB connections',
      registers: [this.registry],
    });

    // Redis Metrics
    this.redisCommandsTotal = new Counter({
      name: 'nabd_redis_commands_total',
      help: 'Total Redis commands',
      labelNames: ['command', 'status'],
      registers: [this.registry],
    });

    this.redisCommandDuration = new Histogram({
      name: 'nabd_redis_command_duration_seconds',
      help: 'Redis command duration in seconds',
      labelNames: ['command'],
      buckets: [0.0001, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
      registers: [this.registry],
    });

    this.redisMemoryUsed = new Gauge({
      name: 'nabd_redis_memory_used_bytes',
      help: 'Redis memory used in bytes',
      registers: [this.registry],
    });

    this.redisMemoryPeak = new Gauge({
      name: 'nabd_redis_memory_peak_bytes',
      help: 'Redis peak memory in bytes',
      registers: [this.registry],
    });

    this.redisEvictionsTotal = new Counter({
      name: 'nabd_redis_evictions_total',
      help: 'Total Redis evictions',
      registers: [this.registry],
    });

    this.redisConnectedClients = new Gauge({
      name: 'nabd_redis_connected_clients',
      help: 'Connected Redis clients',
      registers: [this.registry],
    });

    this.redisRejectedConnections = new Counter({
      name: 'nabd_redis_rejected_connections_total',
      help: 'Rejected Redis connections',
      registers: [this.registry],
    });

    // Queue Metrics
    this.queueJobsTotal = new Counter({
      name: 'nabd_queue_jobs_total',
      help: 'Total queue jobs processed',
      labelNames: ['queue', 'status'],
      registers: [this.registry],
    });

    this.queueJobDuration = new Histogram({
      name: 'nabd_queue_job_duration_seconds',
      help: 'Queue job processing duration in seconds',
      labelNames: ['queue'],
      buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300],
      registers: [this.registry],
    });

    this.queueJobAge = new Gauge({
      name: 'nabd_queue_job_age_seconds',
      help: 'Age of oldest job in queue in seconds',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queueDepth = new Gauge({
      name: 'nabd_queue_depth',
      help: 'Number of jobs in queue',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.queueFailedJobs = new Counter({
      name: 'nabd_queue_failed_jobs_total',
      help: 'Total failed queue jobs',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    // Cache Metrics
    this.cacheHitsTotal = new Counter({
      name: 'nabd_cache_hits_total',
      help: 'Total cache hits',
      labelNames: ['cache_name'],
      registers: [this.registry],
    });

    this.cacheMissesTotal = new Counter({
      name: 'nabd_cache_misses_total',
      help: 'Total cache misses',
      labelNames: ['cache_name'],
      registers: [this.registry],
    });

    this.cacheHitRatio = new Gauge({
      name: 'nabd_cache_hit_ratio',
      help: 'Cache hit ratio',
      labelNames: ['cache_name'],
      registers: [this.registry],
    });

    // LiveKit Metrics
    this.livekitRoomsActive = new Gauge({
      name: 'nabd_livekit_rooms_active',
      help: 'Active LiveKit rooms',
      registers: [this.registry],
    });

    this.livekitParticipantsActive = new Gauge({
      name: 'nabd_livekit_participants_active',
      help: 'Active LiveKit participants',
      registers: [this.registry],
    });

    this.livekitCpuUsage = new Gauge({
      name: 'nabd_livekit_cpu_usage_percent',
      help: 'LiveKit CPU usage percentage',
      registers: [this.registry],
    });

    this.livekitBandwidthIn = new Gauge({
      name: 'nabd_livekit_bandwidth_in_bytes_per_second',
      help: 'LiveKit inbound bandwidth',
      registers: [this.registry],
    });

    this.livekitBandwidthOut = new Gauge({
      name: 'nabd_livekit_bandwidth_out_bytes_per_second',
      help: 'LiveKit outbound bandwidth',
      registers: [this.registry],
    });

    // Notification Metrics
    this.pushNotificationsTotal = new Counter({
      name: 'nabd_push_notifications_total',
      help: 'Total push notifications sent',
      labelNames: ['provider', 'status'],
      registers: [this.registry],
    });

    this.pushNotificationsSuccess = new Counter({
      name: 'nabd_push_notifications_success_total',
      help: 'Successful push notifications',
      labelNames: ['provider'],
      registers: [this.registry],
    });

    this.pushNotificationsFailed = new Counter({
      name: 'nabd_push_notifications_failed_total',
      help: 'Failed push notifications',
      labelNames: ['provider'],
      registers: [this.registry],
    });

    this.smsTotal = new Counter({
      name: 'nabd_sms_total',
      help: 'Total SMS sent',
      labelNames: ['provider', 'status'],
      registers: [this.registry],
    });

    this.smsSuccess = new Counter({
      name: 'nabd_sms_success_total',
      help: 'Successful SMS',
      labelNames: ['provider'],
      registers: [this.registry],
    });

    this.smsFailed = new Counter({
      name: 'nabd_sms_failed_total',
      help: 'Failed SMS',
      labelNames: ['provider'],
      registers: [this.registry],
    });

    this.emailTotal = new Counter({
      name: 'nabd_email_total',
      help: 'Total emails sent',
      labelNames: ['provider', 'status'],
      registers: [this.registry],
    });

    this.emailSuccess = new Counter({
      name: 'nabd_email_success_total',
      help: 'Successful emails',
      labelNames: ['provider'],
      registers: [this.registry],
    });

    this.emailFailed = new Counter({
      name: 'nabd_email_failed_total',
      help: 'Failed emails',
      labelNames: ['provider'],
      registers: [this.registry],
    });

    // Business Metrics
    this.checkoutAttemptsTotal = new Counter({
      name: 'nabd_checkout_attempts_total',
      help: 'Total checkout attempts',
      labelNames: ['payment_method'],
      registers: [this.registry],
    });

    this.checkoutSuccessTotal = new Counter({
      name: 'nabd_checkout_success_total',
      help: 'Successful checkouts',
      labelNames: ['payment_method'],
      registers: [this.registry],
    });

    this.checkoutFailedTotal = new Counter({
      name: 'nabd_checkout_failed_total',
      help: 'Failed checkouts',
      labelNames: ['payment_method', 'reason'],
      registers: [this.registry],
    });

    this.doctorSlotsViewed = new Counter({
      name: 'nabd_doctor_slots_viewed_total',
      help: 'Doctor slots viewed',
      labelNames: ['doctor_id', 'specialty'],
      registers: [this.registry],
    });

    this.doctorSlotsBooked = new Counter({
      name: 'nabd_doctor_slots_booked_total',
      help: 'Doctor slots booked',
      labelNames: ['doctor_id', 'specialty'],
      registers: [this.registry],
    });

    this.searchQueriesTotal = new Counter({
      name: 'nabd_search_queries_total',
      help: 'Total search queries',
      labelNames: ['query_type'],
      registers: [this.registry],
    });

    this.activeUsers = new Gauge({
      name: 'nabd_active_users',
      help: 'Active users',
      labelNames: ['type'],
      registers: [this.registry],
    });
  }

  onModuleInit(): void {
    this.startEventLoopMonitoring();
    this.startMemoryMonitoring();
  }

  onModuleDestroy(): void {
    if (this.defaultMetricsInterval) {
      clearInterval(this.defaultMetricsInterval);
    }
  }

  private startEventLoopMonitoring(): void {
    const samples: number[] = [];
    let lastTime = process.hrtime.bigint();

    const checkLag = () => {
      const now = process.hrtime.bigint();
      const lag = Number(now - lastTime) / 1e9;
      lastTime = now;

      if (lag > 0.01) {
        samples.push(lag);
        if (samples.length > 1000) samples.shift();

        this.eventLoopLag.set(lag);

        if (samples.length > 10) {
          const sorted = [...samples].sort((a, b) => a - b);
          const p50 = sorted[Math.floor(sorted.length * 0.5)];
          const p95 = sorted[Math.floor(sorted.length * 0.95)];
          const p99 = sorted[Math.floor(sorted.length * 0.99)];

          this.eventLoopLagP50.observe(p50);
          this.eventLoopLagP95.observe(p95);
          this.eventLoopLagP99.observe(p99);
        }
      }
    };

    setInterval(checkLag, 100);
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      const mem = process.memoryUsage();
      this.heapUsed.set(mem.heapUsed);
      this.heapTotal.set(mem.heapTotal);
      this.rss.set(mem.rss);
      this.external.set(mem.external);
    }, 10000);
  }

  getRegistry(): Registry {
    return this.registry;
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  async getContentType(): Promise<string> {
    return this.registry.contentType;
  }

  // Helper methods for recording metrics
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number, reqSize?: number, resSize?: number): void {
    this.httpRequestsTotal.inc({ method, route, status_code: String(statusCode) });
    this.httpRequestDuration.observe({ method, route }, duration);
    if (reqSize) this.httpRequestSize.observe({ method, route }, reqSize);
    if (resSize) this.httpResponseSize.observe({ method, route }, resSize);
  }

  recordMongoQuery(operation: string, collection: string, duration: number, success: boolean): void {
    this.mongoQueriesTotal.inc({ operation, collection, status: success ? 'success' : 'error' });
    this.mongoQueryDuration.observe({ operation, collection }, duration);
  }

  recordRedisCommand(command: string, duration: number, success: boolean): void {
    this.redisCommandsTotal.inc({ command, status: success ? 'success' : 'error' });
    this.redisCommandDuration.observe({ command }, duration);
  }

  recordCacheHit(cacheName: string): void {
    this.cacheHitsTotal.inc({ cache_name: cacheName });
    const hits = (this.cacheHitsMap.get(cacheName) || 0) + 1;
    this.cacheHitsMap.set(cacheName, hits);
    this.updateCacheHitRatio(cacheName, hits, this.cacheMissesMap.get(cacheName) || 0);
  }

  recordCacheMiss(cacheName: string): void {
    this.cacheMissesTotal.inc({ cache_name: cacheName });
    const misses = (this.cacheMissesMap.get(cacheName) || 0) + 1;
    this.cacheMissesMap.set(cacheName, misses);
    this.updateCacheHitRatio(cacheName, this.cacheHitsMap.get(cacheName) || 0, misses);
  }

  private updateCacheHitRatio(cacheName: string, hits: number, misses: number): void {
    const total = hits + misses;
    if (total > 0) {
      this.cacheHitRatio.set({ cache_name: cacheName }, hits / total);
    }
  }

  recordQueueJob(queue: string, duration: number, success: boolean): void {
    this.queueJobsTotal.inc({ queue, status: success ? 'success' : 'failed' });
    this.queueJobDuration.observe({ queue }, duration);
    if (!success) this.queueFailedJobs.inc({ queue });
  }

  setQueueDepth(queue: string, depth: number): void {
    this.queueDepth.set({ queue }, depth);
  }

  setQueueJobAge(queue: string, ageSeconds: number): void {
    this.queueJobAge.set({ queue }, ageSeconds);
  }

  recordPushNotification(provider: string, success: boolean): void {
    this.pushNotificationsTotal.inc({ provider, status: success ? 'success' : 'failed' });
    if (success) this.pushNotificationsSuccess.inc({ provider });
    else this.pushNotificationsFailed.inc({ provider });
  }

  recordSms(provider: string, success: boolean): void {
    this.smsTotal.inc({ provider, status: success ? 'success' : 'failed' });
    if (success) this.smsSuccess.inc({ provider });
    else this.smsFailed.inc({ provider });
  }

  recordEmail(provider: string, success: boolean): void {
    this.emailTotal.inc({ provider, status: success ? 'success' : 'failed' });
    if (success) this.emailSuccess.inc({ provider });
    else this.emailFailed.inc({ provider });
  }

  recordCheckoutAttempt(paymentMethod: string): void {
    this.checkoutAttemptsTotal.inc({ payment_method: paymentMethod });
  }

  recordCheckoutSuccess(paymentMethod: string): void {
    this.checkoutSuccessTotal.inc({ payment_method: paymentMethod });
  }

  recordCheckoutFailed(paymentMethod: string, reason: string): void {
    this.checkoutFailedTotal.inc({ payment_method: paymentMethod, reason });
  }

  recordDoctorSlotsViewed(doctorId: string, specialty: string): void {
    this.doctorSlotsViewed.inc({ doctor_id: doctorId, specialty });
  }

  recordDoctorSlotsBooked(doctorId: string, specialty: string): void {
    this.doctorSlotsBooked.inc({ doctor_id: doctorId, specialty });
  }

  recordSearchQuery(queryType: string): void {
    this.searchQueriesTotal.inc({ query_type: queryType });
  }

  setActiveUsers(type: string, count: number): void {
    this.activeUsers.set({ type }, count);
  }

  setLivekitMetrics(rooms: number, participants: number, cpu: number, bandwidthIn: number, bandwidthOut: number): void {
    this.livekitRoomsActive.set(rooms);
    this.livekitParticipantsActive.set(participants);
    this.livekitCpuUsage.set(cpu);
    this.livekitBandwidthIn.set(bandwidthIn);
    this.livekitBandwidthOut.set(bandwidthOut);
  }

  setRedisMetrics(memoryUsed: number, memoryPeak: number, evictions: number, connectedClients: number, rejectedConnections: number): void {
    this.redisMemoryUsed.set(memoryUsed);
    this.redisMemoryPeak.set(memoryPeak);
    this.redisEvictionsTotal.inc(evictions);
    this.redisConnectedClients.set(connectedClients);
    this.redisRejectedConnections.inc(rejectedConnections);
  }

  setMongoConnections(active: number, idle: number): void {
    this.mongoConnectionsActive.set(active);
    this.mongoConnectionsIdle.set(idle);
  }
}