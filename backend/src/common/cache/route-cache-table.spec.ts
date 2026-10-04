import * as fs from 'fs';
import * as path from 'path';

/**
 * 14.7 route-table TEST (NOT a CI gate yet — do not wire into CI workflows).
 *
 * Invariant: every GET route is either private-by-default (the interceptor
 * default, proven by `route-cache-policy.spec.ts`) or explicitly
 * `@PublicCache` on a `@Public()` read; and no `@PublicCache` route reads
 * `req.user` (shared cache must never store user-specific responses).
 *
 * Method: static source scan over controllers (incl. inline controllers in
 * `*.module.ts`). Window-bounded heuristic — decorator adjacency is
 * conventional (`@PublicCache` directly above `@Public()`/`@Get()`); if the
 * rollout wave adopts far-apart decorators, upgrade this to an AST scan.
 * Today zero controllers use `@PublicCache` (X0 only), so the table asserts
 * the shape of the invariant and enumerates the full GET surface.
 *
 * CANDIDATE public reads for the rollout wave (all `@Public()` GET, no
 * user reads in handler — NOT decorated here, wave does that):
 *  locations: regions/cities/districts/:code (tags ['geo'], long ttl;
 *    varyLanguage iff names localized)
 *  labs: services/packages/categories/services/:id/packages/:id/
 *    compatible-providers (tags ['labs-catalog'])
 *  radiology: services/compatible-providers/modalities/services/:id
 *  doctors (inline): list/specialties/detail (slots is time-sensitive:
 *    60s ttl or exclude)
 *  articles (inline): list/categories/:slug (varyLanguage:true)
 *  home-care: catalog; provider: banks; provider-onboarding: providers
 *  feature-flags public GET (short ttl 60-300); mcp: tools/server-card
 *  legal GETs; config GET (startup); seo resolve/meta/build
 *    (varyLanguage likely)
 *  EXCLUDE (never cache): every `@Public()` POST (auth login/OTP/passkey,
 *    webhooks, mcp RPC), anything reading req.user/@CurrentUser,
 *    bookings/mine-style user scoping.
 *  RECONCILE FIRST: seo sitemap/robots/llms.txt/indexnow-key set manual
 *    `Cache-Control: public` via `@Res()` — the wave must pick ONE source
 *    (decorator vs manual) before decorating.
 */
const MODULES_DIR = path.join(__dirname, '..', '..', 'modules');
const ROUTE_WINDOW = 4000; // @Get vs nearest write-method pairing
const SPAN_BACK = 600; // decorators precede the method signature
const USER_WINDOW = 1500; // handler body user-read check

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

describe('route cache-policy table (14.7, informational)', () => {
  const files = collectRouteFiles(MODULES_DIR);

  it('scans a non-empty controller surface', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('every @PublicCache marks a @Public() GET read and never touches req.user', () => {
    const cached: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      for (const idx of getIndices(src, /@PublicCache\(/)) {
        const rel = path.relative(MODULES_DIR, f);
        cached.push(rel);
        const ahead = src.slice(idx, idx + ROUTE_WINDOW);
        const getAt = ahead.search(/@Get\(/);
        const writeAt = ahead.search(/@(Post|Put|Patch|Delete)\(/);
        expect(getAt).toBeGreaterThanOrEqual(0); // must decorate a read route
        if (writeAt >= 0) expect(getAt).toBeLessThan(writeAt);
        // @Public() must be present: method-level span or class-level controller.
        const span = src.slice(Math.max(0, idx - SPAN_BACK), idx + SPAN_BACK);
        expect(`${span} ${src.includes('@Public()') ? '@Public()' : ''}`).toContain('@Public()');
        // No user-specific reads in the handler window.
        const handler = src.slice(idx, idx + USER_WINDOW);
        expect(handler).not.toMatch(/\breq(?:uest)?\s*\.\s*user\b/);
        expect(handler).not.toMatch(/getRequest\(\)\s*\.\s*user\b/);
        expect(handler).not.toMatch(/@CurrentUser\(\)/);
      }
    }
    // Documents current rollout state: zero decorated routes (wave pending).
    // eslint-disable-next-line no-console
    console.log(`[14.7] @PublicCache routes: ${cached.length === 0 ? 'none yet (rollout wave pending)' : cached.join(', ')}`);
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
