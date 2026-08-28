import fs from 'node:fs';
import path from 'node:path';

describe('Patient unified insurance catalog contract', () => {
  const root = path.resolve(__dirname, '../..');
  const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

  const consultations = read('app/(tabs)/consultations/index.tsx');
  const bookingConfirmation = read('app/consultations/booking-confirm.tsx');
  const insuranceUpload = read('app/diagnostics/insurance-upload.tsx');
  const profileInsurance = read('app/profile/insurance.tsx');
  const addPolicy = read('app/insurance/add-policy.tsx');

  it('uses the Backend catalog and company-specific networks in all company-selection flows', () => {
    for (const source of [consultations, bookingConfirmation, insuranceUpload, profileInsurance, addPolicy]) {
      expect(source).toMatch(/["']\/insurance\/companies["']/);
    }
    expect(consultations).toContain('`/insurance/companies/${insCompany}/networks`');
    expect(insuranceUpload).toContain('`/insurance/companies/${selCompany}/networks`');
    expect(profileInsurance).toContain('`/insurance/companies/${c.id || c.code}/networks`');
  });

  it('does not ship a static company or plan fallback in operational Patient screens', () => {
    for (const source of [consultations, bookingConfirmation, insuranceUpload, profileInsurance, addPolicy]) {
      expect(source).not.toContain('INSURANCE_COMPANIES_FULL');
      expect(source).not.toContain('COVERAGE_CLASSES');
      expect(source).not.toContain('saudiInsurances');
    }
    expect(consultations).not.toContain("'بوبا العربية (Bupa)'");
    expect(consultations).not.toContain("'التعاونية (Tawuniya)'");
    expect(consultations).not.toContain("'ميدغلف (Medgulf)'");
  });

  it('fails closed when the catalog cannot be loaded instead of substituting stale data', () => {
    expect(consultations).toContain('setInsuranceCatalogUnavailable(true)');
    expect(insuranceUpload).toContain('setInsuranceCatalogUnavailable(true)');
    expect(bookingConfirmation).toContain('insuranceCatalogUnavailable');
  });
});
