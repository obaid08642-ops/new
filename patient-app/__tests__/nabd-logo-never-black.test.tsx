import fs from 'fs';
import path from 'path';

// Owner decision 2026-10-25: the Noon Dot is never black. Allowed: coral bowl and dot ('brand') or the white mark ('onBrand') on a coral tile.
const ROOT = path.join(__dirname, '..');
function sources(dir: string): string[] {
  return fs.readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name === '__tests__') return [];
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) return sources(p);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

describe('NabdLogo is never black', () => {
  it('only has the brand and onBrand variants', () => {
    const source = fs.readFileSync(path.join(ROOT, 'src/components/NabdLogo.tsx'), 'utf8');
    expect(source).toContain("export type NabdLogoVariant = 'brand' | 'onBrand';");
    expect(source).not.toMatch(/text\.primary|onInverse/);
  });
  it('no screen passes the removed text or ink variants', () => {
    const offenders = [...sources(path.join(ROOT, 'app')), ...sources(path.join(ROOT, 'src'))].filter((file) =>
      /<NabdLogo[^>]*variant=(["'{]+)(text|ink)/.test(fs.readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
