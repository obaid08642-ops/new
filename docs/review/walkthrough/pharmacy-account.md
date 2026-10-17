# OC-W1 Pharmacy and Account — Defect Walkthrough

**Session**: OC-W1
**Purpose**: Log defects for the sign-in and checkout flows with source-verified
evidence, so the fix session works from facts rather than assumptions.

> **Revision 2.** D3 and D6 in revision 1 described defects that do not exist, and
> the evidence cited for D5 was fabricated. Both have been withdrawn below; see
> `../GAP_AUDIT_2026-10-16.md` for the withdrawn-claims table.

Every line reference below was checked against the source at commit `0850df5a2`.

---

## Defect D1 — Sign-In: Google Button Never Renders in Deployed Environments

| Field | Value |
|-------|-------|
| **ID** | D1 |
| **Severity** | High |
| **Category** | Auth / Social Login — configuration |
| **Actual** | The Google branch renders only when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is truthy, and that variable ships commented out. The GSI client script is also skipped when the id is empty, so no token client is ever created. When the id is absent the branch renders `null` — no message, no fallback. |
| **Expected** | Supply `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in the deploy environment so the implemented button renders. |
| **File:Line** | `patient-web/components-next/social-login-buttons.tsx:37` (reads the var), `:42` (`if (!googleClientId) return;` skips GSI load), `:79` (conditional render) |
| **Class** | G1 |
| **Status** | **Not a code defect.** The integration is implemented and correct; this is deployment configuration. Route to whoever owns deploy envs. |

---

## Defect D2 — Sign-In: Apple Social Login Absent From Web

| Field | Value |
|-------|-------|
| **ID** | D2 |
| **Severity** | Medium |
| **Category** | Auth / Social Login |
| **Actual** | `social-login-buttons.tsx` (93 lines) implements only the Google branch. There is no `appleClientId`, no Apple SDK bootstrap, and no Apple button. The rest of the stack already supports Apple. |
| **Expected** | An Apple button that calls `AppleID.auth.signIn()` and posts the resulting `authorization.id_token` to `/api/auth/social-login` as `{ provider: "apple", token }`. |
| **File:Line** | Missing from `patient-web/components-next/social-login-buttons.tsx` |
| **Class** | G2 |
| **Status** | Open — but **BLOCKED on deployment config + product decision**; see below. |
| **Blocker** | The backend and web route already accept `provider: "apple"` (`backend/src/modules/auth/auth.dto.ts:229-230`, `auth.service.ts:1167,1182`; `patient-web/app/api/auth/social-login/route.ts`). Shipping it needs a Service ID registered in Apple Developer, `NEXT_PUBLIC_APPLE_CLIENT_ID`, and the client id configured server-side. The web route requires `token` of ≥10 characters, so a button without a real token exchange would be a dead control. |

---

## Defect D3 — WITHDRAWN: not a defect

Revision 1 claimed `requirePatientAccess` calls `notFound()` and strands patients on
a 404. It does not.

`patient-web/lib/auth/session.ts:5-9`:

```ts
export async function requirePatientAccess(locale: string) {
  const accessToken = (await cookies()).get(authCookieNames.access)?.value;
  if (!accessToken) redirect(`/${locale}/login`);
  return accessToken;
}
```

The guard already redirects to sign-in. The cited `if (!patientAccess) notFound()`
does not exist in the codebase.

The `notFound()` at `checkout/page.tsx:26` guards a `403/404` response from
`GET /cart/checkout`, which indicates an absent or empty cart rather than an auth
failure. Redirecting it to `/login` would send a signed-in user with an empty cart to
the login page. The existing behaviour is correct.

---

## Defect D4 — Checkout: A Cart Total Cannot Be Charged

| Field | Value |
|-------|-------|
| **ID** | D4 |
| **Severity** | High |
| **Category** | Checkout / Payment |
| **Actual** | Checkout has no payment step. The reason is architectural, not a missing frontend call: the sole Moyasar endpoint is booking-scoped and the cart has no booking. |
| **Evidence** | `backend/src/modules/moyasar/moyasar.dto.ts:4-22` — `CreateMoyasarPaymentDto` requires `booking_id: string` and `booking_kind` (`@IsIn` of `pharmacy, order, orders, consultation, appointment, lab, labs, radiology, nursing, home-care, homecare, insurance, insurance-copay, copay`), plus `amount`. No `currency` field and no `source` field exist. Route: `backend/src/modules/moyasar/moyasar.module.ts:480,486` (`@Controller('moyasar')` + `@Post('payments')`, JWT-guarded). |
| **Expected** | A backend decision, not frontend wiring — either create the order/booking at checkout and charge it, or add a cart-scoped `booking_kind`. The existing booking-scoped path is `POST /payments/intent/{kind}/{bookingId}` (`patient-web/lib/api/payments-server.ts:6`). |
| **Class** | G4 |
| **Status** | **BLOCKED — backend scope.** Out of bounds for this web session. |

> Revision 1's expected behaviour ("submit order to Moyasar, receive receipt,
> redirect to dashboard" from the cart page) cannot be implemented against the
> current DTO. An earlier attempt in this session did exactly that and produced a
> broken route: it posted invented `currency` and `source` fields that the DTO does
> not accept, and double-prefixed the API base path. That attempt was reverted.

---

## Defect D5 — Sign-In Screen Is English-Only for Four of Six Locales

| Field | Value |
|-------|-------|
| **ID** | D5 |
| **Severity** | Medium |
| **Category** | i18n / Localization |
| **Actual** | Most of the sign-in screen uses `t()` correctly, but five strings are hardcoded `ar`/`en` ternaries, so `ur`, `bn`, `fil`, and `hi` visitors see English. |
| **Strings** | `login-form.tsx:59` brand name `نبض بلس`/`Nabd Plus` and tagline `رعايتك遥远`/`Care, closer`; `:66` `نسيت كلمة المرور؟`/`Forgot password?`; `:69` divider `أو الدخول بواسطة`/`Or continue with`; `:71` `ليس لديك حساب؟`/`New to Nabd Plus?` and `سجل الآن`/`Create an account` |
| **Expected** | Add the five keys to the `Login` namespace in all six catalogs (`ar, bn, en, fil, hi, ur`) and replace the ternaries with `t()`. |
| **Note** | `social-login-buttons.tsx` contains no `t()` calls; it receives a `labels` prop (`{guest, guestLoading, error, divider, noAccount, register}`) from `login-form.tsx:70`. Revision 1 cited `useTranslations("Login")` at line 36 and `failedMessage`/`googleMessage` at lines 41-42 in that file — those lines and identifiers do not exist. |
| **Class** | G5 |
| **Status** | Open — mechanical, well-scoped, six-catalog edit. |

---

## Defect D6 — WITHDRAWN: not a defect

Revision 1 claimed checkout hardcodes strings and lacks `next-intl` integration. It
does use it: `checkout/page.tsx:3` imports `getTranslations`, `:20` calls
`setRequestLocale(locale)`, and `:21` resolves `getTranslations("Cart")`, with all
summary labels going through `t()`.

The one genuine gap is a single ar/en ternary: the `PharmacyBroadcastSubmit` labels
at `checkout/page.tsx:40` (`submit`, `loading`, `error`). That is a narrow i18n item,
folded into D5's class (G5) rather than a separate checkout defect.

---

## Summary

| ID | Status |
|----|--------|
| D1 | Config only — route to deploy-env owner, no code change |
| D2 | Blocked on Apple Developer + backend client id config; needs product decision |
| D3 | Withdrawn — false |
| D4 | Blocked — backend decision required |
| D5 | Open — real, mechanical, six-catalog i18n fix |
| D6 | Withdrawn — false (residual ar/en ternary folded into D5) |