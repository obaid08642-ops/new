/** R19: every outbound endpoint variable the backend reads must be in the residency inventory (docs/platform/R19-data-residency.md), or listed here as internal with a reason. */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const DOC = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'docs', 'platform', 'R19-data-residency.md'), 'utf8');
const ENDPOINT_VAR = /process\.env\.([A-Z0-9_]*(?:ENDPOINT|DSN|_URL|_URI|_HOST|_BASE|API_URL))\b/g;

// Variables that name this platform's own public addresses or internal tuning, not a third party that receives personal data.
const INTERNAL: Record<string, string> = {
  NABD_PUBLIC_URL: 'own public URL', API_PUBLIC_URL: 'own public URL', API_BASE_URL: 'own public URL', PUBLIC_APP_URL: 'own public URL', WEB_PUBLIC_URL: 'own public URL',
  PROVIDER_APP_BASE_URL: 'own public URL', MCP_PUBLIC_URL: 'own public URL', PAYMENT_RESULT_URL: 'own return page', NEXT_REVALIDATE_URL: 'own web container', RUNBOOK_BASE_URL: 'link to this repository',
  MONGO_URI: 'alias of MONGO_URL for scripts', MONGO_ANALYTICS_URI: 'second member of our own replica set (R17)',
};

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); } else if (p.endsWith('.ts') && !p.endsWith('.spec.ts') && !p.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

describe('data residency inventory', () => {
  const found = new Set<string>();
  for (const f of walk(SRC)) for (const m of fs.readFileSync(f, 'utf8').matchAll(ENDPOINT_VAR)) found.add(m[1]);

  it('finds the endpoint variables (guards the scan itself)', () => {
    expect(found.size).toBeGreaterThan(20);
    expect(found.has('MONGO_URL')).toBe(true);
    expect(found.has('S3_ENDPOINT')).toBe(true);
  });
  it('every endpoint variable is in the R19 document or listed as internal', () => {
    const missing = [...found].filter((v) => !INTERNAL[v] && !DOC.includes(v) && !(v === 'SES_SMTP_HOST' && DOC.includes('MAIL_*')));
    expect(missing).toEqual([]);
  });
  it('the internal list has no stale entries', () => {
    expect(Object.keys(INTERNAL).filter((v) => !found.has(v))).toEqual([]);
  });
  it('the document names the processors with a residency verdict', () => {
    for (const w of ['Cloudflare', 'Sentry', 'Moyasar', 'Nominatim', 'Infobip', 'AI assistants', 'Option', 'Migration plan']) expect(DOC.toLowerCase()).toContain(w.toLowerCase());
  });
});
