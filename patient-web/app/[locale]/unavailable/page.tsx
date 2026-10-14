import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomeShell } from "@/components-next/home/home-shell";
import { ReloadErrorState } from "@/components-next/core/core-states";
import styles from "@/components-next/home/home.module.css";
import { isLocale, locales } from "@/lib/i18n";

/**
 * F82-3: what a visitor sees when a public page could not be made and there is no cached copy of it (the backend is down
 * on the first request, or after the cache was cleared). The nonce server answers with this page, as 503 and never cached,
 * at the address that was asked for (server/nonce-server.mjs); a retry reloads that address. A page that has a cached
 * copy never comes here: Next keeps serving the last good copy (stale-if-error, no time cap, #302).
 *
 * It holds no data, so it is rendered at build time for every language.
 */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "HomeWeb" });
  return { title: t("unavailableTitle"), robots: { index: false, follow: false } };
}

export default async function UnavailablePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "HomeWeb" });
  return (
    <HomeShell locale={locale} surface="home">
      <div className={styles.page}>
        <ReloadErrorState title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={t("retry")} />
      </div>
    </HomeShell>
  );
}
