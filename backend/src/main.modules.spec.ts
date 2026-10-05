// 82830cb: main.ts required @fastify/compress and @fastify/helmet when
// USE_FASTIFY=true, but neither package is a dependency, so that switch crashed
// the process at boot. Every package main.ts can load, on any path, must
// resolve from the installed dependencies.
import * as fs from 'fs';
import * as path from 'path';

describe('main.ts only loads installed packages (82830cb)', () => {
  const src = fs.readFileSync(path.join(__dirname, 'main.ts'), 'utf8');
  const specifiers = new Set<string>();
  for (const re of [/require\(\s*['"]([^'"]+)['"]\s*\)/g, /^import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/gm, /import\(\s*['"]([^'"]+)['"]\s*\)/g]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) if (!m[1].startsWith('.')) specifiers.add(m[1]);
  }

  it('finds the package loads', () => {
    expect(specifiers.size).toBeGreaterThan(5);
  });

  it('every package resolves', () => {
    const missing = [...specifiers].filter((s) => {
      try { require.resolve(s, { paths: [path.join(__dirname, '..')] }); return false; } catch { return true; }
    });
    expect(missing).toEqual([]);
  });

});
