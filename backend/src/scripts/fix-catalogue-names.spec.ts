import {
  ApplyResult,
  BatchRequest,
  CatalogueRecord,
  ProposalRow,
  WRITABLE_FIELDS,
  applyApproved,
  brandSkeleton,
  brandTokens,
  buildRequests,
  callerFromEnv,
  estimate,
  latinSkeletons,
  nameMatchesEnglish,
  parseAnswers,
  parseCsv,
  proposalsFromResponses,
  runRequests,
  sameArabicBrand,
  scan,
  shortensBrand,
  toCsv,
} from './fix-catalogue-names';

// Names quoted by the owner on issue #1556 and by the review of PR #1588. Only the name fields matter here.
const rec = (o: Partial<CatalogueRecord> & { sku: number; name_en: string }): CatalogueRecord => ({
  _id: `id-${o.sku}`,
  ...o,
  // The v14 importer copies translations.ar.official_name to official_name_ar.
  official_name_ar: (o.translations?.ar?.official_name as string | undefined) ?? null,
  translations: { en: { name: o.name_en }, ...(o.translations || {}) },
});
const ar = (sku: number, name_en: string, display: string, official: string, extra: Record<string, Record<string, unknown>> = {}) =>
  rec({ sku, name_en, name_ar: display, translations: { ar: { name: display, official_name: official }, ...extra } });

// Correct names the first version destroyed (review of #1588): they must come out unchanged.
const ACILOC = ar(527000, 'Aciloc 20 Mg - 14 Capsules', 'اسيلوك 20 مجم - 14 كبسولة', 'اسيلوك 20 مجم - 14 كبسولة');
const ACC = ar(937873, 'ACC Long 600 Mg - 10 Effervescent Tablets', 'ايه سى سى لونغ 600 مجم', 'ايه سى سى لونغ 600 مجم');
const ACICAL = ar(955439, 'Acical Chewable Tablets', 'اسيكال بلس', 'اسيكال بلس');
const ADOL_UR = ar(574566, 'Adol Capplets 500 Mg - 24 Tablets', 'أدول 500 مجم - 24 قرص', 'أدول 500 مجم - 24 قرص', {
  ur: { name: 'اڈول 500 ملی گرام - 24 گولیاں' }, hi: { name: 'एडोल 500 मिलीग्राम' }, bn: { name: 'অ্যাডল ৫০০ মিগ্রা' },
});
const MUST_STAY = [ACILOC, ACC, ACICAL, ADOL_UR];

const fixture: CatalogueRecord[] = [
  ...MUST_STAY,
  // Brand disagreement: display shows another product; official is right.
  ar(948256, 'Ezetrol 10 Mg - 28 Tablets', 'اترازول 10 مجم - 28 قرص', 'ايزيترول 10 مجم - 28 قرص'),
  // Brand disagreement: display is a leaflet sentence.
  ar(838580, 'Fenam 500 Mg - 20 Capsules', 'يستخدم هذا الدواء لتخفيف الألم والالتهاب', 'فينام 500 مجم - 20 كبسولة'),
  // Spelling variant, same numbers: align (official takes the display spelling; both match English).
  ar(111, 'Crestor 10 Mg - 28 Tablets', 'كرستور 10 مجم - 28 قرص', 'كريستور 10 مجم - 28 قرص'),
  // Same brand, different numbers: reported, never aligned.
  ar(287198, 'Tegretol CR 400 Mg - 30 Tablets', 'تجريتول سي ار 200 مجم - 50 قرص', 'تجريتول سي ار 400 مجم - 30 قرص'),
  // Same brand and numbers, but the longer brand must not be cut to the shorter one.
  ar(222, 'Panadol Extra 500 Mg - 24 Tablets', 'بانادول اكسترا 500 مجم - 24 قرص', 'بانادول 500 مجم - 24 قرص'),
  // Correct and consistent; its ur/hi names are another product (report only).
  ar(603297, 'Lamictal 100 Mg - 30 Tablets', 'لاميكتال 100 مجم - 30 قرص', 'لاميكتال 100 مجم - 30 قرص', {
    ur: { name: 'لوکسول 100 ملی گرام - 30 گولیاں' }, hi: { name: 'लोक्सोल 100 मिलीग्राम - 30 गोलियाँ' },
  }),
  // Two products sharing one Arabic name.
  ar(353492, 'Durex, Condom Thin Feel - 3 Pcs', 'ديوركس، واقى ذكرى رقيق - 3 قطع', 'ديوركس، واقى ذكرى رقيق - 3 قطع'),
  ar(223008, 'Durex, Condom Invisible - 3 Pcs', 'ديوركس، واقى ذكرى رقيق - 3 قطع', 'ديوركس، واقى ذكرى رقيق - 3 قطع'),
];

