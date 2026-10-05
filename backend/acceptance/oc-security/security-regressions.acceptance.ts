// ACCEPTANCE — OpenCode review 2026-10-05 (REVIEW_OPENCODE_P15_P21.md, items D, F, chaos).
// Written by the reviewer; the implementing agent makes it pass and may not edit it.
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '../../src');
function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}
const sources = walk(SRC).map((f) => ({ f: path.relative(SRC, f), t: fs.readFileSync(f, 'utf8') }));

describe('no admin wallet backdoor (R6 / [REVIEW-FIX] b56c5718; re-added by 81955522)', () => {
  it('no controller declares wallet credit/debit/balance routes', () => {
    const hits = sources.filter(({ t }) => /@(Post|Get|Put|Patch)\(\s*['"`]\/?wallet\/(credit|debit|balance)/.test(t)).map(({ f }) => f);
    expect(hits).toEqual([]);
  });
  it('the R6 security spec still expects 404 for admin and super_admin', () => {
    const spec = fs.readFileSync(path.join(__dirname, '../../test/security/f01-wallet.e2e-spec.ts'), 'utf8');
    expect(spec).toMatch(/\/api\/v1\/wallet\/credit'[^\n]*\n?[^\n]*\.expect\(404\)/);
    expect(spec).toMatch(/\/api\/v1\/wallet\/debit'[^\n]*\n?[^\n]*\.expect\(404\)/);
  });
});

describe('chaos failure switches never act in production (c9f6368c)', () => {
  const prev = { ...process.env };
  afterEach(() => { process.env = { ...prev }; });
  it('CHAOS_FAIL_SMS / CHAOS_FAIL_LIVEKIT are ignored when NODE_ENV=production', async () => {
    const { isChaosFail } = await import('../../src/common/chaos-switches');
    (process.env as Record<string, string>).NODE_ENV = 'production';
    process.env.CHAOS_FAIL_SMS = '1';
    process.env.CHAOS_FAIL_LIVEKIT = '1';
    expect(isChaosFail('sms')).toBe(false);
    expect(isChaosFail('livekit')).toBe(false);
  });
});

describe('fake verification is never reported as real (f2b285e6 / 52dc3644)', () => {
  it('no source labels a mock/fallback verification result as an official source', () => {
    // A missing key or a provider error must fail closed (unverified / error), not
    // return an invented active licence or address tagged as the real API.
    const scfhs = sources.find(({ f }) => /scfhs-license\.service\.ts$/.test(f));
    if (scfhs) {
      expect(scfhs.t).not.toMatch(/mock|fake|synthetic/i);
    }
    const spl = sources.find(({ f }) => /spl.*\.service\.ts$/i.test(f));
    if (spl) {
      expect(spl.t).not.toMatch(/mock|fallbackAddress|sampleAddress|hard-?coded/i);
    }
  });
});

describe('audit trail and correlation id are back (6180cdf1 removed them)', () => {
  it('security-relevant events are written to the audit log again', () => {
    const writers = sources.filter(({ t }) => /@OnEvent\(/.test(t) && /audit/i.test(t));
    expect(writers.length).toBeGreaterThan(0);
  });
  it('the correlation middleware reads/echoes x-correlation-id and sets req.correlationId', () => {
    const mw = sources.find(({ f }) => f.endsWith('common/correlation.middleware.ts'));
    expect(mw).toBeTruthy();
    expect(mw!.t).toMatch(/x-correlation-id/i);
    expect(mw!.t).toMatch(/correlationId/);
  });
});
