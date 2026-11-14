import * as Sentry from '@sentry/nestjs';

/**
 * R5 tracing. The API already traces HTTP, Mongo, Redis (ioredis) and outbound fetch/http through Sentry's OpenTelemetry-based SDK (instrument.ts, 10 % in
 * production); a second OpenTelemetry SDK next to it would double the instrumentation and the memory on a host that is out of memory (R1). What Sentry does
 * not see by itself are queue consumers and durable-event deliveries: `traced()` wraps them in a span so a slow job shows up in the same trace view, and
 * `currentTraceId()` puts the trace id on structured log lines so a log line leads to its trace.
 */
export async function traced<T>(name: string, op: string, fn: () => Promise<T>, attributes: Record<string, string | number | boolean> = {}): Promise<T> {
  try {
    if (!Sentry.getClient()) return await fn();
    return await Sentry.startSpan({ name, op, attributes }, async () => fn());
  } catch (e) {
    throw e;
  }
}

/** Hex trace id of the active span, or undefined outside a trace / when tracing is off. */
export function currentTraceId(): string | undefined {
  try {
    const span = Sentry.getActiveSpan();
    return span ? span.spanContext().traceId : undefined;
  } catch {
    return undefined;
  }
}
