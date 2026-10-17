import { MongoMemoryServer } from 'mongodb-memory-server';
import { mongo as mdb } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { SeoSearchService } from './seo-search.module';
import { ingredientKey, rankEquivalents, strengthKey } from './product-equivalents';

// Issue 1547: the product page's equivalents. Red on the base: there is no route, and the web kept only the first 12
// search hits whose active_ingredient string was EXACTLY the product's, so most products showed nothing.

describe('ingredient, strength and form keys', () => {
  it('spellings of one ingredient set give one key', () => {
    expect(ingredientKey('Paracetamol')).toBe(ingredientKey(' paracetamol '));
    expect(ingredientKey('Acetaminophen')).toBe(ingredientKey('Paracetamol'));
    expect(ingredientKey('باراسيتامول')).toBe(ingredientKey('Paracetamol'));
    expect(ingredientKey('Caffeine + Paracetamol')).toBe(ingredientKey('paracetamol/caffeine'));
    expect(ingredientKey('إيبوبروفين /')).toBe(ingredientKey('ايبوبروفين'));
    expect(ingredientKey('Amoxicillin (as trihydrate)')).toBe(ingredientKey('AMOXICILLIN'));
    expect(ingredientKey('Ibuprofen')).not.toBe(ingredientKey('Paracetamol'));
    expect(ingredientKey('Caffeine + Paracetamol')).not.toBe(ingredientKey('Paracetamol'));
    expect(ingredientKey(null)).toBe('');
  });

  it('spellings of one strength give one key', () => {
    expect(strengthKey('500 mg')).toBe('500mg');
    expect(strengthKey('500MG')).toBe('500mg');
    expect(strengthKey('٥٠٠ مجم')).toBe('500mg');
    expect(strengthKey('2,5 ml')).toBe('2.5ml');
    expect(strengthKey('')).toBe('');
  });

  it('ranks the same strength first, then the same form, then the most used; leaves out itself and unpriced rows', () => {
    const me = { id: 'a', active_ingredient: 'Paracetamol', strength: '500 mg', form: 'Tablets' };
    const rows = [
      { id: 'a', active_ingredient: 'Paracetamol', strength: '500 mg', form: 'Tablets', price: 5 },
      { id: 'b', active_ingredient: 'paracetamol', strength: '1 g', form: 'Tablets', price: 5, usage_count: 99 },
      { id: 'c', active_ingredient: 'Acetaminophen', strength: '500mg', form: 'Syrup', price: 5 },
      { id: 'd', active_ingredient: 'PARACETAMOL', strength: '500 MG', form: 'tablets', price: 5 },
      { id: 'e', active_ingredient: 'Paracetamol', strength: '500 mg', form: 'Tablets', price: 0 },
      { id: 'f', active_ingredient: 'Paracetamol + Caffeine', strength: '500 mg', form: 'Tablets', price: 5 },
    ];
    expect(rankEquivalents(me, rows, 8).map((r) => r.id)).toEqual(['d', 'c', 'b']);
  });
});

describe('GET public/product-equivalents/:locale/:id (MongoDB)', () => {
  let mongo: MongoMemoryServer;
  let client: mdb.MongoClient;
  let svc: SeoSearchService;
  const PUB = { public_eligibility: true, medical_review_status: 'approved' };
  const med = (id: string, extra: Record<string, unknown>) => ({
    id, slug: id, name_en: `Name ${id}`, name_ar: `اسم ${id}`, price: 10, category: 'Medicine', sub_category: 'Pain', ...PUB, ...extra,
  });

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    client = await mdb.MongoClient.connect(mongo.getUri());
    const db = client.db('nabd_test');
    await db.collection('medicines').insertMany([
      med('p1', { active_ingredient: 'Paracetamol', strength: '500 mg', form: 'Tablets', usage_count: 1 }),
      med('p2', { active_ingredient: 'paracetamol ', strength: '1 g', form: 'Tablets', usage_count: 50 }),
      med('p3', { active_ingredient: 'باراسيتامول', strength: '٥٠٠ مجم', form: 'Tablets', usage_count: 2 }),
      med('p4', { active_ingredient: 'Acetaminophen', strength: '500mg', form: 'Tablets', usage_count: 3 }),
      med('p5', { active_ingredient: 'Paracetamol', strength: '500 mg', form: 'Tablets', public_eligibility: false }),
      med('p6', { active_ingredient: 'Paracetamol', strength: '500 mg', form: 'Tablets', is_deleted: true }),
      med('p7', { active_ingredient: 'Paracetamol + Caffeine', strength: '500 mg', form: 'Tablets' }),
      med('rx1', { active_ingredient: 'Aripiprazole', strength: '15 mg', requires_prescription: true, old_price: 20, category: 'Rx', sub_category: 'CNS', sub_sub_category: 'Antipsychotic' }),
      med('rx2', { active_ingredient: 'Olanzapine', requires_prescription: true, old_price: 30, category: 'Rx', sub_category: 'CNS', sub_sub_category: 'Antipsychotic', usage_count: 5 }),
      med('rx3', { active_ingredient: 'Sertraline', requires_prescription: true, category: 'Rx', sub_category: 'CNS', sub_sub_category: 'Antidepressant' }),
      med('rx4', { active_ingredient: 'Sertraline', requires_prescription: true, category: 'Rx', sub_category: 'CNS', public_eligibility: false }),
      med('lonely', { category: 'Solo' }),
    ]);
    svc = new SeoSearchService({ collection: (name: string) => db.collection(name) } as never);
  }, 120_000);

  afterAll(async () => {
    await client?.close();
    await mongo?.stop();
  });

  it('returns the normalized-ingredient equivalents, same strength first, only published ones', async () => {
    const out = await svc.publicProductEquivalents('en', 'p1');
    expect(out.equivalents.map((c) => c.id)).toEqual(['p4', 'p3', 'p2']);
    expect(out.similar).toEqual([]);
    expect(out.equivalents[0]).toEqual(expect.objectContaining({ slug: 'p4', price: 10, is_rx: false }));
  });

  it('without equivalents: similar products of the therapeutic class, then the sub-category; Rx keeps no old price', async () => {
    const out = await svc.publicProductEquivalents('en', 'rx1');
    expect(out.equivalents).toEqual([]);
    expect(out.similar.map((c) => c.id)).toEqual(['rx2', 'rx3']);
    expect(out.similar.every((c) => c.is_rx === true && !c.old_price)).toBe(true);
  });

  it('nothing at all when there is no equivalent and no other product in the category', async () => {
    expect(await svc.publicProductEquivalents('ar', 'lonely')).toEqual({ locale: 'ar', id: 'lonely', equivalents: [], similar: [] });
  });

  it('an unpublished or unknown product is not found', async () => {
    await expect(svc.publicProductEquivalents('en', 'p5')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.publicProductEquivalents('en', 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
