# Patient App — Screen Audit Report
**Total Screens:** 254  
**Audit Date:** 2026-09-14  
**Branch:** nabdah-plus/full-completion

---

## Screen Inventory by Category

### Auth & Onboarding (13)
| Screen | File | Status | Notes |
|--------|------|--------|-------|
| Welcome | `(auth)/welcome.tsx` | ✅ | Entry point |
| Login | `(auth)/login.tsx` | ✅ | Phone + OTP |
| OTP Verify | `(auth)/otp.tsx` | ✅ | 6-digit code |
| Register | `(auth)/register.tsx` | ✅ | Full registration |
| Forgot Password | `(auth)/forgot-password.tsx` | ✅ | Phone-based reset |
| Reset Password | `(auth)/reset-password.tsx` | ✅ | New password |
| Privacy | `(auth)/privacy.tsx` | ✅ | Legal |
| Terms | `(auth)/terms.tsx` | ✅ | Legal |
| Provider Info | `(auth)/provider-info.tsx` | ✅ | Provider registration info |
| Onboarding Index | `(onboarding)/index.tsx` | ✅ | Flow start |
| Language Select | `(onboarding)/language.tsx` | ✅ | 6 languages |
| Permissions | `(onboarding)/permissions.tsx` | ✅ | Notifications, location |
| Auth Layout | `(auth)/_layout.tsx` | ✅ | Stack navigator |

### Main Tabs (7)
| Tab | File | Status | Screens Inside |
|-----|------|--------|----------------|
| Home | `(tabs)/index.tsx` | ✅ | Dashboard |
| Consultations | `(tabs)/consultations/index.tsx` | ✅ | 20+ screens |
| Diagnostics | `(tabs)/diagnostics.tsx` | ✅ | 18+ screens |
| Pharmacy | `(tabs)/pharmacy.tsx` | ✅ | 20+ screens |
| Nursing | `(tabs)/nursing.tsx` | ✅ | 6+ screens |
| Services | `(tabs)/services.tsx` | ✅ | Hub |
| Health | `(tabs)/health.tsx` | ✅ | 20+ screens |

### Consultations (22 screens)
| Screen | File | API Endpoints | Status |
|--------|------|---------------|--------|
| Specialty Select | `consultations/specialty-select.tsx` | GET /doctors/specialties | ✅ |
| Doctor Search | `consultations/doctor-search.tsx` | GET /doctors | ✅ |
| Doctor Profile | `consultations/doctor/[id].tsx` | GET /doctors/:id | ✅ |
| Doctor Profile Alt | `consultations/doctor-profile.tsx` | GET /doctors/:id | ⚠️ Duplicate? |
| Book Appointment | `consultations/book/[id].tsx` | POST /appointments/book | ✅ |
| Booking Pending | `consultations/booking-pending.tsx` | ❌ DEPRECATED | Redirect to booking-status |
| Booking Confirm | `consultations/booking-confirm.tsx` | ❌ DEPRECATED | Redirect to booking-status |
| Booking Success | `consultations/booking-success.tsx` | ❌ DEPRECATED | Redirect to booking-status |
| Booking Status | `consultations/booking-status.tsx` | GET /appointments/:id | ✅ |
| Appointments List | `consultations/appointments.tsx` | GET /appointments | ✅ |
| Appointment Detail | `consultations/appointment-detail.tsx` | GET /appointments/:id | ✅ |
| Clinic Confirm | `consultations/clinic-confirm.tsx` | GET /facilities/:id | ✅ |
| Clinic Location | `consultations/clinic-location.tsx` | Maps integration | ✅ |
| Home Visit Tracking | `consultations/home-visit-tracking.tsx` | WS /nursing/visits/:id | ✅ |
| Video Call | `consultations/video-call.tsx` | LiveKit token | ✅ |
| Virtual Waiting Room | `consultations/virtual-waiting-room.tsx` | WS | ✅ |
| Waiting Room | `consultations/waiting-room.tsx` | WS | ✅ |
| Incoming Call | `consultations/incoming-call.tsx` | LiveKit | ✅ |
| Chat with Doctor | `consultations/chat-with-doctor.tsx` | WS /chat | ✅ |
| Prescription from Doctor | `consultations/prescription-from-doctor.tsx` | GET /prescriptions/:id | ✅ |
| Follow Up | `consultations/follow-up.tsx` | POST /appointments/followup | ✅ |
| Post Call Rating | `consultations/post-call-rating.tsx` | POST /ratings | ✅ |
| Share Report | `consultations/share-report.tsx` | POST /reports/share | ✅ |
| Call History | `consultations/call-history.tsx` | GET /consultations/history | ✅ |
| Cancel Reschedule | `consultations/cancel-reschedule.tsx` | PATCH /appointments/:id | ✅ |
| Offer Detail | `consultations/offer/[id].tsx` | GET /offers/:id | ✅ |
| Summary | `consultations/summary.tsx` | GET /consultations/summary | ✅ |

