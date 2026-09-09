import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FlaskConical } from "lucide-react";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import styles from "../diagnostics.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function DiagnosticsBookingsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Diagnostics");
  const token = await requirePatientAccess(locale);
  const res = await callPatientApi("/labs/bookings/mine", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  if (res.status === 403 || res.status === 404) notFound();
  const raw = res.ok ? await res.json().catch(() => null) : null;
  const list = Array.isArray(raw) ? raw : (raw as { data?: unknown })?.data;

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/diagnostics`}>{t("back")}</Link>
      <section className={styles.intro}>
        <div className={styles.introText}>
          <p className={styles.eyebrow}><FlaskConical size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1>{locale === "ar" ? "حجوزاتي التشخيصية" : "My diagnostic bookings"}</h1>
        </div>
      </section>
      {Array.isArray(list) && list.length > 0 ? (
        <ul style={{ display: "grid", gap: 8 }}>
          {list.map((b: unknown, i: number) => {
            const r = b as Record<string, unknown>;
            const id = String(r.id ?? r.bookingId ?? r._id ?? i);
            return <li key={id}><Link href={`/${locale}/diagnostics/labs/${encodeURIComponent(id)}`}>{String(r.service_name ?? r.name ?? id)} · {String(r.state ?? r.status ?? "")}</Link>{" "}<Link href={`/${locale}/diagnostics/insurance-upload?bookingId=${encodeURIComponent(id)}`}>{locale === "ar" ? "رفع تأمين" : "Upload insurance"}</Link></li>;
          })}
        </ul>
      ) : <p role="status">{t("unavailable")}</p>}
    </main>
  );
}
