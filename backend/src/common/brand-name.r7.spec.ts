// R7 (owner): the brand is نبض بلس / Nabd+. Old names ("Nabdah Plus", "نبضة بلس",
// "Nabd+ Plus") were still in the password-reset e-mail, the OTP SMS, lab and
// order PDFs, provider-app terms, admin titles and website meta descriptions.
// Seeds, tests and the SMS sender id (registered with the SMS provider) are out of scope.
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOTS = ['src', '../patient-web/app', '../provider-app/src', '../admin/src', '../patient-app/app', '../patient-app/src'].map((p) => join(__dirname, '../..', p));
const OLD = /Nabdah Plus|نبضة بلس|Nabd\+ Plus/;

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.(spec|test)\.tsx?$/.test(name) && !/seed/i.test(p)) out.push(p);
  }
  return out;
}

describe('brand name in shipping code (R7)', () => {
  it('no old brand name remains', () => {
    const hits = ROOTS.flatMap((r) => files(r)).filter((f) => OLD.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});
