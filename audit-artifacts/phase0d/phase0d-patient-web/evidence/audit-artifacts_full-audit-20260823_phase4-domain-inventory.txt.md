# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/phase4-domain-inventory.txt`
- **Member SHA-256:** `1594d6262d1894dd71bb8b0d7a10c1eaca1b9810c3f36b13625de3fe0cc839f9`
- **Line count:** 407
- **Read range:** `1-407`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx:47:        const res = await apiFetch('/providers?type=lab');`
- `6: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx:55:        const res = await apiFetch('/insurance/companies');`
- `7: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx:73:        const res = await apiFetch(`/insurance/companies/${selCompany}/networks`);`
- `8: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx:124:        const res = await apiFetch('/ai/ocr-translate', {`
- `9: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx:358:                const res = await apiFetch('/orders/create', {`
- `12: /home/ubuntu/nabdah_review/extracted/mobile/app/nursing/live-tracking.tsx:85:        const res = await apiFetch(`/nursing/visits/${bookingId}/tracking`);`
- `15: /home/ubuntu/nabdah_review/extracted/mobile/app/nursing/nurse-profile.tsx:133:      const res = await apiFetch('/home-care/bookings', { method: 'POST', body: JSON.stringify(payload) });`
- `23: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/order/[id].tsx:35:          const res = await apiFetch(`/radiology/bookings/${id}`);`
- `24: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/order/[id].tsx:40:          const res = await apiFetch(`/labs/bookings/${id}`);`
- `25: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/order/[id].tsx:61:          const response = await apiFetch(`${base}/bookings/${id}/cancel`, { method: 'POST' });`
- `26: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/orders.tsx:31:          apiFetch("/labs/bookings/mine").catch(() => null),`
- `27: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/orders.tsx:32:          apiFetch("/radiology/bookings/mine").catch(() => null),`
### backend_consumers_or_contracts
- `2: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/cart.tsx:30:      apiFetch(`/labs/compatible-providers?testIds=${ids}`)`
- `3: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-approval.tsx:37:        const res = await apiFetch(`/orders/${orderId}`);`
- `4: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-approval.tsx:78:        await apiFetch(`/orders/${orderId}/items/${item.id}/opt-in-cash`, {`
- `5: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx:47:        const res = await apiFetch('/providers?type=lab');`
- `6: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx:55:        const res = await apiFetch('/insurance/companies');`
- `7: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx:73:        const res = await apiFetch(`/insurance/companies/${selCompany}/networks`);`
- `8: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx:124:        const res = await apiFetch('/ai/ocr-translate', {`
- `9: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx:358:                const res = await apiFetch('/orders/create', {`
- `10: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/lab-comparison.tsx:34:      apiFetch(`/labs/services/${id}`),`
- `11: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/lab-comparison.tsx:35:      apiFetch(`/labs/compatible-providers?testIds=${id}`)`
- `12: /home/ubuntu/nabdah_review/extracted/mobile/app/nursing/live-tracking.tsx:85:        const res = await apiFetch(`/nursing/visits/${bookingId}/tracking`);`
- `13: /home/ubuntu/nabdah_review/extracted/mobile/app/nursing/nurse-profile.tsx:88:        const nurseData = await apiFetch(`/home-care/providers/${nurseId}`);`
### auth_ownership
- `19: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/lab/[id].tsx:29:          apiFetch(`/labs/services?providerId=${id}`)`
- `203: lib/api/settings.ts:7:const sessionSchema = z.object({ device: z.string().max(160).nullable().optional(), expires_in_seconds: z.number().int().min(0).max(31536000).optional() }).passthrough();`
- `207: app/api/appointments/[appointmentId]/call-token/route.ts:18:  if (!upstream.ok) return NextResponse.json(data || { message: "call_token_unavailable" }, { status: upstream.status, headers: { "cache-control": "no-store" } });`
- `212: lib/api/sandbox-prescriptions-contract.test.ts:28:    const response = await fetch(`${baseUrl}/prescriptions/mine`, { headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(12_000) });`
- `213: lib/api/sandbox-prescriptions-contract.test.ts:34:  it("rejects the self-scoped prescription list without a patient session", async () => {`
- `215: lib/api/sandbox-order-ownership.test.ts:32:    const ownerResponse = await fetch(`${baseUrl}/orders/${sandboxOrderId}`, { headers: { authorization: `Bearer ${ownerToken}` } });`
- `216: lib/api/sandbox-order-ownership.test.ts:35:    const otherResponse = await fetch(`${baseUrl}/orders/${sandboxOrderId}`, { headers: { authorization: `Bearer ${otherToken}` } });`
- `223: lib/api/sandbox-home-care-contract.test.ts:31:  it("allows the owner to read their list and rejects another patient for any available detail", async () => {`
- `224: lib/api/sandbox-home-care-contract.test.ts:36:    const list = await fetch(`${baseUrl}/home-care/bookings/my`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) });`
- `225: lib/api/sandbox-home-care-contract.test.ts:40:    const ownerDetail = await fetch(`${baseUrl}/home-care/bookings/${encodeURIComponent(bookingId)}`, { headers: { authorization: `Bearer ${ownerToken}` }, signal: AbortSignal.timeout(12_000) })`
- `226: lib/api/sandbox-home-care-contract.test.ts:42:    const otherDetail = await fetch(`${baseUrl}/home-care/bookings/${encodeURIComponent(bookingId)}`, { headers: { authorization: `Bearer ${otherToken}` }, signal: AbortSignal.timeout(12_000) })`
- `246: lib/api/sandbox-diagnostics-contracts.test.ts:36:  it("allows the owner to read list endpoints and rejects another patient for any available detail", async () => {`
### state_transitions
- `20: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/broadcast-status.tsx:29:        const response = await apiFetch(`/orders/bids/request/${orderId}`);`
- `21: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/broadcast-status.tsx:46:      await apiFetch(`/orders/bids/${bidId}/accept`, { method: 'POST' });`
- `25: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/order/[id].tsx:61:          const response = await apiFetch(`${base}/bookings/${id}/cancel`, { method: 'POST' });`
- `41: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/waiting-for-pharmacy.tsx:132:            if (orderId) await apiFetch(`/orders/${orderId}/cancel`, { method: "POST" });`
- `44: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/order-confirm.tsx:65:      await apiFetch(`/orders/${orderId}/reject-basket`, { method: 'POST', body: JSON.stringify({ reason: 'patient-rejected-price' }) });`
- `124: lib/api/radiology.test.ts:10:  it("accepts only bounded public identifiers", () => { expect(parseRadiologyServiceId("6a7600a27b25eeca204de283").success).toBe(true); expect(parseRadiologyServiceId("https://evil.test").success).toBe(false); }`
- `130: lib/api/radiology.ts:17:function parse(value: unknown): RadiologyService|null { const p=serviceSchema.safeParse(value); if(!p.success || (!p.data._id&&!p.data.id) || (!p.data.name_ar&&!p.data.name_en)) return null; const x=p.data; return { `
- `143: lib/api/labs.test.ts:13:    expect(parseLabServiceId("bad/id").success).toBe(false);`
- `144: lib/api/claims.test.ts:6:    expect(parseClaims({ data: [{ id: "claim-1", service: "Lab", status: "approved", date: "2026-08-20", patient_id: "private", amount: 500, covered: 400, documents: [{ url: "private" }] }] })).toEqual([{ id: "claim`
- `145: lib/api/claims.test.ts:10:    expect(parseClaims([{ id: "", service: "Lab" }, { id: "claim-2", status: "unknown" }])).toEqual([]);`
- `148: lib/api/labs-server.ts:12:  if (!parseLabServiceId(packageId).success) throw new Error("invalid_lab_package_id");`
- `176: lib/api/doctors.ts:15:export function extractDoctors(payload: unknown): DoctorRow[] { return rowsFrom(payload).flatMap((value) => { const parsed=doctorSchema.safeParse(value); if(!parsed.success) return []; const d=parsed.data; const id=d.i`
### payment_insurance_relevance
- `3: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-approval.tsx:37:        const res = await apiFetch(`/orders/${orderId}`);`
- `4: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-approval.tsx:78:        await apiFetch(`/orders/${orderId}/items/${item.id}/opt-in-cash`, {`
- `5: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx:47:        const res = await apiFetch('/providers?type=lab');`
- `6: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx:55:        const res = await apiFetch('/insurance/companies');`
- `7: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx:73:        const res = await apiFetch(`/insurance/companies/${selCompany}/networks`);`
- `8: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx:124:        const res = await apiFetch('/ai/ocr-translate', {`
- `9: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/insurance-upload.tsx:358:                const res = await apiFetch('/orders/create', {`
- `14: /home/ubuntu/nabdah_review/extracted/mobile/app/nursing/nurse-profile.tsx:93:          const insData = await apiFetch(`/insurance/coverage-check?provider_id=${nurseId}&service_type=home_nursing`).catch(() => null);`
- `15: /home/ubuntu/nabdah_review/extracted/mobile/app/nursing/nurse-profile.tsx:133:      const res = await apiFetch('/home-care/bookings', { method: 'POST', body: JSON.stringify(payload) });`
- `29: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/payment.tsx:41:      const data = await apiFetch(`/orders/${orderId}`);`
- `44: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/order-confirm.tsx:65:      await apiFetch(`/orders/${orderId}/reject-basket`, { method: 'POST', body: JSON.stringify({ reason: 'patient-rejected-price' }) });`
- `55: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/checkout.tsx:67:    apiFetch('/wallet/balance').then((r: any) => setWalletBalance(Number(r?.balance || 0))).catch(() => {});`
### error_empty_loading_retry_cancel
- `14: /home/ubuntu/nabdah_review/extracted/mobile/app/nursing/nurse-profile.tsx:93:          const insData = await apiFetch(`/insurance/coverage-check?provider_id=${nurseId}&service_type=home_nursing`).catch(() => null);`
- `25: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/order/[id].tsx:61:          const response = await apiFetch(`${base}/bookings/${id}/cancel`, { method: 'POST' });`
- `26: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/orders.tsx:31:          apiFetch("/labs/bookings/mine").catch(() => null),`
- `27: /home/ubuntu/nabdah_review/extracted/mobile/app/diagnostics/orders.tsx:32:          apiFetch("/radiology/bookings/mine").catch(() => null),`
- `41: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/waiting-for-pharmacy.tsx:132:            if (orderId) await apiFetch(`/orders/${orderId}/cancel`, { method: "POST" });`
- `55: /home/ubuntu/nabdah_review/extracted/mobile/app/pharmacy/checkout.tsx:67:    apiFetch('/wallet/balance').then((r: any) => setWalletBalance(Number(r?.balance || 0))).catch(() => {});`
- `148: lib/api/labs-server.ts:12:  if (!parseLabServiceId(packageId).success) throw new Error("invalid_lab_package_id");`
- `149: lib/api/labs-server.ts:13:  try { return await fetch(patientApiUrl(`/labs/packages/${packageId}`), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }`
- `190: lib/api/home-care-services-server.ts:13:  try { return await fetch(patientApiUrl(servicePath("/home-care/services")), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }`
- `191: lib/api/home-care-services-server.ts:18:  try { return await fetch(patientApiUrl(servicePath(`/home-care/services/${serviceId}`)), { headers: { Accept: "application/json" }, cache: "no-store" }); } catch { return null; }`
- `209: lib/api/sandbox-profile-contracts.test.ts:92:      expect(["available", "empty"]).toContain(profileDomainState(response.status, fields.length));`
- `211: lib/api/sandbox-prescriptions-contract.test.ts:24:  it("reads the current patient's prescription list without sending, substituting, or uploading", async () => {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