### Diagnostics (18 screens)
| Screen | File | API Endpoints | Status |
|--------|------|---------------|--------|
| Search | `diagnostics/search.tsx` | GET /labs/services, /radiology/services | ✅ |
| Test Detail | `diagnostics/test-detail.tsx` | GET /labs/services/:id | ✅ |
| Lab Detail | `diagnostics/lab/[id].tsx` | GET /labs/:id | ✅ |
| Packages | `diagnostics/packages.tsx` | GET /labs/packages | ✅ |
| Package Detail | `diagnostics/package-detail.tsx` | GET /labs/packages/:id | ✅ |
| Book Sample | `diagnostics/book-sample.tsx` | POST /labs/bookings | ✅ |
| Booking Confirm | `diagnostics/booking-confirm.tsx` | ⚠️ Redirects to hub | |
| Booking Success | `diagnostics/booking-success.tsx` | Shows details | ✅ |
| Cart | `diagnostics/cart.tsx` | Local state | ✅ |
| Checkout | `diagnostics/checkout.tsx` | POST /payments/intent | ✅ |
| Insurance Upload | `diagnostics/insurance-upload.tsx` | POST /insurance/upload-policy | ✅ |
| Insurance Approval | `diagnostics/insurance-approval.tsx` | Polling | ✅ |
| Orders | `diagnostics/orders.tsx` | GET /labs/bookings | ✅ |
| Order Detail | `diagnostics/order/[id].tsx` | GET /labs/bookings/:id | ✅ |
| My Results | `diagnostics/my-results.tsx` | GET /lab-results | ✅ |
| Results History | `diagnostics/results-history.tsx` | GET /lab-results/history | ✅ |
| Sample Tracking | `diagnostics/sample-tracking.tsx` | WS /labs/tracking/:id | ✅ |
| Technician Tracking | `diagnostics/technician-tracking.tsx` | WS | ✅ |
| Lab Comparison | `diagnostics/lab-comparison.tsx` | GET /labs/compare | ✅ |
| Upload RX | `diagnostics/upload-rx.tsx` | POST /prescriptions/upload | ✅ |

