"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCart } from "@/lib/context/CartContext";
import { MAX_LINE_QTY } from "@/lib/cart/cart-store";
import { Button } from "@/components-next/ui-generated/components/Button";
import rx from "./rx.module.css";

export type RxOrderLine = { medicineId?: string; name: string; quantity?: number };

/** The prescribed quantity, kept to a whole number the cart accepts. */
export function rxCartItems(prescriptionId: string, lines: RxOrderLine[]) {
  return lines.flatMap((line) =>
    line.medicineId
      ? [{ id: line.medicineId, name: line.name, rx: true, prescriptionId, qty: Math.min(MAX_LINE_QTY, Math.max(1, Math.trunc(line.quantity ?? 1) || 1)) }]
      : [],
  );
}

/** The cart items the patient keeps: every prescribed medicine except the ones they unticked (owner decision 2026-11-08: pre-checked, never locked). */
export function chosenRxItems(prescriptionId: string, lines: RxOrderLine[], unticked: ReadonlySet<string>) {
  return rxCartItems(prescriptionId, lines).filter((item) => !unticked.has(item.id));
}

/**
 * Decision 18 ("اطلب الأدوية دي"), as in the app: the prescription's catalogue medicines go into the local-first pharmacy cart with the
 * prescribed quantities, each marked prescription-only and carrying this prescription, and the cart opens. A line the doctor wrote by
 * hand has no catalogue id: the count left out is shown, never skipped silently.
 *
 * Owner decision 2026-11-08 (2): the medicines that come from the doctor's prescription are PRE-CHECKED, and the patient can untick any of
 * them (no hidden forced purchase): only the ticked ones go into the cart. With a single medicine there is nothing to choose, so no list.
 */
export function RxOrderThese({ locale, prescriptionId, lines }: { locale: string; prescriptionId: string; lines: RxOrderLine[] }) {
  const t = useTranslations("Prescriptions");
  const router = useRouter();
  const { addItem } = useCart();
  const [busy, setBusy] = useState(false);
  const [unticked, setUnticked] = useState<ReadonlySet<string>>(new Set());
  const items = rxCartItems(prescriptionId, lines);
  const chosen = chosenRxItems(prescriptionId, lines, unticked);
  const toggle = (id: string) => setUnticked((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const left = lines.length - items.length;
  if (items.length === 0) return <p className={rx.note}>{t("notInCart", { count: left, total: lines.length })}</p>;
  const order = () => {
    if (busy || chosen.length === 0) return;
    setBusy(true);
    for (const item of chosen) addItem(item);
    router.push(`/${locale}/cart`);
  };
  return (
    <>
      {items.length > 1 ? (
        <fieldset className={rx.pick}>
          <legend className={rx.pickLegend}>{t("pickLabel")}</legend>
          {items.map((item, index) => (
            <label className={rx.pickRow} key={`${item.id}-${index}`}>
              <input type="checkbox" className={rx.pickBox} checked={!unticked.has(item.id)} onChange={() => toggle(item.id)} />
              <span>{item.name}</span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {chosen.length === 0 ? <p className={rx.note} role="status">{t("pickNone")}</p> : null}
      <Button label={t("orderCta")} fullWidth loading={busy} disabled={chosen.length === 0} onClick={order} testID="prescription-order-these" />
      {left > 0 ? <p className={rx.note} role="status">{t("notInCart", { count: left, total: lines.length })}</p> : null}
    </>
  );
}
