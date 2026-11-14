/**
 * 2026-11-14: mongod was killed 703 times by its container memory limit, in bursts at the hours the nightly jobs and the 03:00 dump overlap. The heavy nightly jobs therefore
 *   - share ONE serial group ('nightly-heavy': one runs at a time across all processes, the others wait their turn),
 *   - start at least 30 minutes apart,
 *   - and stay out of the dump window (03:00 UTC backup.sh, with a margin: 02:45 to 04:15 UTC).
 * A source contract, like cron-jobs-run-once.spec.ts: the jobs fire at their own time of day, so a live journey cannot see this.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const HEAVY: Array<{ file: string; method: string }> = [
  { file: 'modules/finance-integrity/finance-integrity.service.ts', method: 'daily' },
  { file: 'modules/admin/enterprise/audit-chain.verifier.ts', method: 'nightly' },
  { file: 'modules/db-integrity/db-integrity.service.ts', method: 'nightly' },
  { file: 'modules/consistency/consistency.module.ts', method: 'scheduledReconcile' },
  { file: 'modules/event-reliability/reconciliation.service.ts', method: 'nightly' },
  { file: 'modules/risk/risk.service.ts', method: 'rescoreRecent' },
];
/** Light jobs at 03:00 (one deleteMany, a switch that is off): they join the serial group but are not moved. */
const LIGHT_AT_THREE: Array<{ file: string; method: string }> = [
  { file: 'modules/users/data-retention.service.ts', method: 'enforceDataRetention' },
  { file: 'modules/security/security.module.ts', method: 'run' },
];

/** The text of the decorators right above `async <method>(` */
function decoratorsOf(file: string, method: string): string {
  const src = readFileSync(join(ROOT, file), 'utf8');
  const at = src.search(new RegExp(`async ${method}\\(`));
  expect(at).toBeGreaterThan(0);
  return src.slice(Math.max(0, at - 700), at);
}
function minuteOfDay(file: string, method: string): number {
  const d = decoratorsOf(file, method);
  const all = [...d.matchAll(/@Cron\('(\d+) (\d+) \* \* \*'\)/g)];
  expect(all.length).toBeGreaterThan(0);
  const m = all[all.length - 1];       // the one nearest the method
  return Number(m[2]) * 60 + Number(m[1]);
}

describe('heavy nightly jobs: one at a time, 30 minutes apart, away from the dump', () => {
  it.each([...HEAVY, ...LIGHT_AT_THREE])('$file $method is in the serial group nightly-heavy', ({ file, method }) => {
    const d = decoratorsOf(file, method);
    const inDecorator = /serial: 'nightly-heavy'/.test(d);
    const direct = /runSerialized\('nightly-heavy'/.test(readFileSync(join(ROOT, file), 'utf8'));
    expect(inDecorator || direct).toBe(true);
  });

  it('the heavy jobs start at least 30 minutes apart', () => {
    const at = HEAVY.map((j) => ({ ...j, t: minuteOfDay(j.file, j.method) })).sort((a, b) => a.t - b.t);
    for (let i = 1; i < at.length; i += 1) expect(at[i].t - at[i - 1].t).toBeGreaterThanOrEqual(30);
  });

  it('none of the heavy jobs starts inside the dump window (02:45 to 04:15 UTC)', () => {
    for (const j of HEAVY) {
      const t = minuteOfDay(j.file, j.method);
      expect(t < 2 * 60 + 45 || t > 4 * 60 + 15).toBe(true);
    }
  });
});
