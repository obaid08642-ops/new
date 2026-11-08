import type { Redirect } from "./locale-redirects";

/** An appointment id exactly as the pages checked it (lib/consult/appointment-view.ts APPOINTMENT_ID: a UUID). */
const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}";
/** follow-up and prescription: `appointmentId` (else `id`) when it is an appointment id, else the appointments list. `appointmentId` wins whenever it is present. */
const appointmentAlias = (page: string): Redirect[] => [
  { source: `/:locale/consultations/${page}`, has: [{ type: "query", key: "appointmentId", value: `(?<appointmentId>${UUID})` }], destination: "/:locale/appointments/:appointmentId", permanent: false },
  { source: `/:locale/consultations/${page}`, has: [{ type: "query", key: "id", value: `(?<id>${UUID})` }], missing: [{ type: "query", key: "appointmentId" }], destination: "/:locale/appointments/:id", permanent: false },
  { source: `/:locale/consultations/${page}`, destination: "/:locale/appointments", permanent: false },
];

// Speed re-sweep 2026-11-02: every page that only redirects, answered from the app (a full render of the shell, then the redirect) took
// 400 to 480 ms on production against 230 ms for the config redirects in next.config.ts and 135 ms for a plain page. These are the same redirects as plain
// 307s before any rendering (tests/speed-redirects.test.ts proves each one lands where its page did). The source query is forwarded; a
// captured id is limited to letters, digits, "-" and "_" (a path parameter is not encoded in the destination), anything else still reaches the page.
export const speedRedirects: Redirect[] = [
  { source: "/:locale/consultations/offers/:offerId", destination: "/:locale/offers", permanent: false },
  { source: "/:locale/diagnostics/results", destination: "/:locale/orders?tab=results", permanent: false },
  { source: "/:locale/diagnostics/bookings", has: [{ type: "query", key: "tab", value: "previous" }], destination: "/:locale/orders?tab=previous", permanent: false },
  { source: "/:locale/diagnostics/bookings", destination: "/:locale/orders", permanent: false },
  { source: "/:locale/appointments/:appointmentId([A-Za-z0-9_-]{1,64})/summary", destination: "/:locale/appointments/:appointmentId", permanent: false },
  { source: "/:locale/payments/:status(failed|processing|success)", destination: "/:locale/payments/result", permanent: false },
  { source: "/:locale/nursing/service-info", has: [{ type: "query", key: "serviceId", value: "(?<serviceId>[A-Za-z0-9_-]{1,100})" }], destination: "/:locale/home-care/services/:serviceId", permanent: false },
  { source: "/:locale/nursing/service-info", destination: "/:locale/nursing/catalog", permanent: false },
  { source: "/:locale/consultations/clinic-location", destination: "/:locale/consultations/booking-status?view=location", permanent: false },
  { source: "/:locale/consultations/waiting-room", has: [{ type: "query", key: "appointmentId" }], destination: "/:locale/consultations/virtual-waiting-room", permanent: false },
  { source: "/:locale/consultations/waiting-room", has: [{ type: "query", key: "id", value: "(?<id>[A-Za-z0-9_-]{1,64})" }], destination: "/:locale/consultations/virtual-waiting-room?appointmentId=:id", permanent: false },
  { source: "/:locale/consultations/waiting-room", destination: "/:locale/consultations/virtual-waiting-room", permanent: false },
  { source: "/:locale/consultations/clinic-confirm", has: [{ type: "query", key: "appointmentId" }], destination: "/:locale/consultations/booking-status", permanent: false },
  { source: "/:locale/consultations/clinic-confirm", has: [{ type: "query", key: "id", value: "(?<id>[A-Za-z0-9_-]{1,64})" }], destination: "/:locale/consultations/booking-status?appointmentId=:id", permanent: false },
  { source: "/:locale/consultations/clinic-confirm", destination: "/:locale/consultations/booking-status", permanent: false },
  { source: "/:locale/pharmacy/filters", has: [{ type: "query", key: "category", value: "(?<category>(?!all$)[A-Za-z0-9_-]{1,64})" }], destination: "/:locale/c/:category", permanent: false },
  { source: "/:locale/pharmacy/filters", has: [{ type: "query", key: "filter_category", value: "(?<filterCategory>(?!all$)[A-Za-z0-9_-]{1,64})" }], destination: "/:locale/c/:filterCategory", permanent: false },
  { source: "/:locale/pharmacy/filters", destination: "/:locale/c", permanent: false },
  ...appointmentAlias("follow-up"),
  ...appointmentAlias("prescription"),
];
