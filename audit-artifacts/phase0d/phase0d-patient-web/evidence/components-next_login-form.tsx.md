# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `components-next/login-form.tsx`
- **Member SHA-256:** `b68bd3ed09439483cbfc1db0ecf7aaa52f4cfb5d79792dfbb6bd13560434d768`
- **Line count:** 54
- **Read range:** `1-54`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { useRouter } from "next/navigation";`
- `8: import styles from "./login-form.module.css";`
- `10: export function LoginForm({ locale }: { locale: Locale }) {`
- `11: const router = useRouter(); const t = useTranslations("Login");`
- `14: const [message, setMessage] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false);`
- `16: async function submit(event: FormEvent<HTMLFormElement>) {`
- `17: event.preventDefault(); setMessage(null); setSubmitting(true);`
- `29: router.replace(`/${locale}/dashboard`); router.refresh(); return;`
- `31: const endpoint = twoFactor ? "/api/auth/verify-2fa" : "/api/auth/login";`
- `37: router.replace(`/${locale}/dashboard`); router.refresh();`
- `38: } catch { setMessage(otpMode ? t("otpUnavailable") : (twoFactor ? t("twoFactorUnavailable") : t("unavailable"))); } finally { setSubmitting(false); }`
- `43: return <form className={styles.form} onSubmit={submit} aria-busy={submitting}>`
### backend_consumers_or_contracts
- `21: const response = await fetch("/api/auth/otp/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier }) });`
- `25: const verify = await fetch("/api/auth/otp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, code }) });`
- `27: const exchange = await fetch("/api/auth/session/exchange", { method: "POST", headers: { "x-nabd-device-id": crypto.randomUUID() } });`
- `31: const endpoint = twoFactor ? "/api/auth/verify-2fa" : "/api/auth/login";`
- `33: const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });`
### auth_ownership
- `8: import styles from "./login-form.module.css";`
- `10: export function LoginForm({ locale }: { locale: Locale }) {`
- `11: const router = useRouter(); const t = useTranslations("Login");`
- `13: const [twoFactor, setTwoFactor] = useState(false); const [otpMode, setOtpMode] = useState(false); const [otpRequested, setOtpRequested] = useState(false);`
- `19: if (otpMode) {`
- `20: if (!otpRequested) {`
- `21: const response = await fetch("/api/auth/otp/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier }) });`
- `22: if (!response.ok) { setMessage(response.status === 503 || response.status === 504 ? t("otpUnavailable") : t("otpRequestInvalid")); return; }`
- `23: setOtpRequested(true); setMessage(t("otpSent")); return;`
- `25: const verify = await fetch("/api/auth/otp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, code }) });`
- `26: if (!verify.ok) { setMessage(verify.status === 503 || verify.status === 504 ? t("otpUnavailable") : t("otpInvalid")); return; }`
- `27: const exchange = await fetch("/api/auth/session/exchange", { method: "POST", headers: { "x-nabd-device-id": crypto.randomUUID() } });`
### state_transitions
- `3: import { FormEvent, useState } from "react";`
- `12: const [identifier, setIdentifier] = useState(""); const [password, setPassword] = useState(""); const [code, setCode] = useState("");`
- `13: const [twoFactor, setTwoFactor] = useState(false); const [otpMode, setOtpMode] = useState(false); const [otpRequested, setOtpRequested] = useState(false);`
- `14: const [message, setMessage] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false);`
- `22: if (!response.ok) { setMessage(response.status === 503 || response.status === 504 ? t("otpUnavailable") : t("otpRequestInvalid")); return; }`
- `26: if (!verify.ok) { setMessage(verify.status === 503 || verify.status === 504 ? t("otpUnavailable") : t("otpInvalid")); return; }`
- `28: if (!exchange.ok) { setMessage(exchange.status === 503 || exchange.status === 504 ? t("otpUnavailable") : t("otpExchangeInvalid")); return; }`
- `35: if (!response.ok) { setMessage(response.status === 503 || response.status === 504 ? (twoFactor ? t("twoFactorUnavailable") : t("unavailable")) : (twoFactor ? t("twoFactorInvalid") : t("invalid"))); return; }`
- `50: {message ? <p className={styles.error} role="alert">{message}</p> : null}`
### payment_insurance_relevance
- `34: const payload = await response.json().catch(() => ({}));`
- `36: if (!twoFactor && payload.requires2fa) { setTwoFactor(true); setPassword(""); setMessage(null); return; }`
### error_empty_loading_retry_cancel
- `34: const payload = await response.json().catch(() => ({}));`
- `38: } catch { setMessage(otpMode ? t("otpUnavailable") : (twoFactor ? t("twoFactorUnavailable") : t("unavailable"))); } finally { setSubmitting(false); }`
- `50: {message ? <p className={styles.error} role="alert">{message}</p> : null}`
- `51: <button className={styles.submit} disabled={submitting}>{submitting ? <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" /> : (otpMode ? <MailCheck size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="tru`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
