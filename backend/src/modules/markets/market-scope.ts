import type { Schema } from 'mongoose';
import { currentMarketContext } from './market-context';

export class MarketScopeError extends Error {
  constructor(public readonly collection: string) {
    super(`market_scope_missing:${collection}`);
    this.name = 'MarketScopeError';
  }
}

/** Query options flag for the few legitimate cross-market reads (global admin, jobs, migrations). Audited by the caller. */
export const ALL_MARKETS_OPTION = 'allMarkets';

interface QueryLike {
  getFilter(): Record<string, unknown>;
  getOptions(): Record<string, unknown>;
  where(cond: Record<string, unknown>): unknown;
  model?: { collection?: { name?: string } };
}

/**
 * Guard for market-scoped collections (blueprint section 2): a query must carry `market_id`. If the filter does not,
 * the request's MarketContext is applied; with neither, the query is refused. Opt in per schema with `schema.plugin(marketScopePlugin)`
 * AFTER the collection has been backfilled (`market-backfill.ts`): documents without `market_id` would otherwise vanish from scoped reads.
 */
export function marketScopeHook(this: QueryLike): void {
  if (this.getOptions()[ALL_MARKETS_OPTION] === true) return;
  if (this.getFilter().market_id !== undefined) return;
  const ctx = currentMarketContext();
  if (!ctx) throw new MarketScopeError(this.model?.collection?.name ?? 'unknown');
  this.where({ market_id: ctx.market_id });
}

const QUERY_OPS = ['find', 'findOne', 'countDocuments', 'findOneAndUpdate', 'findOneAndDelete', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany'] as const;

export function marketScopePlugin(schema: Schema): void {
  for (const op of QUERY_OPS) schema.pre(op, marketScopeHook as never);
  (schema as unknown as { pre(op: string, fn: unknown): void }).pre('aggregate', function (this: { pipeline(): Array<Record<string, unknown>>; options?: Record<string, unknown>; model?: () => { collection?: { name?: string } } }) {
    if (this.options?.[ALL_MARKETS_OPTION] === true) return;
    const first = this.pipeline()[0] as { $match?: Record<string, unknown> } | undefined;
    if (first?.$match?.market_id !== undefined) return;
    const ctx = currentMarketContext();
    if (!ctx) throw new MarketScopeError(this.model?.()?.collection?.name ?? 'unknown');
    this.pipeline().unshift({ $match: { market_id: ctx.market_id } });
  });
}
