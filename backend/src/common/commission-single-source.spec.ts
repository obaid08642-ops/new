import * as fs from 'fs';
import * as path from 'path';
import { CommissionResolver } from '../modules/finance-engine/finance-engine.module';
import { FinanceCoreService } from '../modules/insurance-engine/insurance-engine.module';
import { DEFAULT_COMMISSIONS, DEFAULT_COMMISSION_PERCENT, commissionServiceTypeOf } from './commission-defaults';

/**
 * ONE source of commission numbers: `finance_config` read by CommissionResolver, with the defaults written once in
 * `common/commission-defaults.ts`. This spec fails when a second literal set (or a literal fallback percent) appears anywhere else.
 */
const SRC = path.join(__dirname, '..');
const DEFAULTS_FILE = path.join(__dirname, 'commission-defaults.ts');

function sources(dir = SRC, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') sources(p, out); }
    else if (p.endsWith('.ts') && !/\.(spec|test|e2e-spec)\.ts$/.test(p) && !p.endsWith('.d.ts') && p !== DEFAULTS_FILE) out.push(p);
  }
  return out;
}
const rel = (p: string) => path.relative(SRC, p);

describe('commission numbers have one source', () => {
  const files = sources();

  it('no literal fallback percent: `.percent ?? 10`, `vat_percent ?? 15`, `commission_rate: 10`, `default: 10` on a commission field', () => {
    const bad: string[] = [];
    const rules = [
      /\.(percent|commission_percent|vat_percent)\s*(\?\?|\|\|)\s*\(?\s*\d/,
      /\bcommission_rate\s*:\s*(?!1\b)\d/,
      /@Prop\(\{\s*default:\s*\d+\s*\}\)\s*commission_/,
      /\bvatPercent\s*=\s*\d/,
    ];
    for (const f of files) {
      fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
        if (rules.some((r) => r.test(line))) bad.push(`${rel(f)}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(bad).toEqual([]);
  });

  it('no second table of per-service commission numbers (two or more service keys with a number, in a file about commission)', () => {
    const key = /\b(pharmacy|doctor|lab|radiology|nursing|consultation|clinic|home_visit|home_care|physiotherapy)\s*:\s*(\{\s*percent\s*:\s*)?\d+(\.\d+)?\s*[,}]/g;
    const bad: string[] = [];
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf8');
      if (!/commission/i.test(text)) continue;
      const hits = text.match(key) ?? [];
      if (hits.length >= 2) bad.push(`${rel(f)}: ${hits.join(' ')}`);
    }
    expect(bad).toEqual([]);
  });

  it('the defaults module keeps the numbers the settlement used: 10 / 15 / 12 / 12 / 15, system default 10', () => {
    expect(Object.fromEntries(Object.entries(DEFAULT_COMMISSIONS.service_types).map(([k, v]) => [k, v.percent]))).toEqual({ pharmacy: 10, doctor: 15, lab: 12, radiology: 12, nursing: 15 });
    expect(DEFAULT_COMMISSION_PERCENT).toBe(10);
  });
});

describe('every reader asks CommissionResolver', () => {
  const conn = (cfg: any) => ({ collection: (n: string) => ({ findOne: async () => (n === 'finance_config' ? cfg : null) }) }) as any;

  it('the resolver: finance_config first, then the one system default', async () => {
    const c = conn({ service_types: { nursing: { percent: 17 } } });
    expect(await new CommissionResolver(c).resolve('nursing')).toMatchObject({ percent: 17, source: 'finance_config' });
    expect(await new CommissionResolver(c).resolve('lab')).toMatchObject({ percent: DEFAULT_COMMISSION_PERCENT, source: 'system_default' });
  });

  it('the insurance engine ledger rate follows finance_config, not its own table (nursing was 18%, consultation 15%)', async () => {
    const rules = { findOne: () => ({ lean: async () => null }), db: conn({ service_types: { nursing: { percent: 15 }, doctor: { percent: 15 } } }) };
    const svc = new FinanceCoreService({} as any, rules as any);
    expect(await svc.rateFor('nursing')).toBe(0.15);
    expect(await svc.rateFor('home_visit')).toBe(0.15);
    expect(await svc.rateFor('consultation')).toBe(0.15);
    expect(await svc.rateFor('pharmacy')).toBe(DEFAULT_COMMISSION_PERCENT / 100); // no pharmacy in this config: the system default
  });

  it('profile types and legacy names map to the settlement\'s service types', () => {
    expect(['doctor', 'clinic', 'hospital', 'consultation'].map(commissionServiceTypeOf)).toEqual(['doctor', 'doctor', 'doctor', 'doctor']);
    expect(['home_care', 'nursing', 'home_visit'].map(commissionServiceTypeOf)).toEqual(['nursing', 'nursing', 'nursing']);
    expect(['pharmacy', 'lab', 'radiology'].map(commissionServiceTypeOf)).toEqual(['pharmacy', 'lab', 'radiology']);
  });
});
