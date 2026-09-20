import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPatientAppointment } from "@/lib/api/appointments-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ChevronLeft } from "lucide-react";
import { VectorDoctor } from "@/components-next/vector-illustrations";
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
  const res = await getPatientAppointment(token, appointmentId);
  if (res.status === 401) redirect(`/${locale}/login`);
  if (res.status === 403 || res.status === 404) notFound();
  const payload = res.ok ? await res.json().catch(() => null) : null;
  const appt = payload?.data ?? payload;
  const status = String(appt?.status ?? "PENDING");
  const steps = ["PENDING", "CONFIRMED", "PROVIDER_EN_ROUTE", "PROVIDER_ARRIVED", "IN_PROGRESS", "COMPLETED"] as const;
  const idx = steps.findIndex((s) => s === status);

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
      <Link className={styles.back} href={`/${locale}/appointments/${encodeURIComponent(appointmentId)}`} style={{ color: "#1E332E", gap: 8, borderRadius: 20, border: "1px solid #E8EDEE", padding: "8px 12px", background: "rgba(255,255,255,.82)", overflowWrap: "anywhere" } as any}>
        <ChevronLeft size={17} aria-hidden="true" />
        <span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("back")}</span>
      </Link>
      <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <h1 className={styles.title} style={{ color: "#1E332E", gap: 16 } as any}>
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE", flex: "0 0 auto" } as any}><VectorDoctor size={48} aria-hidden="true" /></span>
          <span className={styles.titleText} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("title")}</span>
        </h1>
      </section>
      <ol className={styles.timeline} style={{ gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        {steps.map((s, i) => (
          <li key={s} className={`${styles.step} ${i <= idx && idx >= 0 ? styles.done : ""}`} style={{ gap: 8, overflowWrap: "anywhere" } as any}>
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.stepLabel} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t(`step_${s}` as any)}</span>
          </li>
        ))}
      </ol>
      {idx < 0 ? <p className={styles.note} style={{ padding: 16, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("unknownStatus")}: {status}</p> : null}
    </main>
  );
}
