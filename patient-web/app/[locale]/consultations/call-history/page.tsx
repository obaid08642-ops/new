import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { PhoneCall, ChevronLeft } from "lucide-react";
import styles from "./call-history.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function CallHistoryPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("CallHistory");
  const token = await requirePatientAccess(locale);
  const res = await callPatientApi("/care/appointments?type=video&limit=50", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const payload = res.ok ? await res.json().catch(() => null) : null;
  const raw: any[] = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  const done = raw.filter((a) => ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(String(a?.status ?? "")));

  return <main className={`main ${styles.page}`}>
    <Link className={styles.back} href={`/${locale}/appointments`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>
    <h1 className={styles.title}><PhoneCall size={22} aria-hidden="true" />{t("title")}</h1>
    {done.length === 0 ? (
      <section className={styles.empty}><p>{t("emptyBody")}</p><Link className={styles.primary} href={`/${locale}/consultations/doctors`}>{t("findDoctor")}</Link></section>
    ) : (
      <ul className={styles.list}>
        {done.map((a: any, i: number) => (
          <li key={String(a?.id ?? i)} className={styles.item}>
            <Link href={`/${locale}/appointments/${encodeURIComponent(String(a?.id ?? ""))}`} className={styles.itemLink}>
              <span className={styles.doc}>{String(a?.doctor_name ?? a?.doctor?.name ?? t("unknownDoctor"))}</span>
              <span className={styles.meta}>{String(a?.scheduled_at ?? a?.date ?? "").slice(0, 16).replace("T", " ")} — {String(a?.status ?? "")}</span>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </main>;
}
