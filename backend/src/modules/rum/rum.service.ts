import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RUM_BUDGETS, RUM_TTL_SECONDS } from './rum.constants';
import type { RumReportDto } from './rum.dto';

export type RumRow = { page_type: string; metric: string; count: number; p75: number; good_ratio: number; budget: number | null; within_budget: boolean | null };

/**
 * P14.23 real-user monitoring. Every sample is one document (no user id, no IP, no URL: only the page type, locale,
 * device class, metric, value and rating), kept 30 days (TTL index). The admin "Web vitals" page reads the p75 per
 * page type and metric.
 */
@Injectable()
export class RumService implements OnModuleInit {
  private readonly logger = new Logger(RumService.name);
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private get col() {
    return this.conn.collection('rum_vitals');
  }

  async onModuleInit() {
    await this.col.createIndex({ at: 1 }, { expireAfterSeconds: RUM_TTL_SECONDS }).catch((e) => this.logger.warn(`rum ttl index: ${e?.message}`));
    await this.col.createIndex({ page_type: 1, metric: 1, at: -1 }).catch(() => null);
  }

  async record(report: RumReportDto): Promise<{ ok: true }> {
    const at = new Date();
    const docs = report.samples.map((s) => ({
      at,
      page_type: report.page_type,
      locale: report.locale,
      device: report.device ?? null,
      metric: s.name,
      value: s.value,
      rating: s.rating,
      nav: s.nav ?? null,
    }));
    await this.col.insertMany(docs, { ordered: false });
    return { ok: true };
  }

  /** p75 per page type and metric over the last `days`, with the share of "good" samples and the plan's budget. */
  async summary(days = 1): Promise<{ days: number; since: string; rows: RumRow[]; samples: number }> {
    const since = new Date(Date.now() - days * 86_400_000);
    const raw = await this.col
      .aggregate([
        { $match: { at: { $gte: since } } },
        {
          $group: {
            _id: { page_type: '$page_type', metric: '$metric' },
            count: { $sum: 1 },
            good: { $sum: { $cond: [{ $eq: ['$rating', 'good'] }, 1, 0] } },
            p75: { $percentile: { input: '$value', p: [0.75], method: 'approximate' } },
          },
        },
        { $sort: { '_id.page_type': 1, '_id.metric': 1 } },
      ])
      .toArray();
    const rows: RumRow[] = raw.map((r: any) => {
      const p75 = Array.isArray(r.p75) ? Number(r.p75[0]) : Number(r.p75);
      const budget = RUM_BUDGETS[r._id.metric] ?? null;
      return {
        page_type: r._id.page_type,
        metric: r._id.metric,
        count: r.count,
        p75: r._id.metric === 'CLS' ? Math.round(p75 * 1000) / 1000 : Math.round(p75),
        good_ratio: r.count ? Math.round((r.good / r.count) * 1000) / 1000 : 0,
        budget,
        within_budget: budget === null ? null : p75 <= budget,
      };
    });
    return { days, since: since.toISOString(), rows, samples: rows.reduce((n, r) => n + r.count, 0) };
  }
}
