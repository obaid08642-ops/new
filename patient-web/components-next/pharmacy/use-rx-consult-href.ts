"use client";

import { useEffect, useState } from "react";
import { consultHref, rxLineIds } from "@/lib/pharmacy/rx-consult";

/**
 * Where "Consult a doctor" goes for the cart in this browser: the doctors of the specialty the admin mapped to its prescription
 * medicines, or the full specialty list until (or unless) there is one. The link is a real link from the first render; the
 * suggested specialty replaces it when the read comes back, and a failed read leaves the list.
 */
export function useRxConsultHref(locale: string, lines: ReadonlyArray<{ id: string; rx: boolean }>): string {
  const ids = rxLineIds(lines).join(",");
  const [slug, setSlug] = useState<{ ids: string; value: string | null } | null>(null);

  useEffect(() => {
    if (!ids) return;
    const controller = new AbortController();
    fetch(`/api/rx-consult?ids=${encodeURIComponent(ids)}`, { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { specialty?: unknown } | null) => setSlug({ ids, value: typeof body?.specialty === "string" ? body.specialty : null }))
      .catch(() => undefined);
    return () => controller.abort();
  }, [ids]);

  return consultHref(locale, slug && slug.ids === ids ? slug.value : null);
}