### Pharmacy (22 screens)
| Screen | File | API Endpoints | Status |
|--------|------|---------------|--------|
| Product Search | `pharmacy/product-search.tsx` | GET /medicines/search | ✅ |
| Product Detail | `pharmacy/product-detail.tsx` | GET /medicines/:id | ✅ |
| Barcode Scanner | `pharmacy/barcode-scanner.tsx` | Camera + GET /medicines/barcode/:code | ✅ |
| Scan Prescription | `pharmacy/scan-prescription.tsx` | OCR + POST /pharmacy/orders | ✅ |
| Rx Order | `pharmacy/rx-order.tsx` | POST /pharmacy/orders | ✅ |
| Manual Order | `pharmacy/manual-order.tsx` | POST /pharmacy/orders | ✅ |
| Custom Item | `pharmacy/custom-item.tsx` | POST /pharmacy/orders/custom | ✅ |
| Filters | `pharmacy/filters.tsx` | Query params | ✅ |
| Cart | `pharmacy/cart.tsx` | Local + sync | ✅ |
| Checkout | `pharmacy/checkout.tsx` | POST /payments/intent | ✅ |
| Payment | `pharmacy/payment.tsx` | WebView Moyasar/Paymob | ✅ |
| Final Quote | `pharmacy/final-quote.tsx` | GET /pharmacy/quotes/:id | ✅ |
| Order Confirm | `pharmacy/order-confirm.tsx` | POST /pharmacy/orders | ✅ |
| Order History | `pharmacy/order-history.tsx` | GET /pharmacy/orders | ✅ |
| Order Tracking | `pharmacy/order-tracking.tsx` | WS /pharmacy/tracking/:id | ✅ |
| Waiting for Pharmacy | `pharmacy/waiting-for-pharmacy.tsx` | WS | ✅ |
| Broadcast Status | `pharmacy/broadcast-status.tsx` | WS /pharmacy/broadcast/:id | ✅ |
| Insurance Decision | `pharmacy/insurance-decision.tsx` | Manual entry | ✅ |
| Drug Not Found | `pharmacy/drug-not-found.tsx` | Fallback UI | ✅ |
| Medicine Compare | `pharmacy/medicine-compare.tsx` | GET /medicines/compare | ✅ |
| Reorder | `pharmacy/reorder.tsx` | POST /pharmacy/orders/reorder | ✅ |
| Wishlist | `pharmacy/wishlist.tsx` | GET /wishlist | ✅ |
| Pharmacist Chat | `pharmacy/pharmacist-chat.tsx` | WS /chat | ✅ |
| Request | `pharmacy/request.tsx` | POST /pharmacy/requests | ✅ |

### Health (22 screens)
| Screen | File | API Endpoints | Status |
|--------|------|---------------|--------|
| Profile | `health/profile.tsx` | GET /patients/me | ✅ |
| Edit Profile | `health/edit-profile.tsx` | PATCH /patients/me | ✅ |
| Vitals | `health/vitals.tsx` | GET /vitals | ✅ |
| Vitals Log | `health/vitals-log.tsx` | POST /vitals | ✅ |
| Medications | `health/medications.tsx` | GET /medications | ✅ |
| Prescriptions | `health/prescriptions.tsx` | GET /prescriptions | ✅ |
| Refills | `health/refills.tsx` | POST /prescriptions/:id/refill | ✅ |
| Reminders | `health/reminders.tsx` | GET /reminders | ✅ |
| Smart Reminders | `health/smart-reminders.tsx` | AI-generated | ✅ |
| Medication Reminder List | `health/medication-reminder-list.tsx` | GET /reminders/meds | ✅ |
| Medication Reminder Add | `health/medication-reminder-add.tsx` | POST /reminders/meds | ✅ |
| Chronic Disease | `health/chronic-disease.tsx` | GET /conditions | ✅ |
| Chronic Medications | `health/chronic-medications.tsx` | GET /medications/chronic | ✅ |
| Conditions Allergies | `health/conditions-allergies.tsx` | GET /allergies | ✅ |
| Reports | `health/reports.tsx` | GET /reports | ✅ |
| Trends | `health/trends.tsx` | GET /analytics/trends | ✅ |
| Sleep Tracker | `health/sleep-tracker.tsx` | GET /sleep | ✅ |
| Sleep Score | `health/sleep-score.tsx` | AI computed | ✅ |
| Wearables | `health/wearables.tsx` | HealthKit/Google Fit | ✅ |
| Health ID | `health/health-id.tsx` | QR code | ✅ |
| Emergency Contacts | `health/emergency-contacts.tsx` | GET /emergency-contacts | ✅ |
| Add Family Member | `health/add-family-member.tsx` | POST /family/members | ✅ |
| Family Hub | `health/family-hub.tsx` | GET /family | ✅ |
| Family Chat | `health/family-chat.tsx` | WS | ✅ |
| Family Calendar | `health/family-calendar.tsx` | GET /family/events | ✅ |
| Family Member Detail | `health/family-member-detail.tsx` | GET /family/members/:id | ✅ |

