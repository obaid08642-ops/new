import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import {
  CatalogPublicationService,
  SOURCE_COLLECTIONS,
  expectedPublication,
  CatalogEntityType,
} from '../events/catalog-publication.service';

export interface ReconcileOptions {
  limit?: number;
  entityId?: string;
}

export interface ReconcileSummary {
  started_at: Date;
  finished_at: Date;
  scanned: number;
  drifted: number;
  repaired: number;
  failed_repairs: Array<{ entity_type: string; entity_id: string; error: string }>;
}

/**
 * P13-R13: reconciliation job. Compares the public discovery projections
 * (read by search, sitemap, caches and MCP) with their source collections and
 * repairs drift by re-running the publication refresh — which re-emits
 * `catalog.publication.projected`, so the search-index listener re-syncs the
 * index as well. Findings are stored in `reconciliation_reports` for the admin
 * page. Orphan projections (source deleted) are unpublished in place.
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger('Reconciliation');

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly publication: CatalogPublicationService,
  ) {}

  /** Nightly drift sweep (manual runs via POST events/reconciliation/run). */
  @Cron('17 4 * * *')
  async nightly() {
    try {
      await this.reconcile({ limit: 500 });
    } catch (e: any) {
      this.logger.warn(`nightly reconciliation failed: ${String(e?.message || e)}`);
    }
  }

  async reconcile(options: ReconcileOptions = {}): Promise<ReconcileSummary> {
    const startedAt = new Date();
    const limit = Math.min(2000, Math.max(1, Number(options.limit) || 500));
    const filter: any = options.entityId ? { entity_id: String(options.entityId) } : {};
    const rows: any[] = await this.conn
      .collection('public_catalog_projections')
      .find(filter)
      .sort({ _id: 1 })
      .limit(limit)
      .toArray();

    let drifted = 0;
    let repaired = 0;
    const failedRepairs: ReconcileSummary['failed_repairs'] = [];
    const details: Array<Record<string, any>> = [];

    for (const row of rows) {
      const entityType = row?.entity_type as CatalogEntityType;
      const entityId = String(row?.entity_id || '');
      const collection = (SOURCE_COLLECTIONS as Record<string, string>)[entityType];
      if (!collection || !entityId) continue;
      const source: any = await this.conn.collection(collection).findOne({ id: entityId });
      if (!source) {
        // Orphan: the source is gone, so nothing may stay listed.
        if (row.published !== false || row.indexable !== false) {
          drifted++;
          await this.conn.collection('public_catalog_projections').updateOne(
            { entity_type: entityType, entity_id: entityId },
            { $set: { published: false, indexable: false, updated_at: new Date() } },
          );
          repaired++;
          details.push({ entity_type: entityType, entity_id: entityId, kind: 'orphan_unpublished' });
        }
        continue;
      }
      const expected = expectedPublication(entityType, source);
      if (row.published !== expected.published || row.indexable !== expected.indexable) {
        drifted++;
        try {
          await this.publication.refresh({
            entityType,
            entityId,
            actorId: 'system',
            actorRole: 'system',
            reason: 'reconciliation_repair',
            idempotencyKey: `reconciliation:${entityType}:${entityId}:${startedAt.toISOString()}`,
          });
          repaired++;
          details.push({ entity_type: entityType, entity_id: entityId, kind: 'repaired', expected });
        } catch (e: any) {
          failedRepairs.push({ entity_type: entityType, entity_id: entityId, error: String(e?.message || e) });
          details.push({ entity_type: entityType, entity_id: entityId, kind: 'repair_failed' });
        }
      }
    }

    const summary: ReconcileSummary = {
      started_at: startedAt,
      finished_at: new Date(),
      scanned: rows.length,
      drifted,
      repaired,
      failed_repairs: failedRepairs,
    };
    await this.conn.collection('reconciliation_reports').insertOne({
      ...summary,
      details: details.slice(0, 50),
    });
    this.logger.log(`reconciled ${rows.length} projections: ${drifted} drifted, ${repaired} repaired`);
    return summary;
  }

  /** P13-R13: the failed-propagation list — DLQ rows plus stuck outbox events. */
  async failedList(options: { limit?: number; status?: string } = {}): Promise<any> {
    const limit = Math.min(200, Math.max(1, Number(options.limit) || 50));
    const dlqFilter: any = options.status ? { status: String(options.status) } : {};
    const stuckSince = new Date(Date.now() - 30 * 60_000);
    const [dlq, stuckOutbox] = await Promise.all([
      this.conn.collection('event_dlq').find(dlqFilter).sort({ createdAt: -1 }).limit(limit).toArray(),
      this.conn
        .collection('domain_outbox')
        .find({ state: 'pending', created_at: { $lt: stuckSince } })
        .sort({ created_at: 1 })
        .limit(limit)
        .toArray()
        .catch(() => []),
    ]);
    return { dlq, stuck_outbox: stuckOutbox, generated_at: new Date() };
  }

  async latest() {
    const rows: any[] = await this.conn
      .collection('reconciliation_reports')
      .find({})
      .sort({ finished_at: -1 })
      .limit(1)
      .toArray();
    return rows[0] || null;
  }
}
