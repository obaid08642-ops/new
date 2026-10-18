import type { Schema } from 'mongoose';

/** The error an append-only collection raises on any change to a stored row. */
export class AppendOnlyViolation extends Error {
  constructor(collection: string, operation: string) {
    super(`${collection} is append-only: ${operation} is not allowed`);
    this.name = 'AppendOnlyViolation';
  }
}

const QUERY_OPS = [
  'updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'findOneAndDelete', 'findOneAndRemove',
  'replaceOne', 'deleteOne', 'deleteMany', 'remove',
] as const;

/**
 * 16.6 — make a collection append-only at the model layer: every update, replace and delete through Mongoose throws, and a
 * document that is already stored cannot be saved again. Inserts (`create`, `insertMany`, `save` of a new document) pass.
 *
 * The one lawful removal is the owner-approved retention job (23.5), which uses the driver collection directly and leaves a
 * tombstone for every chain link it removes; nothing reachable from a controller can use that path.
 */
export function makeAppendOnly(schema: Schema, collection: string): void {
  for (const op of QUERY_OPS) {
    schema.pre(op as any, function () {
      throw new AppendOnlyViolation(collection, op);
    });
  }
  schema.pre('save', function () {
    if (!(this as unknown as { isNew: boolean }).isNew) throw new AppendOnlyViolation(collection, 'save of an existing row');
  });
  schema.pre('bulkWrite' as any, function (this: unknown, next: unknown, ops: unknown) {
    const list = Array.isArray(next) ? next : Array.isArray(ops) ? ops : [];
    if (list.some((o: Record<string, unknown>) => !('insertOne' in o))) throw new AppendOnlyViolation(collection, 'bulkWrite');
  });
}