### Nursing (7 screens)
| Screen | File | API Endpoints | Status |
|--------|------|---------------|--------|
| Service Info | `nursing/service-info.tsx` | GET /home-care/services | ✅ |
| Service Details | `nursing/service-details.tsx` | GET /home-care/services/:id | ✅ |
| Nurse Profile | `nursing/nurse-profile.tsx` | GET /nurses/:id | ✅ |
| Visits | `nursing/visits.tsx` | GET /home-care/visits | ✅ |
| Live Tracking | `nursing/live-tracking.tsx` | WS /home-care/tracking/:id | ✅ |
| Insurance Status | `nursing/insurance-status.tsx` | GET /insurance/coverage-check | ✅ |

### AI Features (7 screens)
| Screen | File | AI Feature | Status |
|--------|------|------------|--------|
| AI Assistant | `ai-assistant.tsx` | Chat | ✅ |
| Triage | `ai/triage.tsx` | Symptom analysis | ✅ |
| Symptom Checker | `ai/symptom-checker.tsx` | Questionnaire | ✅ |
| Symptom Timeline | `ai/symptom-timeline.tsx` | History view | ✅ |
| Prescription Translator | `ai/prescription-translator.tsx` | OCR + translate | ✅ |
| Monthly Report | `ai/monthly-report.tsx` | AI generated | ✅ |
| Skin Analysis | `ai/skin-analysis.tsx` | Image analysis | ✅ |

### Family (10 screens)
| Screen | File | Status |
|--------|------|--------|
| Hub | `family/hub.tsx` | ✅ |
| Index | `family/index.tsx` | ✅ |
| Member Health | `family/member-health.tsx` | ✅ |
| Calendar | `family/calendar.tsx` | ✅ |
| Chat | `family/chat.tsx` | ✅ |
| Emergency Contacts | `family/emergency-contacts.tsx` | ✅ |
| Invite | `family/invite.tsx` | ✅ |
| Join | `family/join.tsx` | ✅ |
| Scan | `family/scan.tsx` | ✅ |
| Shared Calendar | `family/shared-calendar.tsx` | ✅ |
| Permissions | `family/permissions.tsx` | ✅ |
| Permission Request | `family/permission-request.tsx` | ✅ |

### Emergency (4 screens)
| Screen | File | Status |
|--------|------|--------|
| Index | `emergency/index.tsx` | ✅ |
| SOS | `emergency/sos.tsx` | ✅ |
| SOS Active | `emergency/sos-active.tsx` | ✅ |
| Tracking | `emergency/tracking.tsx` | ✅ |

### Maternity (6 screens)
| Screen | File | Status |
|--------|------|--------|
| Hub | `maternity/hub.tsx` | ✅ |
| Maternity Setup | `maternity/maternity-setup.tsx` | ✅ |
| Pregnancy Tracker | `maternity/pregnancy-tracker.tsx` | ✅ |
| Baby Development | `maternity/baby-development.tsx` | ✅ |
| Baby Growth | `maternity/baby-growth.tsx` | ✅ |
| Ovulation Tracker | `maternity/ovulation-tracker.tsx` | ✅ |

### Nutrition (12 screens)
| Screen | File | Status |
|--------|------|--------|
| Hub | `nutrition/hub.tsx` | ✅ |
| Index | `nutrition/index.tsx` | ✅ |
| Daily Tracker | `nutrition/daily-tracker.tsx` | ✅ |
| Calorie Analyzer | `nutrition/calorie-analyzer.tsx` | ✅ |
| Log Meal | `nutrition/log-meal.tsx` | ✅ |
| AI Meal Planner | `nutrition/ai-meal-planner.tsx` | ✅ |
| AI Plan Builder | `nutrition/ai-plan-builder.tsx` | ✅ |
| Body Composition | `nutrition/body-composition.tsx` | ✅ |
| Body Target | `nutrition/body-target.tsx` | ✅ |
| Exercise Plan | `nutrition/exercise-plan.tsx` | ✅ |
| Food Scanner | `nutrition/food-scanner.tsx` | ✅ |
| Water Tracker | `nutrition/water-tracker.tsx` | ✅ |
| Nutrition Plan | `nutrition/nutrition-plan.tsx` | ✅ |

