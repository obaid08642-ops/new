import { addProduct, newReport, reportLines } from './ingredient-dry-run';

const TABLE = { paracetamol: 'paracetamol' };

describe('ingredient dry run report (read-only counts)', () => {
  const docs = [
    { active_ingredient: 'Paracetamol 500 mg', category: 'medications', strength: '500mg' },
    { active_ingredient: 'Zzzfoo 10 mg', category: 'medications' },
    { active_ingredient: 'Zzzfoo 20 mg', category: 'skincare' },
    { active_ingredient: '', category: 'medications' },
    { active_ingredient: '', generic_name: 'Zzzbar', category: 'medications' },
    { active_ingredient: 'Keep out of reach of children. Store at 25 C. '.repeat(5), category: 'skincare' },
    { category: 'skincare' },
  ];
  const run = (map: Record<string, string>) => { const r = newReport(); for (const d of docs) addProduct(r, d, map); return r; };

  it('counts statuses, strengths and the spellings the table does not map', () => {
    const r = run(TABLE);
    expect(r.total).toBe(7);
    expect(r.byStatus).toEqual({ empty: 2, leaflet: 1, confident: 1, review: 3 });
    expect(r.withStrength).toBe(3);
    expect(r.fromGenericName).toBe(1);
    expect(r.unmapped.get('zzzfoo')).toBe(2);
    expect(r.unmapped.get('zzzbar')).toBe(1);
    expect(r.byCategory.get('skincare')).toEqual({ empty: 1, leaflet: 1, confident: 0, review: 1 });
  });

  it('prints counts and spellings only, never a product id or a document', () => {
    const lines = reportLines(run(TABLE), { approved: true, entries: 1 }, 10);
    expect(lines[0]).toBe('ingredient-dry-run: table approved=true entries=1');
    expect(lines[1]).toContain('TOTAL products=7 empty=2');
    expect(lines).toContain('ingredient-dry-run: spelling n=2 "zzzfoo"');
    expect(lines[lines.length - 1]).toBe('ingredient-dry-run: done (read-only)');
    expect(lines.join('\n')).not.toMatch(/_id|ObjectId|med_v/);
  });

  it('says so when the table is not approved', () => {
    const lines = reportLines(run({}), { approved: false, entries: 0 }, 5);
    expect(lines[0]).toContain('not approved: every ingredient text counts as review');
    expect(lines[1]).toContain('confident=0');
  });

  it('writes nothing: the script has no write call and no apply flag', () => {
    const src = require('fs').readFileSync(require.resolve('./ingredient-dry-run.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const bad of ['updateOne', 'updateMany', 'insertOne', 'insertMany', 'deleteOne', 'deleteMany', 'bulkWrite', 'replaceOne', 'findOneAndUpdate', '--apply', 'drop(']) expect(src).not.toContain(bad);
  });
});
