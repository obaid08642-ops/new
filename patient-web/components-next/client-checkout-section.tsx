"use client";

import { useEffect, useState } from "react";
import { CheckoutFlow } from "./checkout-flow";
import type { Locale } from "@/lib/i18n";

export function ClientCheckoutSection({ locale }: { locale: Locale }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return <CheckoutFlow locale={locale} />;
}
