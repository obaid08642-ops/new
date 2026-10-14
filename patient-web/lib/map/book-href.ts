export type MapProviderType = "doctor" | "hospital" | "pharmacy" | "lab" | "nursing";

/**
 * Where "Book" on a map result goes (issue 767): a hospital opens its facility page, a lab its page, a doctor the doctor's
 * page, and every other kind the medicine catalogue.
 */
export function mapBookHref(locale: string, provider: { id: string; type: MapProviderType }): string {
  const id = encodeURIComponent(provider.id);
  switch (provider.type) {
    case "hospital": return `/${locale}/facility/${id}`;
    case "lab": return `/${locale}/diagnostics/labs/${id}`;
    case "doctor": return `/${locale}/consultations/doctors/${id}`;
    default: return `/${locale}/c`;
  }
}
