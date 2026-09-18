import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ChevronLeft } from "lucide-react";
import { VectorNursing } from "@/components-next/vector-illustrations";
import styles from "./visit-tracking.module.css";

type Props = { params: Promise<{ locale: string; visitId: string }> };

export default async function NursingVisitTrackingPage({ params }: Props) {
  const { locale, visitId } = await params;
  if (!isLocale(locale) || !/^[A-Za-z0-9_-]{1,128}$/.test(visitId)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NursingTracking");
  const token = await requirePatientAccess(locale);

  const [visitRes, trackRes] = await Promise.all([
    callPatientApi(`/nursing/visits/${encodeURIComponent(visitId)}`, {}, token),
    callPatientApi(`/nursing/visits/${encodeURIComponent(visitId)}/tracking`, {}, token),
  ]);
  if (visitRes.status === 401) redirect(`/${locale}/login`);
  if (visitRes.status === 403 || visitRes.status === 404) notFound();
  const visitPayload = visitRes.ok ? await visitRes.json().catch(() => null) : null;
  const trackPayload = trackRes.ok ? await trackRes.json().catch(() => null) : null;
  const visit = visitPayload?.data ?? visitPayload ?? null;
  const track = trackPayload?.data ?? trackPayload ?? null;
  const status = String(visit?.status ?? track?.status ?? "PENDING");
  const steps = ["REQUESTED", "CONFIRMED", "NURSE_EN_ROUTE", "NURSE_ARRIVED", "CARE_IN_PROGRESS", "COMPLETED"];
  const idx = steps.findIndex((s) => s === status);
  const eta = track?.eta_minutes ?? track?.eta ?? null;
  const nurseName = visit?.nurse_name ?? visit?.nurse?.name ?? track?.nurse_name ?? null;

  return <main className={`main ${styles.page}`}>
    <Link className={styles.back} href={`/${locale}/nursing/visits`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
      <VectorNursing size={48} aria-hidden="true" />
      <h1 className={styles.title} style={{ margin: 0 }}>{t("title")}</h1>
    </div>
    {nurseName ? <p className={styles.nurse}>{t("nurse")}: {String(nurseName)}</p> : null}
    {eta != null && Number.isFinite(Number(eta)) ? <p className={styles.eta}>{t("eta")}: {String(eta)} {t("minutes")}</p> : null}
    <ol className={styles.timeline}>
      {steps.map((s, i) => (
        <li key={s} className={`${styles.step} ${i <= idx && idx >= 0 ? styles.done : ""}`}>
          <span className={styles.dot} aria-hidden="true" />
          <span>{t(`step_${s}` as any)}</span>
        </li>
      ))}
    </ol>
    {idx < 0 ? <p className={styles.note}>{t("unknownStatus")}: {status}</p> : null}

    {(track?.vitals || track?.notes || visit?.vitals || visit?.notes) ? (
      <section style={{ background: "rgba(255,255,255,0.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: 20, padding: 24, marginTop: 24, border: "1px solid #E8EDEE" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {locale === "ar" ? "التقرير السريري للزيارة" : "Clinical Visit Report"}
        </h2>
        <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
          {(track?.vitals?.pulse || visit?.vitals?.pulse) && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{locale === "ar" ? "النبض (BPM):" : "Pulse:"}</span>
              <strong style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{track?.vitals?.pulse ?? visit?.vitals?.pulse}</strong>
            </div>
          )}
          {(track?.vitals?.bp || visit?.vitals?.bp) && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{locale === "ar" ? "ضغط الدم:" : "Blood Pressure:"}</span>
              <strong style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{track?.vitals?.bp ?? visit?.vitals?.bp}</strong>
            </div>
          )}
          {(track?.notes || visit?.notes) && (
            <div style={{ marginTop: 8 }}>
              <span style={{ color: "#6B7C6E", display: "block", marginBottom: 8, overflowWrap: "anywhere" }}>{locale === "ar" ? "ملاحظات الممرض:" : "Nurse Notes:"}</span>
              <p style={{ margin: 0, padding: 16, background: "#FDFDFC", borderRadius: 20, color: "#1E332E", border: "1px solid #E8EDEE", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {track?.notes ?? visit?.notes}
              </p>
            </div>
          )}
        </div>
      </section>
    ) : null}
  </main>;
}
