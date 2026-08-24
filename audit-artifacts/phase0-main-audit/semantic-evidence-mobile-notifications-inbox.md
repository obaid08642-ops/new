# Semantic evidence — Mobile Notifications inbox

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/notifications/index.tsx:1–12` is marked `@ts-nocheck` and reads the backend notification feed through `apiFetch`, with route translation through `translateBackendRoute`. The source maps backend notification types into system/medical/promotion groups and local icon/color metadata (`:14–46,62–75`).

The inbox loads `/notifications`, supports category filtering, counts unread items, and exposes pull-to-refresh (`:77–103,141–170`). It provides two mutations: `POST /notifications/read-all` and `POST /notifications/{id}/read` (`:105–115`). The individual read mutation is fire-and-forget and swallows failure; the all-read action optimistically marks everything read and reloads on failure. No visible idempotency key is supplied by the screen, and ownership/replay behavior requires backend evidence.

Opening a notification marks it read and translates a server route before navigation (`:111–121`), which avoids pushing raw backend vocabulary but creates a route-map dependency that needs exhaustive coverage tests. The feed distinguishes API error from true empty state and provides an accessible retry label (`:171–186`), which is stronger than several other Mobile screens. Notification body/title are rendered directly (`:188–205`), so PHI minimization and notification content policy require verification.

No Phase 0 remediation was made.
