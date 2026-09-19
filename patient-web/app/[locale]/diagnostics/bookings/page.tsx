import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { VectorLabs } from "@/components-next/vector-illustrations";
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
      <Link href={`/${locale}/diagnostics`} style={{ color: "#1E332E", fontWeight: 760, textDecoration: "none", overflowWrap: "anywhere" as any }}>{t("back")}</Link>
      <section className={styles.intro}>
        <div className={styles.introText}>
          <p className={styles.eyebrow} style={{ color: "#1E332E" } as any}>{t("eyebrow")}</p>
          <h1 style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" as any }}>{locale === "ar" ? "حجوزاتي التشخيصية" : "My diagnostic bookings"}</h1>
          <p style={{ overflowWrap: "anywhere" }}>{locale === "ar" ? "حجوزات المختبر والأشعة — بيانات حية من الخادم فقط." : "Lab & radiology bookings — live server data only."}</p>
        </div>
        <span className={styles.introIcon} aria-hidden="true"><VectorLabs size={48} aria-hidden="true" /></span>
      </section>
      {Array.isArray(list) && list.length > 0 ? (
        <div style={{ display: "grid", gap: 16 }}>
          {list.map((b: unknown, i: number) => {
            const r = b as Record<string, unknown>;
            const id = String(r.id ?? r.bookingId ?? r._id ?? i);
            const label = String(r.service_name ?? r.name ?? id);
            const state = String(r.state ?? r.status ?? "");
            return <article key={id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 8px 24px rgba(30,51,46,.07)" }}>
              <span style={{ color: "#1E332E", fontWeight: 800, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" as any }}>{label}{state ? ` · ${state}` : ""}</span>
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href={`/${locale}/diagnostics/labs/${encodeURIComponent(id)}`} style={{ padding: "8px 12px", borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", color: "#1E332E", fontWeight: 700, textDecoration: "none" }}>{locale === "ar" ? "عرض" : "View"}</Link>
                <Link href={`/${locale}/diagnostics/insurance-upload?bookingId=${encodeURIComponent(id)}`} style={{ padding: "8px 12px", borderRadius: 20, border: "1px solid #E8EDEE", background: "#5FD9B3", color: "#1E332E", fontWeight: 760, textDecoration: "none" }}>{locale === "ar" ? "رفع تأمين" : "Upload insurance"}</Link>
              </span>
            </article>;
          })}
        </div>
      ) : <section className={styles.state} role="status"><p style={{ overflowWrap: "anywhere" }}>{t("unavailable")}</p></section>}
    </main>
  );
}
