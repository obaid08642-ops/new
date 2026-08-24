"use client";

import { useState } from "react";

type Labels = { addToCart: string; adding: string; checkoutFailed: string };

function idempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}-cart`;
}

export function MedicineAddToCart({ medicineId, locale, labels }: { medicineId: string; locale: string; labels: Labels }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": idempotencyKey() },
        body: JSON.stringify({ medicine_id: medicineId, quantity: 1 }),
      });
      if (response.status === 401) { window.location.assign(`/${locale}/login`); return; }
      if (!response.ok) throw new Error("cart_item_failed");
      window.location.reload();
    } catch {
      setError(labels.checkoutFailed);
    } finally {
      setBusy(false);
    }
  }

  return <div>
    <button type="button" onClick={add} disabled={busy} aria-busy={busy}>{busy ? labels.adding : labels.addToCart}</button>
    {error ? <p role="alert">{error}</p> : null}
  </div>;
}
