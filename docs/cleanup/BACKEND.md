# Backend cleanup before the final deploy (2026-10-25)

Method: `knip`, then every candidate grepped across src, test, e2e, scripts and acceptance. A file whose only importer was itself
dead is removed with it. No collection, migration, seed or deploy file is touched (a schema file is code only).

- **43 files with no importer:** the unused Paymob payment module (Moyasar is the gateway), the never-registered `tour` module,
  `socket.gateway` (LiveKit + REST replaced it), an unused second `moyasar.service`, an unregistered `patient-pharmacy.controller`,
  the Bull `mail.processor`, `ocr.service`, `billing.service`, `ai-referral.service`, `auto-index.service`, `recurring.service`,
  the unregistered `admin-web-core.module`, unused guards (device-limit, velocity, chat-gateway, livekit-webhook) and validators
  (iqama, password, saudi-phone), and 17 Mongoose schemas nothing registers.
- **11 unused dependencies:** `@google-cloud/vision`, `@nestjs/bull`, `bull`, `@nestjs/passport`, `passport`, `passport-jwt`,
  `pdfmake`, `commander`, `tsconfig-paths`, `@types/passport-jwt`, `@types/pdfmake`.
- **Kept on purpose:** `src/scripts/*` (run by hand), the e2e and acceptance suites (own runners), `admin-enterprise.module` and
  `unified-bookings.service` (used by integration tests), `radiology.dto` and `provider-delta.schema` (imported), the lint plugins,
  `@types/multer` (Multer file types).

Checks: `tsc --noEmit` 0, `nest build` ok, `npm test` 25/25 chunks passed, `dtolint` exit 0.
