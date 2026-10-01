import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { Typography } from '../../theme';

const APP = join(__dirname, '..', '..', '..');
const layout = readFileSync(join(APP, 'app/_layout.tsx'), 'utf8');

/**
 * 12.A5 — the app shipped six embedded Cairo weights from a design system that
 * predates the owner's brand. This test exists because the replacement almost
 * shipped broken: the call sites were renamed to `ReadexPro-400` while the
 * font registry was keyed `ReadexPro400`, and nothing in the toolchain noticed.
 * A fontFamily that does not match a registered family renders in a system
 * font with no error anywhere.
 */
describe('patient-app typography is the owner face, and it is actually registered', () => {
  const registered = new Set(
    [...layout.matchAll(/'([A-Za-z0-9-]+)':\s*require\(/g)].map((m) => m[1]),
  );

  it('registers the A5 faces and no longer ships Cairo', () => {
    for (const face of ['ReadexPro-400', 'ReadexPro-500', 'ReadexPro-700']) {
      expect(registered.has(face)).toBe(true);
    }
    // The word "Cairo" survives in the comment that explains WHY it is gone, so
    // the assertion is on the code, not the prose: no Cairo family is registered.
    const code = layout.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toContain('Cairo');
    for (const font of ['Cairo-Regular.ttf', 'Cairo-Bold.ttf', 'Cairo-Black.ttf']) {
      expect(existsSync(join(APP, 'assets/fonts', font))).toBe(false);
    }
  });

  it('every family the type scale asks for is a registered family', () => {
    const asked = new Set<string>();
    const collect = (v: unknown) => {
      if (v && typeof v === 'object') {
        const f = (v as { fontFamily?: string }).fontFamily;
        if (typeof f === 'string') asked.add(f);
        Object.values(v).forEach(collect);
      }
    };
    collect(Typography);
    expect(asked.size).toBeGreaterThan(0);
    // Collected then asserted once: this is Jest, whose expect() takes no message.
    // Listing every offender in one failure is the point — a scale that asks for
    // four unregistered families is one bug, not four.
    const missing = [...asked].filter((f) => !registered.has(f));
    expect(missing).toEqual([]);
  });

  it('ships the font binaries it registers', () => {
    const required = [...layout.matchAll(/require\('\.\.\/assets\/fonts\/([^']+)'\)/g)].map((m) => m[1]);
    expect(required.length).toBeGreaterThan(0);
    const missing = required.filter((f) => !existsSync(join(APP, 'assets/fonts', f)));
    expect(missing).toEqual([]);
    // A 0-byte or truncated download would load as a silently broken font.
    const tiny = required.filter((f) => statSync(join(APP, 'assets/fonts', f)).size <= 1000);
    expect(tiny).toEqual([]);
  });
});
