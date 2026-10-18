# Ordering model for labs, radiology, nursing (owner decision 2026-10-16): gap map and phased plan

The owner's decision (marketplace, one ordering flow What → Where → Who pays → Who provides → When → Confirm, the doctor's medical order, per-item insurance, safeguards, instant consultation) replaces the previous booking model and extends decisions 30 and 35. This file maps it against `main` (2026-10-16) and proposes the build order. **Approved by the owner on 2026-10-16.** The UX and behaviour are specified in `ORDERING_UX_SPEC_2026-10-16.md`.

## 1. Gap map (what exists on main)

| Area | Decision | On main today | Gap |
|---|---|---|---|
| A. Provider item declaration | mode per item (home / facility / both), price per mode, home fee + radius, insurers **and classes per item**, slots or walk-in, turnaround, preparation, auto-accept; home radiology portable only | `provider_capabilities_lab`: price, turnaround, `home_collection_supported`, `insurance_covered` (a yes/no). `provider_capabilities_radiology`: price, no home flag. `provider_capabilities_home_care`: hourly price. Delivery zones (radius + base fee) exist for pharmacies. Weekly slot templates exist (`provider_schedule_slots`, service_type). Catalogue rows have `portable_ultrasound` and fasting/preparation | **New per-item model:** modes, per-mode price, per-item insurers + classes (today one boolean), walk-in flag, auto-accept, preparation per provider, portable-only rule for home radiology. Provider app + admin screens to declare them. Migration of existing rows |
| B1 Entry | catalogue, photo of an order, "Order" from a Nabd+ doctor's order | catalogue browse; upload-rx for diagnostics; AI scanner (pharmacy, #1587) | photo → items for labs/radiology/nursing; entry from a medical order (C) |
| B2–B3 What / Where | checkboxes, order some now; home/facility; automatic split of a mixed order; map pin, floor, apartment, gate note; for whom (family member) | diagnostics cart; saved addresses; family members exist | item-level "now/later"; facility-only labels; **automatic split into two bookings on one screen**; booking for a family member across all three services |
| B4 Who pays | saved insurance chip per family member, per-item coverage estimate | D-30 (OpenCode A, #1459, open): insurance first, provider networks with companies and classes | per-**item** coverage and estimate, needs (A) |
| B5 Who provides | "Best match" card + "Compare yourself" (cheapest, nearest, fastest); suggested split; photo orders broadcast for priced offers | provider matching service and `acceptance_rate` exist; lab comparison page exists; the **pharmacy broadcast engine** exists (staged radius from SystemConfig; plan 13.R1 still open) | a ranking that scores coverage of all items, network, distance, speed, rating and reliability; a split suggestion; the broadcast engine generalised from pharmacy to labs, radiology and nursing |
| B6 When | home: 2-hour window or ASAP (broadcast, 3 → 5 → 8 km with a timer, then the earliest slot); facility: slot or walk-in with QR | slots (fixed times); nursing slots per nurse | 2-hour windows; ASAP broadcast with auto-accept-first; walk-in with QR |
| B7 Pay | prepayment held until the service is done | Moyasar payments; refunds through `RefundExecutor` | **hold-then-capture or pay-then-refund**: owner choice (§3). Home fee line. Preparation in the summary |
| B8 After | preparation reminders, live tracking, 4-digit arrival code, results into records with values and trends + "Discuss with a doctor", rating | home-care tracking; lab results; timeline; ratings | arrival code; results as structured values with trends for every lab; the discuss-with-a-doctor link |
| C. Doctor's medical order | structured items (medicines, labs, radiology, nursing/procedures, sessions), notification + Home card + "My medical orders"; per-group Order button; status per item; validity; attaches to provider and insurer; the doctor never chooses the provider | e-prescriptions for medicines; doctor follow-up | **structured non-medicine orders**, "My medical orders", status per item, validity, auto-attach |
| D. Insurance | per family member; in-network lists and broadcasts by company + class; doctor's order required; relay approval (decision 35 / D-37) with live status; home dispatch after approval; per-item partial-approval choices; packages and home fee self-pay unless approved; expiry warning | relay approval inbox (D-37 merged); D-30 open | per-item decisions and the three patient choices; dispatch gating; expiry warning |
| E. Safeguards | provider confirms a held slot in time or auto-cancel + refund + alternative; ranking by acceptance / on-time / cancellations; no phone numbers; provider photo, name, licence before arrival; gender preference | acceptance rate; no-show and trip-fee rules exist; in-app chat and calls exist | confirm deadline + auto-refund + alternative; on-time and cancellation scoring; **gender preference** (none today) |
| F. Consultations | doctor-first list + "Instant consultation" broadcast to online doctors of the specialty | doctor list; availability | the instant broadcast (none today) |

## 2. Review session's opinion
- **The model is right for a marketplace** that owns no providers. It matches how the large platforms work: providers declare, the patient chooses with a smart default, insurance is in-network, the money is protected. It also removes today's separate, inconsistent flows for labs, radiology and nursing.
- **It is a large build**, comparable to a full phase: a new provider data model, one shared ordering engine, the medical order, per-item insurance and a new UI. Estimate: 40–60 PRs.
- **Timing risk:** OpenCode W2 is about to fix the current labs, radiology and nursing flows from the parity audit (#1618). If those flows are replaced, most of that work is wasted. **Recommendation:** W2 fixes only bugs in those three flows (broken, wrong, security) and skips the parity work there. W2 spends its effort on doctors, consultations, insurance, emergency, maternity, family and settings. The new flow is built once, properly.
- **Reuse, not rewrite:**
  - the pharmacy broadcast engine (generalised);
  - the provider matching service;
  - slots;
  - D-30's networks and classes;
  - the D-37 relay inbox;
  - `RefundExecutor`;
  - home-care tracking;
  - the AI scanner (for photo orders).

## 3. Owner decisions (approved by the owner on 2026-10-16: the recommendation in each item)
1. **"Held until done":**
   - (a) card authorisation, captured when the service is done. Moyasar supports authorise-then-capture, but an authorisation expires after a few days, so it fits ASAP and near-term visits only.
   - (b) charge at booking, automatic refund on cancellation or no-show by the provider. This works for any date.

   Recommendation: (b) for everything, plus (a) for ASAP visits if Moyasar confirms the hold window.
2. **Per-item insurance prices:** do providers declare one price per item, or a cash price plus an insurer-network price per company/class? Recommendation: cash price per mode now; network prices later.
3. **Ranking weights** for "Best match" (coverage, network, distance, speed, rating, reliability). Recommendation: start with fixed weights in SystemConfig, editable in the admin.
4. ASAP radius stages and timers: 3 → 5 → 8 km. Recommendation: 3 minutes per stage, editable in the admin.

## 4. Phased plan (one PR per item; acceptance specs written by the review session first)

| Phase | Content | Owner |
|---|---|---|
| **M0** | Design session: boards for the six-step flow (web + app), the provider declaration screens, "My medical orders". No code | design session |
| **M1** | Provider item model (A) + migration of existing capability rows + provider-app and admin declaration screens | new OpenCode session OC-M |
| **M2** | Doctor's structured medical order (C) + "My medical orders" + per-item status + validity + Order button (prefill) | OC-M |
| **M3** | Ordering engine API: items → split by mode → payer → matching (best match, compare, split suggestion) → time (window / ASAP / slot / walk-in QR) → confirm and pay | OC-M |
| **M4** | ASAP and photo-order broadcast: the pharmacy engine generalised; auto-accept-first; expanding radius with a timer; earliest-slot fallback | OC-M (with OC-A for 13.R1) |
| **M5** | Insurance per item (D): coverage estimate, relay approval gating, partial-approval choices, expiry warning (on top of D-30 / D-37) | OpenCode A after D-30 |
| **M6** | Web and app UI of M1–M5 from the M0 boards | design session + W2 |
| **M7** | After-service and safeguards (B8, E): reminders, arrival code, results with trends, confirm deadline + auto-refund + alternative, reliability ranking, gender preference | OC-M |
| **M8** | Instant consultation broadcast (F) | OC-M |

Each phase passes the live gate with a journey per service (lab, radiology, nursing), red before and green after, real data, six languages.
