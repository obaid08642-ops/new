/**
 * How many filters are on, never counting a default (owner review 2026-10-27, G6). The count shown beside a filter sheet and the
 * "Reset" link both come from here, so the badge always equals the number of things Reset would clear.
 */
import type { HubFilter } from "@/lib/diagnostics-hub";

/** Hub (labs / radiology): "show" is a labs-only option; sort counts for both kinds. The place and payment switches are the order context, not filters. */
export function hubFilterCount(filter: Pick<HubFilter, "show" | "sort">, kind: "labs" | "radiology"): number {
  return (kind === "labs" && filter.show ? 1 : 0) + (filter.sort ? 1 : 0);
}

/** The radiology catalogue page: scan type, body part, home visit, lowest price first, highest rated first. The search text is not a filter. */
export function radiologyFilterCount(f: { modality?: string; bodyPart?: string; homeVisit?: boolean; lowestPrice?: boolean; highestRated?: boolean }): number {
  return (f.modality ? 1 : 0) + (f.bodyPart ? 1 : 0) + (f.homeVisit ? 1 : 0) + (f.lowestPrice ? 1 : 0) + (f.highestRated ? 1 : 0);
}

/** The nurse list of a service: order, gender, available now, nationality (each counts only away from "any"). */
export function nurseFilterCount(f: { sort: string; gender: string; availableNow: boolean; nationality: string }): number {
  return (f.sort !== "any" ? 1 : 0) + (f.gender !== "any" ? 1 : 0) + (f.availableNow ? 1 : 0) + (f.nationality !== "any" ? 1 : 0);
}
