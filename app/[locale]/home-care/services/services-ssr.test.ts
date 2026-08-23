import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ list: vi.fn(), detail: vi.fn(), access: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.access }));
vi.mock("@/lib/api/home-care-services-server", () => ({ getPatientHomeCareServices: state.list, getPatientHomeCareService: state.detail }));
import HomeCareServicesPage from "./page";
import HomeCareServicePage from "./[serviceId]/page";

describe("home-care services SSR", () => {
  beforeEach(() => { state.list.mockReset().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })); state.detail.mockReset(); state.access.mockReset().mockResolvedValue("server-access"); });
  it("renders protected list fields only", async () => { state.list.mockResolvedValue(new Response(JSON.stringify([{ id: "svc-1", name_en: "Home nursing", price: 120, patient_id: "private" }]), { status: 200 })); const html = renderToStaticMarkup(await HomeCareServicesPage({ params: Promise.resolve({ locale: "en" }) })); expect(state.list).toHaveBeenCalledWith("server-access"); expect(html).toContain("Home nursing"); expect(html).not.toContain("private"); expect(html).not.toContain("access-token"); });
  it("renders protected detail without creating a booking or fallback data", async () => { state.detail.mockResolvedValue(new Response(JSON.stringify({ data: { id: "svc-1", name_en: "Home nursing", description_en: "Verified description", patient_id: "private" } }), { status: 200 })); const html = renderToStaticMarkup(await HomeCareServicePage({ params: Promise.resolve({ locale: "en", serviceId: "svc-1" }) })); expect(state.detail).toHaveBeenCalledWith("svc-1", "server-access"); expect(html).toContain("Verified description"); expect(html).not.toContain("private"); expect(html).not.toContain("/home-care/bookings"); expect(html).not.toContain("calendar-check"); });
});
