"use client";

import { useEffect, useMemo, useState } from "react";
import type { BasketLine } from "@/lib/ordering/basket";
import { orderLines, parseSingle, SINGLE_KEY } from "@/lib/ordering/single";
import type { ServiceKind } from "@/lib/ordering/quote";
import { useBasket } from "./use-basket";

const keepBasket = (_kind: ServiceKind, _id: string): void => undefined;

/** Remembers the one item of an "Order now" (this tab only) before the steps open. Storage blocked: the steps show the item without its name. */
export function rememberSingle(serialized: string) {
  try { window.sessionStorage.setItem(SINGLE_KEY, serialized); } catch { /* storage blocked: the item page still works by id */ }
}

/**
 * The lines of the ordering steps: the basket's lines of `kind`, or, with `single` (the `item` query), exactly that one item and nothing
 * from the basket. `remove` is the basket's remove and is a no-op for a one-item order (the cart is not part of it).
 */
export function useOrderLines(kind: ServiceKind, single: string | undefined) {
  const { basket, remove } = useBasket();
  const [known, setKnown] = useState<BasketLine | null>(null);
  useEffect(() => {
    if (!single) { setKnown(null); return; }
    try { setKnown(parseSingle(window.sessionStorage.getItem(SINGLE_KEY), single)); } catch { setKnown(null); }
  }, [single]);
  const lines = useMemo(() => orderLines(basket[kind], single, known), [basket, kind, single, known]);
  return { lines, isSingle: Boolean(single), remove: single ? keepBasket : remove };
}
