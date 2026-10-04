# Spec — Product and Doctor detail pages (patient-app + patient-web)

Visual source: `docs/design/canvas/ProductFull.dc.html` (mobile), `ProductWeb.dc.html` (desktop ≥1024), `DoctorFull.dc.html` (mobile). Tablet 768–1023 = desktop layout in one column with the gallery on top. Port exactly; colours/sizes ONLY via `@nabd/design-tokens` (no hex in components). Every `[placeholder]` = a real API field below. **Rule: if a field is empty, hide its row/section completely — never show "N/A", "0" or invented text.**

## A. Product page — field → UI slot (backend `schemas/medicine.schema.ts`)

| UI slot (canvas) | Field(s) | Display rule |
|---|---|---|
| Gallery (5 slots, dots/thumbs) | `images[]`, then `image_1..image_5`, fallback `image` | De-duplicate; 0 images → tinted tile + category icon (not a fake photo) |
| Badge "خصم X٪" | `old_price`, `price` | Only if `old_price > price`; X = round((old-price)/old×100) |
| Badge "حصري أونلاين" | `online_exclusive` | Only if true |
| Chip Rx | `requires_prescription` | true → "يحتاج وصفة" (warning style) + Rx upload card above CTA; false → "بدون وصفة" |
| Chip category | `category` › `sub_category` (› `sub_sub_category`) | Localised labels; each is a link to the listing |
| Chip "يحتاج تبريد" | `cold_chain` | Only if true; also adds the "التبريد" row in Safety |
| Title | `name_<locale>` (`translations[locale].name` for ur/hi/bn/tl) + `strength` | h1 |
| Secondary name | `name_en` when locale ≠ en | dir=ltr |
| Active ingredient / scientific name | `active_ingredient`, `generic_name` | Hide each part if empty |
| Maker line | `manufacturer`, `country_of_origin` | |
| Price | `price` (+ `old_price` struck) | "شامل الضريبة" + `package_size` |
| Points line | loyalty preview endpoint | Must respect the 10% cap; hide if user is a guest |
| Availability | `pharmacies_count`, nearest distance from offers/location API | `pharmacies_count = 0` → "غير متوفر حاليًا" + "أبلغني عند التوفر"; disable Buy |
| Shortage banner | `availability_status`, `shortage_notes` | Only when status ≠ `none`; `discontinued` → hide Buy, show alternatives first |
| Delivery / pickup segmented | `available_online`, `online_exclusive` | Pickup-only products show only "استلام من الصيدلية" |
| Insurance row | `covered_by_insurance[]` ∩ user's insurer | Only if the logged-in user's insurer is in the list |
| Key facts grid | `form`, `strength`, `package_size`, `storage_conditions_*` (short), `country_of_origin`, `requires_prescription` | Grid reflows to however many exist (min 2) |
| Safety rows | `pregnancy_info_*`, `breastfeeding_info_*`, `cold_chain`, `controlled` | `controlled` → row "دواء خاضع للرقابة — يصرف من الصيدلية فقط" |
| Accordion (mobile) / tabs (desktop) | `indications_*`, `dosage_*`, `usage_instructions_*`, `warnings_*`, `precautions_*`, `side_effects_*`, `contraindications_*`, `interactions[]`, `pregnancy_info_*` + `breastfeeding_info_*`, `storage_conditions_*`, `more_info_*` | First non-empty section open; arrays → bullets; count shown when >1; empty sections removed |
| Medical review line | `medical_review_status = approved`, `last_reviewed` | Only if approved |
| Alternatives | `alternatives[]` (+ same `active_ingredient`) | Chip "أوفر" only when its price < this price (computed) |
| Related | `related_product_ids[]` | |
| Ask a pharmacist | chat entry point | |
| Identifiers | `sku`, `barcode` | Small, bottom |
| SEO (web only) | `seo_description_*`, per-locale `translations[l].slug` | `<meta>`, hreflang for 6 locales, JSON-LD `Drug`/`Product` |

**Not shown to patients:** `verified`, `public_eligibility`, `indexing_eligibility`, `provenance`, `source`, `created_by_*`, `approved_*`, `rejected_reason`, `usage_count`, `aggregate_stock`, `translation_conflict`, `review_reason`, `version`, `is_deleted`.

**Ratings on products:** NOT in the design on purpose — the backend has no product reviews (ratings module covers orders/appointments/bookings only). Adding them = backend work + owner decision (verified-purchase only). Never show fake stars.

## B. Doctor page — field → UI slot (`modules/doctors/doctors.schemas.ts`)

| UI slot | Field(s) | Rule |
|---|---|---|
| Avatar + online dot | `photo_url`, `is_online` | No photo → doctor illustration |
| Name, verified badge | `name_*`, account verification | Badge only if verified |
| Specialty · clinic | `specialty_ar`/`specialty`, `clinic_location.name` | |
| Tags | `tags[]` | Max 3 + "+N" |
| Stats: rating | `rating`, `reviews_count` | Hide the tile if `reviews_count = 0` (show "جديد" chip instead) |
| Stats: completed consults | count of completed appointments (API) | Hide if 0 |
| Stats: experience | **MISSING FIELD** `years_experience` | Hide until backend adds it |
| Consult types (2×2) | `clinic_enabled`/`consultation_fee`, `video_enabled`/`video_consultation_fee`, `voice_enabled`, `home_visit_enabled`/`home_visit_fee` | Show only enabled; grid collapses; voice fee: **MISSING FIELD** `voice_consultation_fee` |
| Days + slots | `weekly_schedule`, `blocked_dates`, `default_slot_minutes`, `max_bookings_per_slot`, slot-locks API | Taken slots disabled (aria-disabled), not hidden; `is_accepting = false` → banner + no booking |
| About | `biography` | 4 lines + "اقرأ المزيد" |
| Info rows | `languages[]`, `gender`; licence + qualifications **MISSING FIELDS** `scfhs_license_no`, `qualifications[]` | Hide rows without data |
| Insurance | `insurance_supported[]` | Hide card if empty |
| Clinic card | `clinic_images[]`, `facilities_images[]`, `clinic_location` | Distance from user location; "الاتجاهات" opens maps |
| Reviews | ratings API (`provider_id` = doctor), `rating`, `reviews_count` | Only completed visits; first name + initial; hide whole section if 0 |
| Sticky CTA | selected mode + day + slot | Disabled until a slot is chosen |

**Backend gaps to raise with the owner (do NOT invent values):** `years_experience`, `scfhs_license_no` (Saudi Commission for Health Specialties — strongly recommended for trust), `qualifications[]`, `voice_consultation_fee`.

## C. Responsive + states (both pages)
- Widths to verify: 320, 360, 375, 390, 414, 430 (phones), 768, 1024 (tablet), 1280, 1440, 1920. No horizontal scroll at any width; long Arabic/German-length names wrap (max 3 lines) — never overflow.
- Safe areas: sticky CTA bar adds `env(safe-area-inset-bottom)` (web) / `useSafeAreaInsets` (app).
- States: skeleton (gallery + 3 text bars + price card), error (retry), not-found (404 page with search), offline.
- Dark mode: all from tokens; glass only on the top bar, sticky CTA and sheets.
- Font: **Readex Pro** — patient-web currently loads Tajawal in `app/[locale]/layout.tsx`; switch to Readex Pro (self-hosted via `next/font/local` so builds don't depend on Google Fonts).
