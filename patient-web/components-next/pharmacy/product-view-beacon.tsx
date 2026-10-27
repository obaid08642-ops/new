"use client";

import { useEffect } from "react";
import { reportRankingEvent } from "@/lib/search/ranking-events";

/** Counts a view of this medicine for the ranking (the page itself is cached, so the browser reports it). Draws nothing. */
export function ProductViewBeacon({ medicineId }: { medicineId: string }) {
  useEffect(() => {
    reportRankingEvent("product_viewed", medicineId);
  }, [medicineId]);
  return null;
}
