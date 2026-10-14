export type DashboardProfile = { name: string | null };
export type DashboardAppointment = { id: string; doctorName: string | null; dateLabel: string | null; status: string | null };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseDashboardProfile(payload: unknown): DashboardProfile {
  const root = record(payload);
  const data = record(root?.data) ?? root;
  // GET /users/me/display answers {display_name}; an account without a name shows the generic title (the caller hides the name).
  return { name: text(data?.display_name) };
}

export function parseDashboardAppointment(payload: unknown): DashboardAppointment | null {
  const root = record(payload);
  const data = record(root?.data) ?? root;
  const id = text(data?.id) ?? text(data?._id);
  if (!id) return null;
  const doctor = record(data?.doctor);
  const date = text(data?.scheduled_at) ?? text(data?.scheduledAt) ?? text(data?.date);
  return {
    id,
    doctorName: text(data?.doctor_name) ?? text(data?.doctorName) ?? text(doctor?.name) ?? null,
    dateLabel: date,
    status: text(data?.status) ?? null,
  };
}
