// F2 (PRODUCT.md): Nabd+ does not approve claims or set coverage; the provider
// approves in its own system and the patient pays the copay. The insurance
// screens must show only what the server returns: no invented coverage
// percentages, annual limits, deductible, renewal date or member id, and they
// must call coverage-check with ids the server understands.
import fs from 'node:fs';
import path from 'node:path';

describe('insurance screens follow F2 and show only server data', () => {
  const root = path.resolve(__dirname, '../..');
  const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
  const hub = read('app/insurance/hub.tsx');
  const benefits = read('src/components/views/InsuranceBenefitsView.tsx');
  const coverage = read('app/insurance/coverage-check.tsx');
  const network = read('app/insurance/network-providers.tsx');
  const nurse = read('app/nursing/nurse-profile.tsx');

  it('has no hardcoded coverage, limits, deductible, renewal date or member id', () => {
    for (const src of [hub, benefits]) {
      expect(src).not.toMatch(/500000|M-000|شامل طبي|deductible:\s*\{|coverage:\s*\{\s*consultations|31 ديسمبر/);
    }
  });

  it('coverage-check sends a service type the server accepts and nothing it ignores', () => {
    expect(coverage).toContain("id:'lab'");
    expect(coverage).not.toContain("id:'labs'");
    expect(coverage).not.toContain('service_key');
    expect(coverage).not.toMatch(/copay_percent|requires_preauth/);
    expect(coverage).toContain('accepting_providers');
  });

  it('network providers filter by the insurer only (no network/class), nurse profile reads the real fields', () => {
    expect(network).not.toMatch(/insurance_network|insurance_class/);
    expect(nurse).not.toMatch(/insuranceData\?\.(provider|policy)\b/);
    expect(nurse).toContain('insuranceData.covered');
  });

  it('benefits view renders the per-service request summary with empty and error states', () => {
    expect(benefits).toMatch(/approved|partially_approved|rejected|pending/);
    expect(benefits).not.toMatch(/annualLimit|usedAmount/);
    expect(benefits).toContain('<ScreenState');
  });
});
