/**
 * What the family screens read from the server's replies, as plain typed values (no schema library: the client bundles
 * must not carry zod). Every value is the server's; nothing is filled in. Used by the server pages only.
 */

/** The permissions the group's members can be given (the keys the backend accepts in PATCH /family/member/:id/permissions). */
export const PERMISSION_KEYS = ["vitals", "meds", "reports", "appointments"] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(value);
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** The grants of a list that these screens have a name for. */
export function knownPermissions(list: readonly string[]): PermissionKey[] {
  return list.filter(isPermissionKey);
}

/**
 * The members of GET /family/my-group with what each was granted, by the member's id. Every grant the server holds is kept
 * (saving writes the whole list back, so one these screens do not draw must not be dropped).
 */
export function parseGroupPermissions(payload: unknown): Map<string, string[]> {
  const root = record(payload);
  const group = record(root?.data) ?? root;
  const list = group?.members;
  const out = new Map<string, string[]>();
  for (const item of Array.isArray(list) ? list : []) {
    const member = record(item);
    if (!member) continue;
    const id = [member.user_id, member.userId, member.id, member._id].find((value) => typeof value === "string" && value) as string | undefined;
    if (id) out.set(id, strings(member.permissions));
  }
  return out;
}

export type PermissionRequest = { id: string; name?: string; permissions: PermissionKey[] };

/** GET /family/permissions/pending: the requests waiting for the viewer's answer. */
export function parsePermissionRequests(payload: unknown): PermissionRequest[] {
  const root = record(payload);
  const list = Array.isArray(payload) ? payload : root?.data;
  const out: PermissionRequest[] = [];
  for (const item of Array.isArray(list) ? list : []) {
    const request = record(item);
    if (!request) continue;
    const id = String(request.id ?? request._id ?? request.request_id ?? "");
    if (!id) continue;
    out.push({ id, name: text(request.member_name) ?? text(request.requester_name), permissions: knownPermissions(strings(request.permissions)) });
  }
  return out;
}

export type MemberRecords = {
  gender?: string;
  birthDate?: string;
  bloodType?: string;
  medicines: Array<{ id: string; nameAr?: string; nameEn?: string; doctor?: string; dose?: string }>;
  appointments: Array<{ id: string; doctor?: string; at?: string }>;
  hasReports: boolean;
};

/** GET /family/member-records/:id: what the member shared with the viewer (the lists are capped at 20, as before). */
export function parseMemberRecords(payload: unknown): MemberRecords {
  const root = record(payload) ?? {};
  const profile = record(root.profile);
  const rows = (value: unknown) => (Array.isArray(value) ? value.map(record).filter((row): row is Record<string, unknown> => row !== null) : []);
  const medicines = [...rows(root.meds), ...rows(root.prescriptions)].slice(0, 20).map((row, index) => ({
    id: String(row.id ?? index),
    nameAr: text(row.medicine_name_ar),
    nameEn: text(row.medicine_name_en),
    doctor: text(row.doctor_name),
    dose: text(row.dose),
  }));
  const appointments = rows(root.appointments).slice(0, 20).map((row, index) => ({
    id: String(row.id ?? index),
    doctor: text(row.doctor_name),
    at: text(row.scheduled_at),
  }));
  return {
    gender: text(profile?.gender),
    birthDate: text(profile?.birth_date),
    bloodType: text(profile?.blood_type),
    medicines,
    appointments,
    hasReports: Boolean(root.reports),
  };
}

export type CalendarEvent = { id: string; title?: string; member?: string; at?: string };

/** GET /family/calendar: an array, or `{ events: [] }`. */
export function parseCalendarEvents(payload: unknown): CalendarEvent[] {
  const root = record(payload);
  const list = Array.isArray(payload) ? payload : root?.events;
  return (Array.isArray(list) ? list : []).flatMap((item, index) => {
    const event = record(item);
    if (!event) return [];
    return [{ id: String(event.id ?? index), title: text(event.title), member: text(event.member_name), at: text(event.event_date) }];
  });
}
