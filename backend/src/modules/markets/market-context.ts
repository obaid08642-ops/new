import { AsyncLocalStorage } from 'node:async_hooks';
import { MarketConfig } from './market-config.types';

/** Resolved by the SERVER for every request (blueprint section 2). Never built from client input without validation. */
export interface MarketContext {
  market_id: string;
  country: string;
  operator_id: string;
  currency: string;
  timezone: string;
  config_version: number;
  /** How it was resolved: 'default' (no hint) or 'header' (a validated X-Market hint). */
  source: 'default' | 'header';
  config: MarketConfig;
}

const storage = new AsyncLocalStorage<MarketContext>();

export function runWithMarketContext<T>(ctx: MarketContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function currentMarketContext(): MarketContext | undefined {
  return storage.getStore();
}

/** For code that must not run without a market (money, orders, catalogue): throws instead of guessing. */
export function requireMarketContext(): MarketContext {
  const ctx = storage.getStore();
  if (!ctx) throw new Error('market_context_missing');
  return ctx;
}
