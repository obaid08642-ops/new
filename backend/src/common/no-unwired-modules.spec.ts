// Review P13/P14: several "foundation" modules were added with no importer
// outside their own spec, so the behaviour they describe never ran. Each
// module listed here was either wired into the real request path or deleted.
// A listed file that exists must be imported by at least one non-spec file
// under src/.
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..');

// [review row, module path relative to src/ without extension]
const MODULES: Array<[string, string]> = [
  ['16be643', 'common/purge-bus'],
  ['cffbab5', 'common/shedding/load-shedding.guard'],
  ['cffbab5', 'common/shedding/shed-classifier'],
  ['b20ecd3', 'common/redis-roles'],
  ['b20ecd3', 'common/swr-cache'],
];

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) sourceFiles(p, out);
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

describe('no unwired foundation modules', () => {
  const files = sourceFiles(SRC);
  it.each(MODULES)('%s: %s is imported by real code or does not exist', (_row, mod) => {
    const target = path.join(SRC, `${mod}.ts`);
    if (!fs.existsSync(target)) return;
    const importers = files.filter((f) => {
      if (f === target) return false;
      const src = fs.readFileSync(f, 'utf8');
      const re = /from\s+['"](\.{1,2}\/[^'"]+)['"]/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        if (path.resolve(path.dirname(f), m[1]) === path.join(SRC, mod)) return true;
      }
      return false;
    });
    expect(importers.map((f) => path.relative(SRC, f))).not.toEqual([]);
  });
});
