"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PatientAddress } from "./addresses";

export function DeliveryAddressSelectClient({ addresses, locale }: { addresses: PatientAddress[]; locale: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(() => addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? null);

  function confirm() {
    if (!selected) return;
    try { localStorage.setItem("delivery_address_id", selected); } catch { /* private mode */ }
    router.back();
  }

  return (
    <div>
      <Link href={`/${locale}/map`}>{ar ? "استخدم موقعي الحالي أو حدد على الخريطة" : "Use my current location or pick on the map"}</Link>
      <h2>{ar ? "العناوين المحفوظة" : "Saved addresses"}</h2>
      {addresses.length === 0 ? (
        <p role="status">{ar ? "لا توجد عناوين محفوظة" : "No saved addresses"}</p>
      ) : (
        <ul role="radiogroup" aria-label={ar ? "عنوان التوصيل" : "Delivery address"}>
          {addresses.map((a) => (
            <li key={a.id}>
              <label>
                <input type="radio" name="delivery-address" checked={selected === a.id} onChange={() => setSelected(a.id)} />{" "}
                <strong>{a.label || (ar ? "عنوان" : "Address")}</strong>
                {a.is_default ? <span> — {ar ? "افتراضي" : "Default"}</span> : null}
                <br />
                <span>{[a.line1, a.district, a.city].filter(Boolean).join("، ")}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href={`/${locale}/map`}>{ar ? "إضافة عنوان جديد على الخريطة" : "Add a new address on the map"}</Link>
        <button type="button" onClick={confirm} disabled={!selected}>{ar ? "تأكيد العنوان" : "Confirm address"}</button>
      </div>
    </div>
  );
}
