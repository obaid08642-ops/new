# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/robots.ts`
- **Member SHA-256:** `0d099032d390a23e74e9dc35925e9a2cdab51234c31338ee6456d927bcc29077`
- **Line count:** 10
- **Read range:** `1-10`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: import type { MetadataRoute } from "next";`
- `5: export default function robots(): MetadataRoute.Robots {`
- `6: const privateRouteFamilies = ["login", "dashboard", "orders", "appointments", "diagnostics", "home-care", "family", "chat", "notifications", "health", "prescriptions", "reminders", "profile", "medicines", "medicine-catalog", "wishlist"];`
- `7: const privatePaths = ["/api/", ...locales.flatMap((locale) => privateRouteFamilies.map((route) => `/${locale}/${route}`))];`
### backend_consumers_or_contracts
- `7: const privatePaths = ["/api/", ...locales.flatMap((locale) => privateRouteFamilies.map((route) => `/${locale}/${route}`))];`
### auth_ownership
- `6: const privateRouteFamilies = ["login", "dashboard", "orders", "appointments", "diagnostics", "home-care", "family", "chat", "notifications", "health", "prescriptions", "reminders", "profile", "medicines", "medicine-catalog", "wishlist"];`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
