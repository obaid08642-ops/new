import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ services: vi.fn(), modalities: vi.fn() }));
vi.mock("@/lib/api/radiology-server", () => ({ getPublicRadiologyServices: state.services, getPublicRadiologyModalities: state.modalities }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: (value: string) => value === "en" }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
import RadiologyServicesPage from "./page";
function hasRole(value: unknown, role: string): boolean { if (!value || typeof value !== "object") return false; const n=value as {props?:{role?:string;children?:unknown}}; if(n.props?.role===role)return true; const c=n.props?.children; return Array.isArray(c)?c.some(x=>hasRole(x,role)):hasRole(c,role); }
function hasText(value: unknown, text: string): boolean { if (typeof value === "string") return value.includes(text); if (!value || typeof value !== "object") return false; const n = value as { props?: { children?: unknown } }; const c = n.props?.children; return Array.isArray(c) ? c.some((x) => hasText(x, text)) : hasText(c, text); }
beforeEach(() => { state.services.mockReset(); state.modalities.mockReset(); state.modalities.mockResolvedValue(new Response(JSON.stringify(["mri", "xray"]), { status: 200 })); });
describe("Radiology Services SSR", () => {
  it("renders live services and forwards documented filters", async () => { state.services.mockResolvedValue(new Response(JSON.stringify([{ _id: "6a7600a27b25eeca204de283", name_en: "Chest X-Ray", modality: "xray", price: 90 }]), { status: 200 })); const result=await RadiologyServicesPage({params:Promise.resolve({locale:"en"}),searchParams:Promise.resolve({modality:"xray",home_visit:"1",search:"chest"})}); expect(hasText(result, "Chest X-Ray")).toBe(true); expect(state.services).toHaveBeenCalledWith(expect.objectContaining({modality:"xray",homeVisit:"true",search:"chest"})); });
  it("renders an alert when the live catalog fails", async () => { state.services.mockResolvedValue(new Response("", { status: 503 })); const result=await RadiologyServicesPage({params:Promise.resolve({locale:"en"}),searchParams:Promise.resolve({})}); expect(hasRole(result,"alert")).toBe(true); });
});
