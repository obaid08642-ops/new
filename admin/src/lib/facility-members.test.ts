import { describe, expect, it } from 'vitest';
import { canCancelInvitation, filterByText, invitationStatusText, roleText, type FacilityInvitationRow } from './facility-members';

const inv = (over: Partial<FacilityInvitationRow>): FacilityInvitationRow => ({ id: 'i1', facility_id: 'f1', invitee_id: 'u1', status: 'pending', ...over });

describe('facility invitations and memberships', () => {
  it('words statuses and roles; unknown values stay readable', () => {
    expect(invitationStatusText('pending')).toBe('بانتظار الرد');
    expect(invitationStatusText('cancelled')).toBe('ملغاة');
    expect(roleText('doctor')).toBe('طبيب');
    expect(roleText('x_role')).toBe('x_role');
    expect(roleText(undefined)).toBe('—');
  });
  it('only a pending invitation can be withdrawn', () => {
    expect(canCancelInvitation(inv({ status: 'pending' }))).toBe(true);
    for (const s of ['accepted', 'rejected', 'cancelled'] as const) expect(canCancelInvitation(inv({ status: s }))).toBe(false);
  });
  it('filters by names and ids', () => {
    const rows = [inv({ id: 'a', facility_name: 'مستشفى النور', invitee_name: 'د. سامي' }), inv({ id: 'b', facility_name: 'Care Clinic', invitee_name: 'Dr Ali' })];
    expect(filterByText(rows, '', ['facility_name', 'invitee_name'])).toHaveLength(2);
    expect(filterByText(rows, 'النور', ['facility_name', 'invitee_name']).map((r) => r.id)).toEqual(['a']);
    expect(filterByText(rows, 'dr ali', ['facility_name', 'invitee_name']).map((r) => r.id)).toEqual(['b']);
  });
});
