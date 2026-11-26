/**
 * Money step M2: a Mongoose plugin that keeps `<field>_minor` (integer minor units of the document's currency) and `currency` next to the
 * legacy amount fields it names, beside `halalaShadowPlugin`, never instead of it (docs/platform/MULTI-COUNTRY-BLUEPRINT.md, money step).
 * The legacy field is never touched: no existing amount changes.
 *
 * Currency of a write, in this order: the document's own `currency` (or `currency` in the update), else the request's MarketContext, else
 * the single-market default (SAR). `resolveWriteCurrency` is the one place that rule lives; `halalaShadowPlugin` uses it too so that
 * `_halalas` is written for SAR documents only.
 *
 * Same cases as the halala plugin: `save`/`create`, `updateOne`, `updateMany`, `findOneAndUpdate` with `$set`/top-level values and `$inc`;
 * a value that is not a whole number of minor units is not rounded (its shadow stays unset and the integrity check lists it). Raw
 * `collection()` writes use `minorFields`. `*_minor` is removed from `toJSON` until the clients read it.
 */
import { Schema } from 'mongoose';
import { currentMarketContext } from '../modules/markets/market-context';
import { DEFAULT_CURRENCY } from './market-defaults';
import { isKnownCurrency } from './currency';
import { isCleanAmount, toMinor } from './money-minor';

export const minorName = (field: string) => `${field}_minor`;

/** `explicit` (the document's or update's own currency) if it is a known code, else the MarketContext currency, else the default. */
export function resolveWriteCurrency(explicit?: unknown): string {
  if (isKnownCurrency(explicit)) return explicit;
  const ctx = currentMarketContext()?.currency;
  if (isKnownCurrency(ctx)) return ctx;
  return DEFAULT_CURRENCY;
}

/** `{ field_minor: n, currency }` for every named field that is a clean amount in `values`; for raw collection writes. `{}` if none. */
export function minorFields(values: Record<string, unknown>, fields: string[], currency?: string): Record<string, unknown> {
  const cur = resolveWriteCurrency(currency ?? values.currency);
  const out: Record<string, unknown> = {};
  for (const f of fields) if (isCleanAmount(values[f], cur)) out[minorName(f)] = toMinor(values[f] as number, cur);
  if (Object.keys(out).length) out.currency = cur;
  return out;
}

export function minorShadowPlugin(schema: Schema, fields: string[]): void {
  for (const f of fields) if (!schema.path(minorName(f))) schema.add({ [minorName(f)]: { type: Number } });
  if (!schema.path('currency')) schema.add({ currency: { type: String } });

  schema.pre('save', function (next) {
    const doc = this as any;
    const cur = resolveWriteCurrency(doc.get('currency'));
    let wrote = false;
    for (const f of fields) {
      if (!doc.isNew && !doc.isModified(f)) continue;
      const v = doc.get(f);
      if (isCleanAmount(v, cur)) { doc.set(minorName(f), toMinor(v, cur)); wrote = true; }
      else doc.set(minorName(f), undefined);
    }
    if (wrote && !isKnownCurrency(doc.get('currency'))) doc.set('currency', cur);
    next();
  });

  const onUpdate = function (this: any, next: (err?: Error) => void) {
    const update = this.getUpdate();
    if (!update || Array.isArray(update)) return next();
    const set: Record<string, unknown> = { ...(update.$set || {}) };
    for (const f of fields) if (f in update && !f.startsWith('$')) set[f] = update[f];
    const cur = resolveWriteCurrency(set.currency ?? update.currency);
    const shadowSet: Record<string, number> = {};
    for (const f of fields) if (isCleanAmount(set[f], cur)) shadowSet[minorName(f)] = toMinor(set[f] as number, cur);
    const shadowInc: Record<string, number> = {};
    for (const f of fields) {
      const d = update.$inc?.[f];
      if (typeof d === 'number' && isCleanAmount(d, cur)) shadowInc[minorName(f)] = toMinor(d, cur);
    }
    if (Object.keys(shadowSet).length) this.setUpdate({ ...update, $set: { ...(update.$set || {}), ...shadowSet } });
    if (Object.keys(shadowInc).length) {
      const c2 = this.getUpdate();
      this.setUpdate({ ...c2, $inc: { ...(c2.$inc || {}), ...shadowInc } });
    }
    next();
  };
  schema.pre('updateOne', onUpdate);
  schema.pre('updateMany', onUpdate);
  schema.pre('findOneAndUpdate', onUpdate);

  // hidden from API output until the clients move to it; a transform the schema already has still runs first
  const prev: any = schema.get('toJSON') || {};
  schema.set('toJSON', {
    ...prev,
    transform(doc: any, ret: any, opts: any) {
      const out = typeof prev.transform === 'function' ? prev.transform(doc, ret, opts) ?? ret : ret;
      for (const f of fields) delete out[minorName(f)];
      return out;
    },
  });
}
