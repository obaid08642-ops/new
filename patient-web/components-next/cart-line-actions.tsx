"use client";

import { useState } from "react";

type Labels = { updateQuantity: string; removeItem: string; removing: string; checkoutFailed: string };
function idempotencyKey() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-cart`; }

export function CartLineActions({ lineId, quantity, labels }: { lineId: string; quantity: number; labels: Labels }) {
  const [value, setValue] = useState(quantity);
  const [busy, setBusy] = useState<"update" | "remove" | null>(null);
  const [error, setError] = useState("");

  async function request(method: "PATCH" | "DELETE") {
    setBusy(method === "PATCH" ? "update" : "remove"); setError("");
    try {
      const response = await fetch(`/api/cart/items/${encodeURIComponent(lineId)}`, {
        method,
        headers: { "content-type": "application/json", "idempotency-key": idempotencyKey() },
        ...(method === "PATCH" ? { body: JSON.stringify({ quantity: value }) } : {}),
      });
      if (!response.ok) throw new Error("cart_mutation_failed");
      window.location.reload();
    } catch {
      setError(labels.checkoutFailed);
    } finally {
      setBusy(null);
    }
  }

  return <div>
    <label>
      <span className="sr-only">{labels.updateQuantity}</span>
      <input type="number" min={1} max={100} value={value} disabled={busy !== null} onChange={(event) => setValue(Math.max(1, Math.min(100, Number(event.target.value) || 1)))} />
    </label>
    <button type="button" disabled={busy !== null || value === quantity} onClick={() => request("PATCH")}>{labels.updateQuantity}</button>
    <button type="button" disabled={busy !== null} onClick={() => request("DELETE")}>{busy === "remove" ? labels.removing : labels.removeItem}</button>
    {error ? <p role="alert">{error}</p> : null}
  </div>;
}
