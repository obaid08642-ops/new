/**
 * #1556 decision B (owner, 2026-10-16): the 5 extra main categories are leftovers of a second import.
 *
 *   "أدوية ومكملات غذائية" (121), "تجميل وعناية" (31), "العناية بالجسم والاستحمام" (78),
 *   "النظافة الشخصية والحماية" (234), "الصحة والعافية المتخصصة" (2)
 *
 * Their sub-categories are brand or store labels ("Offers" / "Promotions" are the source store's promotion
 * tags), so they carry no product-type information. Every record is moved into one of the 8 main trees by
 * what the product is:
 *   1. a rule table of product-type keywords (English + Arabic, matched on name_en / name_ar /
 *      translations.{en,ar}.name) proposes the main tree; a rule matching only a brand is weak;
 *   2. the sub / sub-sub path inside that main tree comes from the catalogue itself: the records already in
 *      the 8 trees whose names share the most words with this one (nearest neighbours) vote for their path;
 *   3. a move is CONFIDENT only when exactly one main tree wins on a product-type keyword AND the neighbours
 *      agree on the path (see THRESHOLDS). Everything else is listed as doubtful for the owner.
 *
 * Writes (apply mode only): `category`, `sub_category`, `sub_sub_category`, `categories`, and the
 * `translations.<lang>.{main_category,sub_category,sub_sub_category}` labels copied from records already in
 * the target path (no label is invented). Each write is keyed by `_id` and guarded by the `before` main
 * category, so a re-run is a no-op and a record edited after the dry run is skipped. Every applied move is
 * stored in `catalogue_category_moves` (run_id, before, after) for rollback.
 *
 * The 5 categories exist only as strings on the records (there is no categories collection in the schema).
 * After the moves the script counts what still references them; they are reported deletable only at 0.
 * With `--category-collection <name>` (a production-only collection, if one exists) the matching category
 * documents are deleted, again only when nothing references them.
 *
 * Usage:
 *   # dry run from a JSON / JSONL export (no database access):
 *   npx ts-node --transpile-only src/scripts/merge-extra-main-categories.ts --input export.jsonl --out ./extra-mains
 *   # dry run against a database (read-only):
 *   MONGO_URL=... npx ts-node --transpile-only src/scripts/merge-extra-main-categories.ts --out ./extra-mains
 *   # apply exactly the approved report (only rows with status "move"):
 *   MONGO_URL=... CATALOGUE_CATEGORY_MOVE_CONFIRM=apply npx ts-node --transpile-only \
 *     src/scripts/merge-extra-main-categories.ts --apply --plan ./extra-mains/moves.json [--category-collection categories]
 */
import { CATALOG_COLLECTIONS } from '../modules/catalogs/catalog-collections';

export const MAIN_TREES = [
  'الأدوية والعلاج',
  'الفيتامينات والتغذية الصحية',
  'الأم والطفل',
  'العناية بالبشرة',
  'العناية بالشعر',
  'المكياج والإكسسوارات',
  'العناية الشخصية',
  'الرعاية الصحية المنزلية والأجهزة الطبية',
] as const;
export type MainTree = (typeof MAIN_TREES)[number];

export const EXTRA_MAINS = [
  'أدوية ومكملات غذائية',
  'تجميل وعناية',
  'العناية بالجسم والاستحمام',
  'النظافة الشخصية والحماية',
  'الصحة والعافية المتخصصة',
] as const;

export const LABEL_LANGS = ['ar', 'en', 'ur', 'hi', 'bn', 'tl', 'fil'] as const;

/** Same thresholds are used by the batch classifier's apply step (#1556 C). */
export const THRESHOLDS = {
  /** neighbours that vote for the sub / sub-sub path */
  k: 7,
  /** share of the neighbours' vote the winning path needs */
  pathAgreement: 0.6,
  /** words the best neighbour must share with the record */
  minSharedWords: 2,
} as const;

export interface CatalogueRecord {
  _id?: unknown;
  id?: unknown;
  sku?: number | string | null;
  name_en?: string | null;
  name_ar?: string | null;
  category?: string | null;
  sub_category?: string | null;
  sub_sub_category?: string | null;
  categories?: string[] | null;
  is_prescription?: boolean | null;
  requires_prescription?: boolean | null;
  translations?: Record<string, Record<string, unknown> | null | undefined> | null;
  [key: string]: unknown;
}

