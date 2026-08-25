# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/prescriptions/prescriptions-ssr.test.ts`
- **Member SHA-256:** `602043a3d8c038d7f19c8d6d03acef0e108bef01f72dd9f42e887c81882d7728`
- **Line count:** 51
- **Read range:** `1-51`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: import PrescriptionsPage from "./page";`
- `13: import PrescriptionDetailPage from "./[prescriptionId]/page";`
- `26: state.getPatientPrescriptions.mockResolvedValue(new Response(JSON.stringify({ prescriptions: [{ id: prescriptionId, state: "CREATED_BY_DOCTOR", createdAt: "2026-08-20T10:00:00.000Z", items: [{ medicine_name_ar: "private-medicine", dose: "pr`
- `28: const html = renderToStaticMarkup(await PrescriptionsPage({ params: Promise.resolve({ locale: "en" }) }));`
- `34: expect(html).not.toMatch(/href="[^"]*private-prescription/i);`
- `45: const html = renderToStaticMarkup(await PrescriptionDetailPage({ params: Promise.resolve({ locale: "en", prescriptionId }) }));`
### backend_consumers_or_contracts
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `10: vi.mock("@/lib/api/prescriptions-server", () => ({ getPatientPrescriptions: state.getPatientPrescriptions }));`
### auth_ownership
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `16: const serverToken = "server-only-prescription-token-never-in-html";`
- `22: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `25: it("renders bounded patient prescription metadata without diagnosis, instructions, file, or token", async () => {`
- `30: expect(state.getPatientPrescriptions).toHaveBeenCalledWith(serverToken);`
- `33: for (const secret of [serverToken, prescriptionId, "private-dose", "private-instructions", "private-patient", "private-diagnosis", "private-notes", fileUrl]) expect(html).not.toContain(secret);`
- `41: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `49: for (const secret of [serverToken, prescriptionId, "private-dose", "private-instructions"]) expect(html).not.toContain(secret);`
### state_transitions
- `4: const state = vi.hoisted(() => ({ getPatientPrescriptions: vi.fn(), requirePatientAccess: vi.fn() }));`
- `9: vi.mock("@/lib/auth/session", () => ({ requirePatientAccess: state.requirePatientAccess }));`
- `10: vi.mock("@/lib/api/prescriptions-server", () => ({ getPatientPrescriptions: state.getPatientPrescriptions }));`
- `21: state.getPatientPrescriptions.mockReset();`
- `22: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `26: state.getPatientPrescriptions.mockResolvedValue(new Response(JSON.stringify({ prescriptions: [{ id: prescriptionId, state: "CREATED_BY_DOCTOR", createdAt: "2026-08-20T10:00:00.000Z", items: [{ medicine_name_ar: "private-medicine", dose: "pr`
- `30: expect(state.getPatientPrescriptions).toHaveBeenCalledWith(serverToken);`
- `40: state.getPatientPrescriptions.mockReset();`
- `41: state.requirePatientAccess.mockReset().mockResolvedValue(serverToken);`
- `46: expect(html).toContain("contractPending");`
- `47: expect(state.requirePatientAccess).toHaveBeenCalledWith("en");`
- `48: expect(state.getPatientPrescriptions).not.toHaveBeenCalled();`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `46: expect(html).toContain("contractPending");`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
