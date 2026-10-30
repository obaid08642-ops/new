import { describe, expect, it } from "vitest";
import { parseOrdersQuery, ordersQuery } from "@/components-next/orders/orders-query";
import { webRouteForNotification } from "@/lib/api/notifications";
import { resultRows, type CenterLabels } from "@/components-next/orders/center-rows";

const labels = { diagnostics: (key: string) => key } as unknown as CenterLabels;

describe("orders and results tabs", () => {
  it("reads and writes the results tab", () => {
    expect(parseOrdersQuery({ tab: "results" }).tab).toBe("results");
    expect(ordersQuery("/ar/orders", "results", null)).toBe("/ar/orders?tab=results");
    expect(ordersQuery("/ar/orders", "current", null)).toBe("/ar/orders");
  });
  it("lists only bookings whose report is ready, with the PDF only when the booking holds a file", () => {
    const payload = [
      { id: "11111111-1111-4111-8111-111111111111", status: "REPORTED", reports: [{ id: "33333333-3333-4333-8333-333333333333", has_file: true }] },
      { id: "22222222-2222-4222-8222-222222222222", status: "SAMPLE_COLLECTED" },
    ];
    const rows = resultRows("en", "labs", payload, labels);
    expect(rows.map((r) => r.key)).toEqual(["result-labs-11111111-1111-4111-8111-111111111111"]);
    expect(rows[0].pdfHref).toBe("/api/patient/labs/bookings/11111111-1111-4111-8111-111111111111/reports/33333333-3333-4333-8333-333333333333");
    expect(rows[0].viewHref).toBe("/en/diagnostics/bookings/labs/11111111-1111-4111-8111-111111111111");
  });
  it("opens the results tab from a results-history notification", () => {
    expect(webRouteForNotification("/diagnostics/results-history", "en")).toBe("/en/orders?tab=results");
  });
});
