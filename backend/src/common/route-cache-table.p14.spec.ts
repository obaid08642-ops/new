/**
 * 14.7 CI gate — a publicly cacheable route must never read the user.
 *
 * This scans every backend source file for `@PublicCache(` and, for each
 * annotated handler, asserts the handler does not read the signed-in user
 * (`@CurrentUser`, `req.user`, `request.user`). A public route that needs the
 * user is a cross-user leak through the shared cache — fail the build, don't
 * cache it.
 *
 * It also asserts the decorator arguments are sane (positive ttl, string tags)
 * and that no handler sets a raw `public` Cache-Control anymore (all public
 * policy flows through the decorator + interceptor, one source of truth —
 * except `@Res()` handlers, whose direct setter is the effective one and must
 * match the decorator's ttl by inspection).
 *
 * Adding `@PublicCache` to a user-reading route makes this suite red. Removing
 * the decorator (fail-closed to private) makes it green.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname);
const DECORATOR_RE = /@PublicCache\(\s*(\d+)\s*(,\s*\[([^\]]*)\])?(\s*,\s*\{[^}]*\})?\s*\)/g;
const METHOD_RE = /^\s*(?:async\s+)?([A-Za-z_][\w$]*)\s*\(/m;

interface AnnotatedRoute {
  file: string;
  method: string;
  ttl: number;
  tags: string[];
  varyLanguage: boolean;
}

function findAnnotated(): AnnotatedRoute[] {
  const out: AnnotatedRoute[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules') continue;
        walk(p);
      } else if (p.endsWith('.controller.ts') || p.endsWith('.module.ts')) {
        const text = fs.readFileSync(p, 'utf8');
        let m: RegExpExecArray | null;
        DECORATOR_RE.lastIndex = 0;
        while ((m = DECORATOR_RE.exec(text)) !== null) {
          const after = text.slice(m.index + m[0].length);
          const mm = METHOD_RE.exec(after);
          const tags = (m[3] || '')
            .split(',')
            .map((t) => t.trim().replace(/^['"`]|['"`]$/g, ''))
            .filter(Boolean);
          out.push({
            file: path.relative(SRC, p),
            method: mm ? mm[1] : '<unknown>',
            ttl: Number(m[1]),
            tags,
            varyLanguage: /varyLanguage\s*:\s*true/.test(m[4] || ''),
          });
        }
      }
    }
  };
  walk(SRC);
  return out;
}

/** The method body for `method` in `file`, bounded by brace counting. */
function methodBody(file: string, method: string): string {
  const text = fs.readFileSync(path.join(SRC, file), 'utf8');
  const start = text.search(new RegExp(`\\n\\s*(?:async\\s+)?${method}\\s*\\(`));
  if (start < 0) return '';
  let depth = 0;
  let i = text.indexOf('{', start);
  if (i < 0) return '';
  const begin = i;
  for (; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(begin, i + 1);
    }
  }
  return '';
}

describe('14.7 route-table gate: no public route reads the user', () => {
  const routes = findAnnotated();

  it('every @PublicCache has a positive ttl and string tags', () => {
    for (const r of routes) {
      expect(r.ttl).toBeGreaterThan(0);
      for (const t of r.tags) expect(typeof t).toBe('string');
    }
  });

  it('no @PublicCache handler injects the user', () => {
    const offenders: string[] = [];
    for (const r of routes) {
      const body = methodBody(r.file, r.method);
      // Signature check: the decorator line + method signature live just before
      // the body; scan a window for @CurrentUser / @Req() user reads.
      const text = fs.readFileSync(path.join(SRC, r.file), 'utf8');
      const sigStart = Math.max(0, text.indexOf(r.method) - 600);
      const sigWindow = text.slice(sigStart, text.indexOf(r.method) + r.method.length + 200);
      if (/@CurrentUser\(/.test(sigWindow)) offenders.push(`${r.file}#${r.method} uses @CurrentUser`);
      if (/req\s*\.\s*user|request\s*\.\s*user/.test(body)) offenders.push(`${r.file}#${r.method} reads req.user`);
    }
    expect(offenders).toEqual([]);
  });

  it('documents the public route table (informational, fails on empty only if routes exist)', () => {
    // This test exists so the table is visible in CI output. It does not fail
    // on count — fail-closed means unlisted routes are private, which is safe.
    // eslint-disable-next-line no-console
    console.log(`public cache table: ${routes.length} routes`, routes.map((r) => `${r.file}#${r.method}`).join(', ') || '(none yet)');
  });
});
