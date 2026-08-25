# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/profile/page.tsx`
- **Member SHA-256:** `8b7244ec55a20d0d14625edc4b787b9e539607ebfbb6c2154c8d6fcbfb82ef9e`
- **Line count:** 59
- **Read range:** `1-59`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `9: import { ArrowUpLeft, BadgeCheck, Bell, BookOpen, CalendarDays, CircleAlert, FileText, HeartPulse, Pill, Settings, ShieldCheck, ShoppingBag, UserRound, UsersRound } from "lucide-react";`
- `21: export default async function ProfilePage({ params }: Props) {`
- `33: if ([profileResponse, medicalResponse, insuranceResponse].some((response) => response.status === 401)) redirect(`/${locale}/login`);`
- `51: { key: "articles", href: `/${locale}/articles`, Icon: BookOpen, accent: "#0F766E" },`
- `58: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><BadgeCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("body")}</p></div><span className={st`
### backend_consumers_or_contracts
- `4: import { callPatientApi } from "@/lib/api/upstream";`
- `5: import { extractRecord, profileDomainState, readProfileFields, type ProfileDomainState, type ProfileField } from "@/lib/api/profile";`
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
- `31: callPatientApi("/users/me/insurance", {}, token)`
- `44: { key: "appointments", href: `/${locale}/appointments`, Icon: CalendarDays, accent: "#0284C7" },`
- `45: { key: "orders", href: `/${locale}/orders`, Icon: ShoppingBag, accent: "#D97706" },`
- `49: { key: "notifications", href: `/${locale}/notifications`, Icon: Bell, accent: "#64748B" },`
### auth_ownership
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
- `27: const token = await requirePatientAccess(locale);`
- `29: callPatientApi("/users/me/profile", {}, token),`
- `30: callPatientApi("/medical-profile", {}, token),`
- `31: callPatientApi("/users/me/insurance", {}, token)`
- `33: if ([profileResponse, medicalResponse, insuranceResponse].some((response) => response.status === 401)) redirect(`/${locale}/login`);`
- `58: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><BadgeCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("body")}</p></div><span className={st`
### state_transitions
- `5: import { extractRecord, profileDomainState, readProfileFields, type ProfileDomainState, type ProfileField } from "@/lib/api/profile";`
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `13: type Domain = { title: string; fields: ProfileField[]; state: ProfileDomainState; kind: "identity" | "medical" | "insurance" };`
- `15: async function resolveDomain(response: Response, acceptedKeys: string[]): Promise<Pick<Domain, "fields" | "state">> {`
- `16: if (!response.ok) return { fields: [], state: profileDomainState(response.status, 0) };`
- `18: return { fields, state: profileDomainState(response.status, fields.length) };`
- `33: if ([profileResponse, medicalResponse, insuranceResponse].some((response) => response.status === 401)) redirect(`/${locale}/login`);`
- `37: resolveDomain(insuranceResponse, ["providerName", "companyName", "status"])`
- `40: const stateMessage = (state: ProfileDomainState) => state === "empty" ? t("empty") : state === "forbidden" ? t("forbidden") : t("unavailable");`
- `58: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><BadgeCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("body")}</p></div><span className={st`
### payment_insurance_relevance
- `13: type Domain = { title: string; fields: ProfileField[]; state: ProfileDomainState; kind: "identity" | "medical" | "insurance" };`
- `28: const [profileResponse, medicalResponse, insuranceResponse] = await Promise.all([`
- `31: callPatientApi("/users/me/insurance", {}, token)`
- `33: if ([profileResponse, medicalResponse, insuranceResponse].some((response) => response.status === 401)) redirect(`/${locale}/login`);`
- `34: const [identity, medical, insurance] = await Promise.all([`
- `37: resolveDomain(insuranceResponse, ["providerName", "companyName", "status"])`
- `39: const domains: Domain[] = [{ title: t("identity"), ...identity, kind: "identity" }, { title: t("medical"), ...medical, kind: "medical" }, { title: t("insurance"), ...insurance, kind: "insurance" }];`
- `41: const domainVisual = { identity: { Icon: UserRound, accent: "#2E86FF" }, medical: { Icon: HeartPulse, accent: "#23B5CE" }, insurance: { Icon: ShieldCheck, accent: "#7A6BEA" } } as const;`
- `58: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><BadgeCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("body")}</p></div><span className={st`
### error_empty_loading_retry_cancel
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `17: const fields = readProfileFields(extractRecord(await response.json().catch(() => null)), acceptedKeys);`
- `40: const stateMessage = (state: ProfileDomainState) => state === "empty" ? t("empty") : state === "forbidden" ? t("forbidden") : t("unavailable");`
- `58: return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><BadgeCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("body")}</p></div><span className={st`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
