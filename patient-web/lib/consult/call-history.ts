/**
 * The patient's call records (`GET /calls/history`: `{ data: [{ id, appointment_id, call_type, status, started_at, ended_at,
 * duration_seconds, end_reason }] }`, livekit.service.ts `getCallHistory`). Nothing is added: a field the server did not send is
 * left out. The call states are the server's INITIATED | ACTIVE | ENDED | FAILED, with `end_reason: "rejected"` for a declined call.
 */
export type CallKind = "video" | "voice";
export type CallStatus = "ended" | "rejected" | "missed" | "active" | "pending";

export type CallRecord = {
  id: string;
  appointmentId?: string;
  kind: CallKind;
  status: CallStatus;
  at?: string;
  durationSeconds?: number;
};

type Raw = Record<string, unknown>;
const record = (value: unknown): Raw | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : null);
const text = (value: unknown): string | undefined => (typeof value === "string" && value.trim() ? value.trim() : undefined);

export function callStatus(status: unknown, endReason: unknown): CallStatus {
  switch (String(status ?? "").toUpperCase()) {
    case "ENDED":
      return "ended";
    case "FAILED":
      return endReason === "rejected" ? "rejected" : "missed";
    case "ACTIVE":
      return "active";
    default:
      return "pending";
  }
}

export function parseCallHistory(payload: unknown): CallRecord[] {
  const root = record(payload);
  const rows = Array.isArray(payload) ? payload : Array.isArray(root?.data) ? root.data : Array.isArray(root?.calls) ? root.calls : [];
  return rows.flatMap((value): CallRecord[] => {
    const row = record(value);
    const id = text(row?.id);
    if (!row || !id) return [];
    const duration = typeof row.duration_seconds === "number" && Number.isFinite(row.duration_seconds) && row.duration_seconds > 0 ? Math.round(row.duration_seconds) : undefined;
    const status = callStatus(row.status, row.end_reason);
    return [{
      id,
      appointmentId: text(row.appointment_id),
      kind: row.call_type === "video" ? "video" : "voice",
      status,
      at: text(row.started_at) ?? text(row.ended_at),
      durationSeconds: status === "ended" ? duration : undefined,
    }];
  });
}
