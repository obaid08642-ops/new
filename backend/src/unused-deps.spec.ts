// 82830cb (review round 2): the Fastify adapter path was removed from main.ts,
// so its runtime packages must not stay as production dependencies.
// A package listed here must either be absent from package.json or be
// imported/required by code under src/.
import * as fs from 'fs';
import * as path from 'path';

const PACKAGES = ['@nestjs/platform-fastify', '@fastify/cookie', 'fastify'];

function sources(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) sources(p, out);
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

describe('no unused Fastify runtime dependencies (82830cb)', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')) as { dependencies: Record<string, string> };
  const code = sources(__dirname).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  it.each(PACKAGES)('%s is used or not declared', (name) => {
    if (!(name in pkg.dependencies)) return;
    const used = new RegExp(`(from|require\\()\\s*['"]${name.replace(/[/.]/g, '\\$&')}(/[^'"]*)?['"]`).test(code);
    expect(used).toBe(true);
  });
});
