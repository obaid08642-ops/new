# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/insurance_catalog_api_consumers_20260820.txt`
- **Member SHA-256:** `69afa5fedc72f41af0ac9834977ee4407fceb568682b19fd2f124097ef336ecf`
- **Line count:** 86
- **Read range:** `1-86`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: admin/src/pages/admin/legal-policies.tsx:13:      apiFetch('/legal/policies').catch(() => []),`
- `2: admin/src/pages/admin/legal-policies.tsx:22:    const full = await apiFetch(`/legal/policy/${key}`).catch(() => null);`
- `3: admin/src/pages/admin/legal-policies.tsx:29:    await apiFetch(`/admin/legal/policy/${editing}`, {`
- `4: admin/src/pages/admin/insurance-queue.tsx:36:        apiFetch('/admin/insurance/stats').catch(() => null),`
- `5: admin/src/pages/admin/insurance-queue.tsx:37:        apiFetch(`/admin/insurance/requests${stateFilter ? `?state=${stateFilter}` : ''}`).catch(() => []),`
- `6: admin/src/pages/admin/insurance-companies.tsx:46:      const res = await apiFetch('/insurance/companies/all');`
- `7: admin/src/pages/admin/insurance-companies.tsx:61:      await apiFetch(`/insurance/companies/${id}`, {`
- `8: admin/src/pages/admin/insurance-companies.tsx:80:      await apiFetch('/insurance/companies', {`
- `9: admin/src/pages/admin/insurance-companies.tsx:98:      await apiFetch(`/insurance/companies/${editId}`, {`
- `10: admin/src/pages/admin/insurance-companies.tsx:118:      await apiFetch(`/insurance/companies/${tierCompany}/networks`, {`
- `11: admin/src/pages/admin/insurance-companies.tsx:141:      await apiFetch(`/insurance/companies/${companyId}/networks/${tier.id || tier._id}`, { method: 'DELETE' });`
- `14: patient/app/profile/index.tsx:23:  { icon: 'shield', label: 'التأمين الطبي', route: '/profile/insurance', color: '#4F46E5' },`
### backend_consumers_or_contracts
- `1: admin/src/pages/admin/legal-policies.tsx:13:      apiFetch('/legal/policies').catch(() => []),`
- `2: admin/src/pages/admin/legal-policies.tsx:22:    const full = await apiFetch(`/legal/policy/${key}`).catch(() => null);`
- `3: admin/src/pages/admin/legal-policies.tsx:29:    await apiFetch(`/admin/legal/policy/${editing}`, {`
- `4: admin/src/pages/admin/insurance-queue.tsx:36:        apiFetch('/admin/insurance/stats').catch(() => null),`
- `5: admin/src/pages/admin/insurance-queue.tsx:37:        apiFetch(`/admin/insurance/requests${stateFilter ? `?state=${stateFilter}` : ''}`).catch(() => []),`
- `6: admin/src/pages/admin/insurance-companies.tsx:46:      const res = await apiFetch('/insurance/companies/all');`
- `7: admin/src/pages/admin/insurance-companies.tsx:61:      await apiFetch(`/insurance/companies/${id}`, {`
- `8: admin/src/pages/admin/insurance-companies.tsx:80:      await apiFetch('/insurance/companies', {`
- `9: admin/src/pages/admin/insurance-companies.tsx:98:      await apiFetch(`/insurance/companies/${editId}`, {`
- `10: admin/src/pages/admin/insurance-companies.tsx:118:      await apiFetch(`/insurance/companies/${tierCompany}/networks`, {`
- `11: admin/src/pages/admin/insurance-companies.tsx:141:      await apiFetch(`/insurance/companies/${companyId}/networks/${tier.id || tier._id}`, { method: 'DELETE' });`
- `12: admin/src/components/AdminGuard.tsx:24:      { href: '/admin/insurance-queue', label: 'التأمين والمستردات', icon: '' },`
### auth_ownership
- `1: admin/src/pages/admin/legal-policies.tsx:13:      apiFetch('/legal/policies').catch(() => []),`
- `2: admin/src/pages/admin/legal-policies.tsx:22:    const full = await apiFetch(`/legal/policy/${key}`).catch(() => null);`
- `3: admin/src/pages/admin/legal-policies.tsx:29:    await apiFetch(`/admin/legal/policy/${editing}`, {`
- `4: admin/src/pages/admin/insurance-queue.tsx:36:        apiFetch('/admin/insurance/stats').catch(() => null),`
- `5: admin/src/pages/admin/insurance-queue.tsx:37:        apiFetch(`/admin/insurance/requests${stateFilter ? `?state=${stateFilter}` : ''}`).catch(() => []),`
- `6: admin/src/pages/admin/insurance-companies.tsx:46:      const res = await apiFetch('/insurance/companies/all');`
- `7: admin/src/pages/admin/insurance-companies.tsx:61:      await apiFetch(`/insurance/companies/${id}`, {`
- `8: admin/src/pages/admin/insurance-companies.tsx:80:      await apiFetch('/insurance/companies', {`
- `9: admin/src/pages/admin/insurance-companies.tsx:98:      await apiFetch(`/insurance/companies/${editId}`, {`
- `10: admin/src/pages/admin/insurance-companies.tsx:118:      await apiFetch(`/insurance/companies/${tierCompany}/networks`, {`
- `11: admin/src/pages/admin/insurance-companies.tsx:141:      await apiFetch(`/insurance/companies/${companyId}/networks/${tier.id || tier._id}`, { method: 'DELETE' });`
- `12: admin/src/components/AdminGuard.tsx:24:      { href: '/admin/insurance-queue', label: 'التأمين والمستردات', icon: '' },`
### state_transitions
- `5: admin/src/pages/admin/insurance-queue.tsx:37:        apiFetch(`/admin/insurance/requests${stateFilter ? `?state=${stateFilter}` : ''}`).catch(() => []),`
- `61: patient/app/insurance/claim-tracking.tsx:112:                <TouchableOpacity onPress={() => router.push('/insurance/refund-status')}`
- `70: patient/app/insurance/approval-pending.tsx:32:          req = await apiFetch(`/insurance/requests/${params.requestId}`).catch(() => null);`
- `71: patient/app/insurance/approval-pending.tsx:34:          const list = await apiFetch('/insurance/requests/my').catch(() => []);`
- `72: patient/app/insurance/approval-pending.tsx:87:        <Button label="متابعة حالة الطلبات" variant="ghost" icon="refresh" onPress={() => router.push('/insurance/claim-tracking')} />`
- `83: provider/src/screens/radiology/RadiologyDashboard.tsx:214:    try { await client.post(`/radiology/bookings/${currentOrder.id}/insurance-approval`, { approval_code: nphiesCode, copay: parseFloat(copay) || 0 }); show(tr('تم إرسال التأمين للمر`
- `84: provider/src/screens/pharmacy/PharmacyDashboard.tsx:1305:      const res = await client.post(`/provider/pharmacy/orders/${orderId}/insurance`, { policyNo: nphiesData.policyNo, authCode: nphiesData.authCode, copay: Number(nphiesData.copay) |`
### payment_insurance_relevance
- `4: admin/src/pages/admin/insurance-queue.tsx:36:        apiFetch('/admin/insurance/stats').catch(() => null),`
- `5: admin/src/pages/admin/insurance-queue.tsx:37:        apiFetch(`/admin/insurance/requests${stateFilter ? `?state=${stateFilter}` : ''}`).catch(() => []),`
- `6: admin/src/pages/admin/insurance-companies.tsx:46:      const res = await apiFetch('/insurance/companies/all');`
- `7: admin/src/pages/admin/insurance-companies.tsx:61:      await apiFetch(`/insurance/companies/${id}`, {`
- `8: admin/src/pages/admin/insurance-companies.tsx:80:      await apiFetch('/insurance/companies', {`
- `9: admin/src/pages/admin/insurance-companies.tsx:98:      await apiFetch(`/insurance/companies/${editId}`, {`
- `10: admin/src/pages/admin/insurance-companies.tsx:118:      await apiFetch(`/insurance/companies/${tierCompany}/networks`, {`
- `11: admin/src/pages/admin/insurance-companies.tsx:141:      await apiFetch(`/insurance/companies/${companyId}/networks/${tier.id || tier._id}`, { method: 'DELETE' });`
- `12: admin/src/components/AdminGuard.tsx:24:      { href: '/admin/insurance-queue', label: 'التأمين والمستردات', icon: '' },`
- `13: admin/src/components/AdminGuard.tsx:25:      { href: '/admin/insurance-companies', label: 'شركات التأمين', icon: '' },`
- `14: patient/app/profile/index.tsx:23:  { icon: 'shield', label: 'التأمين الطبي', route: '/profile/insurance', color: '#4F46E5' },`
- `15: patient/app/profile/insurance.tsx:40:      const data = await apiFetch("/users/me/insurance");`
### error_empty_loading_retry_cancel
- `1: admin/src/pages/admin/legal-policies.tsx:13:      apiFetch('/legal/policies').catch(() => []),`
- `2: admin/src/pages/admin/legal-policies.tsx:22:    const full = await apiFetch(`/legal/policy/${key}`).catch(() => null);`
- `4: admin/src/pages/admin/insurance-queue.tsx:36:        apiFetch('/admin/insurance/stats').catch(() => null),`
- `5: admin/src/pages/admin/insurance-queue.tsx:37:        apiFetch(`/admin/insurance/requests${stateFilter ? `?state=${stateFilter}` : ''}`).catch(() => []),`
- `26: patient/app/nursing/nurse-profile.tsx:93:          const insData = await apiFetch(`/insurance/coverage-check?provider_id=${nurseId}&service_type=home_nursing`).catch(() => null);`
- `70: patient/app/insurance/approval-pending.tsx:32:          req = await apiFetch(`/insurance/requests/${params.requestId}`).catch(() => null);`
- `71: patient/app/insurance/approval-pending.tsx:34:          const list = await apiFetch('/insurance/requests/my').catch(() => []);`
- `72: patient/app/insurance/approval-pending.tsx:87:        <Button label="متابعة حالة الطلبات" variant="ghost" icon="refresh" onPress={() => router.push('/insurance/claim-tracking')} />`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
