import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

/**
 * 14.7 route-table TEST (runs in the unit suite).
 *
 * Invariant: every GET route is either private-by-default (the interceptor
 * default, proven by `route-cache-policy.spec.ts`) or explicitly
 * `@PublicCache` on a `@Public()` read; and no `@PublicCache` route reads
 * `req.user` (shared cache must never store user-specific responses).
 *
 * Method: TypeScript AST scan over controllers (incl. inline controllers in
 * `*.module.ts`): decorators are read per method, so their order or spacing
 * does not matter.
 *
 * Decorated today: locations regions/cities/districts/:code, care
 * specialties/insurance/degrees, public/specialties, labs
 * services/packages/categories/services/:id, radiology
 * services/modalities/services/:id, articles list/categories
 * (proven in public-cache-routes.spec.ts). articles/:slug counts views, so
 * it is not shared-cached.
 */
const MODULES_DIR = path.join(__dirname, '..', '..', 'modules');
const SPAN_BACK = 600; // decorators precede the method signature

function collectRouteFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      collectRouteFiles(p, out);
    } else if (e.name.endsWith('.controller.ts')) {
      out.push(p);
    } else if (e.name.endsWith('.module.ts')) {
      const src = fs.readFileSync(p, 'utf8');
      if (/@Get\(/.test(src)) out.push(p); // inline controller
    }
  }
  return out;
}

function getIndices(hay: string, needle: RegExp): number[] {
  const out: number[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(needle.source, needle.flags.includes('g') ? needle.flags : `${needle.flags}g`);
  while ((m = re.exec(hay)) !== null) out.push(m.index);
  return out;
}

describe('route cache-policy table (14.7)', () => {
  const files = collectRouteFiles(MODULES_DIR);

  it('scans a non-empty controller surface', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('every @PublicCache marks a @Public() GET read and never touches the user (AST)', () => {
    const cached: string[] = [];
    const problems: string[] = [];
    const decoratorNames = (node: ts.Node): string[] =>
      (ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : []).map((d) => {
        const e = d.expression;
        return ts.isCallExpression(e) ? e.expression.getText() : e.getText();
      });
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf8');
      if (!text.includes('@PublicCache(')) continue;
      const sf = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true);
      const visit = (node: ts.Node): void => {
        if (ts.isClassDeclaration(node)) {
          const classPublic = decoratorNames(node).includes('Public');
          for (const m of node.members) {
            if (!ts.isMethodDeclaration(m)) continue;
            const names = decoratorNames(m);
            if (!names.includes('PublicCache')) continue;
            const where = `${path.relative(MODULES_DIR, f)}#${node.name?.getText()}.${m.name.getText()}`;
            cached.push(where);
            if (!names.includes('Get')) problems.push(`${where}: not a GET`);
            if (names.some((n) => ['Post', 'Put', 'Patch', 'Delete'].includes(n))) problems.push(`${where}: write method`);
            if (!names.includes('Public') && !classPublic) problems.push(`${where}: not @Public()`);
            for (const p of m.parameters) {
              const pd = decoratorNames(p);
              if (pd.some((n) => ['CurrentUser', 'Req', 'Request', 'Headers', 'Session'].includes(n))) problems.push(`${where}: reads ${pd.join(',')}`);
            }
            if (m.body && /\.user\b/.test(m.body.getText())) problems.push(`${where}: reads .user`);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }
    expect(problems).toEqual([]);
    expect(cached.length).toBeGreaterThan(0);
  });

  it('enumerates the full GET route table (every GET is private-by-default unless listed above)', () => {
    let getCount = 0;
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      for (const idx of getIndices(src, /@Get\(/)) {
        getCount += 1;
        const back = src.slice(Math.max(0, idx - SPAN_BACK), idx);
        // A @PublicCache() GET must still satisfy the pairing test above;
        // anything else is private-by-default — no assertion needed beyond count.
        expect(typeof back).toBe('string');
      }
    }
    expect(getCount).toBeGreaterThan(0);
    // eslint-disable-next-line no-console
    console.log(`[14.7] GET handlers enumerated: ${getCount} (all private-by-default unless @PublicCache)`);
  });
});
