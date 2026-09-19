import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { VectorLabs } from "@/components-next/vector-illustrations";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { DiagnosticsCartClient } from "@/components-next/diagnostics-cart-client";
import styles from "../diagnostics.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function DiagnosticsCartPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const t = await getTranslations("Diagnostics");

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
      <section className={styles.intro} style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20 }}>
        <div className={styles.introText} style={{ display: "grid", gap: 8 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E" }}>{t("eyebrow")}</p>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
            {locale === "ar" ? "سلة التحاليل" : "Tests cart"}
          </h1>
          <p style={{ color: "#6B7C6E", lineHeight: 1.7, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
            {locale === "ar" ? "راجع تحاليلك المحددة ثم اختر المختبر وأكمل الحجز." : "Review selected tests, pick a lab, then complete booking."}
          </p>
          <Link href={`/${locale}/diagnostics`} style={{ color: "#1E332E", fontWeight: 760, textDecoration: "none", width: "fit-content", padding: "8px 12px", borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", marginTop: 8 }}>
            {t("back")}
          </Link>
        </div>
        <span className={styles.introIcon} style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", backdropFilter: "blur(16px)" }} aria-hidden="true">
          <VectorLabs size={48} aria-hidden="true" />
        </span>
      </section>

      <section style={{ display: "grid", gap: 16, padding: 16, border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 8px 24px rgba(30,51,46,.07)" }}>
        <Suspense fallback={<p style={{ color: "#6B7C6E", overflowWrap: "anywhere" }}>{locale === "ar" ? "جارٍ التحميل..." : "Loading..."}</p>}>
          <DiagnosticsCartClient locale={locale} />
        </Suspense>
      </section>
    </main>
  );
}
