import {
  CatalogueRecord, EXTRA_MAINS, MoveRow, applyMoves, classifyMain, planMoves, projectAfter, remainingReferences, toCsv,
} from './merge-extra-main-categories';

const tr = (main: string, sub: string, subSub: string) => ({
  ar: { main_category: main, sub_category: sub, sub_sub_category: subSub },
  en: { main_category: `EN ${main}`, sub_category: `EN ${sub}`, sub_sub_category: `EN ${subSub}` },
  ur: { main_category: `UR ${main}`, sub_category: `UR ${sub}`, sub_sub_category: `UR ${subSub}` },
});
let n = 0;
const inTree = (name_en: string, name_ar: string, main: string, sub: string, subSub: string): CatalogueRecord => ({
  _id: `t${++n}`, id: `med_t${n}`, sku: 1000 + n, name_en, name_ar, category: main, sub_category: sub, sub_sub_category: subSub,
  categories: [main, sub, subSub], translations: tr(main, sub, subSub),
});
const extra = (sku: number, name_en: string, name_ar: string, main: string, sub: string): CatalogueRecord => ({
  _id: `x${sku}`, id: `med_x${sku}`, sku, name_en, name_ar, category: main, sub_category: sub, sub_sub_category: sub,
  categories: [main, sub], translations: { ar: { main_category: main, sub_category: sub }, en: { main_category: 'Medicines & Supplements', sub_category: sub } },
});

const VIT = ['الفيتامينات والتغذية الصحية', 'الفيتامينات المتعددة', 'فيتامين د'] as const;
const BABY = ['الأم والطفل', 'الحفاضات', 'حفاضات الأطفال'] as const;
const SKIN = ['العناية بالبشرة', 'الترطيب', 'كريمات مرطبة'] as const;
const SOAP = ['العناية الشخصية', 'الاستحمام', 'الصابون'] as const;
const DEV = ['الرعاية الصحية المنزلية والأجهزة الطبية', 'أدوات المساعدة', 'العكازات والمشايات'] as const;
const ORG = ['الرعاية الصحية المنزلية والأجهزة الطبية', 'أدوات المساعدة', 'منظمات الأدوية'] as const;

const tree: CatalogueRecord[] = [
  inTree('Solgar Vitamin D3 1000 IU 100 Softgels', 'سولجار فيتامين د3', ...VIT),
  inTree('Jamieson Vitamin D3 Softgels', 'جاميسون فيتامين د3', ...VIT),
  inTree('Nature Made Vitamin D3 Softgels', 'نيتشر ميد فيتامين د3', ...VIT),
  inTree('Pampers Baby Dry Diapers Size 4', 'حفاضات بامبرز بيبي دراي مقاس 4', ...BABY),
  inTree('Pampers Premium Care Diapers Size 3', 'حفاضات بامبرز بريميوم كير مقاس 3', ...BABY),
  inTree('Huggies Diapers Size 2', 'حفاضات هجيز مقاس 2', ...BABY),
  inTree('Eucerin Moisturizing Cream 75ml', 'يوسيرين كريم مرطب', ...SKIN),
  inTree('Cetaphil Moisturizing Cream 50g', 'سيتافيل كريم مرطب', ...SKIN),
  inTree('Dove Beauty Bar Soap 100g', 'صابون دوف', ...SOAP),
  inTree('Lux Soap Bar 120g', 'صابون لوكس', ...SOAP),
  inTree('Aluminium Crutches Adjustable Pair', 'عكازات ألمنيوم قابلة للتعديل', ...DEV),
  inTree('Walking Crutches Adult', 'عكازات مشي للكبار', ...DEV),
  inTree('Weekly Pill Organizer 7 Days', 'منظم حبوب أسبوعي', ...ORG),
  inTree('Pill Organizer AM PM 14 Days', 'منظم حبوب صباح ومساء', ...ORG),
];

const extras: CatalogueRecord[] = [
  extra(501, 'NOW Vitamin D3 5000 IU Softgels', 'ناو فيتامين د3', 'أدوية ومكملات غذائية', 'Vitamins & Healthy Nutrition'),
  extra(502, 'Pampers Baby Dry Diapers Size 5', 'حفاضات بامبرز مقاس 5', 'أدوية ومكملات غذائية', 'Baby Products'),
  extra(503, 'Nivea Moisturizing Cream 100ml', 'نيفيا كريم مرطب', 'تجميل وعناية', 'Nivea'),
  extra(504, 'Palmolive Soap Bar 120g', 'صابون بالموليف', 'النظافة الشخصية والحماية', 'احتياجات السفر'),
  extra(505, 'Adjustable Walking Crutches', 'عكازات مشي قابلة للتعديل', 'الصحة والعافية المتخصصة', 'Offers'),
  extra(506, 'Weekly Pill Organizer Large', 'منظم حبوب أسبوعي كبير', 'العناية بالجسم والاستحمام', 'Promotions'),
  // brand only, no product-type word: doubtful
  extra(507, 'Electrorush Orange 20s', 'إلكترورش برتقال', 'أدوية ومكملات غذائية', 'Electrorush'),
  // two product types (hair + skin): doubtful
  extra(508, 'Argan Shampoo and Face Serum Set', 'طقم شامبو وسيروم', 'تجميل وعناية', 'Offers'),
];

