/**
 * Prints the duplicate groups the catalogue_duplicates step would merge (strong: same normalized name, abbreviation pair or code) and the radiology groups
 * it only reports (weak: same modality + body part + contrast). Reads the catalogue files shipped in the repo (seed-data/*.json and the completion seed); nothing is written.
 *   npx ts-node --transpile-only src/scripts/catalogue-duplicate-scan.ts
 * The production dry run (tools/ops/tasks/90-catalogue-apply.sh) prints the same groups from the database.
 */
import * as fs from 'fs';
import * as path from 'path';
import { duplicateGroups, nameAr, nameEn, type CatalogDoc } from '../modules/catalogs/catalog-dedupe';
import { weakRadiologyGroups } from '../modules/catalogs/catalogue-duplicates';

const SEED = path.join(__dirname, '../modules/catalogs/seed-data');
const read = (f: string): any => JSON.parse(fs.readFileSync(path.join(SEED, f), 'utf8'));
const rows = (v: any): CatalogDoc[] => (Array.isArray(v) ? v : []);

export function seedCatalogues(): Record<'lab' | 'radiology' | 'nursing', CatalogDoc[]> {
  const completion = read('catalogue-completion.2026-10-29.json');
  return {
    lab: [...rows(read('labs.json')), ...rows(completion.labs)],
    radiology: [...rows(read('radiology.json')), ...rows(completion.radiology)],
    nursing: [...rows(read('nursing.json')), ...rows(completion.nursing)],
  };
}

const label = (d: CatalogDoc) => `${String(d.short_code ?? d.code ?? d.test_code ?? d.id ?? '?')}  ${nameAr(d)} | ${nameEn(d)}`;

if (require.main === module) {
  const cat = seedCatalogues();
  for (const v of ['lab', 'radiology', 'nursing'] as const) {
    const strong = duplicateGroups(cat[v], { byPackage: v === 'lab' });
    console.log(`\n== ${v}: ${cat[v].length} rows, ${strong.length} strong group(s)`);
    strong.forEach((g, i) => { console.log(`  #${i + 1}`); g.forEach((d) => console.log(`     ${label(d)}`)); });
    if (v === 'radiology') {
      const weak = weakRadiologyGroups(cat[v], strong);
      console.log(`  -- weak (same modality + body part + contrast, different names; reported, NOT merged): ${weak.length} group(s)`);
      weak.forEach((g, i) => { console.log(`  ~${i + 1}`); g.forEach((d) => console.log(`     ${label(d)}`)); });
    }
  }
}
