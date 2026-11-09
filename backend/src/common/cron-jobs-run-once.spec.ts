import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * SY-01 "Nightly jobs run once and report" (docs/qa/SCENARIOS.md), as a contract over the whole backend source.
 *
 * Why a source contract and not a live journey: a nightly job fires at its own time of day, three of the five nightly jobs have no HTTP trigger, and the live gate runs one process.
 * What makes "exactly once per window across N api/worker processes" true is the Redis lease of `@ScheduledOnce` (proved with real Redis, 2 and 8 workers on one tick, in
 * scheduled-once.spec.ts) PLUS every scheduled method carrying it. This spec pins the second half for ALL `@Cron` / `@Interval` methods, so a new job cannot ship unleased,
 * and pins the five named nightly jobs (schedule, lease, and the place each one reports to).
 */
const SRC = join(__dirname, '..');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === 'node_modules' ? [] : walk(p);
    return /\.ts$/.test(n) && !/\.spec\.ts$/.test(n) ? [p] : [];
  });

interface Job { file: string; line: number; schedule: string; method: string; leased: boolean }
function jobs(): Job[] {
  const out: Job[] = [];
  for (const file of walk(SRC)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((l, i) => {
      const m = /^\s*@(Cron|Interval)\((.*)\)\s*(\/\/.*)?$/.exec(l);
      if (!m) return;
      // the decorator block of this method: following lines up to the method signature
      let j = i + 1; let leased = false;
      while (j < lines.length && !/^\s*(public |private |protected )?(async )?[A-Za-z_$][\w$]*\s*\(/.test(lines[j])) { if (/@ScheduledOnce\(/.test(lines[j])) leased = true; j++; }
      if (/@ScheduledOnce\(/.test(lines[i - 1] ?? '')) leased = true;
      const sig = /^\s*(?:public |private |protected )?(?:async )?([A-Za-z_$][\w$]*)\s*\(/.exec(lines[j] ?? '');
      out.push({ file: relative(SRC, file), line: i + 1, schedule: m[2].trim(), method: sig?.[1] ?? '?', leased });
    });
  }
  return out;
}

/**
 * Scheduled methods that are deliberately NOT behind the Redis lease (docs/platform/R3-cron-leases.md and R2), key `method@file`, with the reason. Each one has another way to run once
 * (or must run on every process); anything else MUST be @ScheduledOnce.
 */
const NOT_LEASED: Record<string, string> = {
  'beat@common/worker-heartbeat.service.ts': 'per process on purpose: each worker reports its own liveness',
  'scheduledKeepAlive@modules/mail/mail.module.ts': 'keeps this process\'s own SMTP connection warm',
  'sweep@modules/seo-search/seo-indexing.service.ts': 'has its own Mongo lease (indexnow_state)',
  'sweep@modules/durable-events/durable-events.processor.ts': 'R2: an atomic Mongo claim per event, safe with N workers',
  'daily@modules/finance-integrity/finance-integrity.service.ts': 'one run per (kind, day) through a unique insert in finance_integrity_runs',
};
const key = (j: Job) => `${j.method}@${j.file.replace(/\\/g, '/')}`;

describe('SY-01: every scheduled job is leased, so N workers run it once', () => {
  const all = jobs();

  it('finds the scheduled jobs (the scan itself works)', () => {
    expect(all.length).toBeGreaterThanOrEqual(35);
    expect(all.every((j) => j.method !== '?')).toBe(true);
  });

  it('every @Cron / @Interval method has @ScheduledOnce, except the documented exceptions', () => {
    const unleased = all.filter((j) => !j.leased).filter((j) => !NOT_LEASED[key(j)]);
    expect(unleased.map((j) => `${j.file}:${j.line} ${j.method}`)).toEqual([]);
  });

  it('the exceptions list names real, still-unleased jobs (no stale entry hides a gap)', () => {
    const unleasedKeys = new Set(all.filter((j) => !j.leased).map(key));
    for (const key of Object.keys(NOT_LEASED)) expect(unleasedKeys.has(key)).toBe(true);
  });

  /** The five named nightly jobs: schedule (UTC), method, how it runs once ('lease' = @ScheduledOnce, 'own' = a guard inside the job) and where it reports to. */
  const NIGHTLY: Array<{ file: string; schedule: string; method: string; once: 'lease' | { own: RegExp }; reports: Array<{ file: string; pattern: RegExp }> }> = [
    { file: 'modules/finance-integrity/finance-integrity.service.ts', schedule: "'40 1 * * *'", method: 'daily', once: { own: /runs\.insertOne\(\{ kind, day/ }, reports: [{ file: 'modules/finance-integrity/finance-integrity.controller.ts', pattern: /@Controller\('admin\/finance\/integrity'\)/ }] },
    { file: 'modules/admin/enterprise/audit-chain.verifier.ts', schedule: "'15 2 * * *'", method: 'nightly', once: 'lease', reports: [{ file: 'modules/admin/enterprise/audit-chain.verifier.ts', pattern: /chain/i }] },
    { file: 'modules/consistency/consistency.module.ts', schedule: "'17 3 * * *'", method: 'scheduledReconcile', once: 'lease', reports: [{ file: 'modules/consistency/consistency.module.ts', pattern: /@Get\('audit'\)/ }] },
    { file: 'modules/db-integrity/db-integrity.service.ts', schedule: "'20 3 * * *'", method: 'nightly', once: 'lease', reports: [{ file: 'modules/db-integrity/db-integrity.controller.ts', pattern: /@Controller\('admin\/db-integrity'\)/ }] },
    { file: 'modules/event-reliability/reconciliation.service.ts', schedule: "'17 4 * * *'", method: 'nightly', once: 'lease', reports: [{ file: 'modules/event-reliability/reconciliation.service.ts', pattern: /reconciliation_reports/ }] },
  ];

  for (const n of NIGHTLY) {
    it(`${n.method} @ ${n.schedule} in ${n.file}: scheduled, runs once and reports`, () => {
      const job = all.find((j) => j.file.replace(/\\/g, '/') === n.file && j.schedule.startsWith(n.schedule) && j.method === n.method);
      expect(job).toBeDefined();
      if (n.once === 'lease') expect(job!.leased).toBe(true);
      else { expect(job!.leased).toBe(false); expect(readFileSync(join(SRC, n.file), 'utf8')).toMatch(n.once.own); expect(NOT_LEASED[key(job!)]).toBeDefined(); }
      for (const r of n.reports) expect(readFileSync(join(SRC, r.file), 'utf8')).toMatch(r.pattern);
    });
  }

  it('no two nightly jobs share a minute (they are staggered, so the lease of one never hides another)', () => {
    const minutes = NIGHTLY.map((n) => n.schedule);
    expect(new Set(minutes).size).toBe(minutes.length);
  });
});
