import { externalFetch } from '../../../common/external-call';
import { ScfhsLicenseService, parseScfhsAnswer } from './scfhs-license.service';

jest.mock('../../../common/external-call', () => ({ externalFetch: jest.fn() }));
const fetchMock = externalFetch as jest.Mock;

const answer = (body: unknown, ok = true) => ({ ok, json: async () => body });
const iso = (days: number) => new Date(Date.now() + days * 24 * 3600 * 1000).toISOString().slice(0, 10);

function build(profiles: any[] = []) {
  const updates: any[] = [];
  const col = {
    find: () => ({ limit: () => ({ toArray: async () => profiles }) }),
    updateOne: jest.fn(async (...a: any[]) => { updates.push(a); }),
    updateMany: jest.fn(async (...a: any[]) => { updates.push(a); }),
  };
  const events = { emit: jest.fn() };
  const svc = new ScfhsLicenseService({ collection: () => col } as any, events as any);
  return { svc, col, events };
}

describe('ScfhsLicenseService', () => {
  const env = { ...process.env };
  beforeEach(() => { fetchMock.mockReset(); process.env.SCFHS_VERIFY_URL = 'https://verify.example/licenses'; process.env.SCFHS_API_KEY = 'k'; });
  afterAll(() => { process.env = env; });

  describe('lookup', () => {
    it('sends the number with the key and maps a live licence', async () => {
      fetchMock.mockResolvedValue(answer({ found: true, status: 'active', expiry_date: iso(100), holder_name: 'Dr A' }));
      const r = await build().svc.lookup('12-345');
      expect(r).toMatchObject({ outcome: 'active', holder_name: 'Dr A' });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://verify.example/licenses?license_number=12-345');
      expect(init.headers.Authorization).toBe('Bearer k');
    });

    it.each([
      [{ found: true, status: 'expired', expiry_date: iso(-5) }, 'expired'],
      [{ found: true, status: 'suspended' }, 'suspended'],
      [{ found: true, status: 'revoked' }, 'suspended'],
      [{ found: false }, 'not_found'],
    ])('maps %j to %s', async (body, outcome) => {
      fetchMock.mockResolvedValue(answer(body));
      expect((await build().svc.lookup('1')).outcome).toBe(outcome);
    });

    it('is unavailable (never active) when unconfigured, on errors, non-200, unreadable or incomplete answers', async () => {
      delete process.env.SCFHS_VERIFY_URL;
      expect((await build().svc.lookup('1')).outcome).toBe('unavailable');
      expect(fetchMock).not.toHaveBeenCalled();
      process.env.SCFHS_VERIFY_URL = 'https://verify.example/licenses';
      fetchMock.mockRejectedValue(new Error('timeout'));
      expect((await build().svc.lookup('1')).outcome).toBe('unavailable');
      fetchMock.mockResolvedValue(answer({}, false));
      expect((await build().svc.lookup('1')).outcome).toBe('unavailable');
      fetchMock.mockResolvedValue(answer('<html>'));
      expect((await build().svc.lookup('1')).outcome).toBe('unavailable');
      fetchMock.mockResolvedValue(answer({ found: true, status: 'active' })); // no expiry date: cannot be confirmed unexpired
      expect((await build().svc.lookup('1')).outcome).toBe('unavailable');
      expect((await build().svc.lookup('')).outcome).toBe('unavailable');
    });
  });

  describe('decideFor', () => {
    it('a doctor with a live licence verifies; with SCFHS down it needs the manual check', async () => {
      const { svc } = build();
      fetchMock.mockResolvedValue(answer({ found: true, status: 'active', expiry_date: iso(100) }));
      expect((await svc.decideFor({ type: 'doctor', license_number: '1' })).decision.verified).toBe(true);
      fetchMock.mockRejectedValue(new Error('down'));
      expect((await svc.decideFor({ type: 'doctor', license_number: '1' })).decision.reason).toBe('scfhs_unavailable_manual_check_required');
      const manual = await svc.decideFor({ type: 'doctor', license_number: '1' }, { reference: 'R', expiry_date: iso(60) });
      expect(manual.decision).toMatchObject({ verified: true, source: 'admin_manual' });
    });

    it('a pharmacy form has no pharmacist number: only the manual check can verify, and the reason says so', async () => {
      const { svc } = build();
      const none = await svc.decideFor({ type: 'pharmacy', license_number: 'CR-1' });
      expect(none.decision.reason).toBe('scfhs_license_number_missing');
      expect(fetchMock).not.toHaveBeenCalled();
      expect((await svc.decideFor({ type: 'pharmacy' }, { reference: 'R', expiry_date: iso(60) })).decision.verified).toBe(true);
    });
  });

  describe('recordAtSubmission', () => {
    it('stores the answer for the reviewer and never verifies the provider', async () => {
      fetchMock.mockResolvedValue(answer({ found: true, status: 'active', expiry_date: iso(100) }));
      const { svc, col } = build();
      await svc.recordAtSubmission({ id: 'p1', type: 'doctor', license_number: '1' });
      const set = col.updateMany.mock.calls[0][1].$set;
      expect(set).toMatchObject({ license_verified: false, license_status: 'pending_verification', scfhs_check_outcome: 'active' });
    });
    it('does nothing for a type without the rule', async () => {
      const { svc, col } = build();
      await svc.recordAtSubmission({ id: 'p1', type: 'lab' });
      expect(col.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('dailyRecheck', () => {
    const profile = (extra: any = {}) => ({ _id: 'x1', id: 'p1', account_id: 'a1', type: 'doctor', license_number: '1', status: 'active', public_eligibility: true, scfhs_check_source: 'scfhs_api', scfhs_last_good_at: new Date(), ...extra });

    it('hides a provider whose licence expired: off every public list, with the reason, and tells it', async () => {
      fetchMock.mockResolvedValue(answer({ found: true, status: 'expired', expiry_date: iso(-3) }));
      const { svc, col, events } = build([profile()]);
      await expect(svc.dailyRecheck()).resolves.toEqual({ checked: 1, hidden: 1 });
      const set = col.updateOne.mock.calls[0][1].$set;
      expect(set).toMatchObject({ status: 'suspended', suspended_reason: 'scfhs_license_expired', public_eligibility: false, indexing_eligibility: false, license_verified: false, license_status: 'expired' });
      expect(events.emit).toHaveBeenCalledWith('provider.license_lapsed', expect.objectContaining({ provider_id: 'a1', outcome: 'expired' }));
    });

    it('keeps a provider with a live licence and refreshes its expiry', async () => {
      fetchMock.mockResolvedValue(answer({ found: true, status: 'active', expiry_date: iso(300) }));
      const { svc, col } = build([profile()]);
      await expect(svc.dailyRecheck()).resolves.toEqual({ checked: 1, hidden: 0 });
      expect(col.updateOne.mock.calls[0][1].$set).toMatchObject({ scfhs_check_outcome: 'active' });
    });

    it('keeps providers through a short SCFHS outage and hides them after the grace period', async () => {
      fetchMock.mockRejectedValue(new Error('down'));
      const old = new Date(Date.now() - 20 * 24 * 3600 * 1000);
      const { svc } = build([profile(), profile({ _id: 'x2', id: 'p2', scfhs_last_good_at: old })]);
      await expect(svc.dailyRecheck()).resolves.toEqual({ checked: 2, hidden: 1 });
    });

    it('does nothing while SCFHS is not configured (providers verified by hand run on their expiry date)', async () => {
      delete process.env.SCFHS_VERIFY_URL;
      const { svc, col } = build([profile()]);
      await expect(svc.dailyRecheck()).resolves.toEqual({ checked: 0, hidden: 0 });
      expect(col.updateOne).not.toHaveBeenCalled();
    });
  });

  it('parseScfhsAnswer treats anything unrecognised as unavailable', () => {
    expect(parseScfhsAnswer({ found: true, status: 'pending' }, new Date()).outcome).toBe('unavailable');
    expect(parseScfhsAnswer(null, new Date()).outcome).toBe('unavailable');
  });
});
