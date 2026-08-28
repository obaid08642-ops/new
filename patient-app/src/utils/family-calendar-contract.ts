export type FamilyCalendarEventType = 'appointment' | 'order' | 'lab' | 'reminder' | 'medication';

export type FamilyCalendarDraft = {
  title: string;
  eventDate: string;
  memberUserId: string | null;
  type: FamilyCalendarEventType | null;
};

const ALLOWED_TYPES: ReadonlySet<string> = new Set(['appointment', 'order', 'lab', 'reminder', 'medication']);

/** Builds an event only from fields deliberately supplied in the cross-platform form. */
export function buildFamilyCalendarPayload(draft: FamilyCalendarDraft) {
  const title = draft.title.trim();
  if (!title) throw new Error('title is required');
  if (!draft.memberUserId?.trim()) throw new Error('member_user_id is required');
  if (!draft.type || !ALLOWED_TYPES.has(draft.type)) throw new Error('valid calendar event type is required');
  const date = new Date(draft.eventDate);
  if (!draft.eventDate.trim() || Number.isNaN(date.getTime())) throw new Error('valid event_date is required');
  return { title, event_date: date.toISOString(), member_user_id: draft.memberUserId, type: draft.type };
}

export function parseFamilyCalendarEvents(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) throw new Error('calendar response must be an array');
  return value.filter((event): event is Record<string, unknown> => !!event && typeof event === 'object' && !Array.isArray(event));
}
