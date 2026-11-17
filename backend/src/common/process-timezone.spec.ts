import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The code reads local time in several places (`getHours()`, `getDay()`, `setHours()`): notification quiet hours, engagement nudges, peak-hour surge, the provider weekly slots, the doctor and
 * service-catalog schedules. Opening hours and quiet hours are Riyadh clock time (UTC+3, no daylight saving), but a container without `TZ` runs in UTC, so each of them was 3 hours off
 * (lead decision 2026-11-17, found while moving the lab / radiology / home-care slots to Riyadh time in #2725). The backend and the worker therefore run with TZ=Asia/Riyadh.
 */
describe('the backend and worker containers run in Riyadh time', () => {
  const compose = readFileSync(join(__dirname, '../../../deploy/docker-compose.production.yml'), 'utf8');
  const serviceBlock = (name: string) => {
    const m = compose.match(new RegExp(`\\n  ${name}:\\n([\\s\\S]*?)(?=\\n  [a-z][a-z-]*:\\n)`));
    return m ? m[1] : '';
  };

  it.each(['backend', 'worker'])('%s sets TZ: Asia/Riyadh', (name) => {
    const block = serviceBlock(name);
    expect(block).toContain('container_name: nabdah-' + name);
    expect(block).toMatch(/\n\s+TZ: Asia\/Riyadh/);
  });

  it('Asia/Riyadh is UTC+3 all year in this runtime (no daylight saving): the assumption behind the fixed offset used by the slot code', () => {
    for (const month of [0, 6]) {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', hour: '2-digit', hour12: false }).formatToParts(new Date(Date.UTC(2030, month, 15, 12, 0, 0)));
      expect(parts.find((p) => p.type === 'hour')?.value).toBe('15');
    }
  });
});

/**
 * `TZ=Asia/Riyadh` (above) also changes what every `@Cron` means: without a `timeZone` option a cron runs in the process's local time. All the schedules we measured and designed (the serial group
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