export interface Rule {
  id: string;
  main: MainTree;
  /** product-type words; a match is strong */
  type: RegExp;
  /** brand words; a match alone is weak */
  brand?: RegExp;
}

// Word boundaries: \b is ASCII-only, so Arabic words are matched as plain substrings of the normalised text.
const W = (latin: string, arabic: string) => new RegExp(`\\b(?:${latin})|${arabic}`, 'i');

/**
 * Ordered rule table. Order only breaks nothing: every rule is evaluated and a record matching two main
 * trees on product-type words is doubtful.
 */
export const RULES: Rule[] = [
  {
    id: 'baby',
    main: 'الأم والطفل',
    type: W('diaper|nappy|nappies|pacifier|soother|teether|feeding bottle|baby bottle|infant formula|baby formula|breast pump|nipple|baby wipes|newborn',
      'حفاض|حفاظ|حفاضات|لهاية|رضاعة|رضّاعة|حليب اطفال|حليب الاطفال|حليب رضع|شفاط حليب|مضخة ثدي|حلمة|مناديل اطفال|حديثي الولادة|عضاضة'),
    brand: W('pampers|huggies|molfix|chicco|avent|tommee|nuk|similac|aptamil|bebelac|nan optipro|mustela', 'بامبرز|هجيز|مولفكس|شيكو|افنت|سيميلاك|ابتاميل|بيبيلاك|موستيلا'),
  },
  {
    id: 'vitamins',
    main: 'الفيتامينات والتغذية الصحية',
    type: W('vitamin|multivitamin|omega|fish oil|supplement|collagen|magnesium|zinc|calcium|iron|probiotic|biotin|ginkgo|biloba|electrolyte|protein|whey|melatonin|coq10|glucosamine|turmeric|ashwagandha|spirulina|folic',
      'فيتامين|فيتامينات|اوميغا|اوميجا|زيت السمك|مكمل|مكملات|كولاجين|كولاجين|مغنيسيوم|ماغنيسيوم|زنك|كالسيوم|حديد|بروبيوتيك|بيوتين|جنكو|جينكو|بيلوبا|املاح معدنيه|بروتين|ميلاتونين|جلوكوزامين|كركم|حمض الفوليك'),
    brand: W('now foods|natural factors|solgar|nature made|centrum|jamieson|electrorush|vitabiotics|nature.s bounty', 'ناتورال فاكتورز|سولجار|سنتروم|جاميسون|فيتابيوتكس'),
  },
  {
    id: 'hair',
    main: 'العناية بالشعر',
    type: W('shampoo|conditioner|hair mask|hair oil|hair serum|hair spray|hair gel|hair colou?r|hair dye|anti.?dandruff|hair loss|hair growth',
      'شامبو|بلسم|ماسك شعر|ماسك للشعر|زيت شعر|زيت للشعر|سيروم شعر|سيروم للشعر|بخاخ شعر|جل شعر|صبغه شعر|صبغة شعر|قشره|تساقط الشعر|نمو الشعر'),
  },
  {
    id: 'makeup',
    main: 'المكياج والإكسسوارات',
    type: W('lipstick|lip gloss|mascara|eyeliner|eye liner|eyeshadow|eye shadow|foundation|concealer|blush|bronzer|highlighter|nail polish|makeup brush|make-up brush|powder puff|makeup sponge|beauty blender|primer|setting spray|false lashes|tweezers?|makeup remover',
      'احمر شفاه|روج|ماسكارا|كحل|ايلاينر|ظلال عيون|ظل عيون|كريم اساس|فاونديشن|كونسيلر|خافي عيوب|بلاشر|احمر خدود|برونزر|هايلايتر|طلاء اظافر|مناكير|فرشاه مكياج|فرشاة مكياج|اسفنجه مكياج|رموش|ملقط|مزيل مكياج'),
  },
  {
    id: 'skin',
    main: 'العناية بالبشرة',
    type: W('sunscreen|sun block|sunblock|spf|moisturi[sz]er|moisturi[sz]ing cream|face cream|night cream|day cream|eye cream|serum|face wash|facial wash|cleanser|toner|micellar|face mask|peeling|retinol|hyaluronic|niacinamide|anti.?aging|anti.?wrinkle|acne|whitening cream|lip balm',
      'واقي شمس|واقي من الشمس|مرطب|كريم مرطب|كريم للوجه|كريم وجه|كريم ليلي|كريم نهاري|كريم العين|كريم للعين|سيروم|غسول وجه|غسول للوجه|منظف|تونر|ميسيلار|قناع للوجه|ماسك للوجه|تقشير|ريتينول|هيالورونيك|نياسيناميد|مضاد للتجاعيد|تجاعيد|حب الشباب|تفتيح|مرطب شفاه'),
    brand: W('murad|nivea|la roche|vichy|cerave|bioderma|eucerin|avene|glow & lovely|glow and lovely|neutrogena|the ordinary|cetaphil', 'موراد|نيفيا|لاروش|فيشي|سيرافي|بيوديرما|يوسيرين|افين|جلو اند لوفلي|نيتروجينا|سيتافيل'),
  },
  {
    id: 'personal',
    main: 'العناية الشخصية',
    type: W('soap|shower gel|body wash|bath|deodorant|antiperspirant|toothpaste|toothbrush|mouthwash|dental floss|razor|shaving|sanitary pad|panty liner|tampon|wet wipes|hand wash|hand sanitizer|body lotion|body oil|body cream|body spray|talc|cotton buds|feminine wash|intimate wash',
      'صابون|جل استحمام|جل الاستحمام|غسول الجسم|غسول للجسم|استحمام|مزيل عرق|مزيل للعرق|معجون اسنان|معجون الاسنان|فرشاه اسنان|فرشاة اسنان|غسول فم|غسول الفم|خيط اسنان|شفره|شفرة|حلاقه|حلاقة|فوط صحيه|فوط صحية|فوط يوميه|سدادات قطنيه|مناديل مبلله|مناديل مبللة|غسول يدين|غسول اليدين|معقم يدين|معقم لليدين|لوشن للجسم|لوشن الجسم|زيت للجسم|زيت الجسم|كريم للجسم|كريم الجسم|بودره|اعواد قطن|غسول نسائي|الغسول المهبلي'),
    brand: W('aquafresh|aqaufresh|colgate|signal|sensodyne|dove|lux|lifebuoy|dettol|gillette|always|rexona|palmolive|johnson', 'اكوافريش|كولجيت|سيجنال|سنسوداين|دوف|لوكس|لايفبوي|ديتول|جيليت|اولويز|ريكسونا|بالموليف'),
  },
  {
    id: 'devices',
    main: 'الرعاية الصحية المنزلية والأجهزة الطبية',
    type: W('crutch|crutches|walking stick|cane|wheelchair|walker|pill organi[sz]er|pill box|pill case|thermometer|blood pressure monitor|bp monitor|glucometer|glucose meter|test strips|lancets?|nebuli[sz]er|pulse oximeter|oximeter|face mask|surgical mask|bandage|gauze|plaster|first aid|brace|knee support|back support|compression stocking|heating pad|syringe|scale|hearing aid|inhaler spacer',
      'عكاز|عكازات|عصا مشي|كرسي متحرك|مشايه|مشاية|منظم حبوب|منظم ادويه|علبه حبوب|علبة حبوب|ميزان حراره|ميزان حرارة|جهاز ضغط|جهاز قياس الضغط|جهاز سكر|جهاز قياس السكر|شرائط|ابر وخز|جهاز بخار|جهاز استنشاق|مقياس اكسجين|كمامه|كمامة|ضماد|ضمادات|شاش|لاصق جروح|اسعافات اوليه|دعامه|دعامة|مشد|جوارب ضاغطه|جوارب ضاغطة|وساده تدفئه|حقنه|حقنة|ميزان|سماعه طبيه'),
  },
  {
    id: 'medicines',
    main: 'الأدوية والعلاج',
    // Dosage forms only count for medicines when nothing else matched them (see classifyMain): a vitamin tablet
    // is a vitamin, a medicated shampoo is hair care.
    type: W('tablets?|caps(ule)?s?|syrup|suspension|injection|ampoules?|vials?|suppositor(y|ies)|eye drops|ear drops|nasal spray|ointment|effervescent|lozenges?|\\d+\\s?mg\\b',
      'قرص|اقراص|كبسول|كبسولات|شراب|معلق|حقن|امبول|امبولات|لبوس|تحاميل|قطره|قطرة|بخاخ انف|مرهم|فوار|استحلاب'),
  },
];

