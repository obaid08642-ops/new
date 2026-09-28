import { matchInsuranceCompany, buildChiPolicyPayload } from './insurance-chi-contract';

const COMPANIES = [
  { id: 'c-1', code: 'bupa', name_ar: 'بوبا العربية', name_en: 'Bupa Arabia' },
  { id: 'c-2', code: 'tawuniya', name_ar: 'التعاونية', name_en: 'Tawuniya' },
];

describe('matchInsuranceCompany (LJ-04)', () => {
  it('matches by English name, Arabic name or code (case/space-insensitive)', () => {
    expect(matchInsuranceCompany(COMPANIES, 'bupa arabia')?.code).toBe('bupa');
    expect(matchInsuranceCompany(COMPANIES, ' بوبا العربية ')?.id).toBe('c-1');
    expect(matchInsuranceCompany(COMPANIES, 'TAWUNIYA')?.code).toBe('tawuniya');
  });

  it('returns null for an unknown company or empty directory', () => {
    expect(matchInsuranceCompany(COMPANIES, 'شركة وهمية')).toBeNull();
    expect(matchInsuranceCompany([], 'bupa')).toBeNull();
    expect(matchInsuranceCompany(null, 'bupa')).toBeNull();
  });
});

describe('buildChiPolicyPayload (LJ-04)', () => {
  it('maps a real company and policy number without sending verified', () => {
    const payload = buildChiPolicyPayload(COMPANIES[0], { company: 'Bupa Arabia', policy_number: 'POL-123', class: 'A', network: 'gold', expiry: '2027-01-01' });
    expect(payload).toMatchObject({ company_id: 'bupa', policy_number: 'POL-123', class: 'A', network: 'gold' });
    expect(payload).not.toHaveProperty('verified');
  });

  it('refuses to save without a real policy number or a matched company', () => {
    expect(buildChiPolicyPayload(COMPANIES[0], { policy_number: '' })).toBeNull();
    expect(buildChiPolicyPayload(null, { policy_number: 'POL-123' })).toBeNull();
  });
});
