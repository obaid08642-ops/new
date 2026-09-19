import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPatientAppointments } from "@/lib/api/appointments-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { ChevronLeft } from "lucide-react";
import { VectorDoctor } from "@/components-next/vector-illustrations";
import styles from "./call-history.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function CallHistoryPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("CallHistory");
  const token = await requirePatientAccess(locale);
  const res = await getPatientAppointments(token);
  if (res.status === 401) redirect(`/${locale}/login`);
  if (res.status === 403 || res.status === 404) notFound();
  const payload = res.ok ? await res.json().catch(() => null) : null;
  const raw: unknown[] = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  const done = (raw as any[]).filter((a) => ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(String(a?.status ?? "")));

  return (
    <main className={`main ${styles.page}`}>
      <Link className={styles.back} href={`/${locale}/appointments`}>
        <ChevronLeft size={17} aria-hidden="true" />
        {t("back")}
      </Link>
      <h1 className={styles.title}>
        <VectorDoctor size={48} aria-hidden="true" />
        <span className={styles.titleText}>{t("title")}</span>
      </h1>
      {done.length === 0 ? (
        <section className={styles.empty}>
          <VectorDoctor size={48} aria-hidden="true" />
          <p className={styles.emptyText}>{t("emptyBody")}</p>
          <Link className={styles.primary} href={`/${locale}/consultations/doctors`}>
            {t("findDoctor")}
          </Link>
        </section>
      ) : (
        <ul className={styles.list}>
          {done.map((a: any, i: number) => (
            <li key={String(a?.id ?? i)} className={styles.item}>
              <Link href={`/${locale}/appointments/${encodeURIComponent(String(a?.id ?? ""))}`} className={styles.itemLink}>
                <span className={styles.doc}>{String(a?.doctor_name ?? a?.doctor?.name ?? t("unknownDoctor"))}</span>
                <span className={styles.meta}>
                  {String(a?.scheduled_at ?? a?.date ?? "").slice(0, 16).replace("T", " ")} — {String(a?.status ?? "")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
