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
  it('editing the consultation table changes the hash of consultation AND of lab, radiology and nursing (they follow its 2-hour table); pharmacy keeps its own', () => {
    const before = ['consultation', 'lab', 'radiology', 'nursing', 'pharmacy'].map((s) => policyStamp(stored(), s as any).hash);
    const edited = stored({ consultation: { ...DEFAULT_REFUND_POLICY.consultation, late_refund_percent: 30 } });
    const after = ['consultation', 'lab', 'radiology', 'nursing', 'pharmacy'].map((s) => policyStamp(edited, s as any).hash);
    for (const i of [0, 1, 2, 3]) expect(after[i]).not.toBe(before[i]);
    expect(after[4]).toBe(before[4]);
    // the home-visit rules (trip fee) change lab, radiology and nursing, not the consultation or pharmacy
    const trip = stored({ home_visit: { ...DEFAULT_REFUND_POLICY.home_visit, trip_fee_sar: 55 } });
    for (const [i, svc] of [[1, 'lab'], [2, 'radiology'], [3, 'nursing']] as const) expect(policyStamp(trip, svc).hash).not.toBe(before[i]);
    expect(policyStamp(trip, 'consultation').hash).toBe(before[0]);
    expect(policyStamp(trip, 'pharmacy').hash).toBe(before[4]);
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
  describe('hash echo (refund_policy_hash)', () => {
    it('the same hash the screen showed: stamped as usual', async () => {
      const shown = policyStamp(stored(), 'lab').hash;
      expect(await stampAcceptance(dbWith(stored()), base(), 'lab', shown)).toMatchObject({ hash: shown, service: 'lab' });
    });
    it('no hash sent (old client): allowed', async () => {
      expect(await stampAcceptance(dbWith(stored()), base(), 'lab', undefined)).toMatchObject({ service: 'lab' });
      expect(await stampAcceptance(dbWith(stored()), base(), 'lab', null)).toMatchObject({ service: 'lab' });
    });
    it('the table changed since the screen: 409 refund_policy_changed with the hash now in force', async () => {
      const shown = policyStamp(null, 'lab').hash; // the default table was on the screen
      const edited = stored({ home_visit: { ...(DEFAULT_REFUND_POLICY as any).home_visit, edited: 1 } });
      const err: any = await stampAcceptance(dbWith(edited), base(), 'lab', shown).catch((e) => e);
      expect(err.getStatus()).toBe(409);
      expect(err.getResponse()).toMatchObject({ code: 'refund_policy_changed', service: 'lab', hash: policyStamp(edited, 'lab').hash });
    });
    it('a hash of another service is a change too', async () => {
      await expect(stampAcceptance(dbWith(null), base(), 'nursing', policyStamp(null, 'lab').hash)).rejects.toMatchObject({ status: 409 });
    });
    it('a malformed hash is 400, never stored', async () => {
      await expect(stampAcceptance(dbWith(null), base(), 'lab', 'abc')).rejects.toMatchObject({ status: 400 });
      await expect(stampAcceptance(dbWith(null), base(), 'lab', 42)).rejects.toMatchObject({ status: 400 });
    });
    it('a read problem never becomes a 409', async () => {
      const broken: any = { collection: () => { throw new Error('down'); } };
      expect(await stampAcceptance(broken, base(), 'lab', 'a'.repeat(64))).toEqual(base());
    });
    it('nothing to stamp (exempt actor / missing tick): the hash is not checked', async () => {
      expect(await stampAcceptance(dbWith(stored()), undefined, 'lab', 'a'.repeat(64))).toBeUndefined();
    });
  });
});
