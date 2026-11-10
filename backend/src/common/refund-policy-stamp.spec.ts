import { POLICY_SECTION, canonicalJson, policyStamp, stampAcceptance } from './refund-policy-stamp';
import { REFUND_POLICY_VERSION, refundPolicyAcceptance } from './refund-policy-acceptance';
import { DEFAULT_REFUND_POLICY } from '../modules/refund-policy/refund-policy.defaults';

const NOW = new Date('2026-11-10T10:00:00Z');
const base = () => refundPolicyAcceptance({ role: 'patient' }, true, NOW)!;
const stored = (patch: any = {}, updatedAt = '2026-11-10T08:00:00.000Z') => ({ value: { ...DEFAULT_REFUND_POLICY, ...patch }, updatedAt: new Date(updatedAt) });

describe('canonicalJson / policyStamp', () => {
  it('the same policy gives the same text whatever the key order', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [3, { y: 1, x: 2 }] } })).toBe(canonicalJson({ a: { c: [3, { x: 2, y: 1 }], d: 2 }, b: 1 }));
  });
  it('the default table: version is the constant, the hash is stable (64 hex), one per service section', () => {
    const a = policyStamp(null, 'consultation');
    expect(a).toMatchObject({ version: REFUND_POLICY_VERSION, service: 'consultation' });
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(policyStamp(null, 'consultation').hash).toBe(a.hash);
    expect(policyStamp(null, 'pharmacy').hash).not.toBe(a.hash);
  });
  it('the version is the time the stored policy was saved', () => {
    expect(policyStamp(stored(), 'lab').version).toBe('2026-11-10T08:00:00.000Z');
  });
  it('editing the consultation table changes the consultation hash only; lab, radiology and nursing follow home_visit, pharmacy its own', () => {
    const before = ['consultation', 'lab', 'radiology', 'nursing', 'pharmacy'].map((s) => policyStamp(stored(), s as any).hash);
    const edited = stored({ consultation: { ...DEFAULT_REFUND_POLICY.consultation, late_refund_percent: 30 } });
    const after = ['consultation', 'lab', 'radiology', 'nursing', 'pharmacy'].map((s) => policyStamp(edited, s as any).hash);
    expect(after[0]).not.toBe(before[0]);
    expect(after.slice(1)).toEqual(before.slice(1));
    const trip = stored({ home_visit: { ...DEFAULT_REFUND_POLICY.home_visit, trip_fee_sar: 55 } });
    expect(policyStamp(trip, 'lab').hash).not.toBe(before[1]);
    expect(policyStamp(trip, 'nursing').hash).not.toBe(before[3]);
    expect(policyStamp(trip, 'consultation').hash).toBe(before[0]);
    expect(POLICY_SECTION).toMatchObject({ lab: 'home_visit', radiology: 'home_visit', nursing: 'home_visit', pharmacy: 'pharmacy', consultation: 'consultation' });
  });
  it('a lab and a nursing hash differ even though they share a section (the service is part of what is hashed)', () => {
    expect(policyStamp(null, 'lab').hash).not.toBe(policyStamp(null, 'nursing').hash);
  });
});

describe('stampAcceptance', () => {
  const dbWith = (doc: any) => ({ collection: jest.fn(() => ({ findOne: jest.fn(async () => doc) })) });
  it('adds version, hash and service to the acceptance (time and the tick are kept)', async () => {
    const out: any = await stampAcceptance(dbWith(stored()), base(), 'lab');
    expect(out).toMatchObject({ accepted: true, at: NOW, version: '2026-11-10T08:00:00.000Z', service: 'lab' });
    expect(out.hash).toBe(policyStamp(stored(), 'lab').hash);
  });
  it('no stored policy: the default table, version is the constant', async () => {
    const out: any = await stampAcceptance(dbWith(null), base(), 'consultation');
    expect(out).toMatchObject({ version: REFUND_POLICY_VERSION, service: 'consultation' });
  });
  it('nothing to stamp (an exempt actor or a missing tick): undefined stays undefined', async () => {
    expect(await stampAcceptance(dbWith(stored()), undefined, 'lab')).toBeUndefined();
  });
  it('a read problem or no database never stops a booking: the plain acceptance comes back', async () => {
    const broken: any = { collection: () => { throw new Error('down'); } };
    expect(await stampAcceptance(broken, base(), 'lab')).toEqual(base());
    // no database to read: the default table is the policy in force, so it is stamped with that
    expect(await stampAcceptance(undefined, base(), 'lab')).toMatchObject({ accepted: true, version: REFUND_POLICY_VERSION, service: 'lab', hash: policyStamp(null, 'lab').hash });
  });
});
