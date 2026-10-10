"use client";

import Link from "next/link";
import { useRxConsultHref } from "./use-rx-consult-href";

/**
 * The "Consult a doctor" link of the prescription banners (cart, checkout). It opens the doctors of the specialty the admin mapped
 * to the cart's prescription medicines, and the specialty list when there is none. Rendered only where the banner is shown, so the
 * one read of the suggested specialty is made only when the link is on screen.
 */
export function RxConsultLink({ locale, lines, label, className }: { locale: string; lines: ReadonlyArray<{ id: string; rx: boolean }>; label: string; className?: string }) {
  const href = useRxConsultHref(locale, lines);
  return <Link className={className} href={href}>{label}</Link>;
}
