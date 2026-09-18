import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FlaskConical } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import styles from "../diagnostics.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function DiagnosticsResultsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Diagnostics");
  const token = await requirePatientAccess(locale);
  const [labsRes, radioRes] = await Promise.all([
    callPatientApi("/labs/bookings/mine", {}, token),
    callPatientApi("/radiology/reports/mine", {}, token),
  ]);
  if (labsRes.status === 401 || radioRes.status === 401) redirect(`/${locale}/login`);
  const labs = labsRes.ok ? await labsRes.json().catch(() => null) : null;
  const radio = radioRes.ok ? await radioRes.json().catch(() => null) : null;
  const labList = Array.isArray(labs) ? labs : (labs as { data?: unknown })?.data;
  const radioList = Array.isArray(radio) ? radio : (radio as { data?: unknown })?.data;

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/diagnostics`} style={{ color: "#1E332E", fontWeight: 760, textDecoration: "none", overflowWrap: "anywhere" as any }}>{t("back")}</Link>
      <section className={styles.intro}>
        <div className={styles.introText}>
          <p className={styles.eyebrow}><FlaskConical size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" as any }}>{locale === "ar" ? "نتائجي وتقاريري" : "My results & reports"}</h1>
          <p style={{ overflowWrap: "anywhere" }}>{locale === "ar" ? "نتائج المختبر وتقارير الأشعة من الخادم فقط." : "Lab results and radiology reports from the server only."}</p>
        </div>
        <div className={styles.introIcon} aria-hidden="true"><FlaskConical size={24} /></div>
      </section>
      <section className={styles.domain} style={{ display: "grid", gap: 16 }}>
        <h2 style={{ margin: 0, color: "#1E332E", fontSize: "1.05rem", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" as any }}>{locale === "ar" ? "حجوزات المختبر" : "Lab bookings"}</h2>
        {Array.isArray(labList) && labList.length > 0 ? (
          <div style={{ display: "grid", gap: 16 }}>
            {labList.map((b: unknown, i: number) => {
              const r = b as Record<string, unknown>;
              const id = String(r.id ?? r.bookingId ?? r._id ?? i);
              const label = String(r.service_name ?? r.name ?? id);
              return <Link key={id} href={`/${locale}/diagnostics/labs/${encodeURIComponent(id)}`} style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", color: "#1E332E", fontWeight: 700, textDecoration: "none", overflowWrap: "anywhere", boxShadow: "0 8px 24px rgba(30,51,46,.07)" }}><span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" as any }}>{label}</span></Link>;
            })}
          </div>
        ) : <p className={styles.empty} style={{ overflowWrap: "anywhere" }}>{t("unavailable")}</p>}
      </section>
      <section className={styles.domain} style={{ display: "grid", gap: 16 }}>
        <h2 style={{ margin: 0, color: "#1E332E", fontSize: "1.05rem", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" as any }}>{locale === "ar" ? "تقارير الأشعة" : "Radiology reports"}</h2>
        {Array.isArray(radioList) && radioList.length > 0 ? (
          <div style={{ display: "grid", gap: 16 }}>
            {radioList.map((b: unknown, i: number) => {
              const r = b as Record<string, unknown>;
              const label = String(r.title ?? r.service_name ?? r.id ?? i);
              return <div key={String(r.id ?? i)} style={{ padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", color: "#1E332E", fontWeight: 700, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" as any, boxShadow: "0 8px 24px rgba(30,51,46,.07)" }}>{label}</div>;
            })}
          </div>
        ) : <p className={styles.empty} style={{ overflowWrap: "anywhere" }}>{t("unavailable")}</p>}
      </section>
    </main>
  );
}