### Mental Health (7 screens)
| Screen | File | Status |
|--------|------|--------|
| Hub | `mental-health/hub.tsx` | ✅ |
| Index | `mental-health/index.tsx` | ✅ |
| Mood Journal | `mental-health/mood-journal.tsx` | ✅ |
| Self Assessment | `mental-health/self-assessment.tsx` | ✅ |
| Breathing | `mental-health/breathing.tsx` | ✅ |
| Meditation | `mental-health/meditation.tsx` | ✅ |
| Crisis Support | `mental-health/crisis-support.tsx` | ✅ |
| Therapist Match | `mental-health/therapist-match.tsx` | ✅ |

### Loyalty (5 screens)
| Screen | File | Status |
|--------|------|--------|
| Hub | `loyalty/hub.tsx` | ✅ |
| Challenges | `loyalty/challenges.tsx` | ✅ |
| Leaderboard | `loyalty/leaderboard.tsx` | ✅ |
| Referrals | `loyalty/referrals.tsx` | ✅ |
| Rewards | `loyalty/rewards.tsx` | ✅ |

### Wallet & Payments (7 screens)
| Screen | File | Status |
|--------|------|--------|
| Wallet | `wallet/index.tsx` | ✅ |
| Payments Processing | `payments/processing.tsx` | ✅ |
| Payments Success | `payments/success.tsx` | ✅ |
| Payments Failed | `payments/failed.tsx` | ✅ |
| Payments Result | `payments/result.tsx` | ✅ |

### Insurance (10 screens)
| Screen | File | Status |
|--------|------|--------|
| Hub | `insurance/hub.tsx` | ✅ |
| Index | `insurance/index.tsx` | ✅ |
| Add Policy | `insurance/add-policy.tsx` | ✅ |
| Policy Detail | `insurance/policy-detail.tsx` | ✅ |
| Benefits Summary | `insurance/benefits-summary.tsx` | ✅ |
| Coverage Check | `insurance/coverage-check.tsx` | ✅ |
| Network Providers | `insurance/network-providers.tsx` | ✅ |
| Copay | `insurance/copay.tsx` | ✅ |
| Submit Claim | `insurance/submit-claim.tsx` | ✅ |
| Claim Tracking | `insurance/claim-tracking.tsx` | ✅ |
| Refund Status | `insurance/refund-status.tsx` | ✅ |
| Payment Split | `insurance/payment-split.tsx` | ✅ |
| Approval Pending | `insurance/approval-pending.tsx` | ✅ |

### Settings (12 screens)
| Screen | File | Status |
|--------|------|--------|
| Index | `settings/index.tsx` | ✅ |
| About | `settings/about.tsx` | ✅ |
| Data | `settings/data.tsx` | ✅ |
| Feedback | `settings/feedback.tsx` | ✅ |
| Help | `settings/help.tsx` | ✅ |
| Language | `settings/language.tsx` | ✅ |
| Notifications | `settings/notifications.tsx` | ✅ |
| Notifications Settings | `settings/notifications-settings.tsx` | ✅ |
| Privacy | `settings/privacy.tsx` | ✅ |
| Security | `settings/security.tsx` | ✅ |
| Support Chat | `settings/support-chat.tsx` | ✅ |
| Terms | `settings/terms.tsx` | ✅ |

