import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${values.number}` : key) }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("@/components-next/consult/consult-parts", () => ({ Notice: ({ children }: { children: unknown }) => <p data-notice>{children as string}</p> }));

import { CallLink, EMERGENCY_NUMBER } from "./call-link";
import { UrgentCall } from "./urgent-call";

const json = (body: unknown, ok = true) => ({ ok, json: async () => body });

describe("emergency call links", () => {
  beforeEach(() => state.callPatientApi.mockReset());

  it("CallLink is a real tel: anchor with the phone icon and the large primary button classes", () => {
    const html = renderToStaticMarkup(<CallLink dial={EMERGENCY_NUMBER} label="Call 997" />);
    expect(html).toContain('href="tel:997"');
    expect(html).toContain("nabd-button--primary");
    expect(html).toContain("nabd-button--lg");
    expect(html).toContain("<svg");
  });

  it("UrgentCall dials the number the admin set", async () => {
    state.callPatientApi.mockResolvedValue(json({ data: { phone: "+966 800 123 456" } }));
    const html = renderToStaticMarkup(await UrgentCall());
    expect(html).toContain('href="tel:+966800123456"');
    expect(html).not.toContain("urgentUnavailable");
  });

  it("UrgentCall without a number shows the honest note and the 997 call, never an invented number", async () => {
    for (const reply of [json({ phone: null }), json({}, false)]) {
      state.callPatientApi.mockResolvedValue(reply);
      const html = renderToStaticMarkup(await UrgentCall());
      expect(html).toContain("urgentUnavailable");
      expect(html).toContain('href="tel:997"');
      expect(html.match(/href="tel:/g)).toHaveLength(1);
    }
    state.callPatientApi.mockRejectedValue(new Error("down"));
    expect(renderToStaticMarkup(await UrgentCall())).toContain('href="tel:997"');
  });
});
