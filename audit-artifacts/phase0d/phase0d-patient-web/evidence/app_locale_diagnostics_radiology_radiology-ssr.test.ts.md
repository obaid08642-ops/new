# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/diagnostics/radiology/radiology-ssr.test.ts`
- **Member SHA-256:** `2ce96baa60859acb228e364a99149b7c0e8569a5d17aac1816f024f45ac8e8ad`
- **Line count:** 13
- **Read range:** `1-13`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: import RadiologyServicesPage from "./page";`
- `11: it("renders live services and forwards documented filters", async () => { state.services.mockResolvedValue(new Response(JSON.stringify([{ _id: "6a7600a27b25eeca204de283", name_en: "Chest X-Ray", modality: "xray", price: 90 }]), { status: 20`
- `12: it("renders an alert when the live catalog fails", async () => { state.services.mockResolvedValue(new Response("", { status: 503 })); const result=await RadiologyServicesPage({params:Promise.resolve({locale:"en"}),searchParams:Promise.resol`
### backend_consumers_or_contracts
- `3: vi.mock("@/lib/api/radiology-server", () => ({ getPublicRadiologyServices: state.services, getPublicRadiologyModalities: state.modalities }));`
### auth_ownership
- `8: function hasRole(value: unknown, role: string): boolean { if (!value || typeof value !== "object") return false; const n=value as {props?:{role?:string;children?:unknown}}; if(n.props?.role===role)return true; const c=n.props?.children; ret`
- `12: it("renders an alert when the live catalog fails", async () => { state.services.mockResolvedValue(new Response("", { status: 503 })); const result=await RadiologyServicesPage({params:Promise.resolve({locale:"en"}),searchParams:Promise.resol`
### state_transitions
- `2: const state = vi.hoisted(() => ({ services: vi.fn(), modalities: vi.fn() }));`
- `3: vi.mock("@/lib/api/radiology-server", () => ({ getPublicRadiologyServices: state.services, getPublicRadiologyModalities: state.modalities }));`
- `9: beforeEach(() => { state.services.mockReset(); state.modalities.mockReset(); state.modalities.mockResolvedValue(new Response(JSON.stringify(["mri", "xray"]), { status: 200 })); });`
- `11: it("renders live services and forwards documented filters", async () => { state.services.mockResolvedValue(new Response(JSON.stringify([{ _id: "6a7600a27b25eeca204de283", name_en: "Chest X-Ray", modality: "xray", price: 90 }]), { status: 20`
- `12: it("renders an alert when the live catalog fails", async () => { state.services.mockResolvedValue(new Response("", { status: 503 })); const result=await RadiologyServicesPage({params:Promise.resolve({locale:"en"}),searchParams:Promise.resol`
### payment_insurance_relevance
- `11: it("renders live services and forwards documented filters", async () => { state.services.mockResolvedValue(new Response(JSON.stringify([{ _id: "6a7600a27b25eeca204de283", name_en: "Chest X-Ray", modality: "xray", price: 90 }]), { status: 20`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
