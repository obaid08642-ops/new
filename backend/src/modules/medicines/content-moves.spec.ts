import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { applyChanges, rollbackChanges, sha256, type DbLike } from '../catalogs/catalogue-apply.core';
import { planProductTranslations } from '../catalogs/catalogue-apply.steps';
import { applyMoves, buildRequests, findGaps, findMoves, isTranslationFile, slotPaths, type MoveItem, type TranslationFile } from './content-translation';
import { resolveMedicinePublicDto, storedContentText } from './med-i18n';
import { main as translateMain, summarizeMoves } from '../../scripts/translate-product-content';
import { computePlan } from '../../scripts/catalogue-apply';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const AR = 'يؤخذ قرص واحد كل ثماني ساعات بعد الطعام مع كوب من الماء';          // a real Arabic text (well over the 12-letter threshold)
const EN = 'Take one tablet every eight hours after food with a glass of water';
const ok = { public_eligibility: true, medical_review_status: 'approved', name_ar: 'دواء', name_en: 'Drug' };

describe('findMoves: a text in the wrong column is a move, a clear or a swap', () => {
  it('move: the Arabic text sits in the English column and the Arabic column is empty', () => {
    const m = findMoves({ id: 'a', ...ok, dosage_en: AR });
    expect(m).toEqual([{ id: 'a', field: 'dosage_instructions', wrong: 'en', right: 'ar', kind: 'move', text: AR, text_sha: sha256(AR) }]);
  });
  it('move the other way: an English text in the Arabic column, English column empty', () => {
    expect(findMoves({ id: 'a', ...ok, dosage_ar: EN })).toEqual([expect.objectContaining({ wrong: 'ar', right: 'en', kind: 'move' })]);
  });
  it('clear: the right column already has its text, only the wrong one is emptied', () => {
    expect(findMoves({ id: 'a', ...ok, dosage_ar: EN, dosage_en: 'Take one tablet daily with food and water' })).toEqual([expect.objectContaining({ wrong: 'ar', kind: 'clear' })]);
    expect(findMoves({ id: 'a', ...ok, dosage_ar: AR, dosage_en: AR + ' زيادة' })).toEqual([expect.objectContaining({ wrong: 'en', kind: 'clear' })]);
  });
  it('swap: each column holds the other\'s language, one item', () => {
    const m = findMoves({ id: 'a', ...ok, dosage_ar: EN, dosage_en: AR });
    expect(m).toEqual([expect.objectContaining({ kind: 'swap', wrong: 'ar', right: 'en' })]);
  });
  it('a text in the right language, a short text, an Urdu/Hindi/Bengali/Filipino text and a mixed brand name are left alone', () => {
    expect(findMoves({ id: 'a', ...ok, dosage_ar: AR, dosage_en: EN })).toEqual([]);
    expect(findMoves({ id: 'a', ...ok, dosage_ar: 'Panadol 500', dosage_en: 'أقراص' })).toEqual([]);                  // too short to judge
    expect(findMoves({ id: 'a', ...ok, translations: { ur: { dosage_instructions: EN }, hi: { dosage_instructions: AR } } })).toEqual([]);
    expect(findMoves({ id: 'a', ...ok, dosage_ar: 'خذ قرصاً واحداً من Panadol Extra 500 mg بعد الأكل مرتين يومياً' })).toEqual([]);
  });
  it('reads the same slots the page reads: the translations map as well as the column', () => {
    expect(findMoves({ id: 'a', ...ok, translations: { en: { dosage_instructions: AR } } })).toEqual([expect.objectContaining({ wrong: 'en', kind: 'move', field: 'dosage_instructions' })]);
    expect(slotPaths('dosage_instructions', 'en')).toEqual(['dosage_en', 'translations.en.dosage_instructions']);
    expect(slotPaths('form', 'ar')).toEqual(['form', 'translations.ar.dosage_form']);
    expect(slotPaths('form', 'hi')).toEqual(['translations.hi.dosage_form']);
  });
});

