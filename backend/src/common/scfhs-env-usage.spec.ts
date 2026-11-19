import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Owner decision 2026-11-17: no SCFHS integration; an admin verifies licences. The SCFHS variables may be read ONLY by the inert re-check and its helpers, so no health check, alert, ops route or
 * launch gate can start to expect SCFHS to be configured.
 */
describe('nothing but the inert SCFHS re-check reads the SCFHS environment', () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') && !p.endsWith('.spec.ts') ? [p] : [];
  });
  const ALLOWED = ['modules/provider/services/scfhs-license.service.ts', 'common/scfhs-license.ts'];

  it('only the SCFHS service files mention SCFHS_VERIFY_URL / SCFHS_API_KEY / SCFHS_RECHECK_GRACE_DAYS', () => {
    const readers = walk(join(__dirname, '..')).filter((f) => /SCFHS_(VERIFY_URL|API_KEY|RECHECK_GRACE_DAYS)/.test(readFileSync(f, 'utf8'))).map((f) => f.split('/src/')[1]).sort();
    expect(readers.every((f) => ALLOWED.includes(f))).toBe(true);
    expect(readers.length).toBeGreaterThan(0);
  });

  it('the daily re-check does nothing while the SCFHS API is not configured', async () => {
    const { ScfhsLicenseService } = await import('../modules/provider/services/scfhs-license.service');
    const saved = { u: process.env.SCFHS_VERIFY_URL, k: process.env.SCFHS_API_KEY };
    delete process.env.SCFHS_VERIFY_URL; delete process.env.SCFHS_API_KEY;
    try {
      const svc: any = Object.create(ScfhsLicenseService.prototype);
      svc.conn = { collection: () => { throw new Error('must not read the database when SCFHS is not configured'); } };
      await expect(svc.dailyRecheck()).resolves.toEqual({ checked: 0, hidden: 0 });
    } finally {
      if (saved.u !== undefined) process.env.SCFHS_VERIFY_URL = saved.u;
      if (saved.k !== undefined) process.env.SCFHS_API_KEY = saved.k;
    }
  });
});
