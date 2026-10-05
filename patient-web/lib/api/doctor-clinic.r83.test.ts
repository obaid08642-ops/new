import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { extractDoctor } from "./doctors";

// d0b9ce9 / R83: the clinic name and address the doctor registered appear on
// the website doctor pages (GET /care/doctors/:id and the entity-graph doctor).
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }), redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true, locales: ["ar", "en"] }));

const CARE_DOCTOR = {
  id: "doc-r83", name_ar: "د. ريم", specialty: "cardiology", consultation_modes: ["clinic"],
  clinic_name: "عيادة النخبة", clinic_address: "برج النخبة، شارع العليا 12",
};

describe("R83 on the website", () => {
  it("the doctor parser keeps the registered clinic name and address", () => {
    expect(extractDoctor({ data: CARE_DOCTOR })).toMatchObject({ clinicName: "عيادة النخبة", clinicAddress: "برج النخبة، شارع العليا 12" });
    expect(extractDoctor({ data: { id: "doc-x", name_ar: "د. س" } })).toMatchObject({ clinicName: undefined, clinicAddress: undefined });
  });

  it("the consultation doctor page shows them", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => String(input).includes("/slots")
      ? new Response(JSON.stringify({ date: "2026-10-05", service_type: "clinic", slots: [] }), { status: 200 })
      : new Response(JSON.stringify(CARE_DOCTOR), { status: 200 })));
    const { default: DoctorDetailPage } = await import("../../app/[locale]/consultations/doctors/[doctorId]/page");
    const html = renderToStaticMarkup(await DoctorDetailPage({ params: Promise.resolve({ locale: "ar", doctorId: "doc-r83" }), searchParams: Promise.resolve({}) }));
    expect(html).toContain("عيادة النخبة");
    expect(html).toContain("برج النخبة، شارع العليا 12");
    vi.unstubAllGlobals();
  });

  it("the clinic booking confirmation shows them", async () => {
    vi.doMock("@/lib/auth/session", () => ({ requirePatientAccess: async () => "token" }));
    vi.doMock("@/lib/api/upstream", () => ({
      callPatientApi: async (path: string) => path.startsWith("/care/appointments/")
        ? new Response(JSON.stringify({ id: "5b3c1d2e-1111-4222-8333-444455556666", doctor_id: "doc-r83", slot_start: "2026-10-06T09:00:00.000Z" }), { status: 200 })
        : new Response(JSON.stringify(CARE_DOCTOR), { status: 200 }),
    }));
    const { default: ConfirmPage } = await import("../../app/[locale]/consultations/clinic-confirm/page");
    const html = renderToStaticMarkup(await ConfirmPage({ params: Promise.resolve({ locale: "ar" }), searchParams: Promise.resolve({ appointmentId: "5b3c1d2e-1111-4222-8333-444455556666" }) }));
    expect(html).toContain("عيادة النخبة");
    expect(html).toContain("برج النخبة، شارع العليا 12");
  });

  it("the SEO doctor page shows the clinic from the entity-graph doctor", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      entity: { id: "doc-r83", slug: "dr-reem", name_ar: "د. ريم", specialty: "cardiology", clinic_name: "عيادة النخبة", clinic_address: "برج النخبة، شارع العليا 12" },
      relationships: { facility: null, accepted_insurance: [], treated_conditions: [] },
    }), { status: 200 })));
    const { default: DoctorSeoPage } = await import("../../app/[locale]/doctor/[slug]/page");
    const html = renderToStaticMarkup(await DoctorSeoPage({ params: Promise.resolve({ locale: "ar", slug: "dr-reem" }) } as never));
    expect(html).toContain("عيادة النخبة · برج النخبة، شارع العليا 12");
    vi.unstubAllGlobals();
  });
});