describe('after the moves', () => {
  it('applyMoves gives the corrected product: the text in its own column, the wrong one empty', () => {
    const raw = { id: 'a', ...ok, dosage_en: AR };
    const fixed = applyMoves(raw, findMoves(raw));
    expect(storedContentText(fixed, 'dosage_instructions', 'ar')).toBe(AR);
    expect(storedContentText(fixed, 'dosage_instructions', 'en')).toBeNull();
    expect(raw.dosage_en).toBe(AR);                                                                                   // the input is not touched
  });
  it('the emptied column is a normal missing text, translated from the text that now sits in the right column', () => {
    const r = findGaps({ id: 'a', ...ok, dosage_en: AR });
    expect(r.moves).toHaveLength(1);
    expect(r.mislabelled).toBe(0);
    const en = r.gaps.find((g) => g.target === 'en' && g.field === 'dosage_instructions');
    expect(en).toMatchObject({ source: 'ar', text: AR });
    expect(buildRequests(r.gaps).some((q) => q.items.some((i) => i.field === 'dosage_instructions' && q.source === 'ar' && q.target === 'en'))).toBe(true);
  });
  it('a clear is re-translated from the right-language column', () => {
    const r = findGaps({ id: 'a', ...ok, dosage_ar: EN, dosage_en: 'Take one tablet daily with food and water' });
    expect(r.gaps.find((g) => g.target === 'ar' && g.field === 'dosage_instructions')).toMatchObject({ source: 'en', text: 'Take one tablet daily with food and water' });
  });
  it('summarizeMoves counts by kind and by pair and field', () => {
    const moves: MoveItem[] = [
      ...findMoves({ id: 'a', ...ok, dosage_en: AR, description_en: AR }),
      ...findMoves({ id: 'b', ...ok, dosage_ar: EN, dosage_en: 'Take one tablet daily with food and water' }),
    ];
    expect(summarizeMoves(moves)).toEqual({ total: 3, by_kind: { move: 2, clear: 1 }, per_pair: { 'en>ar': { dosage_instructions: 1, description: 1 }, 'ar>en': { dosage_instructions: 1 } } });
  });
});

describe('the page shows a section in its language or not at all', () => {
  it('until the text is moved, the English page hides the Arabic text that sits in its column; the Arabic page does not show the English one', () => {
    const wrong = { id: 'a', ...ok, dosage_en: AR };
    expect(resolveMedicinePublicDto(wrong, 'en').dosage_instructions).toBeNull();
    expect(resolveMedicinePublicDto(wrong, 'ar').dosage_instructions).toBeNull();                                      // the Arabic column is empty and the English one is not English
    const moved = applyMoves(wrong, findMoves(wrong));
    expect(resolveMedicinePublicDto(moved, 'ar').dosage_instructions).toBe(AR);                                       // shown in Arabic once it sits in its own column
    expect(resolveMedicinePublicDto(moved, 'en').dosage_instructions).toBeNull();                                      // still hidden in English until translated
  });
});

