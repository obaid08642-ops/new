import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The containers run in UTC on purpose: the nightly schedule we measured and designed (the serial group 'nightly-heavy', nothing in 02:45-04:15 UTC, the 03:00 UTC dump) is UTC, and a process-wide
 * `TZ=Asia/Riyadh` would hard-wire one country's time into every local-time read (lead 2026-11-17, multi-country plan). Opening hours, schedules, quiet hours and surge hours are market clock
 * time and are read through `common/market-time.ts` (zone from `MARKET_TIMEZONE`), so no code depends on the process zone.
 */
describe('the backend and worker containers stay in UTC', () => {
  const compose = readFileSync(join(__dirname, '../../../deploy/docker-compose.production.yml'), 'utf8');
  const serviceBlock = (name: string) => {
    const m = compose.match(new RegExp(`\\n  ${name}:\\n([\\s\\S]*?)(?=\\n  [a-z][a-z-]*:\\n)`));
    return m ? m[1] : '';
  };

  it.each(['backend', 'worker'])('%s sets no TZ', (name) => {
    const block = serviceBlock(name);
    expect(block).toContain('container_name: nabdah-' + name);
    expect(block).not.toMatch(/\n\s+TZ:/);
  });
});

/**
 * Without a `timeZone` option a `@Cron` runs in the process's local time. All the schedules we measured and designed (the serial group
 * 'nightly-heavy', nothing in 02:45-04:15 UTC, the 03:00 UTC dump) are UTC, so every `@Cron` is pinned to UTC explicitly and this test fails when a new one is added without a `timeZone`.
 */
describe('every @Cron is pinned to a time zone', () => {
  const { readdirSync, statSync } = require('fs') as typeof import('fs');
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((n: string) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') && !p.endsWith('.spec.ts') ? [p] : [];
  });
  const decorators = (src: string): string[] => {
    const out: string[] = [];
    let i = 0;
    for (;;) {
      const j = src.indexOf('@Cron(', i);
      if (j < 0) break;
      const lineStart = src.lastIndexOf('\n', j) + 1;
      const before = src.slice(lineStart, j).trim();
      let k = j + 6; let depth = 1;
      while (depth && k < src.length) { const c = src[k++]; if (c === '(') depth++; else if (c === ')') depth--; }
      if (!before.startsWith('*') && !before.startsWith('//')) out.push(src.slice(j, k));
      i = k;
    }
    return out;
  };

  it('no @Cron in backend/src lacks `timeZone`', () => {
    const missing: string[] = [];
    let total = 0;
    for (const f of walk(join(__dirname, '..'))) {
      for (const d of decorators(readFileSync(f, 'utf8'))) { total++; if (!/timeZone/.test(d)) missing.push(`${f.split('/src/')[1]}: ${d}`); }
    }
    expect(total).toBeGreaterThanOrEqual(38);
    expect(missing).toEqual([]);
  });

  it('the scan sees a cron without a time zone (the test itself works)', () => {
    expect(decorators("@Cron('1 * * * *')\n  run() {}").every((d) => /timeZone/.test(d))).toBe(false);
    expect(decorators("@Cron('1 * * * *', { timeZone: 'UTC' })").every((d) => /timeZone/.test(d))).toBe(true);
    expect(decorators(" *   @Cron('*/5 * * * *')")).toEqual([]);
  });
});
