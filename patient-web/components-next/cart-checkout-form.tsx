"use client";

import { useMemo, useState } from "react";

type Address = { id: string; label?: string; street?: string; city?: string; lat?: number; lng?: number; is_default?: boolean };
type Labels = {
  checkout: string; cashOnDelivery: string; address: string; chooseAddress: string; noAddresses: string; manageAddresses: string;
  checkoutInProgress: string; checkoutFailed: string; orderCreated: string; newAddress: string; addressLabel: string; street: string; city: string;
  latitude: string; longitude: string; saveAddress: string;
};
function idempotencyKey() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-checkout`; }

export function CartCheckoutForm({ locale, initialAddresses, labels }: { locale: string; initialAddresses: Address[]; labels: Labels }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const initial = useMemo(() => initialAddresses.find((address) => address.is_default)?.id || initialAddresses[0]?.id || "", [initialAddresses]);
  const [addressId, setAddressId] = useState(initial);
  const [busy, setBusy] = useState<"checkout" | "address" | null>(null);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState({ label: "", street: "", city: "", lat: "", lng: "" });

  async function saveAddress() {
    setBusy("address"); setMessage("");
    try {
      const response = await fetch("/api/addresses", {
        method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotencyKey() },
        body: JSON.stringify({ label: draft.label || undefined, street: draft.street, city: draft.city || undefined, lat: Number(draft.lat), lng: Number(draft.lng) }),
      });
      if (response.status === 401) { window.location.assign(`/${locale}/login`); return; }
      const saved = await response.json().catch(() => null) as Address | null;
      if (!response.ok || !saved?.id) throw new Error("address_save_failed");
      setAddresses((current) => [...current, saved]); setAddressId(saved.id);
      setDraft({ label: "", street: "", city: "", lat: "", lng: "" });
    } catch { setMessage(labels.checkoutFailed); } finally { setBusy(null); }
  }

  async function checkout() {
    if (!addressId) { setMessage(labels.noAddresses); return; }
    setBusy("checkout"); setMessage("");
    try {
      const response = await fetch("/api/cart/checkout", {
        method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotencyKey() },
        body: JSON.stringify({ address_id: addressId, payment_method_id: "cash" }),
      });
      if (response.status === 401) { window.location.assign(`/${locale}/login`); return; }
      const data = await response.json().catch(() => null) as { order_id?: string } | null;
      if (!response.ok || !data?.order_id) throw new Error("checkout_failed");
      setMessage(labels.orderCreated);
      window.location.assign(`/${locale}/orders/${encodeURIComponent(data.order_id)}`);
    } catch { setMessage(labels.checkoutFailed); } finally { setBusy(null); }
  }

  return <section aria-label={labels.checkout}>
    <h2>{labels.checkout}</h2><p>{labels.cashOnDelivery}</p>
    {addresses.length ? <label>{labels.address}<select value={addressId} onChange={(event) => setAddressId(event.target.value)} disabled={busy !== null}><option value="">{labels.chooseAddress}</option>{addresses.map((address) => <option key={address.id} value={address.id}>{[address.label, address.street, address.city].filter(Boolean).join(" — ")}</option>)}</select></label> : <p>{labels.noAddresses}</p>}
    <button type="button" onClick={checkout} disabled={busy !== null || !addressId}>{busy === "checkout" ? labels.checkoutInProgress : labels.checkout}</button>
    <details><summary>{labels.manageAddresses}</summary><div>
      <h3>{labels.newAddress}</h3>
      <label>{labels.addressLabel}<input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} /></label>
      <label>{labels.street}<input required value={draft.street} onChange={(event) => setDraft({ ...draft, street: event.target.value })} /></label>
      <label>{labels.city}<input value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} /></label>
      <label>{labels.latitude}<input required inputMode="decimal" value={draft.lat} onChange={(event) => setDraft({ ...draft, lat: event.target.value })} /></label>
      <label>{labels.longitude}<input required inputMode="decimal" value={draft.lng} onChange={(event) => setDraft({ ...draft, lng: event.target.value })} /></label>
      <button type="button" disabled={busy !== null || !draft.street || !draft.lat || !draft.lng} onClick={saveAddress}>{busy === "address" ? labels.checkoutInProgress : labels.saveAddress}</button>
    </div></details>
    {message ? <p role="status">{message}</p> : null}
  </section>;
}
