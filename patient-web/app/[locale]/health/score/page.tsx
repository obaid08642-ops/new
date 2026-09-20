import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { getPatientHealthScore } from "@/lib/api/vitals-server";
import { parseHealthScore } from "@/lib/api/health-score";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VectorHealthShield } from "@/components-next/vector-illustrations";
import styles from "../health.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function HealthScorePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Health");
  const token = await requirePatientAccess(locale);
  const response = await getPatientHealthScore(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok)
    return (
      <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
        <section
          className={styles.state}
          role="alert"
          style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 24, gap: 16 } as any}
        >
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}>
            <VectorHealthShield size={48} aria-hidden="true" />
          </span>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
            {t("unavailableTitle")}
          </h1>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("unavailable")}</p>
        </section>
      </main>
    );

  const score = parseHealthScore(await response.json().catch(() => null));
  if (!score)
    return (
      <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
        <section
          className={styles.state}
          role="alert"
          style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 24, gap: 16 } as any}
        >
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}>
            <VectorHealthShield size={48} aria-hidden="true" />
          </span>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
            {t("unavailableTitle")}
          </h1>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("unavailable")}</p>
        </section>
      </main>
    );

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
      <Link
        className={styles.back}
        href={`/${locale}/health`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 20px",
          borderRadius: 20,
          border: "1px solid #E8EDEE",
          background: "#5FD9B3",
          color: "#1E332E",
          fontWeight: 700,
          textDecoration: "none",
          width: "fit-content",
          overflowWrap: "anywhere",
        } as any}
      >
        <ChevronLeft size={16} aria-hidden="true" />
        {t("back")}
      </Link>
      <section
        className={styles.hero}
        style={{
          gap: 16,
          padding: 24,
          border: "1px solid #E8EDEE",
          borderRadius: 20,
          background: "rgba(255,255,255,.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        } as any}
      >
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", display: "flex", alignItems: "center", gap: 8, overflowWrap: "anywhere" } as any}>
            <ShieldCheck size={15} aria-hidden="true" />
            <span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
              {t("eyebrow")}
            </span>
          </p>
          <h1
            style={{
              color: "#1E332E",
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: 2 as any,
              WebkitBoxOrient: "vertical" as any,
              overflow: "hidden",
            } as any}
          >
            {t("scoreTitle")}
          </h1>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
            {t("scoreNotice")}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <strong className={styles.score} style={{ color: "#1E332E", overflowWrap: "anywhere" } as any}>
            {score.score == null ? t("scoreInsufficient") : score.score}
          </strong>
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 48,
              height: 48,
              borderRadius: 16,
              background: "rgba(95,217,179,.12)",
              border: "1px solid #E8EDEE",
              flex: "0 0 auto",
            } as any}
          >
            <VectorHealthShield size={48} aria-hidden="true" />
          </span>
        </div>
      </section>
      <section className={styles.cards} aria-label={t("scoreComponents")} style={{ gap: 16, display: "grid" } as any}>
        <div
          className={styles.card}
          style={{
            border: "1px solid #E8EDEE",
            borderRadius: 20,
            background: "rgba(255,255,255,.82)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            padding: 16,
            gap: 8,
          } as any}
        >
          <div className={styles.cardTop} style={{ gap: 8 } as any}>
            <span style={{ color: "#1E332E", fontWeight: 700, overflowWrap: "anywhere" } as any}>{t("scoreStatus")}</span>
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 48,
                height: 48,
                borderRadius: 16,
                background: "rgba(95,217,179,.12)",
                border: "1px solid #E8EDEE",
              } as any}
            >
              <ShieldCheck size={20} color="#1E332E" aria-hidden="true" />
            </span>
          </div>
          <strong className={styles.value} style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
            {score.status}
          </strong>
        </div>
        {score.components.map((item) => (
          <div
            className={styles.card}
            key={item.key}
            style={{
              border: "1px solid #E8EDEE",
              borderRadius: 20,
              background: "rgba(255,255,255,.82)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              padding: 16,
              gap: 8,
            } as any}
          >
            <div className={styles.cardTop} style={{ gap: 8 } as any}>
              <span style={{ color: "#1E332E", fontWeight: 700, overflowWrap: "anywhere" } as any}>{item.key}</span>
            </div>
            <strong className={styles.value} style={{ color: "#1E332E", overflowWrap: "anywhere" } as any}>
              {item.score}
            </strong>
          </div>
        ))}
      </section>
    </main>
  );
}
