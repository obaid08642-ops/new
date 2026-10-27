import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { applyChanges, rollbackChanges, sha256, type DbLike } from '../catalogs/catalogue-apply.core';
import { planProductTranslations } from '../catalogs/catalogue-apply.steps';
import { computePlan } from '../../scripts/catalogue-apply';
import { estimateRequests, planFromResponses } from '../../scripts/translate-product-content';
import { buildRequests, checkTranslation, findGaps, isTranslationFile, numbersOf, parseAnswers, storagePath, type TranslationFile } from './content-translation';
import { resolveMedicinePublicDto } from './med-i18n';

const product = (extra: Record<string, unknown> = {}) => ({
  id: 'p1', name_ar: 'دواء', name_en: 'Drug', slug: 'drug', public_eligibility: true, medical_review_status: 'approved',
  description_ar: 'وصف عربي كامل', description_en: 'English description', indications_en: 'Pain relief 500 mg\nFever',
  warnings_ar: 'لا يستعمل مع الكحول', ...extra,
});

describe('findGaps', () => {
  it('targets ar and en first, translating from the other of the two; the rest from English, else Arabic', () => {
    const { gaps } = findGaps(product());
    const key = (g: { field: string; target: string }) => `${g.target}.${g.field}`;
    const by = new Map(gaps.map((g) => [key(g), g]));
    expect(by.get('ar.indications')).toMatchObject({ source: 'en', text: 'Pain relief 500 mg\nFever' });
    expect(by.get('en.warnings')).toMatchObject({ source: 'ar' });
    expect(by.get('hi.indications')).toMatchObject({ source: 'en' });
    expect(by.get('hi.warnings')).toMatchObject({ source: 'ar' }); // no English: Arabic
    expect(by.get('ar.description')).toBeUndefined(); // already there
    expect(gaps.findIndex((g) => g.target === 'ur')).toBeGreaterThan(gaps.findIndex((g) => g.target === 'en'));
  });
  it('never translates from a text sitting in the wrong column: it is moved first, and the gaps are those of the corrected product', () => {
    const r = findGaps(product({ description_en: '', usage_instructions_en: 'نص عربي طويل جدا يوضع خطأ في العمود الإنجليزي هنا' }));
    expect(r.mislabelled).toBe(0);
    expect(r.moves).toEqual([expect.objectContaining({ field: 'how_to_use', wrong: 'en', right: 'ar', kind: 'move' })]);
    expect(r.gaps.some((g) => g.field === 'how_to_use' && g.source === 'en')).toBe(false);                          // not translated FROM the Arabic in the English column
    expect(r.gaps.find((g) => g.field === 'how_to_use' && g.target === 'en')).toMatchObject({ source: 'ar', text: 'نص عربي طويل جدا يوضع خطأ في العمود الإنجليزي هنا' }); // the emptied column is a normal gap, from the moved text
  });
  it('invents nothing: a field that exists nowhere is not a gap', () => {
    expect(findGaps(product()).gaps.some((g) => g.field === 'side_effects')).toBe(false);
  });
});

describe('checkTranslation', () => {
  it('keeps the numbers: same doses, Arabic-Indic digits count as the same number', () => {
    expect(numbersOf('خذ ٥٠٠ ملغ كل 8 ساعات')).toEqual(['500', '8']);
    expect(checkTranslation('Take 500 mg every 8 hours', 'خذ ٥٠٠ ملغ كل ٨ ساعات', 'ar')).toBeNull();
    expect(checkTranslation('Take 500 mg every 8 hours', 'خذ 50 ملغ كل 8 ساعات', 'ar')).toBe('numbers_differ');
  });
  it('right script, sane length, no markup, not empty', () => {
    expect(checkTranslation('Pain relief of the head', 'Pain relief of the head', 'hi')).toBe('wrong_script');
    expect(checkTranslation('A long enough sentence about storage conditions', 'storage place only', 'ar')).toBe('wrong_script');
    expect(checkTranslation('A long enough sentence about storage conditions', 'خزن', 'ar')).toBe('length');
    expect(checkTranslation('Store in a cool place', '```json x```', 'ar')).toBe('format');
    expect(checkTranslation('Store in a cool place', '  ', 'ar')).toBe('empty');
    expect(checkTranslation('Store in a cool place', null, 'ar')).toBe('empty');
    expect(checkTranslation('Store in a cool place', 'يحفظ في مكان بارد', 'ar')).toBeNull();
  });
});

