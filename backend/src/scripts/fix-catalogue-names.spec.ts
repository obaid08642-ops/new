import {
  brandSkeleton,
  latinSkeletons,
  nameMatchesEnglish,
  planNameFixes,
  planDescriptionReports,
  applyPlan,
  planSharedNameReports,
  CatalogueRecord,
} from './fix-catalogue-names';

// Fixture built from the cases quoted by the owner on issue #1556
// (comments 6214376460 and 6214420277). Only the name fields matter here.
const rec = (o: Partial<CatalogueRecord> & { sku: number; name_en: string }): CatalogueRecord => ({
  _id: `id-${o.sku}`,
  id: `id-${o.sku}`,
  ...o,
  // The v14 importer copies translations.ar.official_name to official_name_ar.
  official_name_ar: (o.translations?.ar?.official_name as string | undefined) ?? null,
  translations: { en: { name: o.name_en }, ...(o.translations || {}) },
});

const fixture: CatalogueRecord[] = [
  // Display shows another product; official is right.
  rec({ sku: 948256, name_en: 'Ezetrol 10 Mg - 28 Tablets', name_ar: 'اترازول 10 مجم - 28 قرص',
    translations: { ar: { name: 'اترازول 10 مجم - 28 قرص', official_name: 'ايزيترول 10 مجم - 28 قرص' } } }),
  rec({ sku: 72535, name_en: 'Loxol, Lamotrigine 100 Mg - 30 Tablets', name_ar: 'لاميكتال 100 مجم، لعلاج الصرع - 30 قرص',
    translations: { ar: { name: 'لاميكتال 100 مجم، لعلاج الصرع - 30 قرص', official_name: 'لوكسول، لاموتريجين 100 مجم - 30 قرص' } } }),
  // Neither Arabic name matches -> built from English, owner check.
  rec({ sku: 803435, name_en: 'Trandate, 100 Mg - 100 Tablets', name_ar: 'نورموتن 100 مجم - 100 قرص',
    translations: { ar: { name: 'نورموتن 100 مجم - 100 قرص', official_name: 'نورموتن 100 مجم - 100 قرص' } } }),
  // Display is a leaflet sentence.
  rec({ sku: 838580, name_en: 'Fenam 500 Mg - 20 Capsules', name_ar: 'يستخدم هذا الدواء لتخفيف الألم والالتهاب',
    translations: { ar: { name: 'يستخدم هذا الدواء لتخفيف الألم والالتهاب', official_name: 'فينام 500 مجم - 20 كبسولة' } } }),
  // Official is wrong; display is right.
  rec({ sku: 477262, name_en: 'Julmentin 1 Gm - 14 Tablets', name_ar: 'جولمنتين 1 جم - 14 قرص',
    translations: { ar: { name: 'جولمنتين 1 جم - 14 قرص', official_name: 'أوجمنتين 1 جم - 14 قرص' } } }),
  // Spelling variants of the same brand: must count as matching.
  rec({ sku: 111, name_en: 'Crestor 10 Mg - 28 Tablets', name_ar: 'كرستور 10 مجم - 28 قرص',
    translations: { ar: { name: 'كرستور 10 مجم - 28 قرص', official_name: 'كريستور 10 مجم - 28 قرص' } } }),
  // Strength/pack mismatch: same brand, different product.
  rec({ sku: 287198, name_en: 'Tegretol CR 400 Mg, Antiepileptic Drug - 30 Tablets',
    name_ar: 'تجريتول سي ار 200 مجم، أقراص ممتدة المفعول، لعلاج الصرع - 50 قرص',
    translations: { ar: { name: 'تجريتول سي ار 200 مجم، أقراص ممتدة المفعول، لعلاج الصرع - 50 قرص',
      official_name: 'تجريتول سي ار 400 مجم - 30 قرص' } } }),
  // Already correct and consistent: no change.
  rec({ sku: 988352, name_en: 'Tegretol CR 200 Mg, Antiepileptic Drug - 50 Tablets',
    name_ar: 'تجريتول سي ار 200 مجم - 50 قرص',
    translations: { ar: { name: 'تجريتول سي ار 200 مجم - 50 قرص', official_name: 'تجريتول سي ار 200 مجم - 50 قرص' },
      ur: { name: 'ٹیگریٹول سی آر 200 ملی گرام - 50 گولیاں' },
      hi: { name: 'टेग्रेटोल सीआर 200 मिलीग्राम - 50 गोलियाँ' } } }),
  // ur/hi names of another product.
  rec({ sku: 603297, name_en: 'Lamictal 100 Mg, Antiepileptic Drug - 30 Tablets',
    name_ar: 'لاميكتال 100 مجم - 30 قرص',
    translations: { ar: { name: 'لاميكتال 100 مجم - 30 قرص', official_name: 'لاميكتال 100 مجم - 30 قرص' },
      ur: { name: 'لوکسول 100 ملی گرام - 30 گولیاں' },
      hi: { name: 'लोक्सोल 100 मिलीग्राम - 30 गोलियाँ' },
      bn: { name: 'ল্যামিক্টাল ১০০ মিগ্রা - ৩০ ট্যাবলেট' } },
    description_ar: 'لوكسول يحتوي على لاموتريجين لعلاج الصرع' }),
];

