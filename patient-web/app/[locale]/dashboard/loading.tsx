import { getLocale, getTranslations } from "next-intl/server";
import { HomeShell } from "@/components-next/home/home-shell";
import styles from "@/components-next/home/home.module.css";
import type { Locale } from "@/lib/i18n";

/** The dashboard while it streams: the same frame, with quiet blocks where the hero and the services will be. */
export default async function DashboardLoading() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("Dashboard")]);
  return (
    <HomeShell locale={locale as Locale} signedIn surface="dashboard">
      <div className={styles.page} role="status" aria-label={t("loading")}>
        <div className={`${styles.skel} ${styles.skelHero}`} />
        <div className={styles.skelRow}>
          {Array.from({ length: 9 }, (_, i) => <div key={i} className={`${styles.skel} ${styles.skelTile}`} />)}
        </div>
      </div>
    </HomeShell>
  );
}
