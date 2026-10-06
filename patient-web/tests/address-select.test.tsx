import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const server = vi.hoisted(() => ({ addresses: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  redirect: (to: string) => { throw new Error(`redirect:${to}`); },
  notFound: () => { throw new Error("not-found"); },
}));
// the real en messages through the real ICU translator, so a missing key or a bad message fails here
vi.mock("next-intl", async () => {
  const actual = await vi.importActual<typeof import("next-intl")>("next-intl");
  const messages = (await import("./helpers/intl")).messagesFor("en");
  return { useTranslations: (namespace?: string) => actual.createTranslator({ locale: "en", messages: messages as never, namespace: namespace as never, onError: (error) => { throw error; } }), useLocale: () => "en" };
});
vi.mock("next-intl/server", async () => {
  const actual = await vi.importActual<typeof import("next-intl")>("next-intl");
  const messages = (await import("./helpers/intl")).messagesFor("en");
  return {
    getTranslations: async (arg: string | { locale?: string; namespace?: string }) =>
      actual.createTranslator({ locale: "en", messages: messages as never, namespace: (typeof arg === "string" ? arg : arg.namespace) as never, onError: (error) => { throw error; } }),
    setRequestLocale: vi.fn(),
  };
});
vi.mock("@/components-next/core/core-shell", () => ({
  CoreShell: ({ children, title, backHref }: { children: ReactNode; title?: string; backHref?: string }) => <div data-shell data-title={title} data-back={backHref}>{children}</div>,
}));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: async () => "server-only-token" }));
vi.mock("@/lib/api/addresses-server", () => ({ getPatientAddresses: server.addresses }));

import { AddressPicker } from "@/components-next/delivery-address/address-picker";
import { AddressSelectScreen } from "@/components-next/delivery-address/address-select-screen";

const render = (node: ReactNode) => renderToStaticMarkup(node).replace(/ /g, " ");
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => { server.addresses.mockReset(); });

describe("/delivery/address-select", () => {
  const rows = [
    { id: "a1", label: "Home", street: "12 King Fahd Rd", city: "Riyadh", district: "Olaya", lat: 24.7, lng: 46.7, is_default: true },
    { id: "a2", label: "Work", line1: "5 Tahlia St", city: "Riyadh" },
  ];

  it("lists the saved addresses through the shared parser: the default is marked, one without a location cannot be chosen and says why", async () => {
    server.addresses.mockResolvedValue(json(rows));
    const html = render(await AddressSelectScreen({ locale: "en" }));
    expect(html).toContain("Home");
    expect(html).toContain("12 King Fahd Rd");
    expect(html).toContain("Default");
    expect(html).toContain("Work");
    expect(html).toContain("No location");
    expect(html).toMatch(/<input[^>]*disabled[^>]*>(?:(?!<\/label>)[\s\S])*Work/);
    expect(html).toMatch(/<input[^>]*checked[^>]*>(?:(?!<\/label>)[\s\S])*Home/);
    expect(html).toContain("Use this address");
    expect(html).not.toContain("style=");
  });

  it("an address list that could not be read is an error with a retry, not an empty list; no address is the empty state", async () => {
    server.addresses.mockResolvedValue(new Response("{}", { status: 500 }));
    const failed = render(await AddressSelectScreen({ locale: "en" }));
    expect(failed).toContain("Your addresses could not be loaded");
    expect(failed).not.toContain("No saved addresses");
    server.addresses.mockResolvedValue(json([]));
    expect(render(await AddressSelectScreen({ locale: "en" }))).toContain("No saved addresses");
    server.addresses.mockResolvedValue(new Response("{}", { status: 401 }));
    await expect(AddressSelectScreen({ locale: "en" })).rejects.toThrow("redirect:/en/login");
  });

  it("the first address that has a location is in use when none is the default", () => {
    const html = render(<AddressPicker locale="en" addresses={[{ id: "x", label: "Far", street: null, city: null, district: null, lat: null, lng: null, isDefault: true }, { id: "y", label: "Near", street: null, city: null, district: null, lat: 1, lng: 2, isDefault: false }]} />);
    expect(html).toMatch(/<input[^>]*checked[^>]*>(?:(?!<\/label>)[\s\S])*Near/);
  });
});
