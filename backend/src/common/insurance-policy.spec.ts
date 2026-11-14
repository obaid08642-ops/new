import { hasInsuranceContract, policyClass, policyCompanyKeys } from './insurance-policy';

describe('insurance policy and contract reading (D-30)', () => {
  it('collects every company identifier the two save endpoints use', () => {
    expect(policyCompanyKeys({ company_id: 'u1', company_code: 'bupa', provider: 'بوبا' })).toEqual(['u1', 'bupa', 'بوبا']);
    expect(policyCompanyKeys({ provider: 'bupa' })).toEqual(['bupa']);
    expect(policyCompanyKeys({ company_id: ' ', provider: 42 })).toEqual([]);
    expect(policyCompanyKeys(null)).toEqual([]);
  });

  it('reads the class from `class` or `plan_class`', () => {
    expect(policyClass({ class: 'A' })).toBe('A');
    expect(policyClass({ plan_class: 'B' })).toBe('B');
    expect(policyClass({})).toBe('');
  });

  it('matches only an active contract naming the company AND the class', () => {
    const contracts = [{ company_id: 'bupa', classes: ['A', 'B'], active: true }, { company_id: 'tawuniya', classes: ['A'], active: false }, 'medgulf'];
    expect(hasInsuranceContract(contracts, ['bupa'], 'B')).toBe(true);
    expect(hasInsuranceContract(contracts, ['u1', 'bupa'], 'A')).toBe(true);
    expect(hasInsuranceContract(contracts, ['bupa'], 'C')).toBe(false);
    expect(hasInsuranceContract(contracts, ['tawuniya'], 'A')).toBe(false);
    expect(hasInsuranceContract(contracts, ['medgulf'], 'A')).toBe(false);
    expect(hasInsuranceContract(contracts, ['bupa'], '')).toBe(false);
    expect(hasInsuranceContract(undefined, ['bupa'], 'A')).toBe(false);
  });
});
