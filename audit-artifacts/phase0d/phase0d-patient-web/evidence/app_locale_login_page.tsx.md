# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/login/page.tsx`
- **Member SHA-256:** `4f25597af542bfd065e8038efaf4730a4344fae6dbaaee56466064f467a8a1f2`
- **Line count:** 10
- **Read range:** `1-10`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { LoginForm } from "@/components/login-form";`
- `7: import styles from "./login.module.css";`
- `9: export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; if (!isLocale(locale)) return {}; const t = await getTranslations({ locale, namespace: "Metadata" }); return { title: t("loginTi`
- `10: export default async function LoginPage({ params }: Props) { const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale); const shared = await getTranslations("Shared"); const t = await getTranslations("Logi`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `4: import { LoginForm } from "@/components/login-form";`
- `7: import styles from "./login.module.css";`
- `9: export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; if (!isLocale(locale)) return {}; const t = await getTranslations({ locale, namespace: "Metadata" }); return { title: t("loginTi`
- `10: export default async function LoginPage({ params }: Props) { const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale); const shared = await getTranslations("Shared"); const t = await getTranslations("Logi`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `10: export default async function LoginPage({ params }: Props) { const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale); const shared = await getTranslations("Shared"); const t = await getTranslations("Logi`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
