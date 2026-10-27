"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { Button } from "@/components-next/ui-generated/components/Button";
import styles from "@/components-next/diagnostics/diag.module.css";
import { hasLine, type LineNames } from "@/lib/ordering/basket";
import type { ServiceKind } from "@/lib/ordering/quote";
import { useBasket } from "./use-basket";

type Line = { id: string; nameAr?: string; nameEn?: string; names?: LineNames };

/** The "+" of a catalogue row: adds to / removes from the local basket (no backend call). */
export function AddToBasketIcon({ kind, line, name }: { kind: ServiceKind; line: Line; name: string }) {
  const t = useTranslations("OrderingFlow");
  const { basket, add, remove } = useBasket();
  const inBasket = hasLine(basket, kind, line.id);
  return (
    <button
      type="button"
      className={styles.addBtn}
      aria-pressed={inBasket}
      aria-label={`${inBasket ? t("removeAria") : t("addAria")}: ${name}`}
      onClick={() => (inBasket ? remove(kind, line.id) : add(kind, line))}
    >
      <Icon name={inBasket ? "check" : "plus"} size={18} tone="currentColor" />
    </button>
  );
}

/** The item page's call to action. */
export function AddToBasketButton({ kind, line }: { kind: ServiceKind; line: Line }) {
  const t = useTranslations("OrderingFlow");
  const { basket, add, remove } = useBasket();
  const inBasket = hasLine(basket, kind, line.id);
  return <Button label={inBasket ? t("removeFromBasket") : t("ctaOne")} variant={inBasket ? "outline" : "primary"} size="lg" fullWidth onClick={() => (inBasket ? remove(kind, line.id) : add(kind, line))} />;
}

/**
 * The two actions of a catalogue card and of the item page: "Add to cart" (the local basket of its service, `lab` or `radiology`) and "Order now"
 * (adds the item if it is not there yet, then opens the basket of that service; the flow has no single-item entry, so the lines already in the basket stay).
 */
export function ItemActions({ kind, line, orderHref }: { kind: ServiceKind; line: Line; orderHref: string }) {
  const t = useTranslations("OrderingFlow");
  const router = useRouter();
  const { basket, add, remove } = useBasket();
  const inBasket = hasLine(basket, kind, line.id);
  return (
    <>
      <Button label={inBasket ? t("removeFromBasket") : t("ctaOne")} variant="outline" size="md" fullWidth onClick={() => (inBasket ? remove(kind, line.id) : add(kind, line))} />
      <Button
        label={t("orderNow")}
        size="md"
        fullWidth
        onClick={() => {
          if (!inBasket) add(kind, line);
          router.push(orderHref);
        }}
      />
    </>
  );
}
