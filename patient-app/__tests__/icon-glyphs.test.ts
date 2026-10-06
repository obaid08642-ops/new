import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import glyphMap from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json';
import { resolveIconName } from '../src/components/Icon';

// Icon.tsx reads theme/language from the app context; the resolver under test does not use it.
jest.mock('../src/context/AppContext', () => ({ useApp: () => ({}) }));

// A name with no MaterialCommunityIcons glyph renders as a "?" box. Every literal name passed to <Icon name>
// (or to a card's icon= prop) in the app must resolve to a real glyph.
const ROOT = join(__dirname, '..');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return /node_modules|__tests__/.test(p) ? [] : files(p);
    return p.endsWith('.tsx') ? [p] : [];
  });
}

function literalNames(): Map<string, string> {
  const out = new Map<string, string>();
  for (const f of [...files(join(ROOT, 'src')), ...files(join(ROOT, 'app'))]) {
    const s = readFileSync(f, 'utf8');
    if (!/import \{[^}]*\bIcon\b[^}]*\} from '[^']*components\/Icon'|import Icon from/.test(s)) continue;
    for (const m of s.matchAll(/<Icon\b[^>]*?\bname=(?:"([^"]+)"|\{'([^']+)'\})/g)) out.set(m[1] || m[2], f);
  }
  return out;
}

describe('Icon glyphs', () => {
  it('every literal icon name in the app has a MaterialCommunityIcons glyph', () => {
    const names = literalNames();
    // a floor that proves the scan finds names at all; it falls as screens move to the fill icon set (Batch 3 removed 18 files' worth)
    expect(names.size).toBeGreaterThan(50);
    const missing = [...names].filter(([n]) => !(resolveIconName(n) in glyphMap)).map(([n, f]) => `${n} (${f.replace(ROOT, '')})`);
    expect(missing).toEqual([]);
  });

  it('the home service cards resolve (pharmacy was a "?" box)', () => {
    for (const n of ['pharmacy', 'diagnostics', 'stethoscope', 'nurse', 'forgot-password']) {
      expect(resolveIconName(n) in glyphMap).toBe(true);
    }
  });
});
