import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { CalendarDays, ChevronLeft, Salad, Utensils } from "lucide-react";
import { VectorNutrition } from "@/components-next/vector-illustrations";
import styles from "../nutrition.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function NutritionPlanPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NutritionPlan");
  const token = await requirePatientAccess(locale);
  const res = await callPatientApi("/nutrition/plan", {}, token);
  if (res.status === 401) redirect(`/${locale}/login`);
  const payload = res.ok ? await res.json().catch(() => null) : null;
  const list: any[] = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/nutrition`} className={styles.back}>
        <ChevronLeft size={17} aria-hidden="true" />
        {t("back")}
      </Link>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <Salad size={15} aria-hidden="true" />
            {t("title")}
          </p>
          <h1>{t("title")}</h1>
          <p>
            {locale === "ar"
              ? "خطتك الغذائية المعتمدة والوجبات المقترحة لتحقيق أهدافك الصحية."
              : "Your approved nutrition plan and meal schedules to reach health goals."}
          </p>
        </div>
        <span className={styles.heroVector}>
          <VectorNutrition size={48} aria-hidden="true" />
        </span>
      </section>

      {list.length === 0 ? (
        <section className={styles.state}>
          <VectorNutrition size={42} aria-hidden="true" />
          <p>{t("empty")}</p>
        </section>
      ) : (
        <section className={styles.statsGrid}>
          {list.map((item: any, i: number) => (
            <article className={styles.statCard} key={String(item?.id ?? i)}>
              <div className={styles.statTop}>
                <span>{String(item?.type ?? item?.category ?? t("title"))}</span>
                <span className={styles.statGlyph}>
                  <Utensils size={18} aria-hidden="true" />
                </span>
              </div>
              <p className={styles.statValue} style={{ fontSize: "1.2rem" }}>
                {String(item?.title ?? item?.name ?? item?.id ?? "")}
              </p>
              {item?.created_at ? (
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
                  <CalendarDays size={13} style={{ display: "inline", verticalAlign: "middle", marginInlineEnd: 4 }} />
                  {String(item.created_at).slice(0, 10)}
                </p>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
