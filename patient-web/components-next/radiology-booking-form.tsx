"use client";

import { useState } from "react";

type Labels = { book: string; scheduledAt: string; booking: string; bookingFailed: string; bookingCreated: string };
function idempotencyKey() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-radiology`; }

export function RadiologyBookingForm({ serviceId, labels }: { serviceId: string; labels: Labels }) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit() {
    setBusy(true); setMessage("");
    try {
      const parsed = new Date(scheduledAt);
      if (!scheduledAt || Number.isNaN(parsed.getTime()) || parsed.getTime() < Date.now() - 5 * 60_000) throw new Error("invalid_time");
      const response = await fetch("/api/radiology/bookings", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotencyKey() }, body: JSON.stringify({ service_id: serviceId, scheduled_at: parsed.toISOString() }) });
      if (!response.ok) throw new Error("booking_failed");
      setMessage(labels.bookingCreated);
    } catch { setMessage(labels.bookingFailed); } finally { setBusy(false); }
  }
  return <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
    <label>{labels.scheduledAt}<input required type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} disabled={busy} /></label>
    <button type="submit" disabled={busy}>{busy ? labels.booking : labels.book}</button>
    {message ? <p role="status">{message}</p> : null}
  </form>;
}
