// ACCEPTANCE — D-38 legal texts live in the apps (owner decision 2026-10-08 item 36; Queue C D-38), app part.
// Written by the reviewer before the work; the implementing agent makes it pass and may not edit it.
// Run: npx jest -c jest.acceptance.config.js acceptance/d-38
//
// Required (source checks): the patient app has the four legal screens and each reads its text from
// `/legal/policy/<key>` with the user's language (keys: patient_terms, privacy_policy, refund_policy,
// telehealth_consent); no legal text is written inside a screen.
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(__dirname, '../..');
const KEYS = ['patient_terms', 'privacy_policy', 'refund_policy', 'telehealth_consent'];

function files(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (n === 'node_modules' || n.startsWith('.')) return [];
    return statSync(p).isDirectory() ? files(p) : /\.(t|j)sx?$/.test(n) ? [p] : [];
  });
}

describe('D-38 app: legal texts come from /legal/policy', () => {
  const sources = [...files(join(ROOT, 'app')), ...files(join(ROOT, 'src'))].map((p) => ({ p, s: readFileSync(p, 'utf8') }));

  it.each(KEYS)('%s is read from /legal/policy with the language', (key) => {
    const users = sources.filter(({ s }) => s.includes(key) && /\/legal\/policy\//.test(s));
    expect(users.map((u) => u.p)).not.toEqual([]);
    expect(users.some(({ s }) => /lang/.test(s))).toBe(true);
  });

  it('the terms and privacy screens hold no hard-coded legal text', () => {
    const screens = ['app/(auth)/terms.tsx', 'app/(auth)/privacy.tsx', 'app/settings/terms.tsx', 'app/settings/privacy.tsx'].map((p) => join(ROOT, p)).filter(existsSync);
    const offenders = screens.filter((p) => /\/legal\/policy\//.test(readFileSync(p, 'utf8')) === false);
    expect(offenders.map((p) => p.replace(ROOT + '/', ''))).toEqual([]);
  });
});