describe('requests, estimate and plan (a fake model)', () => {
  const gaps = findGaps(product()).gaps;
  const reqs = buildRequests(gaps, 3);
  it('groups by language pair, ar/en targets first, at most 3 texts per request', () => {
    expect(reqs.every((r) => r.items.length <= 3)).toBe(true);
    expect(reqs[0].target === 'ar' || reqs[0].target === 'en').toBe(true);
    expect(reqs.every((r) => r.prompt.includes('never invent content'))).toBe(true);
  });
  it('estimates tokens and cost without a network', () => {
    const e = estimateRequests(reqs);
    expect(e.texts).toBe(gaps.length);
    expect(e.total_input_tokens).toBeGreaterThan(0);
    expect(e.usd_standard).toBeGreaterThanOrEqual(0);
  });
  it('accepts good answers, rejects bad ones by reason, and reports missing answers', () => {
    const responses = new Map<string, string>();
    for (const r of reqs) {
      responses.set(r.id, JSON.stringify(r.items.map((it) => ({ i: it.i, t: r.target === 'ar' ? (it.text.includes('500') ? 'تخفيف الألم ٥٠٠ ملغ' + '\nالحمى' : 'نص عربي صالح للاختبار') : null }))));
    }
    responses.delete(reqs[reqs.length - 1].id);
    const plan = planFromResponses(reqs, responses, 'fake-model', '2026-10-26T00:00:00Z');
    expect(plan.accepted).toBeGreaterThan(0);
    expect(plan.rejected.no_answer).toBeGreaterThan(0);
    expect(plan.rejected.empty).toBeGreaterThan(0);
    expect(plan.file.items.every((i) => i.source_sha === sha256(gaps.find((g) => g.id === i.id && g.field === i.field && g.target === i.target)!.text))).toBe(true);
    expect(isTranslationFile(plan.file)).toBe(true);
  });
  it('parseAnswers tolerates text around the JSON and drops malformed items', () => {
    expect(parseAnswers('here: [{"i":0,"t":"x"},{"i":"a","t":"y"},{"i":1,"t":null}] done')).toEqual([{ i: 0, t: 'x' }, { i: 1, t: null }]);
  });
  it('storagePath: ar/en long texts go to their column, the rest to translations', () => {
    expect(storagePath('dosage_instructions', 'ar')).toBe('dosage_ar');
    expect(storagePath('how_to_use', 'en')).toBe('usage_instructions_en');
    expect(storagePath('indications', 'hi')).toBe('translations.hi.indications_uses');
    expect(storagePath('form', 'fil')).toBe('translations.tl.dosage_form');
    expect(storagePath('form', 'ar')).toBe('translations.ar.dosage_form');
  });
});

describe('planProductTranslations on a database (guarded, resumable, reversible)', () => {
  jest.setTimeout(120_000);
  let mongod: MongoMemoryServer; let db: DbLike;
  const col = () => mongoose.connection.db!.collection('medicines');
  beforeAll(async () => { mongod = await MongoMemoryServer.create(); await mongoose.connect(mongod.getUri(), { dbName: 'content_translation_test' }); db = mongoose.connection.db as unknown as DbLike; });
  afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });
  beforeEach(async () => { await col().deleteMany({}); await col().insertOne(product()); });

  const file = (): TranslationFile => ({
    version: 1, model: 'fake-model', generated_at: 't',
    items: [
      { id: 'p1', field: 'indications', target: 'ar', source: 'en', text: 'تخفيف الألم 500 ملغ\nالحمى', source_sha: sha256('Pain relief 500 mg\nFever') },
      { id: 'p1', field: 'warnings', target: 'en', source: 'ar', text: 'Do not use with alcohol', source_sha: sha256('لا يستعمل مع الكحول') },
      { id: 'p1', field: 'indications', target: 'hi', source: 'en', text: 'दर्द से राहत 500 मिलीग्राम\nबुखार', source_sha: sha256('Pain relief 500 mg\nFever') },
      { id: 'ghost', field: 'indications', target: 'ar', source: 'en', text: 'x', source_sha: 'x' },
    ],
  });

  it('writes empty fields only, marks them machine translated, and the DTO then shows them in the page language', async () => {
    const { changes, report } = await planProductTranslations(db, file());
    expect(report).toMatchObject({ items: 4, to_write: 3, skipped_not_published: 1 });
    expect(report.by_locale).toEqual({ ar: 1, en: 1, hi: 1 });
    await applyChanges(db, changes);
    const doc = (await col().findOne({ id: 'p1' }))!;
    expect(doc.indications_ar).toBe('تخفيف الألم 500 ملغ\nالحمى');
    expect(doc.warnings_en).toBe('Do not use with alcohol');
    expect(doc.translations.hi.indications_uses).toBe('दर्द से राहत 500 मिलीग्राम\nबुखार');
    expect(doc.translation_provenance.ar.indications).toBe('machine:fake-model');
    const dto = resolveMedicinePublicDto(doc, 'ar');
    expect(dto.indications).toEqual(['تخفيف الألم 500 ملغ', 'الحمى']);
    expect(dto.fallback_langs.indications).toBeUndefined();
    expect((await planProductTranslations(db, file())).changes).toHaveLength(0); // resumable: a second plan is empty
  });

  it('never overwrites a text that appeared since, and skips an item whose source text changed', async () => {
    await col().updateOne({ id: 'p1' }, { $set: { indications_ar: 'نص موجود', warnings_ar: 'نص جديد مختلف' } });
    const { report } = await planProductTranslations(db, file());
    expect(report.already_translated).toBe(1);
    expect(report.skipped_source_changed).toBe(1);
    expect(report.to_write).toBe(1);
  });

  it('rolls back to the empty fields', async () => {
    const { changes } = await planProductTranslations(db, file());
    await applyChanges(db, changes);
    await rollbackChanges(db, changes);
    const doc = (await col().findOne({ id: 'p1' }))!;
    expect(doc.indications_ar).toBeUndefined();
    expect(doc.translation_provenance?.ar?.indications).toBeUndefined();
  });

  it('is part of the catalogue-apply plan only when the file is given, and its hash is in the inputs', async () => {
    const fs = await import('fs'); const os = await import('os'); const path = await import('path');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tr-')); const f = path.join(dir, 't.json'); fs.writeFileSync(f, JSON.stringify(file()));
    const without = await computePlan(db, []);
    const withFile = await computePlan(db, [`--product-translations=${f}`]);
    expect(without.report.product_translations).toMatch(/skipped/);
    expect(withFile.inputs.product_translations).toBe(sha256(fs.readFileSync(f, 'utf8')));
    expect(withFile.changes.length).toBeGreaterThan(without.changes.length);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
