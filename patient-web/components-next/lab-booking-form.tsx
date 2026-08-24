"use client";

import { useState } from "react";

type Provider = { account_id: string; name: string; city?: string; rating?: number };
type Labels = { book: string; findProviders: string; providers: string; noProviders: string; chooseProvider: string; scheduledAt: string; booking: string; bookingFailed: string; bookingCreated: string };
function idempotencyKey() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-lab`; }

export function LabBookingForm({ serviceId, labels }: { serviceId: string; labels: Labels }) {
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [providerId, setProviderId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [busy, setBusy] = useState<"match" | "book" | null>(null);
  const [message, setMessage] = useState("");
  async function match() {
    setBusy("match"); setMessage("");
    try {
      const response = await fetch("/api/labs/match", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ service_id: serviceId }) });
      const data = await response.json().catch(() => null) as { providers?: Provider[] } | null;
      if (!response.ok || !Array.isArray(data?.providers)) throw new Error("match_failed");
      setProviders(data.providers); setProviderId(data.providers[0]?.account_id || "");
    } catch { setMessage(labels.bookingFailed); } finally { setBusy(null); }
  }
  async function book() {
    setBusy("book"); setMessage("");
    try {
      const parsed = new Date(scheduledAt);
      if (!providerId || !scheduledAt || Number.isNaN(parsed.getTime()) || parsed.getTime() < Date.now() - 5 * 60_000) throw new Error("invalid_input");
      const response = await fetch("/api/labs/bookings", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotencyKey() }, body: JSON.stringify({ service_id: serviceId, provider_account_id: providerId, scheduled_at: parsed.toISOString() }) });
      if (!response.ok) throw new Error("booking_failed");
      setMessage(labels.bookingCreated);
    } catch { setMessage(labels.bookingFailed); } finally { setBusy(null); }
  }
  return <form onSubmit={(event) => { event.preventDefault(); void book(); }}>
    {providers === null ? <button type="button" disabled={busy !== null} onClick={() => void match()}>{busy === "match" ? labels.booking : labels.findProviders}</button> : <><h3>{labels.providers}</h3>{providers.length ? <><label>{labels.chooseProvider}<select required value={providerId} onChange={(event) => setProviderId(event.target.value)} disabled={busy !== null}>{providers.map((provider) => <option key={provider.account_id} value={provider.account_id}>{[provider.name, provider.city, provider.rating === undefined ? undefined : String(provider.rating)].filter(Boolean).join(" — ")}</option>)}</select></label><label>{labels.scheduledAt}<input required type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} disabled={busy !== null} /></label><button type="submit" disabled={busy !== null}>{busy === "book" ? labels.booking : labels.book}</button></> : <p>{labels.noProviders}</p>}</>}
    {message ? <p role="status">{message}</p> : null}
  </form>;
}
