import { describe, expect, it } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-require-imports
import { matchHas, prepareDestination } from "next/dist/shared/lib/router/utils/prepare-destination";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import { localeOnlyRedirects } from "@/lib/routing/locale-redirects";
import { speedRedirects } from "@/lib/routing/speed-redirects";

/**
 * The pages that only redirect are served as config redirects (a plain 307 before any rendering). Each case is what the page did before
 * (app/[locale]/.../page.tsx), run through Next's own matcher and destination builder, in next.config order.
 */
const rules = localeOnlyRedirects(speedRedirects);

function follow(url: string): string | null {
  const u = new URL(url, "https://x.test");
  const query: Record<string, string> = Object.fromEntries(u.searchParams.entries());
  for (const r of rules) {
    const m = getPathMatch(r.source, { removeUnnamedParams: true, strict: true, sensitive: false })(u.pathname);
    if (!m) continue;
    let params = m as Record<string, string>;
    if (r.has) {
      const hm = matchHas({ headers: {}, cookies: {}, url: u.pathname + u.search } as never, query, r.has as never, (r.missing ?? []) as never);
      if (!hm) continue;
      params = { ...params, ...hm } as Record<string, string>;
    }
    const { parsedDestination } = prepareDestination({ appendParamsToQuery: false, destination: r.destination, params, query });
    const qs = new URLSearchParams(parsedDestination.query as Record<string, string>);
    return parsedDestination.pathname + (qs.toString() ? `?${qs.toString()}` : "");
  }
  return null;
}
const id = "7210a983-9756-4682-ae68-dcc5978d4ab5";
const other = "11111111-2222-4333-8444-555555555555";

describe("redirect-only pages are config redirects that land where the page did", () => {
  it.each([
    ["/ar/consultations/offers/abc", "/ar/offers"],
    ["/en/community/post-1", "/en/articles"],
    ["/ar/diagnostics/results", "/ar/orders?tab=results"],
    ["/ar/diagnostics/bookings", "/ar/orders"],
    ["/ar/diagnostics/bookings?tab=previous", "/ar/orders?tab=previous"],
    ["/ar/diagnostics/bookings?tab=upcoming", "/ar/orders?tab=upcoming"],   // the page sent plain /orders; the extra query is harmless there
    [`/ar/appointments/${id}/summary`, `/ar/appointments/${id}`],
    ["/ar/payments/failed", "/ar/payments/result"],
    ["/ar/payments/processing?ref=r1&id=i1", "/ar/payments/result?ref=r1&id=i1"],
    ["/ur/payments/success?orderId=o1", "/ur/payments/result?orderId=o1"],
    ["/ar/nursing/service-info", "/ar/nursing/catalog"],
    ["/ar/nursing/service-info?serviceId=svc-1", "/ar/home-care/services/svc-1?serviceId=svc-1"],
    ["/ar/consultations/clinic-location?appointmentId=a1", "/ar/consultations/booking-status?appointmentId=a1&view=location"],
    ["/ar/consultations/clinic-location", "/ar/consultations/booking-status?view=location"],
    ["/ar/consultations/waiting-room", "/ar/consultations/virtual-waiting-room"],
    ["/ar/consultations/waiting-room?appointmentId=a1", "/ar/consultations/virtual-waiting-room?appointmentId=a1"],
    ["/ar/consultations/waiting-room?id=a2", "/ar/consultations/virtual-waiting-room?id=a2&appointmentId=a2"],
    ["/ar/consultations/waiting-room?id=a2&appointmentId=a1", "/ar/consultations/virtual-waiting-room?id=a2&appointmentId=a1"],   // appointmentId wins, as in the page
    ["/ar/consultations/clinic-confirm", "/ar/consultations/booking-status"],
    ["/ar/consultations/clinic-confirm?appointmentId=a1&view=location", "/ar/consultations/booking-status?appointmentId=a1&view=location"],
    ["/ar/consultations/clinic-confirm?id=a2", "/ar/consultations/booking-status?id=a2&appointmentId=a2"],
    ["/ar/consultations/follow-up", "/ar/appointments"],
    [`/ar/consultations/follow-up?appointmentId=${id}`, `/ar/appointments/${id}?appointmentId=${id}`],
    [`/ar/consultations/follow-up?id=${id}`, `/ar/appointments/${id}?id=${id}`],
    [`/ar/consultations/prescription?appointmentId=${id}&id=${other}`, `/ar/appointments/${id}?appointmentId=${id}&id=${other}`],   // appointmentId wins
    ["/ar/consultations/prescription?appointmentId=not-an-id", "/ar/appointments?appointmentId=not-an-id"],
    [`/ar/consultations/prescription?appointmentId=not-an-id&id=${id}`, `/ar/appointments?appointmentId=not-an-id&id=${id}`],   // present but invalid: the page did not fall back to id
    ["/ar/pharmacy/filters", "/ar/c"],
    ["/ar/pharmacy/filters?category=all", "/ar/c?category=all"],
    ["/ar/pharmacy/filters?category=pain", "/ar/c/pain?category=pain"],
    ["/ar/pharmacy/filters?filter_category=skin&q=cream", "/ar/c/skin?filter_category=skin&q=cream"],
    ["/ar/pharmacy/filters?q=cream&page=2", "/ar/c?q=cream&page=2"],
  ])("%s -> %s", (from, to) => {
    expect(follow(from)).toBe(to);
  });

  it("a captured id that is not letters, digits, - and _ never reaches a path (the page still answers it)", () => {
    expect(follow("/ar/nursing/service-info?serviceId=../../x")).toBe("/ar/nursing/catalog?serviceId=..%2F..%2Fx");
    expect(follow("/ar/nursing/service-info?serviceId=a/b")).toBe("/ar/nursing/catalog?serviceId=a%2Fb");
    expect(follow("/ar/consultations/waiting-room?id=a/b")).toBe("/ar/consultations/virtual-waiting-room?id=a%2Fb");
    expect(follow("/ar/pharmacy/filters?category=../x")).toBe("/ar/c?category=..%2Fx");
    expect(follow("/ar/appointments/a%2Fb/summary")).toBeNull();
    expect(follow("/ar/appointments/a.b/summary")).toBeNull();
  });

  it("only a real locale matches, and nothing else is redirected", () => {
    expect(follow("/api/payments/success")).toBeNull();
    expect(follow("/ar/payments/result")).toBeNull();
    expect(follow("/ar/payments")).toBeNull();
    expect(follow("/ar/consultations/waiting-room/extra")).toBeNull();
  });
});
