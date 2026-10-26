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

/**
 * Decision 18 ("اطلب الأدوية دي"), as in the app: the prescription's catalogue medicines go into the local-first pharmacy cart with the
 * prescribed quantities, each marked prescription-only and carrying this prescription, and the cart opens. A line the doctor wrote by
 * hand has no catalogue id: the count left out is shown, never skipped silently.
 */
export function RxOrderThese({ locale, prescriptionId, lines }: { locale: string; prescriptionId: string; lines: RxOrderLine[] }) {
  const t = useTranslations("Prescriptions");
  const router = useRouter();
  const { addItem } = useCart();
  const [busy, setBusy] = useState(false);
  const items = rxCartItems(prescriptionId, lines);
  const left = lines.length - items.length;
  if (items.length === 0) return <p className={rx.note}>{t("notInCart", { count: left, total: lines.length })}</p>;
  const order = () => {
    if (busy) return;
    setBusy(true);
    for (const item of items) addItem(item);
    router.push(`/${locale}/cart`);
  };
  return (
    <>
      <Button label={t("orderCta")} fullWidth loading={busy} onClick={order} testID="prescription-order-these" />
      {left > 0 ? <p className={rx.note} role="status">{t("notInCart", { count: left, total: lines.length })}</p> : null}
    </>
  );
}
