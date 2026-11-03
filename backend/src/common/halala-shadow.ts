/**
 * R11 phase P1 (expand), dual write: a Mongoose plugin that keeps an integer `<field>_halalas` next to every legacy SAR double it names
 * (docs/platform/R11-money-integrity.md). Readers still use the doubles; the shadows are what the invariant checks and the later switch (P2) read.
 *
 * Covers documents (`save`, `create`) and the update calls Mongoose runs through the model (`updateOne`, `updateMany`, `findOneAndUpdate`):
 *  - a number written with `$set` (or at the top of an update) gets its shadow in the same write;
 *  - a number moved with `$inc` raises the shadow by the halalas of the delta;
 *  - a value that is not a whole number of halalas (float drift) is NOT rounded silently: its shadow is left unset, so the integrity check lists it.
 * Writes that bypass Mongoose (a raw `collection()` call) must add the shadow themselves with `shadowFields`.
 */
import { Schema } from 'mongoose';
import { isCleanSar, toHalalas } from './money';

const shadowName = (field: string) => `${field}_halalas`;

/** `{ field_halalas: n }` for every named field that is a clean number in `values`; for use in raw collection writes. */
export function shadowFields(values: Record<string, unknown>, fields: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of fields) if (isCleanSar(values[f])) out[shadowName(f)] = toHalalas(values[f] as number);
  return out;
}

export function halalaShadowPlugin(schema: Schema, fields: string[]): void {
  for (const f of fields) {
    if (!schema.path(shadowName(f))) schema.add({ [shadowName(f)]: { type: Number } });
  }

  schema.pre('save', function (next) {
    const doc = this as any;
    for (const f of fields) {
      if (!doc.isNew && !doc.isModified(f)) continue;
      const v = doc.get(f);
      if (isCleanSar(v)) doc.set(shadowName(f), toHalalas(v));
      else doc.set(shadowName(f), undefined);
    }
    next();
  });

  const onUpdate = function (this: any, next: (err?: Error) => void) {
    const update = this.getUpdate();
    if (!update || Array.isArray(update)) return next();   // pipeline updates are not rewritten
    const set: Record<string, unknown> = { ...(update.$set || {}) };
    for (const f of fields) if (f in update && !f.startsWith('$')) set[f] = update[f];
    const shadowSet: Record<string, number> = shadowFields(set, fields);
    const shadowInc: Record<string, number> = {};
    for (const f of fields) {
      const d = update.$inc?.[f];
      if (typeof d === 'number' && isCleanSar(d)) shadowInc[shadowName(f)] = toHalalas(d);
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
