import { readFileSync } from 'fs';
import { join } from 'path';

// The root layout renders nothing until every font has loaded, so the icon font is on the critical path of
// the first screen. It must stay the static default instance (tools/perf/instance_icon_font.py), not the
// 15 MB variable file: same glyphs and ligatures, ~1.8 MB.
const font = readFileSync(join(__dirname, '../assets/fonts/MaterialSymbolsRounded.ttf'));

function tables(buf: Buffer): string[] {
  const count = buf.readUInt16BE(4);
  return Array.from({ length: count }, (_, i) => buf.toString('latin1', 12 + i * 16, 16 + i * 16));
}

describe('MaterialSymbolsRounded icon font', () => {
  it('is a static instance (no variation tables)', () => {
    const t = tables(font);
    expect(t).not.toContain('fvar');
    expect(t).not.toContain('gvar');
  });

  it('keeps the ligature table, so icon names still resolve to glyphs', () => {
    expect(tables(font)).toContain('GSUB');
  });

  it('stays within the 2.5 MB budget', () => {
    expect(font.length).toBeLessThan(2.5 * 1024 * 1024);
  });
});
