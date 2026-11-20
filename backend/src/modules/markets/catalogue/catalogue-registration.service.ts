import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CatalogueKind, CatalogueRegistration, CatalogueRegistrationDocument } from './catalogue-registration.schema';

export interface RegistrationView { kind: CatalogueKind; concept_id: string; market_id: string; local_code: string | null; status: 'active' | 'retired'; effective_from: Date }

/** Pure: is the concept offered in the market at `at`? A retired row or one not yet effective says no; no row says no (never a Saudi default). */
export function isOffered(rows: readonly RegistrationView[], kind: CatalogueKind, conceptId: string, market: string, at: Date = new Date()): boolean {
  return rows.some((r) => r.kind === kind && r.concept_id === conceptId && r.market_id === market && r.status === 'active' && r.effective_from.getTime() <= at.getTime());
}

@Injectable()
export class CatalogueRegistrationService {
  constructor(@InjectModel(CatalogueRegistration.name) private readonly regs: Model<CatalogueRegistrationDocument>) {}

  /** Concept ids a market offers for one kind (what a market-scoped catalogue read filters by). */
  async offeredConceptIds(kind: CatalogueKind, market: string, at: Date = new Date()): Promise<string[]> {
    const rows = await this.regs.find({ kind, market_id: market, status: 'active', effective_from: { $lte: at } }, { concept_id: 1 }).lean<Array<{ concept_id: string }>>();
    return rows.map((r) => r.concept_id);
  }

  async register(kind: CatalogueKind, conceptId: string, market: string, opts: { local_code?: string | null; effective_from?: Date; created_by?: string } = {}): Promise<void> {
    await this.regs.updateOne(
      { kind, concept_id: conceptId, market_id: market },
      { $set: { status: 'active', ...(opts.local_code !== undefined ? { local_code: opts.local_code } : {}) }, $setOnInsert: { effective_from: opts.effective_from ?? new Date(), created_by: opts.created_by ?? null } },
      { upsert: true },
    );
  }

  async retire(kind: CatalogueKind, conceptId: string, market: string): Promise<boolean> {
    const r = await this.regs.updateOne({ kind, concept_id: conceptId, market_id: market }, { $set: { status: 'retired' } });
    return r.modifiedCount > 0;
  }
}
