/**
 * Phase 16.9 - which fields are health data, and the two ways they are protected.
 *
 * 1. Mongoose models: `healthFieldsPlugin` puts an encrypting setter and a decrypting getter on every listed path, so
 *    `new Model(...)`, `save`, `create`, `insertMany` and `$set` updates store ciphertext, and a hydrated document, its
 *    `toObject()`/`toJSON()`, and a `.lean()` result (post hooks) give plaintext back. A caller does not have to remember.
 * 2. Raw collection access (`conn.collection('prescriptions')`) bypasses the model. Every such site calls `protectHealthDoc`
 *    before it writes and `revealHealthDoc` after it reads; `health-fields.spec.ts` fails when a new raw access appears
 *    that is not on its reviewed list.
 *
 * Search by these fields is not possible any more (random IV): the only filters on them were free-text searches.
 */
import type { Schema } from 'mongoose';
import { FieldEncryptionService, fieldCrypto } from './pdpl-compliance.module';

/** collection -> paths. `a.*.b` is "b of every element of the array a"; `a.b` is a nested object. */
export const HEALTH_FIELDS: Record<string, string[]> = {
  prescriptions: ['diagnosis', 'notes', 'items.*.instructions'],
  // the report text; the title stays readable (lists, search)
  medicalreports: ['patient_name', 'summary', 'body', 'diagnosis', 'recommendations'],
  // the doctor's consultation summary (SOAP); the patient's own booking note
  // written by the provider-ops completion handler, never read back by the API
  consultationnotes: ['notes', 'diagnosis'],
  appointments: ['summary.diagnosis', 'summary.notes', 'summary.recommendations', 'patient_notes', 'sickLeaves.*.reason'],
};

type Mapper = (value: string) => string;

function mapPath(target: unknown, parts: string[], fn: Mapper): void {
  if (target === null || typeof target !== 'object') return;
  if (Array.isArray(target)) {
    for (const el of target) mapPath(el, parts, fn);
    return;
  }
  const [head, ...rest] = parts;
  const obj = target as Record<string, unknown>;
  if (head === '*') return mapPath(obj, rest, fn);
  if (!(head in obj)) return;
  if (!rest.length) {
    if (typeof obj[head] === 'string' && obj[head]) obj[head] = fn(obj[head] as string);
    return;
  }
  mapPath(obj[head], rest.filter((p) => p !== '*'), fn);
}

function mapDoc<T>(collection: string, doc: T, fn: Mapper): T {
  for (const path of HEALTH_FIELDS[collection] ?? []) mapPath(doc, path.split('.'), fn);
  return doc;
}

/** Encrypt the health fields of a plain object about to be written with the raw driver. Mutates and returns it. */
export function protectHealthDoc<T>(collection: string, doc: T): T {
  const c = fieldCrypto();
  return mapDoc(collection, doc, (v) => c.encrypt(v));
}

/** Decrypt the health fields of a plain object read with the raw driver (a row never encrypted passes through). */
export function revealHealthDoc<T>(collection: string, doc: T): T {
  const c = fieldCrypto();
  return mapDoc(collection, doc, (v) => c.decrypt(v));
}

export function revealHealthDocs<T>(collection: string, docs: T[]): T[] {
  for (const d of docs) revealHealthDoc(collection, d);
  return docs;
}

/** Decrypt a string that may be a health field (for a code path that already picked the field out). */
export function revealHealthValue(value: unknown): unknown {
  return typeof value === 'string' ? fieldCrypto().decrypt(value) : value;
}

function schemaPathFor(schema: Schema, parts: string[]): { setPath: any } | null {
  // walk "items.*.instructions" through the array's own schema; "summary.diagnosis" is a nested path of this schema
  let current: Schema = schema;
  let prefix = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === '*') continue;
    const candidate = prefix ? `${prefix}.${part}` : part;
    const st: any = current.path(candidate);
    if (st && (st.$isMongooseDocumentArray || st.schema) && i < parts.length - 1) {
      current = st.schema;
      prefix = '';
      continue;
    }
    if (i === parts.length - 1) return st ? { setPath: st } : null;
    prefix = candidate;
  }
  return null;
}

/** Plugin: `schema.plugin(healthFieldsPlugin, { registry: 'prescriptions' })` (the key of HEALTH_FIELDS, which is the collection name). */
export function healthFieldsPlugin(schema: Schema, options: { registry: string }): void {
  const paths = HEALTH_FIELDS[options.registry];
  if (!paths) throw new Error(`no health fields registered for ${options.registry}`);
  const types: any[] = [];
  for (const path of paths) {
    const found = schemaPathFor(schema, path.split('.'));
    if (!found) throw new Error(`health field ${options.registry}.${path} is not a path of the schema (typed paths only)`);
    types.push(found.setPath);
    found.setPath.set((v: unknown) => (typeof v === 'string' ? fieldCrypto().encrypt(v) : v));
    found.setPath.get((v: unknown) => (typeof v === 'string' ? fieldCrypto().decrypt(v) : v));
  }
  // toObject()/toJSON() run getters (virtuals stay as the schema had them); the model's own options are kept
  for (const key of ['toObject', 'toJSON'] as const) {
    const existing = (schema.get(key) as Record<string, unknown> | undefined) ?? {};
    schema.set(key, { virtuals: false, ...existing, getters: true });
  }
  // lean() results and aggregate output are plain objects: decrypt them on the way out
  const reveal = (docs: unknown) => {
    const list = Array.isArray(docs) ? docs : docs ? [docs] : [];
    for (const d of list) if (d && typeof d === 'object' && !(d as { $__?: unknown }).$__) revealHealthDoc(options.registry, d);
  };
  for (const op of ['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'findOneAndReplace'] as const) {
    schema.post(op as any, function (docs: unknown) { reveal(docs); });
  }
  schema.post('aggregate' as any, function (docs: unknown) { reveal(docs); });
  void FieldEncryptionService; void types;
}