describe('the moves as guarded catalogue-apply steps', () => {
  jest.setTimeout(120_000);
  let mongod: MongoMemoryServer; let db: DbLike;
  const col = () => mongoose.connection.db!.collection('medicines');
  beforeAll(async () => { mongod = await MongoMemoryServer.create(); await mongoose.connect(mongod.getUri(), { dbName: 'content_moves_test' }); db = mongoose.connection.db as unknown as DbLike; });
  afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });
  beforeEach(async () => {
    await col().deleteMany({});
    await col().insertMany([
      { id: 'mv', ...ok, dosage_en: AR },                                                                             // move (en → ar)
      { id: 'cl', ...ok, dosage_ar: EN, dosage_en: 'Take one tablet daily with food and water' },                      // clear (ar)
      { id: 'sw', ...ok, dosage_ar: EN, dosage_en: AR },                                                              // swap
      { id: 'mp', ...ok, translations: { en: { dosage_instructions: AR } } },                                         // move from the translations map
      { id: 'fine', ...ok, dosage_ar: AR, dosage_en: EN },
    ]);
  });

  const movesOf = async (): Promise<MoveItem[]> => (await col().find({}).toArray()).flatMap((d) => findMoves(d));
  const fileWith = async (items: TranslationFile['items'] = []): Promise<TranslationFile> => ({ version: 1, model: 'fake-model', generated_at: 't', items, moves: await movesOf() });

  it('the file with moves is valid; a malformed move is not', async () => {
    expect(isTranslationFile(await fileWith())).toBe(true);
    expect(isTranslationFile({ ...(await fileWith()), moves: [{ id: 'x' }] })).toBe(false);
  });

  it('move, clear and swap: every path is written only while it holds the exact old text, and the moved text is marked machine_moved', async () => {
    const { changes, report } = await planProductTranslations(db, await fileWith());
    expect(report.language_moves).toMatchObject({ items: 4, planned: 4, by_kind: { move: 2, clear: 1, swap: 1 } });
    expect(changes.every((c) => c.kind === 'set' && c.before !== undefined)).toBe(true);
    const en = changes.find((c) => c.kind === 'set' && c.path === 'dosage_en' && String(c.key._id) !== '') as any;
    expect(en.before === AR || en.before === EN || en.before === null).toBe(true);
    await applyChanges(db, changes);
    const mv = (await col().findOne({ id: 'mv' }))!;
    expect(mv.dosage_ar).toBe(AR); expect(mv.dosage_en).toBe('');
    expect(mv.translation_provenance.ar.dosage_instructions).toBe('machine_moved');
    const cl = (await col().findOne({ id: 'cl' }))!;
    expect(cl.dosage_ar).toBe(''); expect(cl.dosage_en).toBe('Take one tablet daily with food and water');
    expect(cl.translation_provenance?.ar?.dosage_instructions).toBeUndefined();                                       // nothing was moved into the Arabic column
    const sw = (await col().findOne({ id: 'sw' }))!;
    expect(sw.dosage_ar).toBe(AR); expect(sw.dosage_en).toBe(EN);
    expect(sw.translation_provenance.ar.dosage_instructions).toBe('machine_moved');
    expect(sw.translation_provenance.en.dosage_instructions).toBe('machine_moved');
    const mp = (await col().findOne({ id: 'mp' }))!;
    expect(mp.dosage_ar).toBe(AR); expect(mp.translations.en.dosage_instructions).toBe('');
    expect((await col().findOne({ id: 'fine' }))!.dosage_ar).toBe(AR);                                                // a product that was fine is not touched
    expect(await movesOf()).toEqual([]);                                                                              // nothing is in the wrong column any more
  });

  it('a second plan is empty (idempotent)', async () => {
    const file = await fileWith();
    await applyChanges(db, (await planProductTranslations(db, file)).changes);
    const again = await planProductTranslations(db, file);
    expect(again.changes).toHaveLength(0);
    expect(again.report.language_moves).toMatchObject({ planned: 0, skipped_changed_since_plan: 4 });
  });

  it('a column the move emptied is translated in the same set, from the corrected product (no write-order race)', async () => {
    const file = await fileWith([
      { id: 'mv', field: 'dosage_instructions', target: 'en', source: 'ar', text: EN, source_sha: sha256(AR) },        // the English column was emptied by the move
      { id: 'cl', field: 'dosage_instructions', target: 'ar', source: 'en', text: AR, source_sha: sha256('Take one tablet daily with food and water') },
    ]);
    const { changes, report } = await planProductTranslations(db, file);
    expect(report).toMatchObject({ to_write: 2 });
    expect(report.language_moves?.retranslated_in_place).toBe(2);
    // one change per path: the emptied column is written once, with the translation, never emptied and then written
    const paths = changes.map((c: any) => `${String(c.key._id)}|${c.path}`);
    expect(new Set(paths).size).toBe(paths.length);
    await applyChanges(db, changes);
    const mv = (await col().findOne({ id: 'mv' }))!;
    expect(mv.dosage_ar).toBe(AR); expect(mv.dosage_en).toBe(EN);
    expect(mv.translation_provenance.ar.dosage_instructions).toBe('machine_moved');
    expect(mv.translation_provenance.en.dosage_instructions).toBe('machine:fake-model');
    const cl = (await col().findOne({ id: 'cl' }))!;
    expect(cl.dosage_ar).toBe(AR); expect(cl.translation_provenance.ar.dosage_instructions).toBe('machine:fake-model');
    expect(resolveMedicinePublicDto(mv, 'ar').dosage_instructions).toBe(AR);
    expect(resolveMedicinePublicDto(mv, 'en').dosage_instructions).toBe(EN);
  });

  it('other languages are translated from the corrected text (a Hindi text from the English that was moved there)', async () => {
    await col().insertOne({ id: 'hi', ...ok, dosage_ar: EN });                                                         // English in the Arabic column, English column empty
    const file = await fileWith([{ id: 'hi', field: 'dosage_instructions', target: 'hi', source: 'en', text: 'हर आठ घंटे में भोजन के बाद एक गोली लें', source_sha: sha256(EN) }]);
    const { changes, report } = await planProductTranslations(db, file);
    expect(report.to_write).toBe(1);
    await applyChanges(db, changes);
    const doc = (await col().findOne({ id: 'hi' }))!;
    expect(doc.dosage_en).toBe(EN); expect(doc.dosage_ar).toBe(''); expect(doc.translations.hi.dosage_instructions).toContain('गोली');
  });

  it('a text that changed since the dry run is not moved, and a product that is not published is skipped', async () => {
    const file = await fileWith();
    await col().updateOne({ id: 'mv' }, { $set: { dosage_en: AR + ' (edited)' } });
    await col().updateOne({ id: 'sw' }, { $set: { public_eligibility: false } });
    const { report } = await planProductTranslations(db, file);
    expect(report.language_moves).toMatchObject({ skipped_changed_since_plan: 1, skipped_not_published: 1, planned: 2 });
  });

  it('never overwrites: if a text appeared in the right column after the plan, the compare-and-set skips that path', async () => {
    const { changes } = await planProductTranslations(db, await fileWith());
    await col().updateOne({ id: 'mv' }, { $set: { dosage_ar: 'نص كتبه شخص في الأثناء' } });
    const res = await applyChanges(db, changes);
    expect(res.skipped_changed_since_plan).toBeGreaterThan(0);
    expect((await col().findOne({ id: 'mv' }))!.dosage_ar).toBe('نص كتبه شخص في الأثناء');
  });

  it('rolls back to exactly the old texts', async () => {
    const before = await col().find({}).sort({ id: 1 }).toArray();
    const { changes } = await planProductTranslations(db, await fileWith());
    await applyChanges(db, changes);
    await rollbackChanges(db, changes);
    const after = await col().find({}).sort({ id: 1 }).toArray();
    for (let i = 0; i < before.length; i++) {
      expect(after[i].dosage_ar ?? null).toBe(before[i].dosage_ar ?? null);
      expect(after[i].dosage_en ?? null).toBe(before[i].dosage_en ?? null);
      expect(after[i].translation_provenance?.ar?.dosage_instructions).toBeUndefined();
    }
  });

  describe('the tool and the catalogue-apply plan', () => {
    let dir: string;
    beforeAll(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'moves-')); });
    afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

    it('gaps prints the wrong-column texts per field and pair, writes the moves next to the requests, and writes nothing to the database', async () => {
      const before = JSON.stringify(await col().find({}).sort({ id: 1 }).toArray());
      const logs: string[] = [];
      const spy = jest.spyOn(console, 'log').mockImplementation((m: string) => { logs.push(String(m)); });
      process.env.MONGO_URL = mongod.getUri(); process.env.DB_NAME = 'content_moves_test';
      const requests = path.join(dir, 'requests.jsonl');
      try { expect(await translateMain(['gaps', `--out=${requests}`])).toBe(0); } finally { spy.mockRestore(); }
      const line = JSON.parse(logs.find((l) => l.includes('"step":"gaps"')) as string);
      expect(line.text_in_wrong_column).toEqual({ total: 4, by_kind: { move: 2, clear: 1, swap: 1 }, per_pair: { 'en>ar': { dosage_instructions: 2 }, 'ar>en': { dosage_instructions: 2 } } });
      expect(line.text_in_wrong_column_still_unresolved).toBe(0);
      expect(line).not.toHaveProperty('text_in_wrong_column_not_translated');
      const moves = JSON.parse(fs.readFileSync(`${requests}.moves.json`, 'utf8')).moves as MoveItem[];
      expect(moves).toHaveLength(4);
      expect(JSON.stringify(await col().find({}).sort({ id: 1 }).toArray())).toBe(before);                              // dry run
      // the emptied columns are in the requests, translated from the corrected product
      const reqs = fs.readFileSync(requests, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
      expect(reqs.some((r) => r.target === 'en' && r.source === 'ar' && r.items.some((i: { id: string }) => i.id === 'mv'))).toBe(true);
    });

    it('plan puts the moves into the reviewed file even when no model answered, and the catalogue-apply plan carries them', async () => {
      const requests = path.join(dir, 'requests.jsonl');
      const responses = path.join(dir, 'responses.jsonl'); fs.writeFileSync(responses, '');
      const out = path.join(dir, 'translations.json');
      const logs: string[] = [];
      const spy = jest.spyOn(console, 'log').mockImplementation((m: string) => { logs.push(String(m)); });
      try { expect(await translateMain(['plan', `--requests=${requests}`, `--responses=${responses}`, `--out=${out}`])).toBe(0); } finally { spy.mockRestore(); }
      const file = JSON.parse(fs.readFileSync(out, 'utf8'));
      expect(isTranslationFile(file)).toBe(true);
      expect(file.moves).toHaveLength(4);
      expect(JSON.parse(logs[0]).moves.total).toBe(4);
      const plan = await computePlan(db, [`--product-translations=${out}`]);
      expect((plan.report.product_translations as { language_moves: { planned: number } }).language_moves.planned).toBe(4);
      expect(plan.changes.filter((c) => c.step === 'language_moves').length).toBeGreaterThan(0);
      expect(plan.inputs.product_translations).toBe(sha256(fs.readFileSync(out, 'utf8')));
    });
  });
});
