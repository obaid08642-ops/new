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
