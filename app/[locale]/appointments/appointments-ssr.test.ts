import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  getPatientAppointments: vi.fn(),
  getPatientAppointment: vi.fn(),
  getPatientUnifiedConsultation: vi.fn(),
  requirePatientAccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
  setRequestLocale: vi.fn(),
}));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true }));
vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));
vi.mock("@/lib/api/appointments-server", () => ({
  getPatientAppointments: state.getPatientAppointments,
  getPatientAppointment: state.getPatientAppointment,
  getPatientUnifiedConsultation: state.getPatientUnifiedConsultation,
}));

import AppointmentsPage from "./page";
import AppointmentDetailPage from "./[appointmentId]/page";

const appointmentId = "91047ef2-ad36-422a-a184-629693e7c729";
const serverToken = "server-only-access-token-should-never-reach-html";

describe("appointments SSR boundary", () => {
  beforeEach(() => {
    state.getPatientAppointments.mockReset();
    state.getPatientAppointment.mockReset();
    state.getPatientUnifiedConsultation.mockReset();
    state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);
  });

  it("renders the list through the server boundary without embedding the access token", async () => {
    state.getPatientAppointments.mockResolvedValue(new Response(JSON.stringify([{ id: appointmentId, service_type: "video", status: "CONFIRMED" }]), { status: 200 }));

    const html = renderToStaticMarkup(await AppointmentsPage({ params: Promise.resolve({ locale: "en" }) }));

    expect(state.getPatientAppointments).toHaveBeenCalledWith(serverToken);
    expect(html).not.toContain(serverToken);
    expect(html).toContain(`/en/appointments/${appointmentId}`);
  });

  it("renders appointment detail through the server boundary without embedding the access token", async () => {
    state.getPatientAppointment.mockResolvedValue(new Response(JSON.stringify({ id: appointmentId, service_type: "clinic", status: "CONFIRMED", doctor_name: "Verified provider", patient_name: "private-patient", patient_phone: "private-phone", clinical_notes: "private-notes", total_price: 500 }), { status: 200 }));

    const html = renderToStaticMarkup(await AppointmentDetailPage({ params: Promise.resolve({ locale: "en", appointmentId }) }));

    expect(state.getPatientAppointment).toHaveBeenCalledWith(serverToken, appointmentId);
    expect(html).not.toContain(serverToken);
    expect(html).toContain("Verified provider");
    expect(html).toContain('href="/en/appointments"');
    for (const secret of ["private-patient", "private-phone", "private-notes", "500"]) expect(html).not.toContain(secret);
  });
});
