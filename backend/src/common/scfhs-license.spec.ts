import { decideScfhs, recheckVerdict, requiresScfhs, ScfhsResult, scfhsNumberOf } from './scfhs-license';

const NOW = new Date('2026-10-17T00:00:00Z');
const at = (days: number) => new Date(NOW.getTime() + days * 24 * 3600 * 1000);
const res = (r: Partial<ScfhsResult> & { outcome: ScfhsResult['outcome'] }): ScfhsResult => ({ checked_at: NOW, ...r });

describe('19.3 SCFHS licence rules', () => {
  describe('who needs a licence', () => {
    it('doctors, pharmacies and individual nurses do; nursing companies, labs, radiology and hospitals do not', () => {
      expect(requiresScfhs({ type: 'doctor' })).toBe(true);
      expect(requiresScfhs({ type: 'pharmacy' })).toBe(true);
      expect(requiresScfhs({ type: 'nursing', scfhs_license_number: '12345' })).toBe(true);
      expect(requiresScfhs({ type: 'home_care' })).toBe(true);
      expect(requiresScfhs({ type: 'nursing', cr_number: '1010', moh_license_number: 'M1' })).toBe(false);
      for (const type of ['lab', 'radiology', 'hospital', 'clinic']) expect(requiresScfhs({ type })).toBe(false);
    });

    it('reads the SCFHS number, never a pharmacy facility licence', () => {
      expect(scfhsNumberOf({ type: 'doctor', license_number: ' 12-345 ' })).toBe('12-345');
      expect(scfhsNumberOf({ type: 'doctor', scfhs_license_number: 'S1', license_number: 'L1' })).toBe('S1');
      expect(scfhsNumberOf({ type: 'pharmacy', license_number: 'CR-9' })).toBe('');
      expect(scfhsNumberOf({ type: 'pharmacy', scfhs_license_number: 'P1' })).toBe('P1');
    });
  });

  describe('decideScfhs (approval)', () => {
    it('a confirmed, unexpired licence verifies and keeps its expiry', () => {
      const d = decideScfhs(res({ outcome: 'active', expiry_date: at(200) }), undefined, NOW);
      expect(d).toMatchObject({ verified: true, license_status: 'verified', source: 'scfhs_api' });
      expect(d.expiry_date).toEqual(at(200));
    });

    it('an expired, suspended or unknown licence never verifies, even with a manual check', () => {
      const manual = { reference: 'R-1', expiry_date: at(300).toISOString() };
      expect(decideScfhs(res({ outcome: 'expired' }), manual, NOW)).toMatchObject({ verified: false, reason: 'scfhs_license_expired', license_status: 'expired' });
      expect(decideScfhs(res({ outcome: 'suspended' }), manual, NOW)).toMatchObject({ verified: false, reason: 'scfhs_license_suspended', license_status: 'suspended' });
      expect(decideScfhs(res({ outcome: 'not_found' }), manual, NOW)).toMatchObject({ verified: false, reason: 'scfhs_license_not_found', license_status: 'rejected' });
    });

    it('an "active" answer with a past or missing expiry does not verify', () => {
      expect(decideScfhs(res({ outcome: 'active', expiry_date: at(-1) }), undefined, NOW).verified).toBe(false);
      expect(decideScfhs(res({ outcome: 'active' }), undefined, NOW).verified).toBe(false);
    });

    it('fails closed when SCFHS cannot answer and nobody checked by hand', () => {
      expect(decideScfhs(res({ outcome: 'unavailable' }), undefined, NOW)).toMatchObject({ verified: false, reason: 'scfhs_unavailable_manual_check_required' });
    });

    it('accepts an admin\'s manual check only with a reference and a future expiry', () => {
      const ok = decideScfhs(res({ outcome: 'unavailable' }), { reference: 'R-1', expiry_date: at(90).toISOString() }, NOW);
      expect(ok).toMatchObject({ verified: true, source: 'admin_manual', license_status: 'verified' });
      expect(ok.expiry_date).toEqual(at(90));
      for (const bad of [{ reference: '', expiry_date: at(90).toISOString() }, { reference: 'R', expiry_date: at(-2).toISOString() }, { reference: 'R', expiry_date: 'soon' }]) {
        expect(decideScfhs(res({ outcome: 'unavailable' }), bad, NOW)).toMatchObject({ verified: false, reason: 'manual_check_invalid' });
      }
    });
  });

  describe('recheckVerdict (daily)', () => {
    it('keeps a provider whose licence is still active', () => {
      expect(recheckVerdict(res({ outcome: 'active', expiry_date: at(10) }), at(-1), 14, NOW)).toBe('keep');
    });
    it('hides at once on a confirmed bad answer', () => {
      for (const outcome of ['expired', 'suspended', 'not_found'] as const) expect(recheckVerdict(res({ outcome }), at(-1), 14, NOW)).toBe('hide');
      expect(recheckVerdict(res({ outcome: 'active', expiry_date: at(-1) }), at(-1), 14, NOW)).toBe('hide');
    });
    it('keeps through an SCFHS outage for the grace period, then hides', () => {
      expect(recheckVerdict(res({ outcome: 'unavailable' }), at(-10), 14, NOW)).toBe('keep');
      expect(recheckVerdict(res({ outcome: 'unavailable' }), at(-15), 14, NOW)).toBe('hide');
      expect(recheckVerdict(res({ outcome: 'unavailable' }), null, 14, NOW)).toBe('hide');
    });
  });
});
