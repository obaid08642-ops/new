import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getPublicLabServices: vi.fn(), getPublicLabPackage: vi.fn() }));
vi.mock("@/lib/api/labs-server", () => ({ getPublicLabServices: state.getPublicLabServices, getPublicLabPackage: state.getPublicLabPackage }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: (value: string) => value === "en" }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));

import LabsPackagesPage from "./page";
import LabPackageDetailPage from "./[packageId]/page";

function linksOf(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const node = value as { props?: { href?: string; children?: unknown } };
  const own = typeof node.props?.href === "string" ? [node.props.href] : [];
  const children = node.props?.children;
  const nested = Array.isArray(children) ? children.flatMap(linksOf) : linksOf(children);
  return [...own, ...nested];
}

function textOf(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (!value || typeof value !== "object") return "";
  const node = value as { props?: { children?: unknown } };
  const children = node.props?.children;
  return Array.isArray(children) ? children.map(textOf).join(" ") : textOf(children);
}

describe("Labs Packages SSR", () => {
  it("renders only live package rows and links to detail", async () => {
    state.getPublicLabServices.mockResolvedValue(new Response(JSON.stringify([{ id: "pkg-1", name_en: "Wellness panel", is_package: true, included_services: ["cbc"] }]), { status: 200 }));
    const result = await LabsPackagesPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({}) });
    expect(textOf(result)).toContain("Wellness panel");
    expect(linksOf(result)).toContain("/en/diagnostics/packages/pkg-1");
  });
  it("renders package detail facts from the live endpoint", async () => {
    state.getPublicLabPackage.mockResolvedValue(new Response(JSON.stringify({ id: "pkg-1", name_en: "Wellness panel", is_package: true, price: 120, included_services: ["cbc", "tsh"], preparation_en: ["Bring your request"] }), { status: 200 }));
    const result = await LabPackageDetailPage({ params: Promise.resolve({ locale: "en", packageId: "pkg-1" }) });
    expect(textOf(result)).toContain("Wellness panel");
  });
});
