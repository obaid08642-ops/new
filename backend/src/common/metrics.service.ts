/**
 * Phase 20.2 — metrics.
 *
 * Deliberately dependency-free: a Prometheus text endpoint is a counter map and
 * a format function, and adding a client library for that would be a supply
 * chain risk (16.7) for no gain. If the project later wants histograms with
 * native client support, this file is the seam to replace.
 *
 * What is measured, per 20.2: RPS, latency percentiles and errors per route,
 * event-loop delay, heap, and uptime. Percentiles come from a fixed-bucket
 * histogram rather than a sliding window, so the numbers are stable enough to
 * alert on.
 */
import { Injectable } from '@nestjs/common';

/** Latency buckets in milliseconds, matching the plan's p50/p95/p99 need. */
export const LATENCY_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

interface RouteStat {
  count: number;
  errors: number;
  /** Cumulative bucket counts; index i counts durations <= LATENCY_BUCKETS[i]. */
  buckets: number[];
  totalMs: number;
  maxMs: number;
}

/**
 * Gauges other modules register (20.10): name, help and a function read at scrape time, e.g. the realtime gateway's
 * open socket count. Process-wide so a module needs no constructor change to publish one.
 */
const registeredGauges = new Map<string, { help: string; read: () => number }>();
export function registerGauge(name: string, help: string, read: () => number): void {
  registeredGauges.set(name, { help, read });
}

@Injectable()
export class MetricsService {
  private readonly routes = new Map<string, RouteStat>();
  private readonly startedAt = Date.now();
  private eventLoopLagMs = 0;

  constructor() {
    this.measureEventLoopLag();
  }

  /**
   * Event-loop delay: how late a timer actually fires. A rise here is the
   * earliest signal that the API is about to get slow, long before p95 moves.
   */
  private measureEventLoopLag(intervalMs = 1000) {
    let expected = Date.now() + intervalMs;
    const tick = () => {
      const now = Date.now();
      this.eventLoopLagMs = Math.max(0, now - expected);
      expected = now + intervalMs;
      this.timer = setTimeout(tick, intervalMs);
      // Never hold the process open for a metric.
      this.timer?.unref?.();
    };
    this.timer = setTimeout(tick, intervalMs);
    this.timer?.unref?.();
  }

  private timer?: NodeJS.Timeout;

  /** Record one finished request. `route` must be the route pattern, not the URL. */
  record(route: string, statusCode: number, durationMs: number) {
    const key = normaliseRoute(route);
    let stat = this.routes.get(key);
    if (!stat) {
      stat = { count: 0, errors: 0, buckets: new Array(LATENCY_BUCKETS.length).fill(0), totalMs: 0, maxMs: 0 };
      this.routes.set(key, stat);
    }
    stat.count += 1;
    stat.totalMs += durationMs;
    stat.maxMs = Math.max(stat.maxMs, durationMs);
    if (statusCode >= 500) stat.errors += 1;
    for (let i = 0; i < LATENCY_BUCKETS.length; i += 1) {
      if (durationMs <= LATENCY_BUCKETS[i]) stat.buckets[i] += 1;
    }
  }

  /** The percentile of a route's observed latencies, from the bucket histogram. */
  percentile(stat: RouteStat, p: number): number {
    if (stat.count === 0) return 0;
    const target = stat.count * (p / 100);
    for (let i = 0; i < stat.buckets.length; i += 1) {
      if (stat.buckets[i] >= target) {
        // Report the upper edge of the bucket: claiming more precision than the
        // histogram holds would be a lie in a dashboard.
        return LATENCY_BUCKETS[i];
      }
    }
    return LATENCY_BUCKETS[LATENCY_BUCKETS.length - 1];
  }

