/**
 * Minimal in-memory Mongo for HTTP e2e specs (extracted from the Gate P2
 * journey). Shared across repositories and raw collections, with
 * $set/$inc/$push/$unset semantics. Persistence only — services, guards,
 * bcrypt and JWT stay real.
 */
let seq = 0;
const uid = (p: string) => `${p || 'id'}-${Date.now()}-${seq++}`;

export function matches(doc: any, filter: any): boolean {
  if (!filter || !Object.keys(filter).length) return true;
  for (const [k, v] of Object.entries(filter)) {
    if (k === '$or') {
      if (!(v as any[]).some((c) => matches(doc, c))) return false;
      continue;
    }
    const dv = doc?.[k];
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof RegExp)) {
      const ops = v as any;
      if ('$eq' in ops) { if (JSON.stringify(dv) !== JSON.stringify(ops.$eq)) return false; continue; }
      if ('$in' in ops) { if (!ops.$in.some((x: any) => String(x) === String(dv))) return false; continue; }
      if ('$ne' in ops) { if (String(dv) === String(ops.$ne)) return false; continue; }
      if ('$exists' in ops) { if (!!ops.$exists !== (dv !== undefined)) return false; continue; }
      if ('$regex' in ops) { if (!new RegExp(ops.$regex, ops.$options || '').test(String(dv ?? ''))) return false; continue; }
      if (JSON.stringify(dv) !== JSON.stringify(v)) return false;
      continue;
    }
    if (v instanceof RegExp) { if (!v.test(String(dv ?? ''))) return false; continue; }
    if (String(dv ?? '__undef__') !== String((v as any) ?? '__undef__')) return false;
  }
  return true;
}

function applyUpdate(doc: any, update: any) {
  for (const [op, fields] of Object.entries(update || {})) {
    if (op === '$set') for (const [k, v] of Object.entries(fields as any)) doc[k] = v;
    else if (op === '$inc') for (const [k, v] of Object.entries(fields as any)) doc[k] = Number(doc[k] || 0) + Number(v);
    else if (op === '$push') for (const [k, v] of Object.entries(fields as any)) { (doc[k] = doc[k] || []).push(v); }
    else if (op === '$unset') for (const k of Object.keys(fields as any)) delete doc[k];
    else if (op === '$setOnInsert') { /* updateOne path never inserts */ }
  }
}

class FakeDoc {
  [k: string]: any;
  constructor(private store: Map<string, any>, data: any) { Object.assign(this, data); }
  async save() { this.store.set(this.id, this); return this; }
  toObject() { const { store, ...rest } = this as any; return { ...rest }; }
  markModified() {}
}

class FakeQuery {
  constructor(protected docs: any[]) {}
  protected plainOne() {
    const d = this.docs[0];
    if (!d) return null;
    const { save, toObject, markModified, ...rest } = d;
    return { ...rest };
  }
  lean() { return Promise.resolve(this.plainOne()); }
  exec() { return Promise.resolve(this.docs[0] || null); }
  sort() { return this; }
  limit() { return this; }
  toArray() { return this.lean(); }
  then(res: any, rej?: any) { return Promise.resolve(this.docs[0] || null).then(res, rej); }
  catch(rej: any) { return Promise.resolve(this.docs[0] || null).catch(rej); }
}

class FakeMany extends FakeQuery {
  lean() {
    return Promise.resolve(
      this.docs.map((d) => {
        const { save, toObject, markModified, ...rest } = d || {};
        return d ? { ...rest } : d;
      }),
    );
  }
  then(res: any, rej?: any) { return Promise.resolve(this.docs).then(res, rej); }
}

export class FakeCollection {
  store = new Map<string, any>();
  constructor(public name: string) {}
  private all() { return [...this.store.values()]; }
  findOne(filter: any) { return new FakeQuery([this.all().find((d) => matches(d, filter))].filter(Boolean)); }
  find(filter: any) { return new FakeMany(this.all().filter((d) => matches(d, filter))); }
  async insertOne(doc: any) {
    const d = new FakeDoc(this.store, { id: doc.id || uid(this.name), ...doc });
    this.store.set(d.id, d);
    return { acknowledged: true, insertedId: d.id };
  }
  async create(data: any) {
    const d = new FakeDoc(this.store, { id: data.id || uid(this.name), ...data });
    this.store.set(d.id, d);
    return d;
  }
  async updateOne(filter: any, update: any) {
    const d = this.all().find((x) => matches(x, filter));
    if (!d) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    applyUpdate(d, update);
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  }
  async updateMany(filter: any, update: any) {
    let n = 0;
    for (const d of this.all().filter((x) => matches(x, filter))) { applyUpdate(d, update); n++; }
    return { acknowledged: true, matchedCount: n, modifiedCount: n };
  }
  async countDocuments(filter: any = {}) { return this.all().filter((d) => matches(d, filter)).length; }
  async deleteOne(filter: any) {
    const d = this.all().find((x) => matches(x, filter));
    if (d) this.store.delete(d.id);
    return { acknowledged: true, deletedCount: d ? 1 : 0 };
  }
}

export function makeDb() {
  const cols = new Map<string, FakeCollection>();
  const collection = (name: string) => {
    if (!cols.has(name)) cols.set(name, new FakeCollection(name));
    return cols.get(name)!;
  };
  const model = (name: string) => {
    const c = collection(name);
    return {
      findOne: (f: any) => c.findOne(f),
      find: (f: any) => c.find(f),
      create: (d: any) => c.create(d),
      updateOne: (f: any, u: any) => c.updateOne(f, u),
      updateMany: (f: any, u: any) => c.updateMany(f, u),
      countDocuments: (f: any) => c.countDocuments(f),
      db: { collection },
    };
  };
  return { collection, model };
}
