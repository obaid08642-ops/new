import Link from "next/link";
import { NavLink } from "@/components-next/nav/nav-link";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components-next/ui-generated/shells";
import { Avatar } from "@/components-next/ui-generated/components/Surfaces";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import type { BottomTabItem } from "@/components-next/ui-generated/components/contract";
import { NabdMark } from "@/components-next/nabd-mark";
import { LocaleSelector } from "@/components-next/locale-selector";
import { SignOutButton } from "@/components-next/sign-out-button";
import { shellSectionHrefs } from "@/components-next/shell-links";
import { ThemeButton } from "./theme-button";
import type { Locale } from "@/lib/i18n";
import { HomeTabBar } from "./home-tab-bar";
import { HomeAccountTools, HomeNavLink, HomeNotificationsLink } from "./home-identity";
import styles from "./home.module.css";

/**
 * The page frame of Home and Dashboard: the shared AppShell with the web top bar
 * of canvas/HomeWeb (mark, the five sections, language, theme, notifications, cart,
 * account) and the phone tab bar of canvas/HomeApp (Consultations raised).
 *
 * The site header and footer of app/[locale]/layout.tsx are not drawn on these routes
 * (globals.css, `.shell:has(> .nabd-home-shell)`), so nothing renders twice.
 *
 * F82-3: `signedIn` is passed only by a page that is rendered per request and already knows it (the dashboard). The public
 * Home is static and leaves it out: the account parts of the bar then decide in the browser (components-next/home/home-identity.tsx),
 * so the HTML is the same for everyone.
 */
export async function HomeShell({
  locale,
  signedIn,
  name,
  surface,
  children,
}: {
  locale: Locale;
  signedIn?: boolean;
  /** The patient's name, for the account avatar; absent when unknown. */
  name?: string | null;
  /** "dashboard" also drops the site footer (the board has none); the public home keeps it for the legal links. */
  surface: "home" | "dashboard";
  children: React.ReactNode;
}) {
  const [t, shared] = await Promise.all([
    getTranslations({ locale, namespace: "HomeWeb" }),
    getTranslations({ locale, namespace: "Shared" }),
  ]);
  const base = `/${locale}`;
  const hrefsOf = shellSectionHrefs(locale);
  const sections: Array<{ id: string; href: string; label: string }> = [
    { id: "pharmacy", href: hrefsOf.pharmacy, label: t("navPharmacy") },
    { id: "consult", href: hrefsOf.consult, label: t("navConsult") },
    { id: "labs", href: hrefsOf.labs, label: t("navLabs") },
    { id: "nursing", href: hrefsOf.nursing, label: t("navNursing") },
  ];
  const knownSignedIn = signedIn === true;
  const home = knownSignedIn ? `${base}/dashboard` : base;
  const tabs: BottomTabItem[] = [
    { id: "home", label: t("navHome"), icon: "house" },
    { id: "pharmacy", label: t("navPharmacy"), icon: "pill" },
    { id: "consult", label: t("navConsult"), icon: "stethoscope", raised: true },
    { id: "labs", label: t("navLabs"), icon: "test-tube" },
    { id: "nursing", label: t("navNursing"), icon: "first-aid-kit" },
  ];
  const hrefs = Object.fromEntries([["home", home], ...sections.map((s) => [s.id, s.href])]);

  const topBar = (
    <div className={styles.top}>
      <Link href={base} className={styles.brand} aria-label={shared("brand")}>
        <NabdMark size={34} variant="text" />
        <span className={styles.wordmark} aria-hidden="true">
          {shared("wordmark")}<span className={styles.plus}>+</span>
        </span>
      </Link>
      <nav className={styles.nav} aria-label={t("mainNav")}>
        {signedIn === undefined ? (
          <HomeNavLink locale={locale} label={t("navHome")} />
        ) : (
          <Link href={home} className={`${styles.navLink} ${styles.navLinkActive}`} aria-current="page">{t("navHome")}</Link>
        )}
        {sections.map((s) => (
          <NavLink key={s.id} href={s.href} className={styles.navLink} prefetch="viewport" signedIn={signedIn}>{s.label}</NavLink>
        ))}
      </nav>
      <div className={styles.tools}>
        <LocaleSelector current={locale} label={shared("language")} />
        <ThemeButton label={shared("theme")} />
        {signedIn === undefined ? <HomeNotificationsLink locale={locale} label={t("notifications")} /> : null}
        {knownSignedIn ? (
          <Link href={`${base}/notifications`} className={styles.iconBtn} aria-label={t("notifications")}>
            <FIcon icon="bell" tone="ink" chip="none" size={20} />
          </Link>
        ) : null}
        <Link href={`${base}/cart`} className={`${styles.iconBtn} ${styles.cartLink}`} aria-label={t("cart")}>
          <FIcon icon="package" tone="ink" chip="none" size={20} />
        </Link>
        {signedIn === undefined ? (
          <HomeAccountTools locale={locale} signInLabel={t("signIn")} accountLabel={t("account")} />
        ) : knownSignedIn ? (
          <>
            <SignOutButton locale={locale} className={styles.iconBtn} />
            <Link href={`${base}/profile`} className={styles.accountLink} aria-label={t("account")}>
              <Avatar name={name ?? ""} size="md" />
            </Link>
          </>
        ) : (
          <Link href={`${base}/login`} className={styles.signIn}>{t("signIn")}</Link>
        )}
      </div>
    </div>
  );

  return (
    <AppShell
      className={`nabd-home-shell ${surface === "dashboard" ? "nabd-home-shell--dashboard" : ""} ${styles.shell}`}
      topBar={topBar}
      tabBar={<HomeTabBar items={tabs} hrefs={hrefs} value="home" label={t("mainNav")} signedIn={signedIn} signedInHomeHref={`${base}/dashboard`} />}
      tabBarLabel={t("mainNav")}
    >
      {children}
    </AppShell>
  );
}
