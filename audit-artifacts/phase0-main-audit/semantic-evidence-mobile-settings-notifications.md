# Semantic evidence — Mobile Notifications Settings

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/settings/notifications.tsx:1–8` is only a legacy redirect to `/settings/notifications-settings`; it has no independent behavior. The real screen hard-codes defaults for general, appointments, orders, offers, medications, doctorMessages, emergency, sound and vibration (`:86–96`) before reading `/users/me/notification-settings` (`:98–102`). GET failure is swallowed, so defaults can be shown as the saved preference state without loading/error/stale indication.

Each unlocked toggle optimistically updates local state and sends `PATCH /users/me/notification-settings` (`:104–114`) without visible Idempotency-Key, rollback, in-flight guard, version/conflict handling, retry, ownership/auth proof or server acknowledgement. Failure leaves the UI falsely changed. The fixed keys and labels are not negotiated with the backend, and no device-token/channel/platform permission registration, delivery status, timezone, quiet hours or notification history is handled.

Emergency is marked locked and locally forced on (`:59–64,135–145`), but the screen does not prove that server policy prevents disabling it or distinguish safety-critical channels from marketing/product notifications. Descriptions claim appointment reminders one hour and 15 minutes before and medication safety impact (`:29–50,218–220,258–277`) without contract evidence. No localized variants beyond Arabic or accessibility/test coverage is shown. No Phase 0 remediation was made.
