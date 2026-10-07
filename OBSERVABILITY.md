# Nabd Platform - Phase 20 Observability

Complete observability stack for the Nabd Healthcare Platform.

## Components

### 1. Distributed Tracing (OpenTelemetry)
- **Backend**: `backend/src/instrumentation/opentelemetry.ts`
- **Exporters**: OTLP gRPC to Jaeger/Tempo
- **Auto-instrumentation**: NestJS, MongoDB, Redis, HTTP, Express, GraphQL
- **Context Propagation**: `backend/src/common/correlation.middleware.ts` - One request ID end-to-end

### 2. Metrics & Dashboards (Prometheus + Grafana)
- **Metrics Service**: `backend/src/modules/observability/prometheus-metrics.service.ts`
- **Key Metrics**:
  - HTTP: RPS, p50/p95/p99 latency, error rates
  - System: Event loop lag, heap memory, RSS
  - MongoDB: Query latency, connection pool
  - Redis: Command latency, memory, evictions, connections
  - Queues: Depth, job age, processing duration, failure rate
  - Cache: Hit/miss ratios
  - LiveKit: Rooms, participants, CPU, bandwidth
  - Notifications: Push/SMS/Email success rates
  - Business: Checkout success, doctor slots, search, active users

- **Grafana Dashboards** (`deploy/grafana/dashboards/`):
  - `backend-overview.json` - System health overview
  - `business-metrics.json` - Business KPIs
  - `livekit-metrics.json` - WebRTC metrics
  - `queue-metrics.json` - Queue & cache metrics

- **Prometheus Rules** (`deploy/prometheus/rules/nabd-alerts.yml`):
  - SLO alerts (API availability 99.9%, checkout success rate)
  - Latency alerts (p95, p99)
  - Resource alerts (memory, CPU, connections)
  - Queue/cache alerts

### 3. Structured Logs (Loki + Promtail)
- **Logger Service**: `backend/src/modules/observability/structured-logger.service.ts`
- **Features**:
  - JSON format with PII masking (16.6 compliance)
  - Request ID correlation
  - Centralized in Loki
  - Retention: 30d for backend, 14d for web apps
  - Structured fields: traceId, spanId, requestId, service, version

### 4. Error Tracking (Sentry)
- **Projects**: Backend, Patient Web, Admin Web, Mobile Patient, Mobile Provider
- **Config**: `deploy/sentry/sentry-config.yml`
- **Features**:
  - Release tracking with source maps
  - Session replay (web)
  - Native crash handling (mobile)
  - 4xx error filtering
  - PII scrubbing
  - Alert rules for error rates, crash-free rates, slow transactions

### 5. SLOs & Alerts
- **SLOs**:
  - API Availability: 99.9%
  - Checkout Success Rate: 99%
  - p95 Latency: < 1s
  - p99 Latency: < 5s

- **Alert Routes** (`deploy/alertmanager/alertmanager.yml`):
  - Critical → PagerDuty + Slack #alerts-critical + Email
  - Warning → Slack #alerts-warning + Email
  - Payments → #alerts-payments
  - Notifications → #alerts-notifications

### 6. Synthetic Monitoring
- **Config**: `deploy/synthetic/synthetic-monitoring.yml`
- **Journeys** (every 5-15 min):
  1. Home page load
  2. Search functionality
  3. Product detail page
  4. Cart flow (no payment)
  5. Doctor slots availability
  6. Patient login (test account)
- **Runner**: `deploy/synthetic/run-synthetic.js` (Playwright-based)
- **Metrics**: Pushed to Prometheus via Pushgateway

## Deployment

### Docker Compose
```bash
# Start observability stack
docker-compose -f deploy/docker-compose.observability.yml up -d

# Check status
docker-compose -f deploy/docker-compose.observability.yml ps
```

