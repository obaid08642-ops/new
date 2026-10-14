import { Fragment } from "react";
import Link from "next/link";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import type { ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { RowsCard } from "@/components-next/health/health-kit";
import { formatDate } from "@/lib/format-date";
import { getDirection, type Locale } from "@/lib/i18n";
import type { ArticleSummary } from "@/lib/api/articles";
import health from "@/components-next/health/health.module.css";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "./articles.module.css";

/** The glyph tone of an article row: the articles tile of the home screen (never written as a colour). */
export const ARTICLE_TONE: ServiceTone = "mint";

/** The title in the reader's language, Arabic first for Arabic and English first for the rest, never an empty line. */
export function articleTitle(locale: Locale, article: ArticleSummary, fallback: string): string {
  return (locale === "ar" ? article.titleAr || article.titleEn : article.titleEn || article.titleAr) || fallback;
}

/** The summary in the reader's language. */
export function articleExcerpt(locale: Locale, article: ArticleSummary): string | undefined {
  return locale === "ar" ? article.excerptAr || article.excerptEn : article.excerptEn || article.excerptAr;
}

/** A white card of rows, one per article: the glyph, the title, the category, the author and the date, and a caret that mirrors. */
export function ArticleRows({ locale, articles, label, untitled }: { locale: Locale; articles: ArticleSummary[]; label: string; untitled: string }) {
  const caret = getDirection(locale) === "rtl" ? "caret-left" : "caret-right";
  return (
    <RowsCard label={label}>
      {articles.map((article) => {
        const parts = [article.category, article.authorName, formatDate(locale, article.publishedAt)].filter((part): part is string => Boolean(part));
        return (
          <li key={article.slug}>
            <Link className={`${health.row} ${rx.rowLink}`} href={`/${locale}/articles/${article.slug}`}>
              <FIcon icon="file-text" tone={ARTICLE_TONE} size={40} />
              <span className={health.rowBody}>
                <span className={health.rowTitle} dir="auto">{articleTitle(locale, article, untitled)}</span>
                {parts.length ? <span className={health.rowSub}>{parts.map((part, index) => <Fragment key={index}>{index > 0 ? " · " : null}<bdi>{part}</bdi></Fragment>)}</span> : null}
              </span>
              <span className={rx.rowEnd}><Icon name={caret} size={16} tone="secondary" /></span>
            </Link>
          </li>
        );
      })}
    </RowsCard>
  );
}

/** The search field: a plain GET form, so it works before the page is interactive; the chosen category stays in the URL. */
export function ArticleSearch({ q, category, placeholder, submitLabel }: { q?: string; category?: string; placeholder: string; submitLabel: string }) {
  return (
    <form className={styles.search} method="get" role="search">
      <Icon name="search" size={20} tone="secondary" />
      <input name="q" type="search" defaultValue={q ?? ""} maxLength={80} placeholder={placeholder} aria-label={placeholder} />
      {category ? <input type="hidden" name="category" value={category} /> : null}
      <button type="submit" className="nabd-button nabd-button--primary nabd-button--md"><span className="nabd-button__label">{submitLabel}</span></button>
    </form>
  );
}

/** The category chips: links to the same screen with another `?category=`; the first chip clears it. */
export function CategoryChips({ label, allLabel, base, categories, active }: { label: string; allLabel: string; base: string; categories: string[]; active?: string }) {
  return (
    <nav className={styles.chips} aria-label={label}>
      <Link className={styles.chip} href={base} aria-current={active ? undefined : "true"} replace>{allLabel}</Link>
      {categories.map((category) => (
        <Link key={category} className={styles.chip} href={`${base}?category=${encodeURIComponent(category)}`} aria-current={active === category ? "true" : undefined} replace><span dir="auto">{category}</span></Link>
      ))}
    </nav>
  );
}

/** The small label of an article's category. */
export function CategoryPill({ children }: { children: string }) {
  return <span className={styles.pill} dir="auto">{children}</span>;
}
