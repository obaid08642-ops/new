"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { Button } from "@/components-next/ui-generated/components/Button";
import styles from "@/components-next/diagnostics/diag.module.css";
import { hasLine, type LineNames } from "@/lib/ordering/basket";
import type { ServiceKind } from "@/lib/ordering/quote";
import { useBasket } from "./use-basket";

/** The flight of the pressed button to the basket bar; loaded on the first add only, so the page's script does not grow. */
function fly(from: HTMLElement) {
  void import("@/lib/motion/fly-to-basket").then((m) => m.flyToBasket(from)).catch(() => undefined);
}

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
      onClick={(event) => {
        if (inBasket) return remove(kind, line.id);
        add(kind, line);
        fly(event.currentTarget);
      }}
    >
      <Icon name={inBasket ? "check" : "plus"} size={18} tone="currentColor" />
    </button>
  );
}

/** The item page's call to action. */
export function AddToBasketButton({ kind, line }: { kind: ServiceKind; line: Line }) {
  const t = useTranslations("OrderingFlow");
  const { basket, add, remove } = useBasket();
  const box = useRef<HTMLDivElement>(null);
  const inBasket = hasLine(basket, kind, line.id);
  const press = () => {
    if (inBasket) return remove(kind, line.id);
    add(kind, line);
    const button = box.current?.querySelector("button");
    if (button) fly(button);
  };
  return (
    <div ref={box}>
      <Button label={inBasket ? t("removeFromBasket") : t("ctaOne")} variant={inBasket ? "outline" : "primary"} size="lg" fullWidth onClick={press} />
    </div>
  );
}
