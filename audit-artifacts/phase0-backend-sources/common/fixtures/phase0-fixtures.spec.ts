import { phase0Fixtures } from './phase0-fixtures';

describe('Phase 0 synthetic fixtures', () => {
  it('contains isolated synthetic actors and service fixtures only', () => {
    expect(phase0Fixtures.patients.owner.id).not.toBe(phase0Fixtures.patients.stranger.id);
    expect(phase0Fixtures.providers.primary.id).not.toBe(phase0Fixtures.providers.stranger.id);
    expect(phase0Fixtures.facilities.pharmacy.kind).toBe('pharmacy');
    expect(phase0Fixtures.facilities.lab.kind).toBe('lab');
    expect(phase0Fixtures.facilities.nursing.kind).toBe('nursing');
    expect(phase0Fixtures.fakePsp).toEqual({ success: 'authorized', pending: 'pending', failure: 'failed' });
    expect(phase0Fixtures.patients.owner.email).toMatch(/@example\.test$/);
  });

  it('is immutable at the top level', () => {
    expect(Object.isFrozen(phase0Fixtures)).toBe(true);
    expect(Object.isFrozen(phase0Fixtures.patients)).toBe(true);
    expect(Object.isFrozen(phase0Fixtures.catalog)).toBe(true);
  });
});
