/**
 * P22.10 — separate analytics store: sink abstraction.
 *
 * All report queries go through an AnalyticsSink, never through the
 * production domain collections directly. Today the sink is Mongo-backed
 * (its own `analytics_events`/`analytics_reports` collections); the
 * ClickHouse/BigQuery migration only replaces the sink implementation —
 * see ANALYTICS_SINK.md. Warehouse provisioning itself is infra-owned
 * (BLOCKED in P22_C_NOTES.md).
 */

export interface SinkQuery {
  collection: string;
  pipeline: Array<Record<string, unknown>>;
}

export interface AnalyticsSink {
  readonly name: string;
  aggregate(q: SinkQuery): Promise<Array<Record<string, unknown>>>;
  count(collection: string, filter: Record<string, unknown>): Promise<number>;
  find(collection: string, filter: Record<string, unknown>, limit: number): Promise<Array<Record<string, unknown>>>;
}

export interface SinkConnection {
  collection(name: string): {
    aggregate(pipeline: Array<Record<string, unknown>>): { toArray(): Promise<Array<Record<string, unknown>>> };
    countDocuments(filter: Record<string, unknown>): Promise<number>;
    find(filter: Record<string, unknown>): {
      limit(n: number): { toArray(): Promise<Array<Record<string, unknown>>> };
    };
  };
}

export class MongoAnalyticsSink implements AnalyticsSink {
  readonly name = 'mongo-analytics-sink';
  constructor(private readonly conn: SinkConnection) {}

  aggregate(q: SinkQuery): Promise<Array<Record<string, unknown>>> {
    return this.conn.collection(q.collection).aggregate(q.pipeline).toArray();
  }

  count(collection: string, filter: Record<string, unknown>): Promise<number> {
    return this.conn.collection(collection).countDocuments(filter);
  }

  find(collection: string, filter: Record<string, unknown>, limit: number): Promise<Array<Record<string, unknown>>> {
    return this.conn.collection(collection).find(filter).limit(limit).toArray();
  }
}
