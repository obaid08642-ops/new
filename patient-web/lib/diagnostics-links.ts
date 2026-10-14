/** Paths of the diagnostics booking pages. No zod here: client components import it. */
export type DiagnosticLinkDomain = "labs" | "radiology";

/** The booking detail lives under /bookings so labs/[labId] and radiology/[serviceId] cannot shadow it. */
export function diagnosticBookingHref(locale: string, domain: DiagnosticLinkDomain, bookingId: string): string {
  return `/${locale}/diagnostics/bookings/${domain}/${encodeURIComponent(bookingId)}`;
}

/**
 * Where to go once the order call answered. The order id is not a booking id: the answer lists one booking per line
 * (`lines[].booking_id`). One booking opens its confirmation page, anything else opens the bookings list.
 */
export function diagnosticOrderNextHref(locale: string, order: unknown): string {
  const lines = order && typeof order === "object" && Array.isArray((order as { lines?: unknown }).lines) ? (order as { lines: unknown[] }).lines : [];
  const bookings: Array<{ id: string; domain: DiagnosticLinkDomain }> = [];
  for (const line of lines) {
    if (!line || typeof line !== "object") continue;
    const { kind, booking_id: id } = line as { kind?: unknown; booking_id?: unknown };
    if (typeof id !== "string" || !id) continue;
    if (kind === "lab") bookings.push({ id, domain: "labs" });
    else if (kind === "radiology") bookings.push({ id, domain: "radiology" });
  }
  const first = bookings[0];
  if (bookings.length === 1 && first) return `/${locale}/diagnostics/booking-success?bookingId=${encodeURIComponent(first.id)}&domain=${first.domain}`;
  return `/${locale}/diagnostics/bookings`;
}
