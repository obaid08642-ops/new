# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/patient_service_insurance_static_audit_20260820.txt`
- **Member SHA-256:** `d8bf3770220a626c5768d71b0166637b2ad153abdb456a60bc2a6df8c890b59e`
- **Line count:** 182
- **Read range:** `1-182`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `136: /home/ubuntu/nabdah_execution/patient/src/i18n/index.ts-266-  "إلغاء الطلب": {"ar": "إلغاء الطلب", "en": "Cancel Order", "ur": "آرڈر منسوخ کریں", "hi": "ऑर्डर रद्द करें", "bn": "অর্ডার বাতিল করুন", "fil": "Cancel Order"},`
### backend_consumers_or_contracts
- `10: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts-23-}`
- `11: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts-24-`
- `12: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts:25:export const COVERAGE_CLASSES = [`
- `13: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts-26-  { id: 'vip', nameAr: 'VIP', nameEn: 'VIP', level: 1 },`
- `14: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts-27-  { id: 'a', nameAr: 'الفئة A', nameEn: 'Class A', level: 2 },`
- `16: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts-41-];`
- `17: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts-42-`
- `18: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts:43:export const INSURANCE_COMPANIES_FULL: InsuranceCompanyFull[] = [`
- `19: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts-44-  {`
- `20: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts-45-    id: '1',`
- `21: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts-46-    name: 'بوبا العربية',`
- `22: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts:47:    nameEn: 'Bupa Arabia',`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `130: /home/ubuntu/nabdah_execution/patient/src/i18n/index.ts-209-  "مرفوض": { ar: "مرفوض", en: "Rejected", ur: "مسترد", hi: "अस्वीकृत", bn: "প্রত্যাখ্যাত", fil: "Rejected" },`
- `136: /home/ubuntu/nabdah_execution/patient/src/i18n/index.ts-266-  "إلغاء الطلب": {"ar": "إلغاء الطلب", "en": "Cancel Order", "ur": "آرڈر منسوخ کریں", "hi": "ऑर्डर रद्द करें", "bn": "অর্ডার বাতিল করুন", "fil": "Cancel Order"},`
### payment_insurance_relevance
- `1: /home/ubuntu/nabdah_execution/patient/app/(tabs)/consultations/index.tsx-59-  const saudiInsurances = {`
- `10: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts-23-}`
- `11: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts-24-`
- `12: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts:25:export const COVERAGE_CLASSES = [`
- `13: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts-26-  { id: 'vip', nameAr: 'VIP', nameEn: 'VIP', level: 1 },`
- `14: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts-27-  { id: 'a', nameAr: 'الفئة A', nameEn: 'Class A', level: 2 },`
- `16: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts-41-];`
- `17: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts-42-`
- `18: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts:43:export const INSURANCE_COMPANIES_FULL: InsuranceCompanyFull[] = [`
- `19: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts-44-  {`
- `20: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts-45-    id: '1',`
- `21: /home/ubuntu/nabdah_execution/patient/src/constants/insurance.ts-46-    name: 'بوبا العربية',`
### error_empty_loading_retry_cancel
- `136: /home/ubuntu/nabdah_execution/patient/src/i18n/index.ts-266-  "إلغاء الطلب": {"ar": "إلغاء الطلب", "en": "Cancel Order", "ur": "آرڈر منسوخ کریں", "hi": "ऑर्डर रद्द करें", "bn": "অর্ডার বাতিল করুন", "fil": "Cancel Order"},`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
