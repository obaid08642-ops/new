# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/appointments/appointments-ssr.test.ts`
- **Member SHA-256:** `a5906aaf05ce865d3cae10c0c115f63859512d37932a1f8cd441531088b71692`
- **Line count:** 68
- **Read range:** `1-68`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn(), useRouter: () => ({ refresh: vi.fn() }) }));`
- `24: import AppointmentsPage from "./page";`
- `25: import AppointmentDetailPage from "./[appointmentId]/page";`
- `41: const html = renderToStaticMarkup(await AppointmentsPage({ params: Promise.resolve({ locale: "en" }) }));`
- `51: const html = renderToStaticMarkup(await AppointmentDetailPage({ params: Promise.resolve({ locale: "en", appointmentId }) }));`
- `56: expect(html).toContain('href="/en/appointments"');`
- `63: const html = renderToStaticMarkup(await AppointmentsPage({ params: Promise.resolve({ locale: "en" }) }));`
### backend_consumers_or_contracts
- `17: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `18: vi.mock("@/lib/api/appointments-server", () => ({`
- `45: expect(html).toContain(`/en/appointments/${appointmentId}`);`
- `56: expect(html).toContain('href="/en/appointments"');`
### auth_ownership
- `11: vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn(), useRouter: () => ({ refresh: vi.fn() }) }));`
- `17: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `28: const serverToken = "server-only-access-token-should-never-reach-html";`
- `35: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `38: it("renders the list through the server boundary without embedding the access token", async () => {`
- `43: expect(state.getPatientAppointments).toHaveBeenCalledWith(serverToken);`
- `44: expect(html).not.toContain(serverToken);`
- `48: it("renders appointment detail through the server boundary without embedding the access token", async () => {`
- `53: expect(state.getPatientAppointment).toHaveBeenCalledWith(serverToken, appointmentId);`
- `54: expect(html).not.toContain(serverToken);`
### state_transitions
- `4: const state = vi.hoisted(() => ({`
- `17: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `19: getPatientAppointments: state.getPatientAppointments,`
- `20: getPatientAppointment: state.getPatientAppointment,`
- `21: getPatientUnifiedConsultation: state.getPatientUnifiedConsultation,`
- `32: state.getPatientAppointments.mockReset();`
- `33: state.getPatientAppointment.mockReset();`
- `34: state.getPatientUnifiedConsultation.mockReset();`
- `35: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `39: state.getPatientAppointments.mockResolvedValue(new Response(JSON.stringify([{ id: appointmentId, service_type: "video", status: "CONFIRMED" }]), { status: 200 }));`
- `43: expect(state.getPatientAppointments).toHaveBeenCalledWith(serverToken);`
- `49: state.getPatientAppointment.mockResolvedValue(new Response(JSON.stringify({ id: appointmentId, service_type: "clinic", status: "CONFIRMED", doctor_name: "Verified provider", patient_name: "private-patient", patient_phone: "private-phone", c`
### payment_insurance_relevance
- `49: state.getPatientAppointment.mockResolvedValue(new Response(JSON.stringify({ id: appointmentId, service_type: "clinic", status: "CONFIRMED", doctor_name: "Verified provider", patient_name: "private-patient", patient_phone: "private-phone", c`
### error_empty_loading_retry_cancel
- `60: it("renders a truthful empty state without a self-link disguised as an action", async () => {`
- `65: expect(html).toContain("empty");`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