const skusOf = (rows: Array<{ sku: number | null }>) => [...new Set(rows.map((r) => r.sku))].sort((a, b) => (a as number) - (b as number));

/** The destructive outputs of the first version, replayed as model new_text answers. */
const OLD_BAD_OUTPUT: Record<string, string> = {
  'id-527000': 'مجم - 14 كبسولة',
  'id-937873': 'اكك 600 مجم - 10 قرص',
  'id-955439': 'اسيكالشيوابل قرص',
};

function fakeRecordsCollection(records: CatalogueRecord[]) {
  const writes: Array<{ filter: Record<string, unknown>; update: Record<string, unknown> }> = [];
  const byId = new Map(records.map((r) => [String(r._id), r]));
  const get = (r: CatalogueRecord, path: string) => path.split('.').reduce<unknown>((c, p) => (c && typeof c === 'object' ? (c as Record<string, unknown>)[p] : undefined), r);
  return {
    writes,
    updateOne: async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
      const r = byId.get(String(filter._id));
      if (!r) return { modifiedCount: 0 };
      for (const [k, v] of Object.entries(filter)) if (k !== '_id' && get(r, k) !== v) return { modifiedCount: 0 };
      writes.push({ filter, update });
      return { modifiedCount: 1 };
    },
  };
}

