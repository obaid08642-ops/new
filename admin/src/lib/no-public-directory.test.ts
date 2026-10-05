// Q24: the public directory belongs to the website, not the admin host.
// Pages-router routes are the files under src/pages, so this walks the real
// route tree and every page/component source for links into the directory.
// Run: node_modules/.bin/jiti src/lib/no-public-directory.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SRC = join(__dirname, '..');
const PAGES = join(SRC, 'pages');
const DIRECTORY_ROUTES = ['/articles', '/doctors', '/facilities', '/home-care-services', '/lab-services', '/medicines'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function routeOf(file: string): string {
  const rel = relative(PAGES, file).split(sep).join('/').replace(/\.(tsx|ts|jsx|js)$/, '');
  const route = '/' + rel.replace(/(^|\/)index$/, '');
  return route === '/' ? '/' : route.replace(/\/$/, '');
}

test('the admin app exposes no public directory route', () => {
  const routes = walk(PAGES).filter((f) => /\.(tsx|ts|jsx|js)$/.test(f) && !f.endsWith('.test.ts')).map(routeOf);
  const exposed = routes.filter((r) => DIRECTORY_ROUTES.some((d) => r === d || r.startsWith(d + '/')));
  assert.deepEqual(exposed, []);
});

test('no admin source links to a public directory route', () => {
  const offenders: string[] = [];
  for (const file of walk(SRC).filter((f) => /\.(tsx|ts)$/.test(f) && !f.endsWith('.test.ts'))) {
    const src = readFileSync(file, 'utf8');
    for (const d of DIRECTORY_ROUTES) {
      // A navigation target (href / dir / push / replace), not an apiFetch path such as '/medicines/admin/...'.
      const link = new RegExp(`(href|dir|push|replace)\\s*[:=(]\\s*\\{?\\s*['"\`]${d}(/|['"\`?#])`);
      if (link.test(src)) offenders.push(`${relative(SRC, file)} -> ${d}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test('the shared directory component is gone', () => {
  const left = walk(join(SRC, 'components')).filter((f) => /PublicDirectory/.test(f));
  assert.deepEqual(left, []);
});
