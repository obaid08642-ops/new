import { describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() => vi.fn((to: string) => { throw new Error(`REDIRECT:${to}`); }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); }, redirect }));
vi.mock("next-intl/server", () => ({ setRequestLocale: () => undefined }));

import NursingServiceInfoPage from "@/app/[locale]/nursing/service-info/page";

const visit = (serviceId?: string) => NursingServiceInfoPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ serviceId }) });

describe("nursing/service-info", () => {
  it("goes straight to the catalogue without an id (no home-care/services hop)", async () => {
    await expect(visit()).rejects.toThrow("REDIRECT:/en/nursing/catalog");
  });

  it("goes to the service page with an id", async () => {
    await expect(visit("svc 1")).rejects.toThrow("REDIRECT:/en/home-care/services/svc%201");
  });
});
