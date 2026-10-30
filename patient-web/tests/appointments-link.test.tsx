import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { AppointmentsLink, hasPatientHint } from "@/components-next/core/appointments-link";

const setCookie = (value: string) => vi.stubGlobal("document", { cookie: `nabd_session_hint=${value}` });

describe("AppointmentsLink badge request", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("makes no request for a signed-out visitor, a guest or an unknown session", () => {
    expect(hasPatientHint()).toBe(false);
    setCookie("n");
    expect(hasPatientHint()).toBe(false);
    setCookie("g.abc123");
    expect(hasPatientHint()).toBe(false);
  });
  it("asks only for a signed-in patient", () => {
    setCookie("p.abc123");
    expect(hasPatientHint()).toBe(true);
  });
  it("does not prefetch the auth-gated appointments page", () => {
    const html = renderToStaticMarkup(<AppointmentsLink locale="en" href="/en/appointments" />);
    expect(html).toContain('href="/en/appointments"');
    expect(html).toContain('data-testid="appointments-link"');
    // static markup does not show the prefetch flag, so pin it in the source
    expect(readFileSync("components-next/core/appointments-link.tsx", "utf8")).toContain("prefetch={false}");
  });
});
