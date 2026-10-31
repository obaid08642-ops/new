// GET /admin/facilities/invitations and /admin/facilities/memberships rows (hospital.service adminListInvitations / adminListMemberships).

export interface FacilityInvitationRow {
  id: string; facility_id: string; facility_name?: string | null; invitee_id: string; invitee_name?: string | null;
  invitee_identifier?: string; role?: string; status: 'pending' | 'accepted' | 'rejected' | 'cancelled'; createdAt?: string;
}
export interface FacilityMembershipRow {
  user_id: string; full_name?: string | null; role?: string; facility_id: string; facility_name?: string | null; permissions?: string[]; suspended?: boolean;
}

export const INVITATION_STATUSES = [
  { key: '', label: 'الكل' },
  { key: 'pending', label: 'بانتظار الرد' },
  { key: 'accepted', label: 'مقبولة' },
  { key: 'rejected', label: 'مرفوضة' },
  { key: 'cancelled', label: 'ملغاة' },
] as const;

export function invitationStatusText(s: FacilityInvitationRow['status']): string {
  return INVITATION_STATUSES.find((x) => x.key === s)?.label ?? s;
}

const ROLE_TEXT: Record<string, string> = { doctor: 'طبيب', nurse: 'ممرض', lab: 'مختبر', radiology: 'أشعة', pharmacy: 'صيدلية', hospital: 'منشأة', admin: 'إدارة' };
export function roleText(role?: string): string { return (role && ROLE_TEXT[role]) || role || '—'; }

/** Only a pending invitation can be withdrawn. */
export const canCancelInvitation = (r: Pick<FacilityInvitationRow, 'status'>): boolean => r.status === 'pending';

/** Rows matching typed text on names, role and ids. */
export function filterByText<T extends object>(rows: T[], text: string, fields: (keyof T)[]): T[] {
  const q = text.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => fields.some((f) => String((r as Record<string, unknown>)[f as string] ?? '').toLowerCase().includes(q)));
}
