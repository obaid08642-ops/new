# Semantic evidence — Mobile Family QR Scan

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

`audit-work/source/nabd_plus_patient_app/app/family/scan.tsx:1–9` uses `@ts-nocheck`, `expo-camera` permissions and `CameraView`; the screen is a camera-only scanner.

The parser accepts either any URL matching `/join/<alphanumeric-or-hyphen>` or any raw 4–12 character alphanumeric/hyphen string, uppercases it, and returns it as an invite code (`:11–21`). It does not validate the URL origin, signature, nonce, audience, expiry, one-time status, or whether the payload is a Nabd-issued invitation.

On a valid scan the app only sets a busy ref and navigates to `/family/join` with the parsed code (`:30–40`). No server lookup, reservation, consent preview, or replay protection happens in this screen. Invalid payloads only produce a two-second generic message (`:32–36,75–77`), and camera permission handling offers request access but no denied/permanently-denied recovery or manual-code fallback on the scanner screen (`:51–79`).

The screen has no proven handling for duplicate scans after navigation, expired/used/revoked invitations, wrong audience, unauthorized user, or backend errors. No Phase 0 remediation was made.
