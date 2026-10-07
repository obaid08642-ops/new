import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import {
  CreateMysteryShopAssignmentDto,
  SubmitMysteryShopFindingsDto,
} from './mystery-shopper.p22.dto';

export interface MysteryShopperComponent {
  avgScore: number | null;
  visits: number;
}

/**
 * P22.12/Phase 1.1 — mystery-shopper checks (admin-owned, analytics module).
 *
 * Flow (per provider/services/MYSTERY_SHOPPER.md procedure):
 *   admin creates assignment (provider_id, checklist, due date) →
 *   shopper submits findings (scores + photo media IDs + notes) →
 *   score < 60 ⇒ `provider_complaints` entry (category `service`,
 *   reporter `mystery-shopper`) + `provider_quality_alerts` row.
 *
 * Scorecard feed: `getMysteryShopperComponent()` aggregates findings per
 * provider ({ avgScore, visits }); ProviderScorecardService reads the same
 * `mystery_shop_findings` collection and blends the component into the
 * scorecard (penalty + breach below threshold). No cross-module import,
 * so neither module can break the other at boot.
 */
@Injectable()
export class MysteryShopperService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  /** The 8 standard checks (MYSTERY_SHOPPER.md). */
  static readonly CHECKS = [
    'booking_no_support',
    'accept_within_sla',
    'identity_match',
    'price_match',
    'hygiene_professionalism',
    'prescription_respected',
    'support_reachable',
    'receipt_issued',
  ] as const;

  /** Critical fails cap the total at 59 regardless of other passes. */
  static readonly CRITICAL_CHECKS = ['price_match', 'prescription_respected', 'hygiene_professionalism'] as const;

  /** Findings below this score raise admin alerts + a complaint entry. */
  static readonly ALERT_THRESHOLD = 60;

  private newId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  /** 8 checks × pass(12.5)/fail(0); critical fail caps at 59. */
  static scoreChecks(checks: Record<string, 'pass' | 'fail'>): { score: number; criticalFail: boolean } {
    const keys = Object.keys(checks);
    const passes = keys.filter((k) => checks[k] === 'pass').length;
    const score = Math.round(passes * 12.5 * 10) / 10;
    const criticalFail = MysteryShopperService.CRITICAL_CHECKS.some((c) => checks[c] === 'fail');
    return { score: criticalFail ? Math.min(score, 59) : score, criticalFail };
  }

  async createAssignment(dto: CreateMysteryShopAssignmentDto): Promise<Record<string, unknown>> {
    const dup = await this.conn
      .collection('mystery_shop_assignments')
      .findOne({ idempotencyKey: { $eq: String(dto.idempotencyKey) } });
    if (dup) {
      const { _id, ...rest } = dup as unknown as Record<string, unknown>;
      void _id;
      return rest;
    }
    const checklist =
      dto.checklist && dto.checklist.length > 0 ? [...new Set(dto.checklist.map((c) => String(c)))] : [...MysteryShopperService.CHECKS];
    for (const c of checklist) {
      if (!(MysteryShopperService.CHECKS as readonly string[]).includes(c)) {
        throw new BadRequestException(`unknown_check:${c}`);
      }
    }
    const dueAt = new Date(String(dto.dueAt));
    if (Number.isNaN(dueAt.getTime())) throw new BadRequestException('invalid_due_at');
    const doc = {
      id: this.newId('msa'),
      provider_account_id: String(dto.providerAccountId),
      checklist,
      due_at: dueAt,
      status: 'open',
      idempotencyKey: String(dto.idempotencyKey),
      createdAt: new Date(),
    };
    await this.conn.collection('mystery_shop_assignments').insertOne(doc as unknown as Record<string, unknown>);
    return doc;
  }

  async submitFindings(dto: SubmitMysteryShopFindingsDto): Promise<Record<string, unknown>> {
    const dup = await this.conn
      .collection('mystery_shop_findings')
      .findOne({ idempotencyKey: { $eq: String(dto.idempotencyKey) } });
    if (dup) {
      const { _id, ...rest } = dup as unknown as Record<string, unknown>;
      void _id;
      return rest;
    }
    const assignment = (await this.conn
      .collection('mystery_shop_assignments')
      .findOne({ id: { $eq: String(dto.assignmentId) } })) as unknown as Record<string, unknown> | null;
    if (!assignment) throw new NotFoundException('assignment_not_found');
    if (String(assignment['status']) !== 'open') throw new BadRequestException('assignment_not_open');

    const checklist = assignment['checklist'] as unknown[];
    const checks = dto.checks || {};
    for (const k of Object.keys(checks)) {
      if (!(MysteryShopperService.CHECKS as readonly string[]).includes(k)) {
        throw new BadRequestException(`unknown_check:${k}`);
      }
    }
    for (const c of checklist.map((x) => String(x))) {
      const v = (checks as Record<string, unknown>)[c];
      if (v === undefined) throw new BadRequestException(`missing_or_invalid_check:${c}`);
      if (v !== 'pass' && v !== 'fail') throw new BadRequestException(`invalid_check_value:${c}`);
    }
    const normalized = Object.fromEntries(
      checklist.map((x) => [String(x), (checks as Record<string, string>)[String(x)] as 'pass' | 'fail']),
    );
    const { score, criticalFail } = MysteryShopperService.scoreChecks(normalized);
    const photoMediaIds = Array.isArray(dto.photoMediaIds) ? dto.photoMediaIds.map((m) => String(m)) : [];

    const doc = {
      id: this.newId('msf'),
      assignment_id: String(dto.assignmentId),
      provider_account_id: String(assignment['provider_account_id']),
      checks: normalized,
      score,
      critical_fail: criticalFail,
      photo_media_ids: photoMediaIds,
      notes: dto.notes ? String(dto.notes) : null,
      idempotencyKey: String(dto.idempotencyKey),
      createdAt: new Date(),
    };
    await this.conn.collection('mystery_shop_findings').insertOne(doc as unknown as Record<string, unknown>);
    await this.conn
      .collection('mystery_shop_assignments')
      .updateOne({ id: { $eq: String(dto.assignmentId) } }, { $set: { status: 'submitted' } });

    let alert: Record<string, unknown> | null = null;
    if (score < MysteryShopperService.ALERT_THRESHOLD) {
      const day = new Date().toISOString().slice(0, 10);
      const complaint = {
        id: this.newId('pc'),
        provider_account_id: String(assignment['provider_account_id']),
        reporter_user_id: 'mystery-shopper',
        category: 'service',
        details: `mystery-shopper score ${score} (< ${MysteryShopperService.ALERT_THRESHOLD}) on assignment ${String(dto.assignmentId)}${criticalFail ? ' [critical fail]' : ''}${dto.notes ? `: ${String(dto.notes).slice(0, 200)}` : ''}`,
        order_id: null,
        status: 'open',
        idempotencyKey: `msf-complaint-${String(doc.id)}`,
        createdAt: new Date(),
      };
      await this.conn.collection('provider_complaints').insertOne(complaint as unknown as Record<string, unknown>);
      const existing = await this.conn.collection('provider_quality_alerts').findOne({
        provider_account_id: { $eq: String(assignment['provider_account_id']) },
        day: { $eq: day },
      });
      if (!existing) {
        alert = {
          id: this.newId('pqa'),
          provider_account_id: String(assignment['provider_account_id']),
          reasons: ['mystery_shopper_below_60'],
          source: 'mystery-shopper',
          finding_id: String(doc.id),
          score,
          status: 'open',
          day,
          createdAt: new Date(),
        };
        await this.conn.collection('provider_quality_alerts').insertOne(alert as unknown as Record<string, unknown>);
      } else {
        const { _id, ...rest } = existing as unknown as Record<string, unknown>;
        void _id;
        alert = rest;
      }
    }
    return { ...doc, alert };
  }

  async listResults(
    providerAccountId?: string,
    limit = 50,
  ): Promise<{ results: Array<Record<string, unknown>>; component: MysteryShopperComponent }> {
    const filter: Record<string, unknown> = {};
    if (providerAccountId) filter['provider_account_id'] = { $eq: String(providerAccountId) };
    const rows = (await this.conn
      .collection('mystery_shop_findings')
      .find(filter)
      .limit(Math.min(200, Math.max(1, limit)))
      .toArray()) as unknown as Array<Record<string, unknown>>;
    const results = rows.map((r) => {
      const { _id, ...rest } = r;
      void _id;
      return rest;
    });
    return { results, component: this.aggregateComponent(rows) };
  }

  /** Scorecard feed: per-provider aggregate consumed as the `mystery_shopper` component. */
  async getMysteryShopperComponent(providerAccountId: string): Promise<MysteryShopperComponent> {
    const rows = (await this.conn
      .collection('mystery_shop_findings')
      .find({ provider_account_id: { $eq: String(providerAccountId) } })
      .limit(1000)
      .toArray()) as unknown as Array<Record<string, unknown>>;
    return this.aggregateComponent(rows);
  }

  private aggregateComponent(rows: Array<Record<string, unknown>>): MysteryShopperComponent {
    const scores = rows.map((r) => Number(r['score'])).filter((n) => Number.isFinite(n));
    if (scores.length === 0) return { avgScore: null, visits: 0 };
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return { avgScore: Math.round(avg * 10) / 10, visits: scores.length };
  }
}
