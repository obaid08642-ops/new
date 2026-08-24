import { isServerPrescriptionId } from './prescription-id';

describe('isServerPrescriptionId', () => {
  it('accepts UUID prescription IDs only', () => {
    expect(isServerPrescriptionId('11111111-1111-4111-8111-111111111111')).toBe(true);
    expect(isServerPrescriptionId('file:///data/user/0/prescription.jpg')).toBe(false);
    expect(isServerPrescriptionId('https://example.test/prescription.jpg')).toBe(false);
    expect(isServerPrescriptionId('')).toBe(false);
  });
});