### Others
| Screen | File | Status |
|--------|------|--------|
| Articles Index | `articles/index.tsx` | ✅ |
| Article Detail | `articles/[slug].tsx` | ✅ |
| Article Bookmarks | `articles/bookmarks.tsx` | ✅ |
| Community Hub | `community/hub.tsx` | ✅ |
| Community Post | `community/post-detail.tsx` | ✅ |
| Map | `map/index.tsx` | ✅ |
| Search | `search/index.tsx` | ✅ |
| Services | `services/index.tsx` | ✅ |
| Drug Scanner | `drug-scanner/index.tsx` | ✅ |
| Offers Index | `offers/index.tsx` | ✅ |
| Offer Detail | `offers/[id].tsx` | ✅ |
| Orders | `orders/index.tsx` | ✅ |
| Returns Hub | `returns/hub.tsx` | ✅ |
| Returns Detail | `returns/detail.tsx` | ✅ |
| Returns New | `returns/new-request.tsx` | ✅ |
| Reviews | `reviews/index.tsx` | ✅ |
| Programs Active | `programs/active.tsx` | ✅ |
| Reports Hub | `reports/hub.tsx` | ✅ |
| Reports Passport | `reports/passport.tsx` | ✅ |
| Reports Timeline | `reports/timeline.tsx` | ✅ |
| Reports AI Analysis | `reports/ai-analysis.tsx` | ✅ |
| Reports View | `reports/view-report.tsx` | ✅ |
| Notifications | `notifications/index.tsx` | ✅ |
| Profile Index | `profile/index.tsx` | ✅ |
| Profile Edit | `profile/edit.tsx` | ✅ |
| Profile Addresses | `profile/addresses.tsx` | ✅ |
| Profile Insurance | `profile/insurance.tsx` | ✅ |
| Voice | `voice/index.tsx` | ✅ |
| Wearables Hub | `wearables/hub.tsx` | ✅ |
| Room | `room/[id].tsx` | ✅ |
| S Redirect | `s/[type]/[slug].tsx` | ✅ |
| P Redirect | `p/[slug].tsx` | ✅ |
| Doctor Slug | `doctor/[slug].tsx` | ✅ |
| Facility Slug | `facility/[slug].tsx` | ✅ |
| Medicine Slug | `medicine/[slug].tsx` | ✅ |
| Support Chat | `support/chat.tsx` | ✅ |
| Support Ticket | `support/ticket.tsx` | ✅ |
| Location Picker | `shared/location-picker.tsx` | ✅ |
| 404 | `+not-found.tsx` | ✅ |
| Index | `index.tsx` | ✅ |
| Root Layout | `_layout.tsx` | ✅ |
| Tabs Layout | `(tabs)/_layout.tsx` | ✅ |

---

## Issues Found

### ⚠️ DUPLICATE SCREENS (Consultations)
| Screen | File 1 | File 2 | Action |
|--------|--------|--------|--------|
| Doctor Profile | `consultations/doctor/[id].tsx` | `consultations/doctor-profile.tsx` | Merge or remove one |
| Booking Status | `consultations/booking-status.tsx` | `consultations/booking-success.tsx` | booking-success deprecated, redirects |

### 🔴 DEPRECATED PAGES (Need Removal/Redirect)
1. `consultations/booking-pending.tsx` → redirects to booking-status
2. `consultations/booking-confirm.tsx` → redirects to booking-status
3. `consultations/booking-success.tsx` → redirects to booking-status
4. `diagnostics/booking-confirm.tsx` → redirects to hub

### 🟡 POTENTIAL MISSING API INTEGRATION
| Screen | Expected API | Current State |
|--------|--------------|---------------|
| `pharmacy/insurance-decision.tsx` | Manual entry UI | ✅ Intentional |
| `diagnostics/insurance-approval.tsx` | Polling for provider approval | ✅ Intentional |
| `consultations/insurance-decision.tsx` | Not found — check if needed | Need verify |

### 🟢 WELL IMPLEMENTED
- All auth flows complete
- All consultation booking flows (video, clinic, home visit)
- Diagnostics full flow (search → book → track → results)
- Pharmacy full flow (search → cart → checkout → track)
- Health tracking comprehensive
- AI features integrated
- Family management complete
- Emergency SOS flow

---

## Recommendations

1. **Remove 4 deprecated consultation pages** (booking-pending, booking-confirm, booking-success, diagnostics/booking-confirm)
2. **Consolidate doctor profile screens** (keep `doctor/[id].tsx`, remove `doctor-profile.tsx`)
3. **Verify insurance-decision screen** exists for consultations (may be missing)
4. **Add integration tests** for critical user journeys
