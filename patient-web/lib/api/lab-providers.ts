export type LabProviderRow = { id: string; nameAr?: string; nameEn?: string; rating?: number; homeVisit: boolean };

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);

/** The approved labs of GET /providers?type=lab (the hub's "approved labs"): the id, the name, the rating and whether it collects at home. */
export function extractLabProviders(payload: unknown): LabProviderRow[] {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  const rows = Array.isArray(payload) ? payload : Array.isArray(root?.data) ? root.data : Array.isArray(root?.items) ? root.items : [];
  return rows.flatMap((value): LabProviderRow[] => {
    const row = value && typeof value === "object" ? (value as Record<string, unknown>) : null;
    const id = text(row?.id) ?? text(row?._id);
    if (!row || !id || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) return [];
    const nameAr = text(row.name_ar) ?? text(row.business_name_ar) ?? text(row.name) ?? text(row.business_name);
    const nameEn = text(row.name_en) ?? text(row.business_name_en) ?? text(row.name) ?? text(row.business_name);
    if (!nameAr && !nameEn) return [];
    const rating = Number(row.rating ?? row.rating_avg);
    return [{ id, nameAr, nameEn, rating: Number.isFinite(rating) && rating > 0 ? rating : undefined, homeVisit: Boolean(row.homeVisitAvailable ?? row.providesHome ?? row.home_visit_enabled) }];
  });
}
