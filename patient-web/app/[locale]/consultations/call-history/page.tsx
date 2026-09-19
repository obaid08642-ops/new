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
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
      <Link className={styles.back} href={`/${locale}/appointments`} style={{ color: "#1E332E", display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #E8EDEE", borderRadius: 20, padding: "8px 16px", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", fontWeight: 700, textDecoration: "none", width: "fit-content" } as any}>
        <ChevronLeft size={17} aria-hidden="true" />
        {t("back")}
      </Link>
      <section style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <p style={{ color: "#1E332E", fontSize: ".78rem", fontWeight: 800, margin: 0 }}>{t("title")}</p>
          <h1 className={styles.title} style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", margin: 0 } as any}>
            <span className={styles.titleText} style={{ overflowWrap: "anywhere" } as any}>{t("title")}</span>
          </h1>
        </div>
        <span style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-hidden="true">
          <VectorDoctor size={48} aria-hidden="true" />
        </span>
      </section>
      {done.length === 0 ? (
        <section className={styles.empty} style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, display: "grid", gap: 8, placeItems: "center" }}>
          <span style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><VectorDoctor size={48} aria-hidden="true" /></span>
          <p className={styles.emptyText} style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("emptyBody")}</p>
          <Link className={styles.primary} href={`/${locale}/consultations/doctors`} style={{ background: "#5FD9B3", color: "#1E332E", border: "1px solid #5FD9B3", borderRadius: 20, padding: "10px 16px", fontWeight: 760, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" } as any}>
            {t("findDoctor")}
          </Link>
        </section>
      ) : (
        <ul className={styles.list} style={{ display: "grid", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
          {done.map((a: any, i: number) => (
            <li key={String(a?.id ?? i)} className={styles.item} style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 16, display: "grid", gap: 8 } as any}>
              <Link href={`/${locale}/appointments/${encodeURIComponent(String(a?.id ?? ""))}`} className={styles.itemLink} style={{ color: "#1E332E", textDecoration: "none", display: "grid", gap: 8 } as any}>
                <span className={styles.doc} style={{ color: "#1E332E", fontWeight: 760, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{String(a?.doctor_name ?? a?.doctor?.name ?? t("unknownDoctor"))}</span>
                <span className={styles.meta} style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>
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
