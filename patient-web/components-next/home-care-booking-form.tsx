"use client";

import { useState } from "react";

type Provider = { id: string; name: string; specialties: string[]; rating?: number; experience_years?: number };
type Address = { id: string; label?: string; street?: string; address?: string; city?: string; district?: string; lat?: number; lng?: number };
type Labels = { book: string; findProviders: string; providers: string; noProviders: string; chooseProvider: string; chooseAddress: string; noAddresses: string; scheduledAt: string; sessions: string; booking: string; bookingFailed: string; bookingCreated: string };
function idempotencyKey() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-homecare`; }

export function HomeCareBookingForm({ serviceId, labels }: { serviceId: string; labels: Labels }) {
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [providerId, setProviderId] = useState(""); const [addressId, setAddressId] = useState(""); const [scheduledAt, setScheduledAt] = useState(""); const [sessions, setSessions] = useState(1);
  const [busy, setBusy] = useState<"load" | "book" | null>(null); const [message, setMessage] = useState("");
  async function load() {
    setBusy("load"); setMessage("");
    try {
      const [providerResponse, addressResponse] = await Promise.all([fetch("/api/home-care/providers"), fetch("/api/addresses")]);
      const providerData = await providerResponse.json().catch(() => null) as { providers?: Provider[] } | null;
      const addressData = await addressResponse.json().catch(() => null) as Address[] | null;
      if (!providerResponse.ok || !addressResponse.ok || !Array.isArray(providerData?.providers) || !Array.isArray(addressData)) throw new Error("load_failed");
      setProviders(providerData.providers); setAddresses(addressData); setProviderId(providerData.providers[0]?.id || ""); setAddressId(addressData[0]?.id || "");
    } catch { setMessage(labels.bookingFailed); } finally { setBusy(null); }
  }
  async function book() {
    const selected = addresses?.find((address) => address.id === addressId);
    setBusy("book"); setMessage("");
    try {
      const parsed = new Date(scheduledAt); const address = selected ? { address: selected.street || selected.address || selected.label || "", city: selected.city, district: selected.district, lat: selected.lat, lng: selected.lng } : null;
      if (!providerId || !address?.address || !scheduledAt || Number.isNaN(parsed.getTime()) || parsed.getTime() < Date.now() - 5 * 60_000) throw new Error("invalid_input");
      const response = await fetch("/api/home-care/bookings", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotencyKey() }, body: JSON.stringify({ service_id: serviceId, provider_id: providerId, scheduled_at: parsed.toISOString(), address, sessions_count: sessions, payment_method: "cash" }) });
      if (!response.ok) throw new Error("booking_failed");
      setMessage(labels.bookingCreated);
    } catch { setMessage(labels.bookingFailed); } finally { setBusy(null); }
  }
  return <form onSubmit={(event) => { event.preventDefault(); void book(); }}>{providers === null || addresses === null ? <button type="button" disabled={busy !== null} onClick={() => void load()}>{busy === "load" ? labels.booking : labels.findProviders}</button> : <>{providers.length ? <label>{labels.chooseProvider}<select required value={providerId} onChange={(event) => setProviderId(event.target.value)} disabled={busy !== null}>{providers.map((provider) => <option key={provider.id} value={provider.id}>{[provider.name, provider.rating === undefined ? undefined : String(provider.rating)].filter(Boolean).join(" — ")}</option>)}</select></label> : <p>{labels.noProviders}</p>}{addresses.length ? <label>{labels.chooseAddress}<select required value={addressId} onChange={(event) => setAddressId(event.target.value)} disabled={busy !== null}>{addresses.map((address) => <option key={address.id} value={address.id}>{[address.label, address.street || address.address, address.city].filter(Boolean).join(" — ")}</option>)}</select></label> : <p>{labels.noAddresses}</p>}<label>{labels.scheduledAt}<input required type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} disabled={busy !== null} /></label><label>{labels.sessions}<input required type="number" min={1} max={60} value={sessions} onChange={(event) => setSessions(Math.max(1, Math.min(60, Number(event.target.value) || 1)))} disabled={busy !== null} /></label><button type="submit" disabled={busy !== null || !providers.length || !addresses.length}>{busy === "book" ? labels.booking : labels.book}</button></>}</form>;
}
