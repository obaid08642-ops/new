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
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
      <Link className={styles.back} href={`/${locale}/appointments`} style={{ borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", color: "#1E332E", gap: 8 } as any}>
        <ChevronLeft size={17} aria-hidden="true" />
        {t("back")}
      </Link>
      <h1 className={styles.title} style={{ color: "#1E332E", gap: 16, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
        <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,.82)", border: "1px solid #E8EDEE", flex: "0 0 auto" } as any}><VectorDoctor size={48} aria-hidden="true" /></span>
        <span className={styles.titleText} style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("title")}</span>
      </h1>
      {done.length === 0 ? (
        <section className={styles.empty} style={{ borderRadius: 20, border: "1px dashed #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", gap: 16 } as any}>
          <VectorDoctor size={48} aria-hidden="true" />
          <p className={styles.emptyText} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("emptyBody")}</p>
          <Link className={styles.primary} href={`/${locale}/consultations/doctors`} style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", fontWeight: 760 } as any}>
            {t("findDoctor")}
          </Link>
        </section>
      ) : (
        <ul className={styles.list} style={{ gap: 16 } as any}>
          {done.map((a: any, i: number) => (
            <li key={String(a?.id ?? i)} className={styles.item} style={{ borderRadius: 20, border: "1px solid #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
              <Link href={`/${locale}/appointments/${encodeURIComponent(String(a?.id ?? ""))}`} className={styles.itemLink} style={{ gap: 8 } as any}>
                <span className={styles.doc} style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{String(a?.doctor_name ?? a?.doctor?.name ?? t("unknownDoctor"))}</span>
                <span className={styles.meta} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
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
