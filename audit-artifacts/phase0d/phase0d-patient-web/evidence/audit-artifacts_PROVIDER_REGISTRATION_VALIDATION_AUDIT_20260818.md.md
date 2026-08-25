# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_REGISTRATION_VALIDATION_AUDIT_20260818.md`
- **Member SHA-256:** `533039a073839e9632e4e98ed3f7c47d24fa52881e08154c8d69b357c1be3779`
- **Line count:** 32
- **Read range:** `1-32`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: ## provider-app/src/screens/doctor/DoctorRegistration.tsx`
- `5: 954:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.lat, lng: data.lng , signature_url: sigUrl, full_data: sanitizeWizardData(data) });`
- `6: ## provider-app/src/screens/pharmacy/PharmacyRegistration.tsx`
- `11: 794:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.location?.lat || 0, lng: data.location?.lng || 0 , signature_url: sigUrl, full_data: sanitizeWizardData(data) });`
- `12: ## provider-app/src/screens/lab/LabRegistration.tsx`
- `18: 1662:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.location?.lat || 0, lng: data.location?.lng || 0 , signature_url: sigUrl, full_data: sanitizeWizardData(data) });`
- `19: ## provider-app/src/screens/radiology/RadiologyRegistration.tsx`
- `25: 1662:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.location?.lat || 0, lng: data.location?.lng || 0 , signature_url: sigUrl, full_data: sanitizeWizardData(data) });`
- `26: ## provider-app/src/screens/nursing/NursingRegistration.tsx`
- `32: 877:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.location?.lat || 0, lng: data.location?.lng || 0 , signature_url: sigUrl, full_data: sanitizeWizardData(data) });`
### backend_consumers_or_contracts
- `3: 26:import { ProviderApi, sanitizeWizardData } from '../../api/provider';`
- `6: ## provider-app/src/screens/pharmacy/PharmacyRegistration.tsx`
- `7: 10:import { ProviderApi, sanitizeWizardData } from '../../api/provider';`
- `13: 9:import { ProviderApi, sanitizeWizardData } from '../../api/provider';`
- `19: ## provider-app/src/screens/radiology/RadiologyRegistration.tsx`
- `20: 9:import { ProviderApi, sanitizeWizardData } from '../../api/provider';`
- `26: ## provider-app/src/screens/nursing/NursingRegistration.tsx`
- `27: 9:import { ProviderApi, sanitizeWizardData } from '../../api/provider';`
### auth_ownership
- `5: 954:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.lat, lng: data.lng , signature_url: sigUrl, full_data: sanitizeWizardData(data) });`
- `11: 794:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.location?.lat || 0, lng: data.location?.lng || 0 , signature_url: sigUrl, full_data: sanitizeWizardData(data) });`
- `18: 1662:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.location?.lat || 0, lng: data.location?.lng || 0 , signature_url: sigUrl, full_data: sanitizeWizardData(data) });`
- `25: 1662:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.location?.lat || 0, lng: data.location?.lng || 0 , signature_url: sigUrl, full_data: sanitizeWizardData(data) });`
- `32: 877:      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.location?.lat || 0, lng: data.location?.lng || 0 , signature_url: sigUrl, full_data: sanitizeWizardData(data) });`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
