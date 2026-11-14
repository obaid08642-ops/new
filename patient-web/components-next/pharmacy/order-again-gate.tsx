"use client";

import { useEffect, useState, type ComponentType } from "react";
import { getSessionIdentity } from "@/lib/auth/session-identity";

/**
 * "Order again" is only for a signed-in patient (and a guest or a visitor is never asked for orders anyway), so the card's
 * code (order-again-card.tsx: the card, its message namespace use and the order reader) is not in the first load: this gate
 * checks the browser's session first and loads the card only for a signed-in patient. A visitor who is not signed in
 * downloads nothing for it. Nothing is drawn until then, as before (the card drew nothing until it had an order).
 */
export function OrderAgainGate({ locale }: { locale: string }) {
  const [Card, setCard] = useState<ComponentType<{ locale: string }> | null>(null);
  useEffect(() => {
    let live = true;
    void getSessionIdentity()
      .then((who) => (who.status === "user" && !who.isGuest ? import("./order-again-card") : null))
      .then((m) => { if (live && m) setCard(() => m.OrderAgainCard); })
      .catch(() => undefined);
    return () => { live = false; };
  }, []);
  return Card ? <Card locale={locale} /> : null;
}
