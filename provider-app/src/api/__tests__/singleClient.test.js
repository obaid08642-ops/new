/**
 * P15.1 — "one API client per app".
 *
 * This is a structural guard: it fails if anyone reintroduces a second transport
 * (raw `fetch`, a new `axios.create`, or a second fetch-shaped wrapper) and bypasses
 * the timeout / retry / cancellation / catalog-error guarantees in
 * `src/api/client.ts`.
 *
 * Counts what the consolidation actually found, so the number is visible in the report.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../..');
const APP = path.resolve(SRC, '..');

/** Every first-party .ts/.tsx under src/, excluding tests. */
function firstPartySources() {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
        walk(full);
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push(full);
      }
    }
  };
  walk(path.join(SRC));
  return out;
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

/** `fetch(` not preceded by a `.` (so `client.fetch(` / `obj.fetch(` are ignored). */
function rawFetchCalls(source) {
  const matches = source.match(/(^|[^.\w$])fetch\s*\(/g);
  return matches ? matches.length : 0;
}

describe('P15.1 exactly one HTTP client', () => {
  const files = firstPartySources();

  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('no module calls the global fetch() for backend traffic', () => {
    const offenders = [];
    for (const file of files) {
      const count = rawFetchCalls(read(file));
      if (count > 0) offenders.push({ file: path.relative(APP, file), count });
    }
    expect(offenders).toEqual([]);
  });

  it('creates exactly one axios instance, in src/api/client.ts', () => {
    const creators = [];
    for (const file of files) {
      if (/axios\.create\s*\(/.test(read(file))) creators.push(path.relative(APP, file));
    }
    expect(creators).toEqual([path.join('src', 'api', 'client.ts')]);
  });

  it('exposes one fetch-shaped wrapper (src/utils/api.ts), delegating to that client', () => {
    const wrapper = read(path.join(SRC, 'utils', 'api.ts'));
    expect(wrapper).toMatch(/from '\.\.\/api\/client'/);
    const otherWrappers = files.filter((f) => {
      const rel = path.relative(SRC, f);
      if (rel === path.join('utils', 'api.ts') || rel === path.join('api', 'client.ts')) return false;
      // A function literally named apiFetch would be a second wrapper.
      return /\bfunction\s+apiFetch\b/.test(read(f));
    });
    expect(otherWrappers).toEqual([]);
  });

  it('every legacy call site now imports the shared client', () => {
    // The three call sites P15.1 migrated off raw fetch.
    expect(read(path.join(SRC, 'context', 'index.tsx'))).toMatch(/import apiClient from '\.\.\/api\/client'/);
    expect(read(path.join(SRC, 'screens', 'auth', 'AuthScreens.tsx'))).toMatch(/import client, \{ backendDetail \} from '\.\.\/\.\.\/api\/client'/);
    expect(read(path.join(SRC, 'screens', 'shared', 'shared', 'MedicalDrugIndexScreen.tsx'))).not.toMatch(/(^|[^.\w$])fetch\s*\(/);
  });

  it('the shared client enforces the documented guarantees', () => {
    const client = read(path.join(SRC, 'api', 'client.ts'));
    expect(client).toMatch(/DEFAULT: 15000/);
    expect(client).toMatch(/UPLOAD: 60000/);
    expect(client).toMatch(/AI: 45000/);
    expect(client).toMatch(/Retry-After|retry-after/i);
    expect(client).toMatch(/signal\?\.aborted/);
  });
});