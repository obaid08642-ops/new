import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicArticleCategories, getPublicArticles } from "@/lib/api/articles-server";
import { parseArticleCategories, parseArticleList } from "@/lib/api/articles";
import { isLocale, locales } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { VectorHealthShield } from "@/components-next/vector-illustrations";
import styles from "./articles.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams?: Promise<{ q?: string; category?: string }> };

export async function generateMetadata({ params }: Omit<Props, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Articles" });
  const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus";
  return {
    title: t("title"),
    description: t("notice"),
    alternates: {
      canonical: `${origin}/${locale}/articles`,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, `${origin}/${l}/articles`])),
        "x-default": `${origin}/ar/articles`,
      },
    },
    robots: { index: true, follow: true },
  };
}

export default async function ArticlesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Articles");
  const Chevron = locale === "ar" || locale === "ur" ? ChevronLeft : ChevronRight;
  const query = searchParams ? await searchParams : {};

  const [response, categoriesResponse] = await Promise.all([
    getPublicArticles({ q: query.q, category: query.category }),
    getPublicArticleCategories(),
  ]);

  if (!response || !response.ok)
    return (
      <main className="main" style={{ background: "#FDFDFC" }}>
        <section className={styles.state} role="alert" style={{ borderRadius: 20, border: "1px solid #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
          <VectorHealthShield size={48} aria-hidden="true" />
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("unavailableTitle")}</h1>
          <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("unavailable")}</p>
          <RetryButton />
        </section>
      </main>
    );

  const articles = parseArticleList(await response.json().catch(() => null));
  const categories = categoriesResponse?.ok ? parseArticleCategories(await categoriesResponse.json().catch(() => null)) : [];

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
      <section className={styles.hero} style={{ gap: 16 } as any}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 8, minWidth: 0, flex: "1 1 260px" }}>
            <p className={styles.eyebrow} style={{ color: "#1E332E", gap: 8 } as any}>
              <span style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 12, background: "rgba(95,217,179,.14)", border: "1px solid #E8EDEE", flex: "0 0 auto" }}><FileText size={16} aria-hidden="true" style={{ color: "#1E332E" } as any} /></span>
              <span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("eyebrow")}</span>
            </p>
            <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("title")}</h1>
            <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("notice")}</p>
          </div>
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,.82)", border: "1px solid #E8EDEE", flex: "0 0 auto" }}><VectorHealthShield size={48} aria-hidden="true" /></span>
        </div>
        <form className={styles.search} method="get" style={{ borderRadius: 20, border: "1px solid #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", gap: 8 } as any}>
          <Search size={18} aria-hidden="true" style={{ color: "#1E332E" } as any} />
          <input name="q" defaultValue={query.q || ""} maxLength={80} placeholder={t("searchPlaceholder")} aria-label={t("searchPlaceholder")} style={{ color: "#1E332E" } as any} />
          <button type="submit" style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", fontWeight: 760 } as any}>{t("search")}</button>
        </form>
        {categories.length ? (
          <nav className={styles.chips} aria-label={t("categories")}>
            {categories.map((category) => (
              <Link className={query.category === category ? styles.chipActive : styles.chip} key={category} href={`/${locale}/articles?category=${encodeURIComponent(category)}`}>
                <span dir="auto">{category}</span>
              </Link>
            ))}
          </nav>
        ) : null}
      </section>

      {articles.length ? (
        <section className={styles.list} style={{ gap: 16 } as any}>
          {articles.map((article) => (
            <Link className={styles.card} key={article.slug} href={`/${locale}/articles/${article.slug}`} style={{ borderRadius: 20, border: "1px solid #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
              <span className={styles.icon} aria-hidden="true" style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.14)", border: "1px solid #E8EDEE", color: "#1E332E" } as any}>
                <FileText size={20} />
              </span>
              <span className={styles.copy} style={{ gap: 8 } as any}>
                <strong dir="auto" style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{locale === "ar" ? article.titleAr || article.titleEn : article.titleEn || article.titleAr || t("untitled")}</strong>
                <span dir="auto" style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{article.category || t("categoryUnavailable")}</span>
              </span>
              <Chevron className={styles.arrow} size={18} aria-hidden="true" style={{ color: "#1E332E" } as any} />
            </Link>
          ))}
        </section>
      ) : (
        <section className={styles.empty} style={{ borderRadius: 20, border: "1px dashed #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", gap: 16 } as any}>
          <VectorHealthShield size={48} aria-hidden="true" />
          <h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("noResultsTitle")}</h2>
          <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{query.q || query.category ? t("noResults") : t("empty")}</p>
        </section>
      )}
    </main>
  );
}