describe('fix-catalogue-names (#1556 A, reworked after the review of #1588)', () => {
  describe('matcher', () => {
    it('treats Arabic spelling variants as one brand and rejects another brand', () => {
      expect(brandSkeleton('كرستور', 'ar')).toBe(brandSkeleton('كريستور', 'ar'));
      expect(sameArabicBrand('كرستور 10 مجم', 'كريستور 10 مجم', null)).toBe(true);
      expect(sameArabicBrand('اترازول 10 مجم', 'ايزيترول 10 مجم', 'Ezetrol 10 Mg')).toBe(false);
      expect(nameMatchesEnglish('تجريتول سي ار 400 مجم - 30 قرص', 'Tegretol CR 400 Mg - 30 Tablets', 'ar').match).toBe('full');
      expect(latinSkeletons('Crestor')).toContain('KRSTR');
    });

    it('counts brand words without unit and form words; a name that starts with a unit has no brand', () => {
      expect(brandTokens('ايه سى سى لونغ 600 مجم')).toEqual(['ايه', 'سى', 'سى', 'لونغ']);
      expect(brandTokens('مجم - 14 كبسولة')).toEqual([]);
      expect(brandTokens('اسيكالشيوابل قرص')).toEqual(['اسيكالشيوابل']);
      expect(shortensBrand('اسيلوك 20 مجم - 14 كبسولة', 'مجم - 14 كبسولة')).toBe(true);
      expect(shortensBrand('ايه سى سى لونغ 600 مجم', 'اكك 600 مجم - 10 قرص')).toBe(true);
      expect(shortensBrand('اسيكال بلس', 'اسيكالشيوابل قرص')).toBe(true);
    });
  });

  describe('scan', () => {
    const res = scan(fixture);

    it('scopes only brand disagreements and shared-name records', () => {
      expect(res.scope.filter((s) => s.why === 'brand_disagreement').map((s) => s.sku).sort()).toEqual([838580, 948256]);
      expect(res.scope.filter((s) => s.why === 'shared_arabic_name').map((s) => s.sku).sort()).toEqual([223008, 353492]);
    });

    it('leaves the four review examples out of every output that can be written', () => {
      const stay = new Set(MUST_STAY.map((r) => r.sku));
      expect(res.scope.filter((s) => stay.has(s.sku))).toEqual([]);
      expect(res.align.filter((r) => stay.has(r.sku))).toEqual([]);
    });

    it('align: proposed only for the same skeleton and the same numbers, never shortening', () => {
      expect(skusOf(res.align)).toEqual([111, 222]);
      const crestor = res.align.filter((r) => r.sku === 111);
      expect(crestor.map((r) => r.field).sort()).toEqual(['official_name_ar', 'translations.ar.official_name']);
      expect(crestor.every((r) => r.proposal === 'كرستور 10 مجم - 28 قرص' && r.source === 'align')).toBe(true);
      // Tegretol 200/50 vs 400/30: reported, not aligned
      expect(res.numbersDiffer.map((n) => n.sku)).toEqual([287198]);
      // Panadol Extra vs Panadol: the longer brand wins; the display name is never cut
      const panadol = res.align.filter((r) => r.sku === 222);
      expect(panadol.map((r) => r.field).sort()).toEqual(['official_name_ar', 'translations.ar.official_name']);
      expect(panadol.every((r) => r.proposal === 'بانادول اكسترا 500 مجم - 24 قرص')).toBe(true);
    });

    it('ur/hi/bn: report only (574566 ur is never a proposal)', () => {
      const writable = [...res.align, ...res.scope.flatMap((s) => Object.keys(s.fields).map((field) => ({ field })))];
      expect(writable.every((r) => WRITABLE_FIELDS.includes(r.field))).toBe(true);
      expect(res.localized.map((r) => `${r.sku} ${r.field}`).sort()).toEqual(['603297 translations.hi.name', '603297 translations.ur.name']);
      expect(res.localized.every((r) => r.reason.startsWith('report_only'))).toBe(true);
    });
  });

  describe('model batch job', () => {
    const res = scan(fixture);
    const reqs = buildRequests(res.scope, 20);

    it('builds one compact prompt per batch with the English name, both candidates and the description', () => {
      expect(reqs).toHaveLength(1);
      expect(reqs[0].record_ids).toHaveLength(4);
      expect(reqs[0].prompt).toContain('Ezetrol 10 Mg - 28 Tablets|اترازول 10 مجم - 28 قرص|ايزيترول 10 مجم - 28 قرص|');
      expect(reqs[0].prompt).toMatch(/keep_display.*keep_official.*new_text/);
      expect(reqs[0].prompt).not.toMatch(/API_KEY|AIza|sk-/);
    });

    it('estimates the cost with no API call', () => {
      const e = estimate(res.scope, 800, 20);
      expect(e.items).toBe(800);
      expect(e.requests).toBe(40);
      expect(e.usd_batch_api).toBeLessThan(e.usd_standard);
      expect(e.usd_standard).toBeLessThan(1);
    });

    it('needs a key from the environment (no live call in tests)', () => {
      expect(() => callerFromEnv({})).toThrow('GEMINI_API_KEY');
      expect(() => callerFromEnv({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'x' })).toThrow('NAME_FIX_MODEL or OPENAI_MODEL');
    });

    it('run is resumable with a stubbed client', async () => {
      const r: BatchRequest[] = [{ id: 'a', record_ids: [], prompt: 'x' }, { id: 'b', record_ids: [], prompt: 'y' }];
      const lines: string[] = [];
      let calls = 0;
      const call = async () => { calls += 1; if (calls === 1) throw new Error('429'); return '[]'; };
      const io = { done: new Set(['a']), write: (l: string) => lines.push(l), sleep: async () => undefined };
      expect(await runRequests(r, call, io, 600)).toEqual({ sent: 1, skipped: 1, failed: 0 });
      expect(lines.map((l) => JSON.parse(l).id)).toEqual(['b']);
    });

    it('parses only well-formed answers', () => {
      const m = parseAnswers('```json\n[{"i":0,"a":"keep_official"},{"i":1,"a":"new_text","t":"فينام 500 مجم"},{"i":2,"a":"maybe"},{"i":3,"a":"new_text","t":"Fenam"},{"i":4,"a":"new_text"}]\n```');
      expect([...m.keys()]).toEqual([0, 1]);
      expect(parseAnswers('not json').size).toBe(0);
    });

    it('turns answers into flagged proposals; an invalid answer is flagged with no proposal', () => {
      const idx = (sku: number) => reqs[0].record_ids.indexOf(`id-${sku}`);
      const text = JSON.stringify([
        { i: idx(948256), a: 'keep_official' },
        { i: idx(838580), a: 'banana' },
        { i: idx(353492), a: 'new_text', t: 'ديوركس، واقي ذكري رقيق الإحساس - 3 قطع' },
        { i: idx(223008), a: 'keep_display' },
      ]);
      const rows = proposalsFromResponses(res.scope, reqs, [{ id: reqs[0].id, text }]);
      const ez = rows.filter((r) => r.sku === 948256);
      expect(ez.map((r) => r.field).sort()).toEqual(['name_ar', 'translations.ar.name']);
      expect(ez.every((r) => r.proposal === 'ايزيترول 10 مجم - 28 قرص' && r.source === 'keep_official')).toBe(true);
      expect(rows.filter((r) => r.sku === 838580)).toEqual([expect.objectContaining({ source: 'invalid_answer', proposal: null })]);
      expect(rows.filter((r) => r.sku === 353492 && r.source === 'new_text')).toHaveLength(4);
      expect(rows.filter((r) => r.sku === 223008)).toEqual([]); // keep_display: already consistent
    });

    it('a new_text that shortens the brand is rejected (the first version\'s outputs replayed)', () => {
      const other = 'منتج آخر 1 مجم';
      const scope = scan(MUST_STAY.map((r) => ({ ...r, official_name_ar: other, translations: { ...r.translations, ar: { ...(r.translations?.ar || {}), official_name: other } } }))).scope;
      expect(scope.map((s) => s.sku).sort()).toEqual([527000, 574566, 937873, 955439]);
      const r2 = buildRequests(scope, 20);
      const text = JSON.stringify(r2[0].record_ids.map((id, i) => ({ i, a: 'new_text', t: OLD_BAD_OUTPUT[id] || 'منتج' })));
      const rows = proposalsFromResponses(scope, r2, [{ id: r2[0].id, text }]);
      for (const sku of [527000, 937873, 955439]) {
        const display = rows.filter((r) => r.sku === sku && (r.field === 'name_ar' || r.field === 'translations.ar.name'));
        expect(display.length).toBe(2);
        expect(display.every((r) => r.source === 'invalid_answer' && r.proposal === null)).toBe(true);
      }
    });

    it('a keep_display / keep_official that picks a name with no brand (starts with a unit) is rejected', () => {
      const nobrand = 'مجم - 14 كبسولة';
      const bad = MUST_STAY.map((r) => ({ ...r, name_ar: nobrand, translations: { ...r.translations, ar: { ...(r.translations?.ar || {}), name: nobrand } } }));
      const scope = scan(bad).scope;
      expect(scope.length).toBeGreaterThan(0);
      const r2 = buildRequests(scope, 20);
      const text = JSON.stringify(r2[0].record_ids.map((_, i) => ({ i, a: 'keep_display' })));
      const rows = proposalsFromResponses(scope, r2, [{ id: r2[0].id, text }]);
      expect(rows.every((r) => r.source === 'invalid_answer' && r.proposal === null)).toBe(true);
      expect(rows.some((r) => /no brand/.test(r.reason))).toBe(true);
    });
  });

  describe('apply (approved rows only)', () => {
    const records = (): CatalogueRecord[] => JSON.parse(JSON.stringify(fixture));
    const audit: Array<Record<string, unknown>> = [];
    const auditCollection = { insertOne: async (d: Record<string, unknown>) => { audit.push(d); return {}; } };
    const row = (o: Partial<ProposalRow> & { approved?: string }): Record<string, string> =>
      Object.fromEntries(Object.entries({ sku: '', id: '', field: '', before: '', proposal: '', source: '', reason: '', approved: '', ...o }).map(([k, v]) => [k, v === null ? '' : String(v)]));

    it('round-trips the owner CSV and applies only approved=yes rows, guarded by before', async () => {
      const res = scan(fixture);
      const csv = toCsv([
        ...res.align,
        { sku: 948256, id: 'id-948256', field: 'name_ar', before: 'اترازول 10 مجم - 28 قرص', proposal: 'ايزيترول 10 مجم - 28 قرص', source: 'keep_official', reason: 'brand_disagreement, "quoted"' },
        { sku: 948256, id: 'id-948256', field: 'translations.ar.name', before: 'اترازول 10 مجم - 28 قرص', proposal: 'ايزيترول 10 مجم - 28 قرص', source: 'keep_official', reason: 'x' },
      ]);
      const parsed = parseCsv(csv);
      expect(parsed[parsed.length - 2].reason).toBe('brand_disagreement, "quoted"');
      // The owner approves the Ezetrol display rows only; the align rows stay unapproved.
      for (const r of parsed) if (r.id === 'id-948256') r.approved = 'yes';
      const col = fakeRecordsCollection(records());
      const out = await applyApproved(parsed, (id) => id, col, auditCollection, 'run-1');
      expect(out).toEqual<ApplyResult>({ approved: 2, modified: 2, skipped_changed_since_scan: 0, refused: [] });
      expect(col.writes.map((w) => w.update)).toEqual([
        { $set: { name_ar: 'ايزيترول 10 مجم - 28 قرص' } },
        { $set: { 'translations.ar.name': 'ايزيترول 10 مجم - 28 قرص' } },
      ]);
      expect(col.writes[0].filter).toEqual({ _id: 'id-948256', name_ar: 'اترازول 10 مجم - 28 قرص' });
      expect(audit[0]).toMatchObject({ run_id: 'run-1', record_id: 'id-948256', field: 'name_ar', source: 'keep_official' });
    });

    it('skips a row whose stored value changed since the scan', async () => {
      const col = fakeRecordsCollection(records());
      const out = await applyApproved([row({ id: 'id-948256', field: 'name_ar', before: 'قيمة قديمة', proposal: 'ايزيترول 10 مجم - 28 قرص', source: 'keep_official', approved: 'yes' })], (id) => id, col, auditCollection, 'run-2');
      expect(out.skipped_changed_since_scan).toBe(1);
      expect(col.writes).toEqual([]);
    });

    it('never writes ur/hi/bn, rows without a proposal, bad align rows or shortened brands, even when approved', async () => {
      const col = fakeRecordsCollection(records());
      const out = await applyApproved([
        row({ id: 'id-574566', field: 'translations.ur.name', before: 'اڈول 500 ملی گرام - 24 گولیاں', proposal: 'AdolCapplets', source: 'keep_official', approved: 'yes' }),
        row({ id: 'id-838580', field: 'name_ar', before: 'يستخدم هذا الدواء لتخفيف الألم والالتهاب', proposal: '', source: 'invalid_answer', approved: 'yes' }),
        row({ id: 'id-287198', field: 'name_ar', before: 'تجريتول سي ار 200 مجم - 50 قرص', proposal: 'تجريتول سي ار 400 مجم - 30 قرص', source: 'align', approved: 'yes' }),
        row({ id: 'id-527000', field: 'name_ar', before: 'اسيلوك 20 مجم - 14 كبسولة', proposal: 'مجم - 14 كبسولة', source: 'new_text', approved: 'yes' }),
        row({ id: 'id-937873', field: 'name_ar', before: 'ايه سى سى لونغ 600 مجم', proposal: 'اكك 600 مجم - 10 قرص', source: 'new_text', approved: 'yes' }),
        row({ id: 'id-955439', field: 'name_ar', before: 'اسيكال بلس', proposal: 'اسيكالشيوابل قرص', source: 'new_text', approved: 'yes' }),
        row({ id: 'id-222', field: 'name_ar', before: 'بانادول اكسترا 500 مجم - 24 قرص', proposal: 'بانادول 500 مجم - 24 قرص', source: 'align', approved: 'yes' }),
        row({ id: 'id-111', field: 'official_name_ar', before: 'كريستور 10 مجم - 28 قرص', proposal: 'كرستور 10 مجم - 28 قرص', source: 'align', approved: 'no' }),
        row({ id: 'id-948256', field: 'name_ar', before: 'اترازول 10 مجم - 28 قرص', proposal: 'مجم - 28 قرص', source: 'keep_official', approved: 'yes' }),
      ], (id) => id, col, auditCollection, 'run-3');
      expect(col.writes).toEqual([]);
      expect(out.approved).toBe(8);
      expect(out.refused.map((r) => r.reason)).toEqual([
        'not an Arabic name field',
        'missing id, before or proposal',
        'align row: brand skeleton or numbers differ',
        'proposal shortens the brand',
        'proposal shortens the brand',
        'proposal shortens the brand',
        'proposal shortens the brand',
        'proposal has no brand (it starts with a unit or form word)',
      ]);
    });
  });
});