### Environment Variables
```bash
# OpenTelemetry
OTEL_SERVICE_NAME=nabd-backend
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4317

# Sentry
SENTRY_DSN_BACKEND=...
SENTRY_DSN_PATIENT_WEB=...
SENTRY_DSN_ADMIN_WEB=...
SENTRY_DSN_MOBILE_PATIENT=...
SENTRY_DSN_MOBILE_PROVIDER=...

# Alerting
SLACK_WEBHOOK_CRITICAL=...
SLACK_WEBHOOK_WARNING=...
SLACK_WEBHOOK_PAYMENTS=...
SLACK_WEBHOOK_NOTIFICATIONS=...
PAGERDUTY_SERVICE_KEY=...
SMTP_USERNAME=...
SMTP_PASSWORD=...

# Synthetic
SYNTHETIC_TEST_PATIENT_EMAIL=...
SYNTHETIC_TEST_PATIENT_PASSWORD=...
PUSH_GATEWAY=http://prometheus:9091
```

### Grafana Access
- URL: http://localhost:3000
- User: admin
- Password: ${GRAFANA_ADMIN_PASSWORD}

### Prometheus Access
- URL: http://localhost:9090

### Loki Access
- URL: http://localhost:3100

### Jaeger Access
- URL: http://localhost:16686

### Tempo Access
- URL: http://localhost:3200

## Backend Integration

### 1. Add ObservabilityModule to AppModule
```typescript
import { ObservabilityModule } from './modules/observability/observability.module';

@Module({
  imports: [
    // ... other modules
    ObservabilityModule,
  ],
})
export class AppModule {}
```

### 2. Instrument HTTP Requests
The `CorrelationMiddleware` automatically:
- Extracts/generates request ID
- Creates OpenTelemetry spans
- Logs request/response with trace context
- Adds `x-request-id` response header

### 3. Record Custom Metrics
```typescript
@Inject() private observability: ObservabilityService;

// HTTP
observability.recordHttpRequest('GET', '/api/v1/products', 200, 0.15);

// Business
observability.recordCheckoutAttempt('moyasar');
observability.recordCheckoutSuccess('moyasar');
observability.recordDoctorSlotsViewed('doc-123', 'cardiology');

// Queue
observability.recordQueueJob('email', 2.5, true);
observability.setQueueDepth('email', 42);
```

### 4. Structured Logging
```typescript
@Inject() private logger: StructuredLoggerService;

logger.logBusinessEvent('order_created', { orderId: '123', amount: 99.99 });
logger.logSecurityEvent('failed_login', { ip: '1.2.3.4', attempts: 5 }, 'high');
logger.logAuditEvent('create', 'prescription', 'rx-123', 'user-456', { medication: 'Aspirin' });
```

## Runbook Links

Each alert includes a `runbook_url` pointing to:
- Backend Down: `/wiki/Runbook-BackendDown`
- API Availability: `/wiki/Runbook-ApiAvailability`
- Checkout Failures: `/wiki/Runbook-CheckoutFailures`
- High Latency: `/wiki/Runbook-HighLatency`
- Queue Backlog: `/wiki/Runbook-QueueBacklog`

## Testing

### Local Development
```bash
# Start backend with observability
cd backend
npm run start:dev

# Check metrics
curl http://localhost:8002/observability/metrics

# Check health
curl http://localhost:8002/observability/health
```

### Load Testing with Observability
```bash
# Run k6 load test
k6 run deploy/k6/load-test.js

# Check dashboards during load
# Grafana: http://localhost:3000/d/nabd-backend-overview
```

## Maintenance

### Log Retention
- Backend logs: 30 days (Loki)
- Web app logs: 14 days (Loki)
- Traces: 30 days (Tempo/Jaeger)
- Metrics: 30 days (Prometheus)

### Cost Optimization
- Trace sampling: 10% in production
- Metric scraping: 15s interval
- Log compression: Enabled
- Remote write: For long-term storage

### Upgrades
1. Update docker-compose.yml images
2. Run `docker-compose pull`
3. Rolling restart: `docker-compose up -d --no-deps <service>`
4. Verify dashboards and alerts