import type { Connection } from 'mongoose';

/**
 * R14: unique-index review. For every registered Mongoose model, the unique indexes its schema declares must exist in the database with the same key and partial filter. A unique
 * index that failed to build (duplicates already in the data) is silently absent in production - this finds it and runs the duplicate pre-flight for it.
 */
export interface IndexFinding { collection: string; code: 'unique_index_missing' | 'unique_index_not_unique' | 'unique_index_filter_differs'; key: Record<string, unknown>; duplicate_groups?: number; sample?: unknown[] }

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export async function auditUniqueIndexes(conn: Connection): Promise<IndexFinding[]> {
  const out: IndexFinding[] = [];
  for (const model of Object.values(conn.models)) {
    const name = model.collection.collectionName;
    let actual: any[] = [];
    try { actual = await conn.collection(name).indexes(); } catch { continue; }       // the collection does not exist yet: nothing to compare
    for (const [key, opts] of model.schema.indexes() as Array<[Record<string, unknown>, Record<string, any>]>) {
      if (!opts?.unique) continue;
      const found = actual.find((i) => same(i.key, key));
      if (!found) {
        const f: IndexFinding = { collection: name, code: 'unique_index_missing', key };
        const match: Record<string, unknown> = { ...(opts.partialFilterExpression ?? {}) };
        for (const k of Object.keys(key)) if (!(k in match)) match[k] = { $exists: true, $ne: null };
        try {
          const groups: any[] = await conn.collection(name).aggregate([{ $match: match }, { $group: { _id: Object.fromEntries(Object.keys(key).map((k) => [k.replace(/\./g, '_'), `$${k}`])), n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }, { $limit: 50 }], { maxTimeMS: 30_000 } as any).toArray();
          f.duplicate_groups = groups.length; f.sample = groups.slice(0, 3).map((g) => g._id);
        } catch { /* a filter the aggregation cannot use: the missing index is still reported */ }
        out.push(f);
      } else if (!found.unique) out.push({ collection: name, code: 'unique_index_not_unique', key });
      else if (!same(found.partialFilterExpression, opts.partialFilterExpression)) out.push({ collection: name, code: 'unique_index_filter_differs', key });
    }
  }
  return out;
}
