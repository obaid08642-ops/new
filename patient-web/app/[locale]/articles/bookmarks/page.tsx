import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Bookmark, ChevronLeft, FileText } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPatientArticleBookmarks } from "@/lib/api/articles-server";
import { parseArticleList } from "@/lib/api/articles";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { VectorHealthShield } from "@/components-next/vector-illustrations";
import styles from "../articles.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function ArticleBookmarksPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Articles");
  const token = await requirePatientAccess(locale);

  let response: Response;
  try {
    response = await getPatientArticleBookmarks(token);
  } catch {
    return (
      <main className="main" style={{ background: "#FDFDFC" }}>
        <section className={styles.state} role="alert" style={{ borderRadius: 20, border: "1px dashed #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
          <VectorHealthShield size={48} aria-hidden="true" />
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("unavailableTitle")}</h1>
          <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("unavailable")}</p>
          <RetryButton />
        </section>
      </main>
    );
  }

  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok)
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

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC" }}>
      <section className={styles.hero} style={{ gap: 16 } as any}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 8, minWidth: 0, flex: "1 1 220px" }}>
            <p className={styles.eyebrow} style={{ color: "#1E332E", gap: 8 } as any}>
              <span style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 12, background: "rgba(95,217,179,.14)", border: "1px solid #E8EDEE", flex: "0 0 auto" }}><Bookmark size={16} aria-hidden="true" style={{ color: "#1E332E" } as any} /></span>
              <span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("eyebrow")}</span>
            </p>
            <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("bookmarksTitle")}</h1>
            <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("bookmarksNotice")}</p>
          </div>
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,.82)", border: "1px solid #E8EDEE", flex: "0 0 auto" }}><VectorHealthShield size={48} aria-hidden="true" /></span>
        </div>
      </section>

      {articles.length ? (
        <section className={styles.list} style={{ gap: 16 } as any}>
          {articles.map((article) => (
            <Link className={styles.card} key={article.slug} href={`/${locale}/articles/${article.slug}`} style={{ borderRadius: 20, border: "1px solid #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
              <span className={styles.icon} style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.14)", border: "1px solid #E8EDEE" } as any}>
                <FileText size={20} aria-hidden="true" style={{ color: "#1E332E" } as any} />
              </span>
              <span className={styles.copy} style={{ gap: 8 } as any}>
                <strong style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{locale === "ar" ? article.titleAr || article.titleEn : article.titleEn || article.titleAr || t("untitled")}</strong>
                <span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{article.category || t("categoryUnavailable")}</span>
              </span>
              <ChevronLeft className={styles.arrow} size={18} aria-hidden="true" style={{ color: "#1E332E" } as any} />
            </Link>
          ))}
        </section>
      ) : (
        <section className={styles.empty} style={{ borderRadius: 20, border: "1px dashed #E8EDEE", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", gap: 16 } as any}>
          <VectorHealthShield size={48} aria-hidden="true" />
          <h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("emptyTitle")}</h2>
          <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("empty")}</p>
          <Link className={styles.primary} href={`/${locale}/articles`} style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", padding: "8px 16px", fontWeight: 760 } as any}>
            {t("browse")}
          </Link>
        </section>
      )}
    </main>
  );
}
