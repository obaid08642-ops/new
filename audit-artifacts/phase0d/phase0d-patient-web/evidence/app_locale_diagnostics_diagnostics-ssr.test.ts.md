# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/diagnostics/diagnostics-ssr.test.ts`
- **Member SHA-256:** `32f350c714335c345a5489683346309fa382c81235dd5ad13ddb9a01eb78269b`
- **Line count:** 54
- **Read range:** `1-54`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: const state = vi.hoisted(() => ({ getDiagnosticBookings: vi.fn(), getDiagnosticBooking: vi.fn(), requirePatientAccess: vi.fn() }));`
- `10: vi.mock("@/lib/api/diagnostics-server", () => ({ getDiagnosticBookings: state.getDiagnosticBookings, getDiagnosticBooking: state.getDiagnosticBooking }));`
- `12: import DiagnosticsPage from "./page";`
- `13: import DiagnosticDetailPage from "./[domain]/[bookingId]/page";`
- `15: const bookingId = "91047ef2-ad36-422a-a184-629693e7c729";`
- `21: state.getDiagnosticBookings.mockReset();`
- `22: state.getDiagnosticBooking.mockReset();`
- `27: state.getDiagnosticBookings`
- `28: .mockResolvedValueOnce(new Response(JSON.stringify([{ id: bookingId, state: "CONFIRMED", patient_name: "private", total_price: 500 }]), { status: 200 }))`
- `31: const html = renderToStaticMarkup(await DiagnosticsPage({ params: Promise.resolve({ locale: "en" }) }));`
- `33: expect(state.getDiagnosticBookings).toHaveBeenNthCalledWith(1, serverToken, "labs");`
- `34: expect(state.getDiagnosticBookings).toHaveBeenNthCalledWith(2, serverToken, "radiology");`
### backend_consumers_or_contracts
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `10: vi.mock("@/lib/api/diagnostics-server", () => ({ getDiagnosticBookings: state.getDiagnosticBookings, getDiagnosticBooking: state.getDiagnosticBooking }));`
- `38: expect(html).toContain(`/en/diagnostics/labs/${bookingId}`);`
### auth_ownership
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `16: const serverToken = "server-only-diagnostic-token-never-in-html";`
- `23: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `26: it("renders list data through both server boundaries without embedding the token or sensitive fields", async () => {`
- `33: expect(state.getDiagnosticBookings).toHaveBeenNthCalledWith(1, serverToken, "labs");`
- `34: expect(state.getDiagnosticBookings).toHaveBeenNthCalledWith(2, serverToken, "radiology");`
- `35: expect(html).not.toContain(serverToken);`
- `46: expect(state.getDiagnosticBooking).toHaveBeenCalledWith(serverToken, "labs", bookingId);`
- `47: expect(html).not.toContain(serverToken);`
### state_transitions
- `4: const state = vi.hoisted(() => ({ getDiagnosticBookings: vi.fn(), getDiagnosticBooking: vi.fn(), requirePatientAccess: vi.fn() }));`
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `10: vi.mock("@/lib/api/diagnostics-server", () => ({ getDiagnosticBookings: state.getDiagnosticBookings, getDiagnosticBooking: state.getDiagnosticBooking }));`
- `21: state.getDiagnosticBookings.mockReset();`
- `22: state.getDiagnosticBooking.mockReset();`
- `23: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `27: state.getDiagnosticBookings`
- `28: .mockResolvedValueOnce(new Response(JSON.stringify([{ id: bookingId, state: "CONFIRMED", patient_name: "private", total_price: 500 }]), { status: 200 }))`
- `29: .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));`
- `33: expect(state.getDiagnosticBookings).toHaveBeenNthCalledWith(1, serverToken, "labs");`
- `34: expect(state.getDiagnosticBookings).toHaveBeenNthCalledWith(2, serverToken, "radiology");`
- `42: state.getDiagnosticBooking.mockResolvedValue(new Response(JSON.stringify({ id: bookingId, state: "CONFIRMED", patient_phone: "private", reports: [{ url: reportUrl }], documents: [{ url_or_b64: reportUrl }], signed_report_pdf_url: reportUrl,`
### payment_insurance_relevance
- `28: .mockResolvedValueOnce(new Response(JSON.stringify([{ id: bookingId, state: "CONFIRMED", patient_name: "private", total_price: 500 }]), { status: 200 }))`
- `42: state.getDiagnosticBooking.mockResolvedValue(new Response(JSON.stringify({ id: bookingId, state: "CONFIRMED", patient_phone: "private", reports: [{ url: reportUrl }], documents: [{ url_or_b64: reportUrl }], signed_report_pdf_url: reportUrl,`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