const MEDICINE_RULE = 'medicines';

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

export function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '') // tashkeel, tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\s+/g, ' ')
    .trim();
}

// Normalise the Arabic alternatives of each rule the same way as the text.
for (const r of RULES) {
  r.type = new RegExp(normalise(r.type.source), 'i');
  if (r.brand) r.brand = new RegExp(normalise(r.brand.source), 'i');
}

const STOP = new Set(['and', 'with', 'for', 'the', 'of', 'in', 'ml', 'mg', 'gm', 'g', 'pcs', 'pieces', 'pack', 'x',
  'مل', 'ملغ', 'مجم', 'جم', 'غرام', 'حبه', 'قطعه', 'عبوه', 'مع', 'من', 'في', 'على', 'ل', 'و', 'لل', 'الى']);

export function words(s: string): string[] {
  return normalise(s)
    .split(/[^a-zء-ي]+/)
    .map((w) => w.replace(/^ال(?=..)/, ''))
    .filter((w) => w.length > 1 && !STOP.has(w));
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export function recordText(r: CatalogueRecord): string {
  const t = r.translations || {};
  return [r.name_en, r.name_ar, t.en?.name, t.ar?.name].map(str).filter(Boolean).join(' | ');
}

export function recordId(r: CatalogueRecord): string {
  return String(r.id ?? r._id ?? '');
}

export function pathOf(r: CatalogueRecord): string {
  return [r.category, r.sub_category, r.sub_sub_category].map(str).filter(Boolean).join(' > ');
}

// ---------------------------------------------------------------------------
// Main tree from the rules
// ---------------------------------------------------------------------------

export interface MainProposal {
  main: MainTree | null;
  rule: string;
  strength: 'type' | 'brand' | 'none';
  /** other main trees that also matched on a product-type word */
  conflicts: MainTree[];
}

export function classifyMain(r: CatalogueRecord): MainProposal {
  const text = normalise(recordText(r));
  const typeHits = RULES.filter((rule) => rule.id !== MEDICINE_RULE && rule.type.test(text));
  if (typeHits.length === 1) return { main: typeHits[0].main, rule: `${typeHits[0].id}:type`, strength: 'type', conflicts: [] };
  if (typeHits.length > 1) {
    return { main: typeHits[0].main, rule: typeHits.map((h) => `${h.id}:type`).join('+'), strength: 'type', conflicts: typeHits.slice(1).map((h) => h.main) };
  }
  const brandHits = RULES.filter((rule) => rule.brand && rule.brand.test(text));
  const med = RULES.find((rule) => rule.id === MEDICINE_RULE) as Rule;
  const rx = r.is_prescription === true || r.requires_prescription === true;
  if (brandHits.length === 0 && (rx || med.type.test(text))) {
    return { main: med.main, rule: rx ? 'medicines:prescription' : 'medicines:dosage-form', strength: rx ? 'type' : 'brand', conflicts: [] };
  }
  if (brandHits.length === 1) return { main: brandHits[0].main, rule: `${brandHits[0].id}:brand`, strength: 'brand', conflicts: [] };
  if (brandHits.length > 1) {
    return { main: brandHits[0].main, rule: brandHits.map((h) => `${h.id}:brand`).join('+'), strength: 'brand', conflicts: brandHits.slice(1).map((h) => h.main) };
  }
  return { main: null, rule: 'no-rule', strength: 'none', conflicts: [] };
}

// ---------------------------------------------------------------------------
// Tree + nearest-neighbour path inside the main tree
// ---------------------------------------------------------------------------

export interface TreePath {
  main: MainTree;
  sub: string | null;
  subSub: string | null;
  /** translations.<lang>.{main_category,sub_category,sub_sub_category}, most common value in the path */
  labels: Record<string, Record<string, string>>;
  count: number;
}

export interface TreeIndex {
  paths: Map<string, TreePath>;
  /** per main tree: the records (words + path key) that vote */
  members: Map<MainTree, Array<{ words: Set<string>; path: string }>>;
}

const LABEL_FIELDS = ['main_category', 'sub_category', 'sub_sub_category'] as const;

export function buildTree(records: CatalogueRecord[]): TreeIndex {
  const paths = new Map<string, TreePath>();
  const votes = new Map<string, Map<string, Map<string, number>>>(); // path -> "lang.field" -> value -> n
  const members = new Map<MainTree, Array<{ words: Set<string>; path: string }>>();
  for (const r of records) {
    const main = str(r.category) as MainTree;
    if (!(MAIN_TREES as readonly string[]).includes(main)) continue;
    const key = pathOf(r);
    if (!paths.has(key)) paths.set(key, { main, sub: str(r.sub_category) || null, subSub: str(r.sub_sub_category) || null, labels: {}, count: 0 });
    (paths.get(key) as TreePath).count += 1;
    if (!members.has(main)) members.set(main, []);
    (members.get(main) as Array<{ words: Set<string>; path: string }>).push({ words: new Set(words(recordText(r))), path: key });
    if (!votes.has(key)) votes.set(key, new Map());
    const pv = votes.get(key) as Map<string, Map<string, number>>;
    for (const lang of LABEL_LANGS) {
      const tr = r.translations?.[lang];
      if (!tr) continue;
      for (const f of LABEL_FIELDS) {
        const v = str(tr[f]);
        if (!v) continue;
        const k = `${lang}.${f}`;
        if (!pv.has(k)) pv.set(k, new Map());
        const m = pv.get(k) as Map<string, number>;
        m.set(v, (m.get(v) || 0) + 1);
      }
    }
  }
  for (const [key, p] of paths) {
    for (const [k, m] of votes.get(key) || new Map<string, Map<string, number>>()) {
      const [lang, f] = k.split('.');
      const best = [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
      (p.labels[lang] ||= {})[f] = best;
    }
  }
  return { paths, members };
}

export interface PathProposal {
  path: string | null;
  agreement: number;
  sharedWords: number;
}

export function proposePath(r: CatalogueRecord, main: MainTree, tree: TreeIndex, k: number = THRESHOLDS.k): PathProposal {
  const own = new Set(words(recordText(r)));
  const scored: Array<{ path: string; shared: number }> = [];
  for (const m of tree.members.get(main) || []) {
    let shared = 0;
    for (const w of own) if (m.words.has(w)) shared += 1;
    if (shared > 0) scored.push({ path: m.path, shared });
  }
  if (!scored.length) return { path: null, agreement: 0, sharedWords: 0 };
  scored.sort((a, b) => b.shared - a.shared || a.path.localeCompare(b.path));
  const top = scored.slice(0, k);
  const tally = new Map<string, number>();
  for (const t of top) tally.set(t.path, (tally.get(t.path) || 0) + t.shared);
  const total = [...tally.values()].reduce((a, b) => a + b, 0);
  const [bestPath, bestVotes] = [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return { path: bestPath, agreement: bestVotes / total, sharedWords: top[0].shared };
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export interface MoveRow {
  status: 'move' | 'doubtful';
  sku: string | null;
  id: string;
  _id?: unknown;
  name_en: string;
  from: string;
  to: string | null;
  rule: string;
  confidence: number;
  reason: string;
  set: Record<string, unknown> | null;
  before_category: string;
}

export function isExtra(r: CatalogueRecord): boolean {
  return (EXTRA_MAINS as readonly string[]).includes(str(r.category));
}

export function planMoves(records: CatalogueRecord[]): MoveRow[] {
  const tree = buildTree(records);
  const out: MoveRow[] = [];
  for (const r of records) {
    if (!isExtra(r)) continue;
    const base = {
      sku: r.sku === null || r.sku === undefined ? null : String(r.sku), id: recordId(r), _id: r._id,
      name_en: str(r.name_en) || str(r.translations?.en?.name), from: pathOf(r), before_category: str(r.category),
    };
    const main = classifyMain(r);
    if (!main.main) {
      out.push({ ...base, status: 'doubtful', to: null, rule: main.rule, confidence: 0, reason: 'no product-type rule matched', set: null });
      continue;
    }
    const p = proposePath(r, main.main, tree);
    const target = p.path ? (tree.paths.get(p.path) as TreePath) : null;
    const mainScore = main.strength === 'type' && !main.conflicts.length ? 1 : main.strength === 'type' ? 0.4 : 0.5;
    const confidence = Math.round(mainScore * (p.path ? p.agreement : 0) * 100) / 100;
    const reasons: string[] = [];
    if (main.strength !== 'type') reasons.push('main tree from a brand or dosage form only');
    if (main.conflicts.length) reasons.push(`also matches ${main.conflicts.join(', ')}`);
    if (!p.path) reasons.push('no similar product in the target tree');
    else {
      if (p.agreement < THRESHOLDS.pathAgreement) reasons.push(`neighbours disagree on the path (${p.agreement.toFixed(2)})`);
      if (p.sharedWords < THRESHOLDS.minSharedWords) reasons.push(`closest product shares ${p.sharedWords} word(s)`);
    }
    out.push({
      ...base,
      status: reasons.length ? 'doubtful' : 'move',
      to: target ? p.path : main.main,
      rule: main.rule,
      confidence,
      reason: reasons.join('; '),
      set: target ? buildSet(r, target) : null,
    });
  }
  return out;
}

export function buildSet(r: CatalogueRecord, t: TreePath): Record<string, unknown> {
  const set: Record<string, unknown> = {
    category: t.main,
    sub_category: t.sub,
    sub_sub_category: t.subSub,
    categories: [t.main, t.sub, t.subSub].filter(Boolean),
  };
  for (const lang of LABEL_LANGS) {
    if (!r.translations?.[lang] && !t.labels[lang]) continue;
    for (const f of LABEL_FIELDS) set[`translations.${lang}.${f}`] = t.labels[lang]?.[f] ?? null;
  }
  return set;
}

/** What still references one of the 5 categories (main, any label, or the categories array). */
export function remainingReferences(records: CatalogueRecord[]): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(EXTRA_MAINS.map((m) => [m, 0]));
  for (const r of records) {
    const vals = new Set<string>([str(r.category), ...(Array.isArray(r.categories) ? r.categories.map(str) : [])]);
    for (const lang of LABEL_LANGS) vals.add(str(r.translations?.[lang]?.main_category));
    for (const m of EXTRA_MAINS) if (vals.has(m)) out[m] += 1;
  }
  return out;
}

/** The dry run's projected state: the records with the confident moves applied. */
export function projectAfter(records: CatalogueRecord[], plan: MoveRow[]): CatalogueRecord[] {
  const byId = new Map(plan.filter((p) => p.status === 'move' && p.set).map((p) => [p.id, p.set as Record<string, unknown>]));
  return records.map((r) => {
    const set = byId.get(recordId(r));
    if (!set) return r;
    const next: CatalogueRecord = { ...r, translations: { ...(r.translations || {}) } };
    for (const [k, v] of Object.entries(set)) {
      const m = /^translations\.([^.]+)\.(.+)$/.exec(k);
      if (m) (next.translations as Record<string, Record<string, unknown>>)[m[1]] = { ...((next.translations as Record<string, Record<string, unknown> | null>)[m[1]] || {}), [m[2]]: v };
      else next[k] = v;
    }
    return next;
  });
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

export interface UpdateCollection {
  updateOne(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<{ modifiedCount?: number }>;
}
export interface AuditCollection {
  insertOne(doc: Record<string, unknown>): Promise<unknown>;
}

export async function applyMoves(plan: MoveRow[], col: UpdateCollection, audit: AuditCollection, runId: string): Promise<number> {
  let modified = 0;
  for (const row of plan) {
    if (row.status !== 'move' || !row.set) continue;
    const res = await col.updateOne({ _id: row._id, category: row.before_category }, { $set: row.set });
    if (res.modifiedCount) {
      modified += 1;
      await audit.insertOne({ run_id: runId, record_id: row.id, record_key: row._id, sku: row.sku, from: row.from, to: row.to, rule: row.rule, set: row.set, at: new Date() });
    }
  }
  return modified;
}

// ---------------------------------------------------------------------------
// Report + CLI
// ---------------------------------------------------------------------------

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: MoveRow[]): string {
  const head: Array<keyof MoveRow> = ['status', 'sku', 'id', 'name_en', 'from', 'to', 'rule', 'confidence', 'reason'];
  return [head.join(','), ...rows.map((r) => head.map((h) => csvCell(r[h])).join(','))].join('\n') + '\n';
}

export function readExport(raw: string): CatalogueRecord[] {
  const t = raw.trim();
  return t.startsWith('[') ? (JSON.parse(t) as CatalogueRecord[]) : t.split('\n').filter(Boolean).map((l) => JSON.parse(l) as CatalogueRecord);
}

function parseArgs(argv: string[]) {
  const get = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  return { apply: argv.includes('--apply'), input: get('--input'), out: get('--out') || './catalogue-extra-mains', plan: get('--plan'), categoryCollection: get('--category-collection') };
}

async function main() {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const args = parseArgs(process.argv.slice(2));
  const serialise = (rows: MoveRow[]) => rows.map(({ _id, ...rest }) => ({ ...rest, record_key: _id && typeof _id === 'object' ? String(_id) : _id }));
  const mongoose = (await import('mongoose')).default;

  if (!args.apply) {
    let records: CatalogueRecord[];
    if (args.input) records = readExport(fs.readFileSync(args.input, 'utf8'));
    else {
      if (!process.env.MONGO_URL) throw new Error('MONGO_URL or --input is required');
      await mongoose.connect(process.env.MONGO_URL);
      records = (await mongoose.connection.collection(CATALOG_COLLECTIONS.medicines).find({ is_deleted: { $ne: true } }).toArray()) as unknown as CatalogueRecord[];
      await mongoose.disconnect();
    }
    const plan = planMoves(records);
    fs.mkdirSync(args.out, { recursive: true });
    fs.writeFileSync(path.join(args.out, 'moves.json'), JSON.stringify(serialise(plan), null, 2));
    fs.writeFileSync(path.join(args.out, 'moves.csv'), toCsv(plan));
    fs.writeFileSync(path.join(args.out, 'doubtful.csv'), toCsv(plan.filter((p) => p.status === 'doubtful')));
    const byMain: Record<string, number> = {};
    for (const p of plan) byMain[p.before_category] = (byMain[p.before_category] || 0) + 1;
    console.log(JSON.stringify({
      mode: 'dry-run', records: records.length, in_extra_mains: plan.length, by_extra_main: byMain,
      confident_moves: plan.filter((p) => p.status === 'move').length, doubtful: plan.filter((p) => p.status === 'doubtful').length,
      references_left_after_confident_moves: remainingReferences(projectAfter(records, plan)), out: args.out,
    }, null, 2));
    return;
  }

  if (process.env.CATALOGUE_CATEGORY_MOVE_CONFIRM !== 'apply') throw new Error('Set CATALOGUE_CATEGORY_MOVE_CONFIRM=apply to write');
  if (!args.plan) throw new Error('--apply needs --plan <moves.json> (the approved dry-run report)');
  if (!process.env.MONGO_URL) throw new Error('MONGO_URL is required');
  await mongoose.connect(process.env.MONGO_URL);
  const approved = JSON.parse(fs.readFileSync(args.plan, 'utf8')) as Array<MoveRow & { record_key?: unknown }>;
  const plan: MoveRow[] = approved.map((r) => ({
    ...r,
    _id: typeof r.record_key === 'string' && /^[0-9a-f]{24}$/i.test(r.record_key) ? new mongoose.Types.ObjectId(r.record_key) : r.record_key,
  }));
  const meds = mongoose.connection.collection(CATALOG_COLLECTIONS.medicines);
  const runId = `extra-mains-${new Date().toISOString()}`;
  const modified = await applyMoves(plan, meds as unknown as UpdateCollection, mongoose.connection.collection('catalogue_category_moves') as unknown as AuditCollection, runId);
  const left: Record<string, number> = {};
  for (const m of EXTRA_MAINS) {
    left[m] = await meds.countDocuments({
      $or: [{ category: m }, { categories: m }, ...LABEL_LANGS.map((l) => ({ [`translations.${l}.main_category`]: m }))],
    });
  }
  const deleted: Record<string, number> = {};
  if (args.categoryCollection) {
    const cats = mongoose.connection.collection(args.categoryCollection);
    for (const m of EXTRA_MAINS) {
      if (left[m] !== 0) continue;
      const res = await cats.deleteMany({ $or: [{ name: m }, { name_ar: m }, { parent: m }, { main_category: m }] });
      deleted[m] = res.deletedCount;
    }
  }
  const planned = plan.filter((p) => p.status === 'move').length;
  console.log(JSON.stringify({ mode: 'apply', run_id: runId, planned_moves: planned, modified, skipped_changed_since_dry_run: planned - modified, references_left: left, category_documents_deleted: deleted }, null, 2));
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
