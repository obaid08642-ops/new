/**
 * R11 phase P1 (expand), dual write: a Mongoose plugin that keeps an integer `<field>_halalas` next to every legacy SAR double it names
 * (docs/platform/R11-money-integrity.md). Readers still use the doubles; the shadows are what the invariant checks and the later switch (P2) read.
 *
 * Covers documents (`save`, `create`) and the update calls Mongoose runs through the model (`updateOne`, `updateMany`, `findOneAndUpdate`):
 *  - a number written with `$set` (or at the top of an update) gets its shadow in the same write;
 *  - a number moved with `$inc` raises the shadow by the halalas of the delta;
 *  - a value that is not a whole number of halalas (float drift) is NOT rounded silently: its shadow is left unset, so the integrity check lists it.
 * `_halalas` is a SAR-only shadow: a document or update whose resolved currency (`resolveWriteCurrency`) is not SAR gets no `_halalas` (money step M2).
 * Writes that bypass Mongoose (a raw `collection()` call) must add the shadow themselves with `shadowFields`.
 */
import { Schema } from 'mongoose';
import { isCleanSar, toHalalas } from './money';
import { minorFields, resolveSaveCurrency, resolveWriteCurrency } from './minor-shadow';
import { DEFAULT_CURRENCY } from './market-defaults';

/** The halala shadow is the Saudi currency's (2-digit) shadow; the code comes from the market config, never a literal here (market-literals ratchet). */
const HALALA_CURRENCY = DEFAULT_CURRENCY;

const shadowName = (field: string) => `${field}_halalas`;

/** `{ field_halalas: n }` for every named field that is a clean number in `values`; for use in raw collection writes. */
export function shadowFields(values: Record<string, unknown>, fields: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of fields) if (isCleanSar(values[f])) out[shadowName(f)] = toHalalas(values[f] as number);
  return out;
}

/** Shadows for a raw collection write in ONE currency: `_halalas` only for the Saudi currency, `_minor` and `currency` always (money step M4). */
export function moneyShadows(values: Record<string, unknown>, fields: string[], currency: string): Record<string, unknown> {
  return { ...(currency === HALALA_CURRENCY ? shadowFields(values, fields) : {}), ...minorFields(values, fields, currency) };
}

export function halalaShadowPlugin(schema: Schema, fields: string[]): void {
  for (const f of fields) {
    if (!schema.path(shadowName(f))) schema.add({ [shadowName(f)]: { type: Number } });
  }

  schema.pre('save', function (next) {
    const doc = this as any;
    const sar = resolveSaveCurrency(doc) === HALALA_CURRENCY;
    for (const f of fields) {
      if (!doc.isNew && !doc.isModified(f)) continue;
      const v = doc.get(f);
      if (sar && isCleanSar(v)) doc.set(shadowName(f), toHalalas(v));
      else doc.set(shadowName(f), undefined);
    }
    next();
  });

  const onUpdate = function (this: any, next: (err?: Error) => void) {
    const update = this.getUpdate();
    if (!update || Array.isArray(update)) return next();   // pipeline updates are not rewritten
    const set: Record<string, unknown> = { ...(update.$set || {}) };
    for (const f of fields) if (f in update && !f.startsWith('$')) set[f] = update[f];
    const sar = resolveWriteCurrency(set.currency ?? update.currency) === HALALA_CURRENCY;
    const shadowSet: Record<string, number> = sar ? shadowFields(set, fields) : {};
    const shadowInc: Record<string, number> = {};
    for (const f of fields) {
      const d = update.$inc?.[f];
      if (sar && typeof d === 'number' && isCleanSar(d)) shadowInc[shadowName(f)] = toHalalas(d);
    }
    if (Object.keys(shadowSet).length) this.setUpdate({ ...update, $set: { ...(update.$set || {}), ...shadowSet } });
    if (Object.keys(shadowInc).length) {
      const cur = this.getUpdate();
      this.setUpdate({ ...cur, $inc: { ...(cur.$inc || {}), ...shadowInc } });
    }
    next();
  };
  schema.pre('updateOne', onUpdate);
  schema.pre('updateMany', onUpdate);
  schema.pre('findOneAndUpdate', onUpdate);
}
