/**
 * The search box of the lab, radiology and nursing lists on the home search's stack: the Arabic / English synonyms (Meilisearch settings and the words of a search document),
 * the ranking score as the document's boost, matchIds on the Meilisearch path and on the MongoDB fallback, and the lists using it (and keeping their own match as the fallback).
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { meiliSynonyms } from './meili.client';
import { toSearchDocument } from './search-documents';
import { SearchService } from './search.service';
import { LAB_TYPES, NURSING_TYPES, RADIOLOGY_TYPES, byRelevance, matchedIds } from './catalogue-search';
import { normalizeSearchText } from '../seo-search/seo-search.module';
import { LabsService } from '../labs/labs.service';

jest.setTimeout(120_000);
const OK = { active: true, is_deleted: false, public_eligibility: true, medical_review_status: 'approved' };

describe('synonyms', () => {
  const syn = meiliSynonyms();
  const has = (a: string, b: string) => (syn[normalizeSearchText(a)] || []).includes(normalizeSearchText(b));
  it('the examples of the request map both ways, and the medicine synonyms are still there', () => {
    for (const [a, b] of [['سكر تراكمي', 'HbA1c'], ['صورة دم', 'CBC'], ['سونار', 'ultrasound'], ['رنين', 'MRI']]) {
      expect(has(a, b)).toBe(true);
      expect(has(b, a)).toBe(true);
    }
    expect(has('panadol', 'paracetamol')).toBe(true);
  });
  it('a search document carries the other-language words of its name', () => {
    const lab = toSearchDocument('lab_services', { id: 'l1', name_ar: 'تحليل HbA1c', name_en: 'HbA1c', short_code: 'HbA1c', category: 'diabetes', ...OK })!;
    expect(lab.text).toContain('سكر تراكمي');
    const mri = toSearchDocument('radiology_services', { id: 'r1', name_ar: 'رنين مغناطيسي للدماغ', name_en: 'MRI Brain', modality: 'mri', ...OK })!;
    expect(mri.text).toContain('magnetic resonance');
    const drip = toSearchDocument('nursing_services', { id: 'n1', name_ar: 'محلول وريدي', name_en: 'IV Drip Therapy', ...OK })!;
    expect(drip.text).toContain('iv drip');
  });
  it('the ranking score is the boost of a lab, scan or nursing row; a row without one keeps its editorial popularity', () => {
    const scored = toSearchDocument('lab_services', { id: 'a', name_en: 'A', popularity: 5, rank_score: 90, ...OK })!;
    const plain = toSearchDocument('lab_services', { id: 'b', name_en: 'B', popularity: 5, ...OK })!;
    expect(scored.boost).toBeCloseTo(Math.log10(91));
    expect(plain.boost).toBeCloseTo(Math.log10(6));
  });
});

describe('matchIds', () => {
  let mongo: MongoMemoryServer;
  let svc: SearchService;
  const docs = [
    toSearchDocument('lab_services', { id: 'lab-hba1c', name_ar: 'السكر التراكمي', name_en: 'HbA1c', short_code: 'HbA1c', category: 'diabetes', ...OK }),
    toSearchDocument('lab_services', { id: 'lab-cbc', name_ar: 'صورة دم كاملة', name_en: 'Complete Blood Count', short_code: 'CBC', category: 'blood', ...OK }),
    toSearchDocument('radiology_services', { id: 'rad-mri', name_ar: 'رنين مغناطيسي للدماغ', name_en: 'MRI Brain', modality: 'mri', ...OK }),
    toSearchDocument('radiology_services', { id: 'rad-us', name_ar: 'سونار البطن', name_en: 'Abdominal Ultrasound', modality: 'ultrasound', ...OK }),
    toSearchDocument('nursing_services', { id: 'nur-iv', name_ar: 'محلول وريدي', name_en: 'IV Drip Therapy', ...OK }),
  ].filter(Boolean) as never[];

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'cat_search' });
    await mongoose.connection.collection('search_index').insertMany(docs);
    svc = new SearchService(mongoose.connection as never);
    (svc as any).meili = null;                                  // the MongoDB path
  });
  afterAll(async () => { await mongoose.disconnect(); await mongo.stop(); });

  it('MongoDB fallback: an Arabic phrase finds the English-named test, a scan by its other-language name, nothing from another section', async () => {
    expect(await svc.matchIds('سكر تراكمي', LAB_TYPES)).toEqual(['lab-hba1c']);
    expect(await svc.matchIds('cbc', LAB_TYPES)).toEqual(['lab-cbc']);
    expect(await svc.matchIds('mri', RADIOLOGY_TYPES)).toEqual(['rad-mri']);
    expect(await svc.matchIds('سونار', RADIOLOGY_TYPES)).toEqual(['rad-us']);
    expect(await svc.matchIds('محلول', NURSING_TYPES)).toEqual(['nur-iv']);
    expect(await svc.matchIds('mri', LAB_TYPES)).toBeNull();                    // nothing in labs: the caller keeps its own match
    expect(await svc.matchIds('', LAB_TYPES)).toBeNull();
  });

  it('Meilisearch path: its hits are used in its order; when it fails the MongoDB answer is used', async () => {
    const hit = (id: string, type: string) => ({ ...(docs.find((d: any) => d.id === id) as object), type });
    (svc as any).meili = { search: jest.fn().mockResolvedValue({ lab_test: [hit('lab-cbc', 'lab_test'), hit('lab-hba1c', 'lab_test')], lab_package: [] }) };
    expect(await svc.matchIds('blod count', LAB_TYPES)).toEqual(['lab-cbc', 'lab-hba1c']);
    expect((svc as any).meili.search).toHaveBeenCalledWith('blod count', LAB_TYPES, 60, []);
    (svc as any).meili = { search: jest.fn().mockRejectedValue(new Error('down')) };
    expect(await svc.matchIds('cbc', LAB_TYPES)).toEqual(['lab-cbc']);
    (svc as any).meili = null;
  });
});

describe('helpers', () => {
  it('byRelevance orders by the engine; rows it did not return go last', () => {
    expect(byRelevance([{ id: 'c' }, { id: 'a' }, { id: 'x' }, { id: 'b' }], ['a', 'b', 'c']).map((r) => r.id)).toEqual(['a', 'b', 'c', 'x']);
  });
  it('matchedIds asks for two letters or more and needs the engine', async () => {
    const engine: any = { matchIds: jest.fn().mockResolvedValue(['a']) };
    expect(await matchedIds(engine, ' x ', LAB_TYPES)).toBeNull();
    expect(await matchedIds(undefined, 'cbc', LAB_TYPES)).toBeNull();
    expect(await matchedIds(engine, ' cbc ', LAB_TYPES)).toEqual(['a']);
    expect(engine.matchIds).toHaveBeenCalledWith('cbc', LAB_TYPES);
  });
});

describe('the labs list', () => {
  const rows = [{ id: 'lab-b', name_ar: 'ب' }, { id: 'lab-a', name_ar: 'أ' }];
  const make = (engine: unknown) => {
    const filters: any[] = [];
    const svcModel: any = {
      db: { collection: () => ({ find: () => ({ toArray: async () => [] }) }) },
      find: jest.fn((q: any) => {
        filters.push(q);
        const chain: any = { sort: () => chain, limit: () => chain, lean: () => Promise.resolve([...rows]) };
        return chain;
      }),
    };
    const svc = new (LabsService as any)(svcModel, {}, {}, {}, {}, {}, {}, {}, undefined, undefined, undefined, engine);
    return { svc, filters };
  };

  it('filters by the ids the engine found and keeps the engine order', async () => {
    const { svc, filters } = make({ matchIds: async () => ['lab-a', 'lab-b'] });
    const out = await svc.list({ search: 'سكر تراكمي' });
    expect(filters[0].id).toEqual({ $in: ['lab-a', 'lab-b'] });
    expect(filters[0].$or).toBeUndefined();
    expect(out.map((r: any) => r.id)).toEqual(['lab-a', 'lab-b']);
  });

  it('keeps its own text match when the engine has no answer', async () => {
    const { svc, filters } = make({ matchIds: async () => null });
    await svc.list({ search: 'cbc' });
    expect(filters[0].id).toBeUndefined();
    expect(Array.isArray(filters[0].$or)).toBe(true);
  });
});