const bySku = <T extends { sku: number | null }>(rows: T[], sku: number): T[] => rows.filter((r) => r.sku === sku);

describe('fix-catalogue-names (#1556 decision A)', () => {
  describe('brand matching', () => {
    it('treats Arabic spelling variants as one brand', () => {
      expect(brandSkeleton('كرستور', 'ar')).toBe(brandSkeleton('كريستور', 'ar'));
      expect(nameMatchesEnglish('كرستور 10 مجم - 28 قرص', 'Crestor 10 Mg - 28 Tablets', 'ar').match).toBe('full');
      expect(nameMatchesEnglish('كريستور 10 مجم - 28 قرص', 'Crestor 10 Mg - 28 Tablets', 'ar').match).toBe('full');
    });

    it('normalises alef, ya, ta marbuta and diacritics', () => {
      expect(brandSkeleton('إِيزِيتْرُول', 'ar')).toBe(brandSkeleton('ايزيترول', 'ar'));
      expect(brandSkeleton('بانادولى', 'ar')).toBe(brandSkeleton('بانادولي', 'ar'));
    });

    it('rejects a different product brand', () => {
      expect(nameMatchesEnglish('اترازول 10 مجم', 'Ezetrol 10 Mg', 'ar').match).toBe('none');
      expect(nameMatchesEnglish('لاميكتال 100 مجم', 'Loxol, Lamotrigine 100 Mg', 'ar').match).toBe('none');
      expect(nameMatchesEnglish('نورموتن 100 مجم', 'Trandate, 100 Mg', 'ar').match).toBe('none');
      expect(nameMatchesEnglish('أوجمنتين 1 جم', 'Julmentin 1 Gm', 'ar').match).toBe('none');
    });

    it('rejects a strength or pack mismatch on the same brand', () => {
      expect(nameMatchesEnglish('تجريتول سي ار 200 مجم - 50 قرص', 'Tegretol CR 400 Mg - 30 Tablets', 'ar').match).toBe('none');
      expect(nameMatchesEnglish('تجريتول سي ار 400 مجم - 30 قرص', 'Tegretol CR 400 Mg - 30 Tablets', 'ar').match).toBe('full');
    });

    it('reads Urdu, Hindi and Bengali script and native digits', () => {
      expect(nameMatchesEnglish('ٹیگریٹول سی آر 200 ملی گرام - 50 گولیاں', 'Tegretol CR 200 Mg - 50 Tablets', 'ur').match).toBe('full');
      expect(nameMatchesEnglish('टेग्रेटोल सीआर 200 मिलीग्राम - 50 गोलियाँ', 'Tegretol CR 200 Mg - 50 Tablets', 'hi').match).toBe('full');
      expect(nameMatchesEnglish('ল্যামিক্টাল ১০০ মিগ্রা - ৩০ ট্যাবলেট', 'Lamictal 100 Mg - 30 Tablets', 'bn').match).toBe('full');
      expect(nameMatchesEnglish('लोक्सोल 100 मिलीग्राम', 'Lamictal 100 Mg', 'hi').match).toBe('none');
    });

    it('latin skeletons cover c/k, v/f, ph and x', () => {
      expect(latinSkeletons('Crestor')).toContain('KRSTR');
      expect(latinSkeletons('Durex')).toContain('DRKS');
    });
  });

  describe('planNameFixes', () => {
    const plan = planNameFixes(fixture);

    it('Ezetrol: display takes the official name', () => {
      const rows = bySku(plan, 948256);
      expect(rows.map((r) => r.field).sort()).toEqual(['name_ar', 'translations.ar.name']);
      for (const r of rows) {
        expect(r.before).toBe('اترازول 10 مجم - 28 قرص');
        expect(r.after).toBe('ايزيترول 10 مجم - 28 قرص');
        expect(r.needs_owner_check).toBe(false);
      }
    });

    it('Loxol: display takes the official Loxol name', () => {
      const rows = bySku(plan, 72535);
      expect(rows.length).toBe(2);
      expect(rows.every((r) => r.after === 'لوكسول، لاموتريجين 100 مجم - 30 قرص')).toBe(true);
    });

    it('Trandate: neither matches, built from English and flagged', () => {
      const rows = bySku(plan, 803435);
      expect(rows.map((r) => r.field).sort()).toEqual([
        'name_ar', 'official_name_ar', 'translations.ar.name', 'translations.ar.official_name',
      ]);
      for (const r of rows) {
        expect(r.needs_owner_check).toBe(true);
        expect(r.after).toBe('تراندات، 100 مجم - 100 قرص');
        expect(nameMatchesEnglish(r.after as string, 'Trandate, 100 Mg - 100 Tablets', 'ar').match).toBe('full');
      }
    });

    it('Fenam: leaflet sentence replaced by the official name', () => {
      const rows = bySku(plan, 838580);
      expect(rows.length).toBe(2);
      expect(rows.every((r) => r.after === 'فينام 500 مجم - 20 كبسولة' && !r.needs_owner_check)).toBe(true);
    });

    it('Julmentin: wrong official name takes the display name', () => {
      const rows = bySku(plan, 477262);
      expect(rows.map((r) => r.field).sort()).toEqual(['official_name_ar', 'translations.ar.official_name']);
      expect(rows.every((r) => r.before === 'أوجمنتين 1 جم - 14 قرص' && r.after === 'جولمنتين 1 جم - 14 قرص')).toBe(true);
    });

    it('Crestor spelling variants: no wrong-product flag, official aligned to display', () => {
      const rows = bySku(plan, 111);
      expect(rows.map((r) => r.field).sort()).toEqual(['official_name_ar', 'translations.ar.official_name']);
      expect(rows.every((r) => r.after === 'كرستور 10 مجم - 28 قرص' && r.reason.startsWith('align'))).toBe(true);
    });

    it('Tegretol CR 400: display with 200/50 replaced by the 400/30 official name', () => {
      const rows = bySku(plan, 287198);
      expect(rows.length).toBe(2);
      expect(rows.every((r) => r.after === 'تجريتول سي ار 400 مجم - 30 قرص')).toBe(true);
    });

    it('a correct record produces no change', () => {
      expect(bySku(plan, 988352)).toEqual([]);
    });

    it('ur/hi names of another product fall back to the English reference and are flagged', () => {
      const rows = bySku(plan, 603297);
      expect(rows.map((r) => r.field).sort()).toEqual(['translations.hi.name', 'translations.ur.name']);
      expect(rows.every((r) => r.after === 'Lamictal 100 Mg, Antiepileptic Drug - 30 Tablets' && r.needs_owner_check)).toBe(true);
    });

    it('is idempotent: re-planning the fixed records gives no change', () => {
      const fixed: CatalogueRecord[] = JSON.parse(JSON.stringify(fixture));
      const byId = new Map(fixed.map((r) => [String(r._id), r]));
      for (const c of plan) setPath(byId.get(c.id) as CatalogueRecord, c.field, c.after);
      expect(planNameFixes(fixed)).toEqual([]);
    });
  });

  describe('descriptions', () => {
    it('reports an Arabic description that names another catalogue brand, without changing it', () => {
      const reports = planDescriptionReports(fixture);
      const r = reports.find((x) => x.sku === 603297);
      expect(r).toBeDefined();
      expect(r!.field).toBe('description_ar');
      expect(r!.after).toBe(r!.before);
      expect(r!.needs_owner_check).toBe(true);
      expect(r!.reason).toContain('72535');
      expect(reports.filter((x) => x.sku !== 603297)).toEqual([]);
    });
  });

  describe('shared Arabic names', () => {
    it('reports two products that share one Arabic name (same brand and numbers)', () => {
      const pair = [
        rec({ sku: 353492, name_en: 'Durex, Condom Thin Feel - 3 Pcs', name_ar: 'ديوركس، واقى ذكرى رقيق - 3 قطع' }),
        rec({ sku: 223008, name_en: 'Durex, Condom Invisible - 3 Pcs', name_ar: 'ديوركس، واقى ذكرى رقيق - 3 قطع' }),
      ];
      const reports = planSharedNameReports(pair, planNameFixes(pair));
      expect(reports.map((r) => r.sku).sort()).toEqual([223008, 353492]);
      expect(reports.every((r) => r.kind === 'report' && r.needs_owner_check)).toBe(true);
    });
  });

  describe('applyPlan', () => {
    it('writes only the planned name fields, keyed by _id, and records the before value', async () => {
      const updates: Array<{ filter: Record<string, unknown>; update: Record<string, unknown> }> = [];
      const audit: Array<Record<string, unknown>> = [];
      const collection = { updateOne: async (filter: Record<string, unknown>, update: Record<string, unknown>) => { updates.push({ filter, update }); return { modifiedCount: 1 }; } };
      const auditCollection = { insertOne: async (doc: Record<string, unknown>) => { audit.push(doc); return {}; } };
      const plan = planNameFixes(fixture).filter((c) => c.sku === 477262);
      const n = await applyPlan(plan, collection, auditCollection, 'run-1');
      expect(n).toBe(1);
      expect(updates[0].filter).toEqual({ _id: 'id-477262', official_name_ar: 'أوجمنتين 1 جم - 14 قرص', 'translations.ar.official_name': 'أوجمنتين 1 جم - 14 قرص' });
      expect(updates[0].update).toEqual({ $set: { official_name_ar: 'جولمنتين 1 جم - 14 قرص', 'translations.ar.official_name': 'جولمنتين 1 جم - 14 قرص' } });
      expect(audit[0]).toMatchObject({ run_id: 'run-1', record_id: 'id-477262', sku: 477262 });
    });
  });
});

function setPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.');
  let cur = obj as Record<string, unknown>;
  for (const p of parts.slice(0, -1)) {
    if (!cur[p] || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}
