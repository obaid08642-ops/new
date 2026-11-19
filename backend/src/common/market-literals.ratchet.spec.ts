import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Ratchet (blueprint step 2): the Saudi literals live ONLY in `modules/markets/sa-market.seed.ts` and are read
 * through `common/market-defaults.ts`. Counts may only go down; lower the baseline when you remove more.
 * Seeds/scripts and specs are not counted. Pre-existing `Asia/Riyadh` / `+966` code that is genuinely Saudi
 * logic (phone canonicalisation, the fixed +3 h slot helper) is the remaining baseline.
 */
const SRC = join(__dirname, '..');
const ALLOWED = [/modules\/markets\//, /common\/market-defaults\.ts$/];
const BASELINE: Record<string, number> = { "'SAR'": 0, "'Asia/Riyadh'": 0, "'+966'": 0, "'997'": 0 };

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

describe('Saudi literals outside the market config', () => {
  const files = walk(SRC).filter((f) => !ALLOWED.some((a) => a.test(f)));
  for (const [lit, max] of Object.entries(BASELINE)) {
    it(`${lit} appears at most ${max} times`, () => {
      const hits: string[] = [];
      for (const f of files) {
        const txt = readFileSync(f, 'utf8');
        const dq = lit.replace(/'/g, '"');
        for (const [i, line] of txt.split('\n').entries()) if (line.includes(lit) || line.includes(dq)) hits.push(`${f.slice(SRC.length + 1)}:${i + 1}`);
      }
      expect(hits.length).toBeLessThanOrEqual(max);
      if (hits.length > max) throw new Error(hits.join('\n'));
    });
  }
});
