import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { VectorLabs } from "@/components-next/vector-illustrations";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import styles from "../diagnostics.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ bookingId?: string; domain?: string }> };

export default async function DiagnosticsBookingSuccessPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const bookingId = (sp.bookingId || "").trim();
  const domain = sp.domain === "radiology" ? "radiology" : "labs";
  if (!isLocale(locale) || !bookingId) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Diagnostics");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/${domain}/bookings/${encodeURIComponent(bookingId)}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) notFound();
  const ar = locale === "ar";

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
      <section className={styles.intro} style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20 }}>
        <div className={styles.introText} style={{ display: "grid", gap: 8 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E" }}>{ar ? "تم بنجاح" : "Success"}</p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
            {ar ? "تم الحجز بنجاح" : "Booking confirmed"}
          </h1>
          <p style={{ color: "#6B7C6E", lineHeight: 1.7, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
            {ar ? "حجزك مسجل. تابع حالته من حجوزاتك." : "Your booking is registered. Track it from your bookings."}
          </p>
        </div>
        <span className={styles.introIcon} style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", backdropFilter: "blur(16px)" }} aria-hidden="true">
          <VectorLabs size={48} aria-hidden="true" />
        </span>
      </section>

      <section style={{ display: "grid", gap: 16, padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 8px 24px rgba(30,51,46,.07)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#1E332E", fontWeight: 760, fontSize: ".9rem" }}>
          <CheckCircle2 size={20} color="#1E332E" aria-hidden="true" />
          {ar ? `معرف الحجز: ${bookingId}` : `Booking ID: ${bookingId}`}
        </span>
        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link
            href={`/${locale}/diagnostics/${domain}/${encodeURIComponent(bookingId)}`}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 40, padding: "8px 16px", borderRadius: 20, background: "#5FD9B3", color: "#1E332E", fontWeight: 760, textDecoration: "none", border: "1px solid #5FD9B3" }}
          >
            {ar ? "تفاصيل الحجز" : "Booking details"}
          </Link>
          <Link
            href={`/${locale}/diagnostics/bookings`}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 40, padding: "8px 16px", borderRadius: 20, background: "rgba(255,255,255,.82)", color: "#1E332E", fontWeight: 700, textDecoration: "none", border: "1px solid #E8EDEE" }}
          >
            {ar ? "حجوزاتي" : "My bookings"}
          </Link>
          <Link href={`/${locale}/diagnostics`} style={{ color: "#1E332E", fontWeight: 760, textDecoration: "none", alignSelf: "center", padding: "8px 12px" }}>
            {t("back")}
          </Link>
        </nav>
      </section>
    </main>
  );
}