const all = [...tree, ...extras];

describe('#1556 B: merge the 5 extra main categories into the 8 trees', () => {
  it('fixture starts with records in the 5 extra mains (red before)', () => {
    const refs = remainingReferences(all);
    expect(Object.values(refs).every((v) => v > 0)).toBe(true);
  });

  it('classifies the main tree by product type', () => {
    expect(classifyMain(extras[0]).main).toBe('الفيتامينات والتغذية الصحية');
    expect(classifyMain(extras[1]).main).toBe('الأم والطفل');
    expect(classifyMain(extras[2]).main).toBe('العناية بالبشرة');
    expect(classifyMain(extras[3]).main).toBe('العناية الشخصية');
    expect(classifyMain(extras[4]).main).toBe('الرعاية الصحية المنزلية والأجهزة الطبية');
    expect(classifyMain(extras[5]).main).toBe('الرعاية الصحية المنزلية والأجهزة الطبية');
    expect(classifyMain(extras[6]).strength).toBe('brand');
    expect(classifyMain(extras[7]).conflicts.length).toBeGreaterThan(0);
  });

  const plan = planMoves(all);
  const bySku = (sku: number) => plan.find((p) => p.sku === String(sku)) as MoveRow;

  it('moves the confident ones into an existing path, copying its labels', () => {
    expect(bySku(501)).toMatchObject({ status: 'move', to: VIT.join(' > ') });
    expect(bySku(502)).toMatchObject({ status: 'move', to: BABY.join(' > ') });
    expect(bySku(503)).toMatchObject({ status: 'move', to: SKIN.join(' > ') });
    expect(bySku(504)).toMatchObject({ status: 'move', to: SOAP.join(' > ') });
    expect(bySku(505)).toMatchObject({ status: 'move', to: DEV.join(' > ') });
    expect(bySku(506)).toMatchObject({ status: 'move', to: ORG.join(' > ') });
    expect(bySku(501).set).toMatchObject({
      category: VIT[0], sub_category: VIT[1], sub_sub_category: VIT[2], categories: [...VIT],
      'translations.en.sub_category': `EN ${VIT[1]}`, 'translations.ur.main_category': `UR ${VIT[0]}`,
    });
  });

  it('lists the doubtful ones for the owner and never moves them', () => {
    expect(bySku(507).status).toBe('doubtful');
    expect(bySku(508).status).toBe('doubtful');
    expect(toCsv(plan)).toContain('doubtful');
  });

  it('no Offers / Promotions / brand label survives a confident move, references reach 0 only when all moved', () => {
    const after = projectAfter(all, plan);
    for (const sku of [501, 502, 503, 504, 505, 506]) {
      const r = after.find((x) => x.sku === sku) as CatalogueRecord;
      expect(JSON.stringify(r.categories)).not.toMatch(/Offers|Promotions|Nivea|Baby Products/);
    }
    const left = remainingReferences(after);
    expect(left['الصحة والعافية المتخصصة']).toBe(0);
    expect(left['النظافة الشخصية والحماية']).toBe(0);
    expect(left['أدوية ومكملات غذائية']).toBe(1); // 507 stays for the owner
    const cleanPlan = planMoves(all.filter((r) => r.sku !== 507 && r.sku !== 508));
    const cleanLeft = remainingReferences(projectAfter(all.filter((r) => r.sku !== 507 && r.sku !== 508), cleanPlan));
    expect(EXTRA_MAINS.every((m) => cleanLeft[m] === 0)).toBe(true);
  });

  it('apply writes only confident moves, guarded by the before value (idempotent)', async () => {
    const db = new Map(all.map((r) => [String(r._id), { ...r }]));
    const audit: unknown[] = [];
    const col = {
      async updateOne(filter: Record<string, unknown>, update: Record<string, unknown>) {
        const doc = db.get(String(filter._id));
        if (!doc || doc.category !== filter.category) return { modifiedCount: 0 };
        Object.assign(doc, (update as { $set: Record<string, unknown> }).$set);
        return { modifiedCount: 1 };
      },
    };
    const sink = { async insertOne(d: Record<string, unknown>) { audit.push(d); } };
    expect(await applyMoves(plan, col, sink, 'r1')).toBe(6);
    expect(await applyMoves(plan, col, sink, 'r2')).toBe(0);
    expect(audit).toHaveLength(6);
    expect(db.get('x507')?.category).toBe('أدوية ومكملات غذائية');
  });
});
