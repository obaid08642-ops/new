/**
 * 15.3: optimistic updates are for cart, wishlist, reminders, mark-as-read and likes. They are NEVER used for payment,
 * booking, prescription or emergency, which show "processing" until the server confirms. Any file under those areas that
 * imports the optimistic helper fails here.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const FORBIDDEN_AREA = /(payment|checkout|booking|book[-_.]|prescription|\brx\b|emergency|sos)/i;
const IMPORTS_OPTIMISTIC = /from\s+['"][^'"]*utils\/optimistic['"]/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(name) && !/\.test\./.test(name)) out.push(full);
  }
  return out;
}

describe('15.3 optimistic updates never reach money, bookings, prescriptions or emergencies', () => {
  const files = [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'src'))];

  it('scans a real set of files', () => {
    expect(files.length).toBeGreaterThan(300);
  });

  it('no payment, checkout, booking, prescription or emergency file imports the optimistic helper', () => {
    const offenders = files
      .filter((f) => FORBIDDEN_AREA.test(path.relative(ROOT, f)) && IMPORTS_OPTIMISTIC.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it('the helper is used where it is allowed', () => {
    const users = files.filter((f) => IMPORTS_OPTIMISTIC.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(ROOT, f));
    expect(users.sort()).toEqual(expect.arrayContaining(['app/notifications/index.tsx', 'app/pharmacy/product-detail.tsx', 'app/pharmacy/wishlist.tsx']));
  });
});