  /** Prometheus text exposition, scraped by Prometheus or read by curl. */
  scrape(): string {
    const now = Date.now();
    const uptimeSec = (now - this.startedAt) / 1000;
    const mem = process.memoryUsage();
    const lines: string[] = [];

    const push = (name: string, type: string, help: string, value: number | string, labels = '') => {
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} ${type}`);
      lines.push(`${name}${labels} ${value}`);
    };

    push('nabd_uptime_seconds', 'gauge', 'Seconds since the API started.', uptimeSec.toFixed(3));
    push('nabd_event_loop_lag_ms', 'gauge', 'How late the event loop timer fires.', this.eventLoopLagMs);
    push('nabd_heap_used_bytes', 'gauge', 'Heap bytes in use.', mem.heapUsed);
    push('nabd_rss_bytes', 'gauge', 'Resident set size.', mem.rss);
    for (const [name, g] of registeredGauges) {
      let v = 0;
      try { v = Number(g.read()) || 0; } catch { /* a broken gauge must not break the scrape */ }
      push(name, 'gauge', g.help, v);
    }

    // One HELP/TYPE per metric name, then one series per route. Declaring the
    // type per series instead would be invalid exposition.
    const declare = (name: string, type: string, help: string) => {
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} ${type}`);
    };
    declare('nabd_http_requests_total', 'counter', 'HTTP requests completed.');
    declare('nabd_http_errors_total', 'counter', 'HTTP requests that answered 5xx.');
    declare('nabd_http_duration_ms_sum', 'gauge', 'Total request duration in ms.');
    declare('nabd_http_duration_ms_max', 'gauge', 'Slowest request seen in ms.');
    declare('nabd_http_duration_ms_bucket', 'histogram', 'Request duration in ms.');
    declare('nabd_http_p50_ms', 'gauge', 'p50 latency in ms.');
    declare('nabd_http_p95_ms', 'gauge', 'p95 latency in ms.');
    declare('nabd_http_p99_ms', 'gauge', 'p99 latency in ms.');

    for (const [route, stat] of this.routes) {
      // Built rather than spliced: the route is escaped once, and the label set
      // is assembled whole, so there is no way to emit an unbalanced brace.
      const routeLabel = escapeLabel(route);
      const labels = `{route="${routeLabel}"}`;
      const bucketLabels = (le: string) => `{route="${routeLabel}",le="${le}"}`;
      lines.push(`nabd_http_requests_total${labels} ${stat.count}`);
      lines.push(`nabd_http_errors_total${labels} ${stat.errors}`);
      lines.push(`nabd_http_duration_ms_sum${labels} ${stat.totalMs}`);
      lines.push(`nabd_http_duration_ms_max${labels} ${stat.maxMs}`);
      for (let i = 0; i < LATENCY_BUCKETS.length; i += 1) {
        lines.push(`nabd_http_duration_ms_bucket${bucketLabels(String(LATENCY_BUCKETS[i]))} ${stat.buckets[i]}`);
      }
      lines.push(`nabd_http_duration_ms_bucket${bucketLabels('+Inf')} ${stat.count}`);
      lines.push(`nabd_http_p50_ms${labels} ${this.percentile(stat, 50)}`);
      lines.push(`nabd_http_p95_ms${labels} ${this.percentile(stat, 95)}`);
      lines.push(`nabd_http_p99_ms${labels} ${this.percentile(stat, 99)}`);
    }

    return `${lines.join('\n')}\n`;
  }

  /** A compact snapshot for the status/health endpoint and for tests. */
  summary() {
    const total = [...this.routes.values()].reduce((n, s) => n + s.count, 0);
    const errors = [...this.routes.values()].reduce((n, s) => n + s.errors, 0);
    return {
      uptime_seconds: Math.round((Date.now() - this.startedAt) / 1000),
      requests: total,
      errors,
      error_ratio: total ? Number((errors / total).toFixed(4)) : 0,
      event_loop_lag_ms: this.eventLoopLagMs,
      heap_used_bytes: process.memoryUsage().heapUsed,
      routes: [...this.routes.entries()].map(([route, s]) => ({
        route,
        count: s.count,
        errors: s.errors,
        p50_ms: this.percentile(s, 50),
        p95_ms: this.percentile(s, 95),
        p99_ms: this.percentile(s, 99),
      })),
    };
  }

  /**
   * A copy of the cumulative counters, for the SLO evaluator (20.5): it diffs two snapshots to get the requests, errors
   * and latency histogram of the last N minutes. Copied, so later requests do not change a snapshot already taken.
   */
  snapshot(): MetricsSnapshot {
    const routes: MetricsSnapshot['routes'] = {};
    for (const [route, s] of this.routes) routes[route] = { count: s.count, errors: s.errors, buckets: [...s.buckets] };
    return { routes, eventLoopLagMs: this.eventLoopLagMs };
  }

  reset() {
    this.routes.clear();
  }
}

export interface MetricsSnapshot {
  routes: Record<string, { count: number; errors: number; buckets: number[] }>;
  eventLoopLagMs: number;
}

/** The p-th percentile (upper bucket edge, as in `percentile`) of cumulative bucket counts. */
export function percentileFromBuckets(buckets: number[], count: number, p: number): number {
  if (count <= 0) return 0;
  const target = count * (p / 100);
  for (let i = 0; i < buckets.length; i += 1) if (buckets[i] >= target) return LATENCY_BUCKETS[i];
  return LATENCY_BUCKETS[LATENCY_BUCKETS.length - 1];
}

/**
 * Collapse a concrete path to its route pattern, so `/orders/1` and `/orders/2`
 * are one series instead of thousands of one-off series.
 */
export function normaliseRoute(route: string): string {
  if (!route) return 'unknown';
  const path = route.split('?')[0].replace(/\/+$/, '') || '/';
  return path
    .split('/')
    .map((segment) => {
      if (!segment) return segment;
      if (/^\d+$/.test(segment)) return ':id';
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return ':id';
      return segment;
    })
    .join('/') || '/';
}

/** A label value must not be able to break out of the quotes. */
function escapeLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');
}