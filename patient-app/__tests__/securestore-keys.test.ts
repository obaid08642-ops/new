/**
 * Q71: expo-secure-store only accepts keys matching /^[\w.-]+$/. A key with '@' made every native
 * SecureStore.setItemAsync throw (the errors were swallowed), so the session token was never saved on
 * Android/iOS and every signed-in request answered 401. This test reads every SecureStore call in the app,
 * and every call to the secure-storage wrappers (secureSet/secureGet/secureDelete, SecureStorageService),
 * and checks the key it uses (string literals and STORAGE_KEYS.* constants). A refresh-token key with '@'
 * made storeAuthSession() fail after saving the access token and then clear it again (Q71, second cause).
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
  for (const f of [...files(path.join(ROOT, 'app')), ...files(path.join(ROOT, 'src')), ...files(path.join(ROOT, 'utils'))]) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/(?:SecureStore\.(?:setItemAsync|getItemAsync|deleteItemAsync)|secure(?:Set|Get|Delete)|secureStorage\.(?:setItem|getItem|removeItem))\(\s*([^,)]+)/g)) {
      const arg = m[1].trim();
      const lit = arg.match(/^['"`]([^'"`]*)['"`]$/);
      const konst = arg.match(/^STORAGE_KEYS\.([A-Z_]+)$/);
      if (lit) calls.push({ file: path.relative(ROOT, f), key: arg, value: lit[1] });
      else if (konst) calls.push({ file: path.relative(ROOT, f), key: arg, value: (STORAGE_KEYS as Record<string, string>)[konst[1]] });
    }
  }

  it('finds the session token calls (direct and through the wrappers)', () => {
    expect(calls.some((c) => c.key === 'STORAGE_KEYS.AUTH_TOKEN')).toBe(true);
    expect(calls.some((c) => c.key === 'STORAGE_KEYS.REFRESH_TOKEN')).toBe(true);
  });

  it('uses only keys expo-secure-store accepts', () => {
    const bad = calls.filter((c) => !VALID.test(c.value || '')).map((c) => `${c.file}: ${c.key} = ${JSON.stringify(c.value)}`);
    expect(bad).toEqual([]);
  });

  it('keeps every session key valid (utils/api.ts also loops over them when signing out)', () => {
    for (const k of ['AUTH_TOKEN', 'REFRESH_TOKEN', 'USER_DATA'] as const) {
      expect([k, (STORAGE_KEYS as Record<string, string>)[k]]).toEqual([k, expect.stringMatching(VALID)]);
    }
  });
});
