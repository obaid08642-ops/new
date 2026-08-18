# Phase 2 Patient — profile, notification-preferences, and inbox gaps

## Confirmed controls

Patient profile endpoints are JWT-scoped to the current user and apply an editable-field whitelist, including NoSQL operator/path rejection. Notification list/read/read-all routes are JWT-protected, owner/role/all-scoped, and include a tested fail-closed foreign-notification check. These ownership controls are **PASS**.

The patient-managed emergency-contact CRUD path is also patient-scoped: it validates contact name/phone, assigns an opaque ID, and deletes only from the requesting patient's embedded profile. This is **PASS** as standalone contact management. It does **not** authorize activation, sharing, or notification of an emergency/SOS workflow; those contracts remain fail-closed pending owner legal/product approval.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Health-profile defaults can fabricate clinical data after a failed load | The edit form defaults to `gender: ذكر` and `bloodType: O+`. If profile load fails, the user can save those values with unrelated edits, overwriting/creating unverified medical identity data. | Use an explicit unloaded/error state and blank/unknown clinical fields; never send untouched default clinical values; require deliberate, validated selection. |
| **P1** | Patient medical/identity data has no domain validation | Backend only whitelists fields. Client accepts free-text date of birth/national ID, arbitrary height/weight (including invalid values), duplicate allergies, and unrestricted health-condition text. | Define validated DTOs/ranges/formats, normalized controlled-vocabulary options where clinically appropriate, duplicate/length safeguards, and reviewed consent/audit rules for sensitive data. |
| **P1** | Failed profile save has no visible recovery | Save catches and logs error, then leaves the editing view with no message; avatar is displayed locally before its profile patch is known to have persisted. | Show safe field/form error and retry state, preserve draft, refresh on confirmed success, and roll back local avatar if profile linkage fails. |
| **P1** | Notification switches do not govern delivery | `notification_settings` is persisted but has no server-side consumer in notification/push delivery code. The UI implies that categories, sound, and vibration change notification behavior when they do not. | Connect per-category preference evaluation to creation/delivery, define emergency/legal override semantics, and separately synchronize device OS permissions/sound capabilities. |
| **P1** | Partial preference PATCH overwrites the settings object | `setSetting` stores the patch object directly; toggling one setting replaces prior stored fields. Client masks this by merging defaults locally but Backend truth is partial. | Merge validated allowed keys server-side with defaults and return a complete normalized setting document; rollback optimistic UI on failure. |
| **P2** | Inbox read state can diverge on network failure | A notification is locally marked read before an unawaited API call; failure has no reversion/retry. | Await or queue the write with rollback/retry and expose a non-blocking status. |
| **P1** | Profile/inbox/settings are not six-language complete | Form fields, health labels, notification categories/times, error messages, and settings descriptions are raw Arabic; the condition tag uses an emoji delete affordance. | Use translated keys and locale-aware relative time, replace emoji with accessible vector controls, and verify all six language/RTL-LTR layouts. |

## Decision

Profile ownership and notification read authorization are **PASS**, but the patient health-profile editing and notification-preference experience remain **FIX/BLOCKED** for truthful medical data, effective preference behavior, recoverable persistence, and complete localization.
