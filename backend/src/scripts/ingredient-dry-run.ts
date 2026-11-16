/**
 * READ-ONLY dry run of the catalogue active-ingredient normalization (issue #1556, ops task 96s, plan: docs/platform/INGREDIENT-NORMALIZATION-PLAN.md).
 * Streams the medicines once (projection of four fields, batches of 200, time limit) and prints COUNTS: per status, per category, how many strengths were read, and the
 * most frequent normalized spellings the approved table does not map (the candidates for the owner's table). It never prints a product id or name, and it WRITES NOTHING:
 * there is no --apply here, the migration that writes is a later, separate script that waits for the owner's approval of the table.
 *   node dist/scripts/ingredient-dry-run.js        env: MONGO_URL, DB_NAME; optional INN_MAP_FILE (JSON, see ingredient-parse.ts loadInnMap), TOP (default 60)
 */
import { readFileSync } from 'fs';
import { mongo } from 'mongoose';
import { IngredientStatus, loadInnMap, parseIngredients } from '../modules/medicines/ingredient-parse';

const STATUSES: IngredientStatus[] = ['empty', 'leaflet', 'confident', 'review'];
const MAX_DISTINCT = 50_000;   // bounds the memory of the spelling counter

export interface DryRunReport {
  total: number;
  byStatus: Record<IngredientStatus, number>;
  byCategory: Map<string, Record<IngredientStatus, number>>;
  withStrength: number;
  fromGenericName: number;
  unmapped: Map<string, number>;
  unmappedOverflow: number;
  maxLeafletChars: number;
}

const zero = (): Record<IngredientStatus, number> => ({ empty: 0, leaflet: 0, confident: 0, review: 0 });

export function newReport(): DryRunReport {
  return { total: 0, byStatus: zero(), byCategory: new Map(), withStrength: 0, fromGenericName: 0, unmapped: new Map(), unmappedOverflow: 0, maxLeafletChars: 0 };
}

export function addProduct(r: DryRunReport, doc: { active_ingredient?: unknown; generic_name?: unknown; strength?: unknown; category?: unknown }, map: Readonly<Record<string, string>>): void {
  const parsed = parseIngredients(doc, map);
  r.total += 1;
  r.byStatus[parsed.status] += 1;
  const cat = typeof doc.category === 'string' && doc.category.trim() ? doc.category.trim() : '(none)';
  const row = r.byCategory.get(cat) ?? zero();
  row[parsed.status] += 1;
  r.byCategory.set(cat, row);
  if (parsed.reasons.includes('from_generic_name')) r.fromGenericName += 1;
  if (parsed.ingredients.some((i) => i.strength_value !== null)) r.withStrength += 1;
  if (parsed.status === 'leaflet') r.maxLeafletChars = Math.max(r.maxLeafletChars, typeof doc.active_ingredient === 'string' ? doc.active_ingredient.length : 0);
  if (parsed.status === 'review') {
    for (const i of parsed.ingredients) {
      if (i.inn !== null || !i.key) continue;
      if (r.unmapped.has(i.key) || r.unmapped.size < MAX_DISTINCT) r.unmapped.set(i.key, (r.unmapped.get(i.key) ?? 0) + 1);
      else r.unmappedOverflow += 1;
    }
  }
}

export function reportLines(r: DryRunReport, mapInfo: { approved: boolean; entries: number }, top: number): string[] {
  const out: string[] = [];
  const pct = (n: number) => (r.total ? `${((n / r.total) * 100).toFixed(1)}%` : '0%');
  out.push(`ingredient-dry-run: table approved=${mapInfo.approved} entries=${mapInfo.entries}${mapInfo.approved ? '' : ' (not approved: every ingredient text counts as review)'}`);
  out.push(`ingredient-dry-run: TOTAL products=${r.total} ${STATUSES.map((s) => `${s}=${r.byStatus[s]} (${pct(r.byStatus[s])})`).join(' ')}`);
  out.push(`ingredient-dry-run: strength read for ${r.withStrength} products; ingredient taken from generic_name for ${r.fromGenericName}; longest leaflet-like text ${r.maxLeafletChars} chars`);
  const cats = [...r.byCategory.entries()].sort((a, b) => STATUSES.reduce((s, k) => s + b[1][k], 0) - STATUSES.reduce((s, k) => s + a[1][k], 0)).slice(0, 40);
  for (const [cat, c] of cats) out.push(`ingredient-dry-run: category "${cat.slice(0, 60)}" total=${STATUSES.reduce((s, k) => s + c[k], 0)} ${STATUSES.map((s) => `${s}=${c[s]}`).join(' ')}`);
  const spellings = [...r.unmapped.entries()].sort((a, b) => b[1] - a[1]);
  out.push(`ingredient-dry-run: distinct unmapped spellings=${spellings.length}${r.unmappedOverflow ? ` (+${r.unmappedOverflow} more beyond the ${MAX_DISTINCT} counted)` : ''}; the ${Math.min(top, spellings.length)} most frequent:`);
  for (const [key, n] of spellings.slice(0, top)) out.push(`ingredient-dry-run: spelling n=${n} "${key.slice(0, 80)}"`);
  out.push('ingredient-dry-run: done (read-only)');
  return out;
}

async function main(): Promise<void> {
  const url = process.env.MONGO_URL; const name = process.env.DB_NAME;
  if (!url || !name) { console.error('MONGO_URL and DB_NAME are required'); process.exit(2); }
  let mapInfo = { map: {} as Readonly<Record<string, string>>, approved: false, entries: 0 };
  if (process.env.INN_MAP_FILE) mapInfo = loadInnMap(JSON.parse(readFileSync(process.env.INN_MAP_FILE, 'utf8')));
  const top = Math.max(1, Math.min(500, Number(process.env.TOP) || 60));
  const client = await mongo.MongoClient.connect(url);
  try {
    const cursor = client.db(name).collection('medicines').find({ deleted_at: null } as never, { projection: { _id: 0, active_ingredient: 1, generic_name: 1, strength: 1, category: 1 }, batchSize: 200, maxTimeMS: 300_000 });
    const report = newReport();
    for await (const doc of cursor) addProduct(report, doc as never, mapInfo.map);
    for (const line of reportLines(report, mapInfo, top)) console.log(line);
  } finally { await client.close(); }
}

if (require.main === module) main().catch((e) => { console.error('failed:', e?.message); process.exit(1); });
