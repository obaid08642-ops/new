/**
 * An in-memory stand-in for the `app_logs` collection: the operations the 20.3 code uses (insertMany, find with
 * sort/skip/limit, countDocuments, deleteMany, createIndex), and the filter operators the admin query builds
 * (equality, $gte/$lte on dates, $or of $regex). Not a general Mongo fake.
 */
const get = (doc: any, path: string) => path.split('.').reduce((v, k) => (v == null ? undefined : v[k]), doc);

export function matchesLog(doc: any, filter: Record<string, any>): boolean {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === '$or') return (cond as any[]).some((f) => matchesLog(doc, f));
    const value = get(doc, key);
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('$regex' in cond) return new RegExp(cond.$regex, cond.$options || '').test(String(value ?? ''));
      if ('$gte' in cond || '$lte' in cond) {
        const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
        return (!('$gte' in cond) || t >= cond.$gte.getTime()) && (!('$lte' in cond) || t <= cond.$lte.getTime());
      }
      if ('$in' in cond) return cond.$in.includes(value);
    }
    return value === cond;
  });
}

class Cursor {
  constructor(private rows: any[]) {}
  sort(spec: Record<string, 1 | -1>) {
    const keys = Object.entries(spec);
    this.rows = [...this.rows].sort((a, b) => {
      for (const [k, dir] of keys) {
        const av = a[k] instanceof Date ? a[k].getTime() : a[k];
        const bv = b[k] instanceof Date ? b[k].getTime() : b[k];
        if (av < bv) return -dir;
        if (av > bv) return dir;
      }
      return 0;
    });
    return this;
  }
  skip(n: number) { this.rows = this.rows.slice(n); return this; }
  limit(n: number) { this.rows = this.rows.slice(0, n); return this; }
  async toArray() { return this.rows; }
}

export class FakeLogCollection {
  docs: any[] = [];
  indexes: Array<Record<string, any>> = [];
  private seq = 0;
  insertManyCalls = 0;
  failInserts = false;

  async createIndex(key: Record<string, 1 | -1>, options: Record<string, unknown> = {}) { this.indexes.push({ key, ...options }); return options.name; }
  async insertMany(docs: any[]) {
    if (this.failInserts) throw new Error('db down');
    this.insertManyCalls += 1;
    for (const d of docs) this.docs.push({ _id: ++this.seq, ...d });
    return { insertedCount: docs.length };
  }
  find(filter: Record<string, any> = {}) { return new Cursor(this.docs.filter((d) => matchesLog(d, filter))); }
  async countDocuments(filter: Record<string, any> = {}) { return this.docs.filter((d) => matchesLog(d, filter)).length; }
  async estimatedDocumentCount() { return this.docs.length; }
  async deleteMany(filter: Record<string, any>) {
    const before = this.docs.length;
    this.docs = this.docs.filter((d) => !matchesLog(d, filter));
    return { deletedCount: before - this.docs.length };
  }
}

/** A mongoose-connection look-alike that serves one FakeLogCollection for `app_logs` (and `collStats` for the size cap). */
export function fakeLogConnection(col: FakeLogCollection, statsSize = 0) {
  return {
    collection: (name: string) => (name === 'app_logs' ? col : { findOne: async () => null, insertOne: async () => ({}) }),
    db: { command: async () => ({ size: statsSize, count: col.docs.length }) },
    model: () => null,
  } as any;
}
