// R12 review: after two renames (A→B, B→C) the first slug answered 404: the
// reader followed one hop (A→B) and looked for a medicine whose slug is B.
// Real MongoDB so the query is exercised as written.
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SeoSearchService } from './seo-search.module';
import { MedicinesService } from '../medicines/medicines.service';

jest.setTimeout(60_000);

describe('renamed product slugs resolve across any number of renames (R12)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'slug_chain_test' }).asPromise();
    await conn.collection('medicines').insertOne({
      id: 'med-chain-1', slug: 'paracetamol-c', name_en: 'Paracetamol C', name_ar: 'باراسيتامول',
      translations: { en: { slug: 'paracetamol-c', name: 'Paracetamol C' } },
      is_deleted: false, public_eligibility: true, indexing_eligibility: true, medical_review_status: 'approved',
    });
    await conn.collection('slug_history').insertMany([
      { entity_type: 'medicine', entity_id: 'med-chain-1', old_slug: 'paracetamol-a', new_slug: 'paracetamol-b' },
      { entity_type: 'medicine', entity_id: 'med-chain-1', old_slug: 'paracetamol-b', new_slug: 'paracetamol-c' },
    ]);
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });

  it('the first slug resolves to the current product with moved_from', async () => {
    const svc = new SeoSearchService(conn);
    const out: any = await svc.publicProductBySlug('en', 'paracetamol-a');
    expect(out.moved_from).toBe('paracetamol-a');
    expect(out.slug).toBe('paracetamol-c');
  });

  it('the middle slug resolves too', async () => {
    const out: any = await new SeoSearchService(conn).publicProductBySlug('en', 'paracetamol-b');
    expect(out.slug).toBe('paracetamol-c');
  });

  it('a new rename collapses the chain so every old slug points at the newest', async () => {
    const meds = Object.create(MedicinesService.prototype) as { conn: Connection; recordSlugHistory(id: string, a: string, b: string): Promise<void> };
    meds.conn = conn;
    await meds.recordSlugHistory('med-chain-1', 'paracetamol-c', 'paracetamol-d');
    const rows = await conn.collection('slug_history').find({ entity_id: 'med-chain-1' }).toArray();
    expect(rows.map((r) => [r.old_slug, r.new_slug]).sort()).toEqual([
      ['paracetamol-a', 'paracetamol-d'], ['paracetamol-b', 'paracetamol-d'], ['paracetamol-c', 'paracetamol-d'],
    ]);
  });
});
