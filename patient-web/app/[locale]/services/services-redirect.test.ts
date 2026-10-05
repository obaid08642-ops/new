import { describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() => vi.fn((to: string) => { throw new Error(`REDIRECT:${to}`); }));
vi.mock("next/navigation", () => ({ redirect, notFound: () => { throw new Error("NOT_FOUND"); } }));

import ServicesIndexPage from "./page";

describe("/[locale]/services", () => {
  it("lands on Home, the services grid, in the same locale", async () => {
    await expect(ServicesIndexPage({ params: Promise.resolve({ locale: "ar" }) })).rejects.toThrow("REDIRECT:/ar");
    await expect(ServicesIndexPage({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("REDIRECT:/en");
  });
  it("404s an unknown locale instead of redirecting", async () => {
    await expect(ServicesIndexPage({ params: Promise.resolve({ locale: "xx" }) })).rejects.toThrow("NOT_FOUND");
  });
});
