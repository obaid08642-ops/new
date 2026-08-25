# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/seo-discovery-audit.txt`
- **Member SHA-256:** `c5f2371709de020433ca6b27d52dd613010673a9ad26dd46cbedfa6ec6d70d15`
- **Line count:** 147
- **Read range:** `1-147`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `2: app/[locale]/appointments/page.tsx`
- `3: app/[locale]/articles/page.tsx`
- `4: app/[locale]/cart/page.tsx`
- `5: app/[locale]/chat/page.tsx`
- `6: app/[locale]/dashboard/dashboard-page.test.ts`
- `7: app/[locale]/dashboard/page.tsx`
- `8: app/[locale]/diagnostics/page.tsx`
- `9: app/[locale]/family/page.tsx`
- `10: app/[locale]/health/page.tsx`
- `11: app/[locale]/home-care/page.tsx`
- `12: app/[locale]/insurance/page.tsx`
- `14: app/[locale]/login/page.tsx`
### backend_consumers_or_contracts
- `2: app/[locale]/appointments/page.tsx`
- `11: app/[locale]/home-care/page.tsx`
- `12: app/[locale]/insurance/page.tsx`
- `18: app/[locale]/notifications/page.tsx`
- `19: app/[locale]/orders/page.tsx`
- `85: const privatePaths = ["/api/", ...locales.flatMap((locale) => privateRouteFamilies.map((route) => `/${locale}/${route}`))];`
### auth_ownership
- `14: app/[locale]/login/page.tsx`
- `50: app/[locale]/login/page.tsx:1:import type { Metadata } from "next";`
- `51: app/[locale]/login/page.tsx:9:export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; if (!isLocale(locale)) return {}; const t = await getTranslations({ locale, namespace: "Metadata" `
- `57: app/[locale]/page.tsx:11:export default async function LandingPage({ params }: Props) { const { locale } = await params; if (!isLocale(locale)) return null; setRequestLocale(locale); const t = await getTranslations("Home"); const metadata =`
- `84: const privateRouteFamilies = ["login", "dashboard", "orders", "appointments", "diagnostics", "home-care", "family", "chat", "notifications", "health", "prescriptions", "reminders", "profile", "medicines", "medicine-catalog"];`
- `104: > Nabd Plus is a patient web portal. Public content is limited to the published website entry points; patient data always requires an authenticated server session.`
### state_transitions
- `76: app/[locale]/medicine-catalog/page.tsx:44:  return <main className={`main ${styles.page}`}><JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", url: canonical, inLanguage: locale, name: t("title"), mainEntity: { "@type": "I`
### payment_insurance_relevance
- `12: app/[locale]/insurance/page.tsx`
- `56: app/[locale]/page.tsx:10:export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; if (!isLocale(locale)) return {}; const t = await getTranslations({ locale, namespace: "Metadata" }); c`
- `57: app/[locale]/page.tsx:11:export default async function LandingPage({ params }: Props) { const { locale } = await params; if (!isLocale(locale)) return null; setRequestLocale(locale); const t = await getTranslations("Home"); const metadata =`
- `76: app/[locale]/medicine-catalog/page.tsx:44:  return <main className={`main ${styles.page}`}><JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", url: canonical, inLanguage: locale, name: t("title"), mainEntity: { "@type": "I`
### error_empty_loading_retry_cancel
- `76: app/[locale]/medicine-catalog/page.tsx:44:  return <main className={`main ${styles.page}`}><JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", url: canonical, inLanguage: locale, name: t("title"), mainEntity: { "@type": "I`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
