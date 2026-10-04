import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { ToastViewport } from "../components-next/network/toast-viewport";
import { ConsultationPaymentAction } from "../components-next/consultation-payment-action";
import { PharmacyPaymentClient } from "../components-next/pharmacy-payment-client";
import { clearToasts, showToast } from "../lib/api/net/toast";

/**
 * P15.3 UI surface, tested the way this repo tests components (static markup,
 * node environment):
 *   - a forced failure reaches a visible toast;
 *   - payment screens never render a success state — idle shows the action plus
 *     an explicit "not confirmed" notice, and in-flight the runner (tested in
 *     lib/api/optimistic.test.ts) forbids any local success for these kinds.
 */

beforeEach(() => clearToasts());

describe("P15.3 — rollback toasts are visible", () => {
  it("renders nothing when there is nothing to explain", () => {
    expect(renderToStaticMarkup(<ToastViewport />)).toBe("");
  });

  it("renders the rollback title, message, reference and a labeled dismiss", () => {
    showToast({ kind: "error", title: "Change not saved", message: "We could not save that change.", reference: "abc123" });
    const html = renderToStaticMarkup(<ToastViewport />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Change not saved");
    expect(html).toContain("We could not save that change.");
    expect(html).toContain("abc123");
    expect(html).toContain('aria-label="dismiss"');
  });
});

describe("P15.3 — payment never looks confirmed before the server confirms", () => {
  it("consultation payment opens idle, with booking explicitly not a confirmation", () => {
    const html = renderToStaticMarkup(<ConsultationPaymentAction appointmentId="a1" />);
    // The idle action exists…
    expect(html).toContain("عرض خيارات الدفع الآمنة");
    // …the not-a-confirmation notice is always on screen…
    expect(html).toContain("إنشاء الموعد ليس تأكيداً للدفع");
    // …and no success/confirmation markup exists anywhere.
    expect(html).not.toContain("تم تأكيد");
    expect(html).not.toContain("تم الدفع");
    expect(html).not.toContain('role="alert"');
  });

  it("pharmacy payment opens loading, with no amount and no success", () => {
    const html = renderToStaticMarkup(<PharmacyPaymentClient orderId="o1" locale="en" />);
    expect(html).toContain("Loading…");
    expect(html).not.toContain("Amount due");
    expect(html).not.toContain("Redirecting");
  });
});
