import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { FileClock, ChevronLeft, CalendarDays } from "lucide-react";
import { VectorHealthShield } from "@/components-next/vector-illustrations";
import styles from "../health.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function HealthTimelinePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("HealthTimeline");
  const token = await requirePatientAccess(locale);
  const res = await callPatientApi("/medical-reports/timeline", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const payload = res.ok ? await res.json().catch(() => null) : null;
  const list: any[] = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.events)
      ? payload.events
      : Array.isArray(payload)
        ? payload
        : [];

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
      <Link
        href={`/${locale}/health`}
        className={styles.back}
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
            <FileClock size={15} aria-hidden="true" />
            <span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
              {t("title")}
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
            {t("title")}
          </h1>
        </div>
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
      </section>
      {list.length === 0 ? (
        <section
          className={styles.state}
          style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 24, gap: 16, display: "grid", placeItems: "center" } as any}
        >
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}>
            <VectorHealthShield size={48} aria-hidden="true" />
          </span>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("empty")}</p>
        </section>
      ) : (
        <section className={styles.grid} style={{ gap: 16 } as any}>
          {list.map((item: any, i: number) => (
            <article
              className={styles.card}
              key={String(item?.id ?? i)}
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
              <div className={styles.cardTop} style={{ gap: 8, alignItems: "center" } as any}>
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
                  <FileClock size={18} aria-hidden="true" />
                </span>
                <span style={{ color: "#1E332E", fontWeight: 700, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
                  {String(item?.category ?? item?.source ?? "")}
                </span>
              </div>
              <p className={styles.value} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden", color: "#1E332E" } as any}>
                {String(item?.title ?? item?.type ?? item?.kind ?? "")}
              </p>
              {item?.created_at || item?.date ? (
                <p className={styles.date} style={{ overflowWrap: "anywhere", color: "#6B7C6E", display: "flex", alignItems: "center", gap: 8 } as any}>
                  <CalendarDays size={14} aria-hidden="true" />
                  <span style={{ overflowWrap: "anywhere" } as any}>{String(item?.created_at ?? item?.date ?? "").slice(0, 16)}</span>
                </p>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
