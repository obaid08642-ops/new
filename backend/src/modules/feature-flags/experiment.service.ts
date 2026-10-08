import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import {
  evaluateGuardrails,
  pickVariant,
  reportResult,
  ExperimentVariantDef,
  GuardrailDef,
} from './experiment-bucketing';
import { AssignVariantDto, CreateExperimentDto, RecordConversionDto } from './experiment.dto';

export interface ExperimentDoc {
  id: string;
  key: string;
  hypothesis: string;
  variants: ExperimentVariantDef[];
  rolloutPercentage: number;
  salt: string;
  guardrails: GuardrailDef[];
  status: 'draft' | 'running' | 'stopped';
  idempotencyKey: string;
  createdAt: Date;
}

@Injectable()
export class ExperimentService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private get experiments() {
    return this.conn.collection('experiments');
  }

  private get assignments() {
    return this.conn.collection('experiment_assignments');
  }

  private get conversions() {
    return this.conn.collection('experiment_conversions');
  }

  private newId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  async create(dto: CreateExperimentDto): Promise<ExperimentDoc> {
    const key = String(dto.key).trim();
    const totalWeight = dto.variants.reduce((s, v) => s + v.weight, 0);
    if (dto.variants.length < 2) throw new BadRequestException('at_least_two_variants');
    if (Math.abs(totalWeight - 100) > 0.001) throw new BadRequestException('weights_must_sum_to_100');
    const names = dto.variants.map((v) => v.name);
    if (new Set(names).size !== names.length) throw new BadRequestException('duplicate_variant_names');
    if (names.includes('off')) throw new BadRequestException('reserved_variant_name');

    const dupKey = await this.experiments.findOne({ idempotencyKey: { $eq: String(dto.idempotencyKey) } });
    if (dupKey) {
      const { _id, ...rest } = dupKey as unknown as Record<string, unknown>;
      void _id;
      return rest as unknown as ExperimentDoc;
    }
    const existing = await this.experiments.findOne({ key: { $eq: key } });
    if (existing) throw new BadRequestException('experiment_key_exists');

    const doc: ExperimentDoc = {
      id: this.newId('exp'),
      key,
      hypothesis: String(dto.hypothesis),
      variants: dto.variants.map((v) => ({ name: v.name, weight: v.weight })),
      rolloutPercentage: Number(dto.rolloutPercentage),
      salt: dto.salt ? String(dto.salt) : this.newId('salt'),
      guardrails: (dto.guardrails || []).map((g) => ({
        metric: g.metric,
        threshold: g.threshold,
        direction: g.direction,
      })),
      status: 'running',
      idempotencyKey: String(dto.idempotencyKey),
      createdAt: new Date(),
    };
    await this.experiments.insertOne(doc as unknown as Record<string, unknown>);
    return doc;
  }

  async stop(key: string): Promise<ExperimentDoc> {
    const res = await this.experiments.findOneAndUpdate(
      { key: { $eq: String(key) } },
      { $set: { status: 'stopped' } },
      { returnDocument: 'after' },
    );
    const doc = (res as unknown as { value?: unknown }).value ?? res;
    if (!doc) throw new NotFoundException('experiment_not_found');
    const { _id, ...rest } = doc as unknown as Record<string, unknown>;
    void _id;
    return rest as unknown as ExperimentDoc;
  }

  private async load(key: string): Promise<ExperimentDoc> {
    const raw = await this.experiments.findOne({ key: { $eq: String(key) } });
    if (!raw) throw new NotFoundException('experiment_not_found');
    const { _id, ...rest } = raw as unknown as Record<string, unknown>;
    void _id;
    return rest as unknown as ExperimentDoc;
  }

  /**
   * Sticky assignment: an existing assignment for (experiment, subject) is
   * returned verbatim; otherwise the deterministic bucket is computed once
   * and persisted under the caller's idempotency key.
   */
  async assign(key: string, dto: AssignVariantDto): Promise<{ variant: string; bucket: number; exposed: boolean; sticky: boolean }> {
    const exp = await this.load(key);
    if (exp.status !== 'running') return { variant: 'off', bucket: Number.NaN, exposed: false, sticky: false };
    const prior = await this.assignments.findOne({
      experimentKey: { $eq: exp.key },
      subjectId: { $eq: String(dto.subjectId) },
    });
    if (prior) {
      const p = prior as unknown as Record<string, unknown>;
      return {
        variant: String(p['variant']),
        bucket: Number(p['bucket']),
        exposed: Boolean(p['exposed']),
        sticky: true,
      };
    }
    const byKey = await this.assignments.findOne({ idempotencyKey: { $eq: String(dto.idempotencyKey) } });
    if (byKey) {
      const p = byKey as unknown as Record<string, unknown>;
      return {
        variant: String(p['variant']),
        bucket: Number(p['bucket']),
        exposed: Boolean(p['exposed']),
        sticky: true,
      };
    }
    const r = pickVariant(exp.key, exp.salt, String(dto.subjectId), exp.variants, exp.rolloutPercentage);
    await this.assignments.insertOne({
      id: this.newId('asg'),
      experimentKey: exp.key,
      subjectId: String(dto.subjectId),
      variant: r.variant,
      bucket: r.bucket,
      exposed: r.exposed,
      idempotencyKey: String(dto.idempotencyKey),
      createdAt: new Date(),
    } as unknown as Record<string, unknown>);
    return { ...r, sticky: false };
  }

  async convert(key: string, dto: RecordConversionDto): Promise<{ ok: boolean; duplicate: boolean }> {
    await this.load(key);
    const dup = await this.conversions.findOne({ idempotencyKey: { $eq: String(dto.idempotencyKey) } });
    if (dup) return { ok: true, duplicate: true };
    await this.conversions.insertOne({
      id: this.newId('cnv'),
      experimentKey: String(key),
      subjectId: String(dto.subjectId),
      idempotencyKey: String(dto.idempotencyKey),
      createdAt: new Date(),
    } as unknown as Record<string, unknown>);
    return { ok: true, duplicate: false };
  }

  /**
   * Reported result: per-variant exposures/conversions/rates + winner +
   * guardrail evaluation against caller-supplied observed metrics.
   */
  async report(key: string, observedMetrics?: Record<string, number>) {
    const exp = await this.load(key);
    const [asgRows, cnvRows] = await Promise.all([
      this.assignments.find({ experimentKey: { $eq: exp.key } }).toArray(),
      this.conversions.find({ experimentKey: { $eq: exp.key } }).toArray(),
    ]);
    const exposures = (asgRows as unknown as Array<Record<string, unknown>>)
      .filter((r) => r['exposed'] === true)
      .map((r) => ({ subjectId: String(r['subjectId']), variant: String(r['variant']) }));
    const convertedIds = new Set(
      (cnvRows as unknown as Array<Record<string, unknown>>).map((r) => String(r['subjectId'])),
    );
    const result = reportResult(
      exposures,
      [...convertedIds].map((subjectId) => ({ subjectId })),
    );
    const observations = Object.entries(observedMetrics || {}).map(([metric, value]) => ({
      metric,
      value: Number(value),
    }));
    return {
      experiment: exp.key,
      status: exp.status,
      hypothesis: exp.hypothesis,
      ...result,
      guardrails: evaluateGuardrails(exp.guardrails, observations),
    };
  }
}
