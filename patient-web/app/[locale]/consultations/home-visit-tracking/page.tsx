import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { Home, ChevronLeft } from "lucide-react";
import styles from "./home-visit.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string }> };

export default async function HomeVisitTrackingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const { appointmentId = "" } = await searchParams;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(appointmentId)) notFound();
  const t = await getTranslations("HomeVisitTracking");
  const token = await requirePatientAccess(locale);
  const res = await callPatientApi(`/care/appointments/${encodeURIComponent(appointmentId)}`, {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  if (res.status === 403 || res.status === 404) notFound();
  const payload = res.ok ? await res.json().catch(() => null) : null;
  const appt = payload?.data ?? payload;
  const status = String(appt?.status ?? "PENDING");
  const steps = ["PENDING", "CONFIRMED", "PROVIDER_EN_ROUTE", "PROVIDER_ARRIVED", "IN_PROGRESS", "COMPLETED"];
  const idx = steps.findIndex((s) => s === status);

  return <main className={`main ${styles.page}`}>
    <Link className={styles.back} href={`/${locale}/appointments/${encodeURIComponent(appointmentId)}`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>
    <h1 className={styles.title}><Home size={22} aria-hidden="true" />{t("title")}</h1>
    <ol className={styles.timeline}>
      {steps.map((s, i) => (
        <li key={s} className={`${styles.step} ${i <= idx && idx >= 0 ? styles.done : ""}`}>
          <span className={styles.dot} aria-hidden="true" />
          <span>{t(`step_${s}` as any)}</span>
        </li>
      ))}
    </ol>
    {idx < 0 ? <p className={styles.note}>{t("unknownStatus")}: {status}</p> : null}
  </main>;
}
