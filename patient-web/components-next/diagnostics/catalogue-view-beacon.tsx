"use client";

import { useEffect } from "react";
import { reportCatalogueEvent, type CatalogueVertical } from "@/lib/search/catalogue-events";

/** Counts a view of this lab, radiology or nursing service for the ranking (the browser reports it, the page may be cached). Draws nothing. */
export function CatalogueViewBeacon({ vertical, serviceId }: { vertical: CatalogueVertical; serviceId: string }) {
  useEffect(() => {
    reportCatalogueEvent(vertical, "view", serviceId);
  }, [vertical, serviceId]);
  return null;
}
