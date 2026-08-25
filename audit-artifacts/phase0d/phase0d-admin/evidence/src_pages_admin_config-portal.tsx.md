# Phase 0D semantic evidence

- **Surface:** Admin
- **Archive:** `web_admin_dashboard.zip`
- **Member path:** `src/pages/admin/config-portal.tsx`
- **Member SHA-256:** `7e78317313220c6bab5bb56754c9adf1f80fafb43780e2efc358078c4a583fb8`
- **Line count:** 219
- **Read range:** `1-219`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `15: const [isSubmitting, setIsSubmitting] = useState(false);`
- `38: setIsSubmitting(true);`
- `43: setIsSubmitting(false);`
- `48: setIsSubmitting(false);`
- `62: setIsSubmitting(false);`
- `72: setIsSubmitting(true);`
- `97: setIsSubmitting(false);`
- `114: onClick={() => setActiveTab('sla')}`
- `120: onClick={() => setActiveTab('maintenance')}`
- `160: <button disabled={isSubmitting} onClick={handleUpdateSLA} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-8 rounded-lg shadow disabled:opacity-50 transition">`
- `194: disabled={!killSwitchChecked1 || !killSwitchChecked2 || isSubmitting}`
- `195: onClick={() => handleTriggerEmergencyKillSwitch(true)}`
### backend_consumers_or_contracts
- `22: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/config/sla`);`
- `53: await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/config/sla`, {`
- `75: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/governance/trigger-emergency-maintenance`, {`
### auth_ownership
- `2: import { fetchWithAdminGuard } from '@/utils/api';`
- `22: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/config/sla`);`
- `53: await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/config/sla`, {`
- `75: const res = await fetchWithAdminGuard(`${API_BASE}/api/v1/admin/governance/trigger-emergency-maintenance`, {`
- `78: adminId: 'admin-master-001',`
### state_transitions
- `1: import React, { useState, useEffect } from 'react';`
- `5: const [activeTab, setActiveTab] = useState<'sla' | 'maintenance'>('sla');`
- `7: // SLA State`
- `8: const [consultationDuration, setConsultationDuration] = useState(15);`
- `9: const [callRingingDuration, setCallRingingDuration] = useState(45);`
- `10: const [jwtExpiry, setJwtExpiry] = useState(24);`
- `12: // Maintenance State`
- `13: const [killSwitchChecked1, setKillSwitchChecked1] = useState(false);`
- `14: const [killSwitchChecked2, setKillSwitchChecked2] = useState(false);`
- `15: const [isSubmitting, setIsSubmitting] = useState(false);`
- `16: const [systemStatus, setSystemStatus] = useState<'online' | 'maintenance'>('online');`
- `28: if (data.systemStatus) setSystemStatus(data.systemStatus);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `30: } catch (error) {`
- `31: console.error('Failed to fetch initial SLA config', error);`
- `58: } catch (error) {`
- `59: console.error(error);`
- `60: alert('Error updating SLA');`
- `91: alert('Failed to execute command.');`
- `93: } catch (error) {`
- `94: console.error(error);`
- `95: alert('Emergency Maintenance Trigger Error');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
