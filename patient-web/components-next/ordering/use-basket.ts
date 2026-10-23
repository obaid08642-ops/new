"use client";

import { useCallback, useSyncExternalStore } from "react";
import { addLine, BASKET_KEY, emptyBasket, parseBasket, removeLine, serializeBasket, type Basket, type BasketLine } from "@/lib/ordering/basket";
import type { ServiceKind } from "@/lib/ordering/quote";

const EVENT = "nabd-ordering-basket";
const EMPTY = emptyBasket();
let cache: { raw: string | null; value: Basket } = { raw: null, value: EMPTY };

function readRaw(): string | null {
  try { return window.localStorage.getItem(BASKET_KEY); } catch { return null; }
}

function snapshot(): Basket {
  const raw = readRaw();
  if (raw !== cache.raw) cache = { raw, value: parseBasket(raw) };
  return cache.value;
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
}

function write(next: Basket) {
  try { window.localStorage.setItem(BASKET_KEY, serializeBasket(next)); } catch { /* storage blocked: the basket lives in memory for this page only */ memory = next; }
  window.dispatchEvent(new Event(EVENT));
}
let memory: Basket | null = null;

/** The ordering basket of this browser (local-first: no backend call). Server render and first paint see it empty. */
export function useBasket() {
  const basket = useSyncExternalStore(subscribe, () => memory ?? snapshot(), () => EMPTY);
  const add = useCallback((kind: ServiceKind, line: BasketLine) => write(addLine(memory ?? snapshot(), kind, line)), []);
  const remove = useCallback((kind: ServiceKind, id: string) => write(removeLine(memory ?? snapshot(), kind, id)), []);
  return { basket, add, remove };
}
