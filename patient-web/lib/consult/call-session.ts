/**
 * Small, tested parts of the web call screens.
 *
 * A call that was started as a call session (room/[id], the app's ring) is a session on the server until someone ends it; leaving the
 * page must say so, otherwise the session stays ACTIVE and call history and the host's next call see an open call.
 */
export async function endCallSession(fetchImpl: typeof fetch, sessionId: string | undefined | null): Promise<boolean> {
  if (!sessionId) return false;
  try {
    const res = await fetchImpl(`/api/patient/calls/${encodeURIComponent(sessionId)}/end`, { method: "POST", credentials: "same-origin", keepalive: true, headers: { "content-type": "application/json" }, body: "{}" });
    return res.ok;
  } catch {
    return false;
  }
}

export type CallTokenFailure = "not_ready" | "ended" | "unavailable";

/**
 * Why the booking's call credential was refused. The backend answers 409 or 400 `call_token_outside_appointment_window` when the
 * appointment is not open yet (or no longer), 400 `call_token_not_available_for_booking_state` when it was cancelled, completed or
 * rescheduled; everything else is simply unavailable.
 */
export function callTokenFailure(status: number, body: unknown): CallTokenFailure {
  if (status === 409) return "not_ready";
  const text = typeof body === "string" ? body : JSON.stringify(body ?? "");
  if (status === 400 && text.includes("call_token_outside_appointment_window")) return "not_ready";
  if (status === 400 && text.includes("call_token_not_available_for_booking_state")) return "ended";
  return "unavailable";
}
