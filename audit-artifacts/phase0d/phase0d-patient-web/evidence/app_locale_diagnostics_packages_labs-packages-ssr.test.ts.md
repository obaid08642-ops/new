# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/diagnostics/packages/labs-packages-ssr.test.ts`
- **Member SHA-256:** `875645bdea0e39a2fbabfbfafdcc4dd75f30c9cc9cc31c4c721355aca5ad6ab4`
- **Line count:** 41
- **Read range:** `1-41`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import LabsPackagesPage from "./page";`
- `10: import LabPackageDetailPage from "./[packageId]/page";`
- `32: const result = await LabsPackagesPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({}) });`
- `38: const result = await LabPackageDetailPage({ params: Promise.resolve({ locale: "en", packageId: "pkg-1" }) });`
### backend_consumers_or_contracts
- `4: vi.mock("@/lib/api/labs-server", () => ({ getPublicLabServices: state.getPublicLabServices, getPublicLabPackage: state.getPublicLabPackage }));`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `3: const state = vi.hoisted(() => ({ getPublicLabServices: vi.fn(), getPublicLabPackage: vi.fn() }));`
- `4: vi.mock("@/lib/api/labs-server", () => ({ getPublicLabServices: state.getPublicLabServices, getPublicLabPackage: state.getPublicLabPackage }));`
- `31: state.getPublicLabServices.mockResolvedValue(new Response(JSON.stringify([{ id: "pkg-1", name_en: "Wellness panel", is_package: true, included_services: ["cbc"] }]), { status: 200 }));`
- `37: state.getPublicLabPackage.mockResolvedValue(new Response(JSON.stringify({ id: "pkg-1", name_en: "Wellness panel", is_package: true, price: 120, included_services: ["cbc", "tsh"], preparation_en: ["Bring your request"] }), { status: 200 }));`
### payment_insurance_relevance
- `37: state.getPublicLabPackage.mockResolvedValue(new Response(JSON.stringify({ id: "pkg-1", name_en: "Wellness panel", is_package: true, price: 120, included_services: ["cbc", "tsh"], preparation_en: ["Bring your request"] }), { status: 200 }));`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
