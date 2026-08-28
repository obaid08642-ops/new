export function appointmentStart(value: unknown): Date | null {
  if (!value || typeof value !== 'object') return null;
  const appointment = value as Record<string, unknown>;
  // slot_start is the current appointment contract. scheduled_at remains a
  // read-only legacy fallback for records issued before the contract migration.
  const raw = appointment.slot_start ?? appointment.scheduled_at;
  if (typeof raw !== 'string' && !(raw instanceof Date)) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseReportCollection(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray((value as { data?: unknown[] }).data)) return (value as { data: unknown[] }).data;
  throw new Error('invalid report collection response');
}
