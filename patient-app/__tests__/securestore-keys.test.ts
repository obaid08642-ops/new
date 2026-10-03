/**
 * Q71: expo-secure-store only accepts keys matching /^[\w.-]+$/. A key with '@' made every native
 * SecureStore.setItemAsync throw (the errors were swallowed), so the session token was never saved on
 * Android/iOS and every signed-in request answered 401. This test reads every SecureStore call in the app
 * and checks the key it uses (string literals and STORAGE_KEYS.* constants).
 */
import * as fs from 'fs';
import * as path from 'path';
import { STORAGE_KEYS } from '../src/constants';

const ROOT = path.resolve(__dirname, '..');
const VALID = /^[\w.-]+$/;

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' || e.name === '__tests__' ? [] : files(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
}

describe('SecureStore keys', () => {
  const calls: { file: string; key: string; value: string }[] = [];
  for (const f of [...files(path.join(ROOT, 'app')), ...files(path.join(ROOT, 'src'))]) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/SecureStore\.(?:setItemAsync|getItemAsync|deleteItemAsync)\(\s*([^,)]+)/g)) {
      const arg = m[1].trim();
      const lit = arg.match(/^['"`]([^'"`]*)['"`]$/);
      const konst = arg.match(/^STORAGE_KEYS\.([A-Z_]+)$/);
      if (lit) calls.push({ file: path.relative(ROOT, f), key: arg, value: lit[1] });
      else if (konst) calls.push({ file: path.relative(ROOT, f), key: arg, value: (STORAGE_KEYS as Record<string, string>)[konst[1]] });
    }
  }

  it('finds the auth token calls', () => {
    expect(calls.some((c) => c.key === 'STORAGE_KEYS.AUTH_TOKEN')).toBe(true);
  });

  it('uses only keys expo-secure-store accepts', () => {
    const bad = calls.filter((c) => !VALID.test(c.value || '')).map((c) => `${c.file}: ${c.key} = ${JSON.stringify(c.value)}`);
    expect(bad).toEqual([]);
  });
});
