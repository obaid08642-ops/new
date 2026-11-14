# Provider app: UI strings in the first session (count, 2026-11-13)

Source: `tools/design/no-literal-ui-string.baseline.json` (provider-app: 131 files, 5260 literals; gate total 5277 with the other apps). No mass rewrite; this file only counts what a provider sees first and what waits until after launch.

## What the count means
The provider app is Arabic and English at launch. Nearly every screen already writes both languages inline (`AR ? 'ar text' : 'en text'`), so each user-visible string is counted twice by the gate (one Arabic, one English literal). A screen counted as 100 literals is about 50 strings that already show in both languages. Nothing is missing for launch; the work is moving them into `src/i18n/locales/{ar,en}.json`.

## First session = sign in, role onboarding, dashboard, bookings, wallet
Common to every role (login, OTP, offline, registration wizard parts, review, success, home, home stats, wallet): **276** literals (AuthScreens 99, OtpModal 15, OfflineScreen 6, WizardParts 32, ReviewStep 23, RegistrationSuccess 22, ProviderHome 31, ProviderHomeStats 12, ProviderWalletScreen 36).

Per role, on top of the common 276 (registration + dashboard/home + bookings):

| Role | Role-specific literals | Total seen in the first session | Files |
|---|---|---|---|
| Radiology | 231 | 507 | RadiologyDashboard (no separate registration file) |
| Facility | 214 | 490 | FacilityRegistration 159, FacilityHomeTab 45, FacilityDashboardNavigator 10 |
| Doctor | 319 | 595 | DoctorRegistration 187, DoctorHomeTab 65, DoctorDashboardNavigator 11, DoctorScheduleTab 21, AppointmentDetailScreen 35 |
| Nursing | 398 | 674 | NursingRegistration 140, NursingDashboard 258 |
| Pharmacy | 460 | 736 | PharmacyRegistration 155, PharmacyDashboard 305 |
| Lab | 583 | 859 | LabRegistration 212, LabDashboard 371 |

All first-session files together: **2481 of 5260** (47%). The remaining **2779** (settings, chat, calls, reports, referrals, drug index, disputes, insurance config and the other secondary screens) are after launch.

## Proposed order (no rewrite started)
1. Common 276 (one PR; every provider hits it). 2. Radiology, Facility (smallest roles). 3. Doctor. 4. Nursing, Pharmacy, Lab. One PR per step, baseline lowered each time.
