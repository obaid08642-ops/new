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
      <Link href={`/${locale}/diagnostics`}>{t("back")}</Link>
      <section className={styles.intro}>
        <div className={styles.introText}>
          <p className={styles.eyebrow}><FlaskConical size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1>{locale === "ar" ? "نتائجي وتقاريري" : "My results & reports"}</h1>
          <p>{locale === "ar" ? "نتائج المختبر وتقارير الأشعة من الخادم فقط." : "Lab results and radiology reports from the server only."}</p>
        </div>
      </section>
      <section>
        <h2>{locale === "ar" ? "حجوزات المختبر" : "Lab bookings"}</h2>
        {Array.isArray(labList) && labList.length > 0 ? (
          <ul style={{ display: "grid", gap: 8 }}>
            {labList.map((b: unknown, i: number) => {
              const r = b as Record<string, unknown>;
              const id = String(r.id ?? r.bookingId ?? r._id ?? i);
              return <li key={id}><Link href={`/${locale}/diagnostics/labs/${encodeURIComponent(id)}`}>{String(r.service_name ?? r.name ?? id)}</Link></li>;
            })}
          </ul>
        ) : <p>{t("unavailable")}</p>}
      </section>
      <section>
        <h2>{locale === "ar" ? "تقارير الأشعة" : "Radiology reports"}</h2>
        {Array.isArray(radioList) && radioList.length > 0 ? (
          <ul style={{ display: "grid", gap: 8 }}>
            {radioList.map((b: unknown, i: number) => {
              const r = b as Record<string, unknown>;
              return <li key={String(r.id ?? i)}>{String(r.title ?? r.service_name ?? r.id ?? i)}</li>;
            })}
          </ul>
        ) : <p>{t("unavailable")}</p>}
      </section>
    </main>
  );
}
