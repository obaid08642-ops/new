# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/dashboard/page.tsx`
- **Member SHA-256:** `06015f1009086723ad4f7f5c8aaeb5148d4b6a07e093ac0e215b8f5d63b27c85`
- **Line count:** 76
- **Read range:** `1-76`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `5: import { Activity, Bell, BookOpen, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, FileText, HeartPulse, HousePlus, MessageCircle, Pill, ScanLine, Settings, Stethoscope, UserRound, UsersRound } from "lucide-react";`
- `35: { key: "articles", href: "articles", icon: BookOpen },`
- `44: export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {`
- `46: if (!isLocale(locale)) redirect("/ar/login");`
- `48: if (!token) redirect(`/${locale}/login`);`
- `56: redirect(`/${locale}/login`);`
- `68: <div className={styles.heroTop}><span className={styles.heroBadge}>{t("eyebrow")}</span><div className={styles.heroActions}><Link className={styles.iconAction} href={`/${locale}/notifications`} aria-label={t("notifications")}><Bell size={19`
- `71: <section className={styles.section} aria-labelledby="quick-access-title"><div className={styles.sectionHeading}><h2 id="quick-access-title">{t("eyebrow")}</h2><span>{t("title")}</span></div><nav className={styles.quickGrid} aria-label={t("t`
- `72: <section className={styles.section} aria-label={t("appointments")}><div className={styles.statusCard}><div className={styles.sectionHeading}><h2>{t("appointments")}</h2><Link className={styles.moreLink} href={`/${locale}/appointments`}>{t("`
- `73: <section className={styles.section} aria-label={t("health")}><div className={styles.featureGrid}>{featureDestinations.map(({ key, href, icon: Icon, accent }) => <Link key={key} className={styles.featureCard} href={`/${locale}/${href}`} styl`
- `74: <section className={styles.section} aria-label={t("profile")}><div className={styles.sectionHeading}><h2>{t("profile")}</h2><span>{t("body")}</span></div><nav className={styles.moreGrid} aria-label={t("profile")}>{moreDestinations.map(({ ke`
### backend_consumers_or_contracts
- `7: import { authCookieNames } from "@/lib/auth/cookies";`
- `8: import { getPatientDashboardProfile, getPatientDashboardUpcomingAppointment } from "@/lib/api/dashboard-server";`
- `9: import { parseDashboardAppointment, parseDashboardProfile } from "@/lib/api/dashboard";`
- `68: <div className={styles.heroTop}><span className={styles.heroBadge}>{t("eyebrow")}</span><div className={styles.heroActions}><Link className={styles.iconAction} href={`/${locale}/notifications`} aria-label={t("notifications")}><Bell size={19`
- `72: <section className={styles.section} aria-label={t("appointments")}><div className={styles.statusCard}><div className={styles.sectionHeading}><h2>{t("appointments")}</h2><Link className={styles.moreLink} href={`/${locale}/appointments`}>{t("`
### auth_ownership
- `1: import { cookies } from "next/headers";`
- `7: import { authCookieNames } from "@/lib/auth/cookies";`
- `46: if (!isLocale(locale)) redirect("/ar/login");`
- `47: const token = (await cookies()).get(authCookieNames.access)?.value;`
- `48: if (!token) redirect(`/${locale}/login`);`
- `52: getPatientDashboardProfile(token),`
- `53: getPatientDashboardUpcomingAppointment(token),`
- `56: redirect(`/${locale}/login`);`
### state_transitions
- `55: if ([profileResult, appointmentResult].some((result) => result.status === "fulfilled" && result.value.status === 401)) {`
- `58: const profile = profileResult.status === "fulfilled" && profileResult.value.ok`
- `61: const appointment = appointmentResult.status === "fulfilled" && appointmentResult.value.ok`
- `72: <section className={styles.section} aria-label={t("appointments")}><div className={styles.statusCard}><div className={styles.sectionHeading}><h2>{t("appointments")}</h2><Link className={styles.moreLink} href={`/${locale}/appointments`}>{t("`
### payment_insurance_relevance
- `72: <section className={styles.section} aria-label={t("appointments")}><div className={styles.statusCard}><div className={styles.sectionHeading}><h2>{t("appointments")}</h2><Link className={styles.moreLink} href={`/${locale}/appointments`}>{t("`
- `73: <section className={styles.section} aria-label={t("health")}><div className={styles.featureGrid}>{featureDestinations.map(({ key, href, icon: Icon, accent }) => <Link key={key} className={styles.featureCard} href={`/${locale}/${href}`} styl`
### error_empty_loading_retry_cancel
- `59: ? parseDashboardProfile(await profileResult.value.json().catch(() => null))`
- `62: ? parseDashboardAppointment(await appointmentResult.value.json().catch(() => null))`
- `72: <section className={styles.section} aria-label={t("appointments")}><div className={styles.statusCard}><div className={styles.sectionHeading}><h2>{t("appointments")}</h2><Link className={styles.moreLink} href={`/${locale}/appointments`}>{t("`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
