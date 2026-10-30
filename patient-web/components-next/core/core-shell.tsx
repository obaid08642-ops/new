"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { NavLink } from "@/components-next/nav/nav-link";
import { useDisabledModules } from "@/components-next/modules/modules-provider";
import { isPathHidden } from "@/lib/modules";
import { useRoutePrefetch } from "@/components-next/nav/use-route-prefetch";
import { AppShell } from "@/components-next/ui-generated/shells";
import { BottomTabBar } from "@/components-next/ui-generated/components/Surfaces";
import { CartLink } from "./cart-link";
import { WishlistLink } from "./wishlist-link";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import type { BottomTabItem } from "@/components-next/ui-generated/components/contract";
import { NabdMark } from "@/components-next/nabd-mark";
import { LocaleSelector } from "@/components-next/locale-selector";
import { SignOutButton } from "@/components-next/sign-out-button";
import { shellSectionHrefs } from "@/components-next/shell-links";
import { ThemeToggle } from "@/components-next/theme-toggle";
import { getDirection, type Locale } from "@/lib/i18n";
import { useCart } from "@/lib/context/CartContext";
import { formatNumber } from "@/lib/format-price";
import styles from "./core.module.css";
import { PhoneMenu } from "@/components-next/core/phone-menu";

/**
 * The screen frame of the Batch 0 core screens (search, notifications, notification settings),
 * built on <AppShell> (DEVICE_STANDARD §1):
 *
 *   < 768    the page's own header row (back, title, or the search field with "cancel") and the
 *            floating tab bar of canvas/HomeApp;
 *   768+     the top bar of canvas/HomeWeb (mark, the five sections from 1024, language, theme,
 *            notifications, cart, account), the search field taking the section links' place on
 *            the search page (canvas/SearchWeb); the tab bar stays until 1024.
 *
 * The site header and footer of app/[locale]/layout.tsx are not drawn on these pages
 * (globals.css, the `.nabd-core` block). Everything is a class: the CSP refuses style attributes.
 */
export type CoreShellProps = {
  locale: Locale;
  /** The phone header's title (an h1 that only phones show; the page draws its own h1 for wider screens). */
  title?: string;
  /** Where the phone's back button goes; no button without it. */
  backHref?: string;
  /** The search field (search page): it takes the top bar on every width. */
  search?: ReactNode;
  /** Where "cancel" next to the phone search field goes. */
  cancelHref?: string;
  /** `narrow` is the single reading column of the notification pages. */
  width?: "wide" | "narrow";
  /**
   * A field for the wide top bar, beside the section links (canvas/ProductWeb); phones do not draw it
   * (the page carries its own search there). Unlike `search`, it does not replace the section links.
   */
  topBarSearch?: ReactNode;
  /** Labs and radiology: where "My orders and results" goes; draws an icon button in the header and an entry in the phone menu. */
  resultsHref?: string;
  /** The page's sticky bottom bar (a <StickyFooter>, canvas/ProductFull); it sits above the tab bar and goes away from 1024. */
  footer?: ReactNode;
  /** Pages with a sticky buy bar and no tab bar on phones (canvas/ProductFull). */
  hideTabs?: boolean;
  children: ReactNode;
};

export function CoreShell({ locale, title, backHref, search, cancelHref, width = "wide", topBarSearch, footer, hideTabs = false, resultsHref, children }: CoreShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const shell = useTranslations("CoreShell");
  const shared = useTranslations("Shared");
  const searchT = useTranslations("Search");
  const nav = useTranslations("HomeWeb");
  const hrefs = shellSectionHrefs(locale);
  // a switched-off module has no section and no tab (#953)
  const disabled = useDisabledModules();
  const rtl = getDirection(locale) === "rtl";
  // issue 1547: the cart's count on its icon (CartLink reads the cart of this browser, so an add shows at once)
  const cartLink = (extra = "") => <CartLink locale={locale} className={`${styles.iconLink} ${styles.cartLink}${extra ? ` ${extra}` : ""}`} />;

  const allTabs: Array<BottomTabItem & { href: string }> = [
    { id: "home", art: "home", label: nav("navHome"), icon: "house", href: `/${locale}` },
    { id: "pharmacy", art: "pharmacy", label: nav("navPharmacy"), icon: "pill", href: hrefs.pharmacy },
    { id: "consult", art: "consult", label: nav("navConsult"), icon: "stethoscope", href: hrefs.consult, raised: true },
    { id: "labs", art: "labs", label: nav("navLabs"), icon: "test-tube", href: hrefs.labs },
    { id: "nursing", art: "nursing", label: nav("navNursing"), icon: "first-aid-kit", href: hrefs.nursing },
  ];

  const tabs = allTabs.filter((tab) => !isPathHidden(tab.href, disabled));
  // the tab of the section this page belongs to (the longest matching href; Home only on the home page itself)
  const activeTab = tabs
    .filter((tab) => pathname === tab.href || (tab.id !== "home" && pathname?.startsWith(`${tab.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.id ?? "";

  const allSections = [
    { id: "home", label: nav("navHome"), href: `/${locale}` },
    { id: "pharmacy", label: nav("navPharmacy"), href: hrefs.pharmacy },
    { id: "consult", label: nav("navConsult"), href: hrefs.consult },
    { id: "labs", label: nav("navLabs"), href: hrefs.labs },
    { id: "nursing", label: nav("navNursing"), href: hrefs.nursing },
  ];

  const sections = allSections.filter((s) => !isPathHidden(s.href, disabled));

  // The tabs are buttons that call router.push, which Next never prefetches: fetch a tab's page when it is reached.
  // This frame does not know whether a session exists, so it assumes one: the diagnostics hub lists the patient's own
  // bookings then and is left out of the full prefetch (the public sections are not affected).
  useRoutePrefetch(tabs.map((t) => t.href), { signedIn: true });

  const topBar = (
    // with the results button the phone header has too little width for the title: the title takes its own line under the buttons
    <div className={`${styles.bar}${resultsHref ? ` ${styles.barDense}` : ""}`}>
      {!search && backHref ? (
        <Link href={backHref} className={`${styles.iconLink} ${styles.phoneOnly}`} aria-label={shell("back")}>
          <Icon name={rtl ? "caret-right" : "caret-left"} size={22} tone="currentColor" />
        </Link>
      ) : null}
      {!search && title ? <h1 className={`${styles.phoneTitle} ${styles.phoneOnly}`}>{title}</h1> : null}

      <Link href={`/${locale}`} className={`${styles.brand} ${styles.wideOnly}`} aria-label={shared("brand")}>
        <NabdMark size={34} />
        <span className={styles.wordmark} aria-hidden="true">
          {shared("wordmark")}<span className={styles.plus}>+</span>
        </span>
      </Link>

      {search ? (
        <>
          <div className={styles.search}>{search}</div>
          {cancelHref ? <Link href={cancelHref} className={`${styles.cancel} ${styles.phoneOnly}`}>{searchT("cancel")}</Link> : null}
        </>
      ) : (
        <>
          {topBarSearch ? <div className={styles.topSearch}>{topBarSearch}</div> : null}
          <nav className={styles.sections} aria-label={shell("mainNav")}>
            {sections.map((s) => (
              <NavLink key={s.id} href={s.href} className={styles.section} signedIn>{s.label}</NavLink>
            ))}
          </nav>
        </>
      )}

      {resultsHref ? (
        <Link href={resultsHref} className={`${styles.iconLink} ${styles.phoneOnly} ${styles.toolsStart}`} aria-label={shell("menuResults")} title={shell("menuResults")}>
          <FIcon icon="chart-line-up" tone={SERVICE_ICONS.lab.tone} size={24} />
        </Link>
      ) : null}
      {/* every page carries favourites and the cart in the phone header (the wide header has them in the tools); the search page too */}
      <WishlistLink locale={locale} className={`${styles.iconLink} ${styles.cartLink} ${styles.phoneOnly} ${styles.phoneCart}`} />
      {cartLink(styles.phoneOnly)}
      {/* the menu is the last item at the inline-end edge (owner layout decision 1) */}
      {!search ? (
        <PhoneMenu
          labels={{ open: shell("menuOpen"), close: shell("menuClose") }}
          items={[
            { label: shell("menuProfile"), href: `/${locale}/profile` },
            { label: shell("menuOrders"), href: `/${locale}/orders` },
            { label: shell("menuFamily"), href: `/${locale}/family` },
            { label: shell("menuArticles"), href: `/${locale}/articles` },
            { label: shell("notifications"), href: `/${locale}/notifications` },
            { label: shell("menuSettings"), href: `/${locale}/settings` },
            { label: shell("menuHelp"), href: `/${locale}/settings/help` },
          ].filter((item) => !isPathHidden(item.href, disabled))}
        />
      ) : null}

      <div className={`${styles.tools} ${styles.wideOnly}`}>
        <LocaleSelector current={locale} label={shell("language")} />
        <ThemeToggle label={shared("theme")} />
        {resultsHref ? (
          <Link href={resultsHref} className={styles.iconLink} aria-label={shell("menuResults")} title={shell("menuResults")}>
            <FIcon icon="chart-line-up" tone={SERVICE_ICONS.lab.tone} size={24} />
          </Link>
        ) : null}
        <Link href={`/${locale}/notifications`} className={styles.iconLink} aria-label={shell("notifications")}>
          <Icon name="bell" size={20} tone="currentColor" />
        </Link>
        <WishlistLink locale={locale} className={`${styles.iconLink} ${styles.cartLink}`} />
        {cartLink()}
        <Link href={`/${locale}/profile`} className={styles.iconLink} aria-label={shared("account")}>
          <Icon name="user" size={20} tone="currentColor" />
        </Link>
        <SignOutButton locale={locale} className={styles.iconLink} />
      </div>
    </div>
  );

  return (
    <AppShell
      className={`nabd-core ${styles.root}${resultsHref ? ` ${styles.rootDense}` : ""}`}
      topBar={topBar}
      tabBarLabel={shell("mainNav")}
      footer={footer}
      tabBar={hideTabs ? undefined : (
        <BottomTabBar
          label={shell("sections")}
          items={tabs.map(({ id, label, icon, art, raised }) => ({ id, label, icon, art, raised }))}
          value={activeTab}
          onChange={(id) => {
            const target = tabs.find((t) => t.id === id);
            if (target) router.push(target.href);
          }}
        />
      )}
    >
      <div className={`${styles.page} ${width === "narrow" ? styles.narrow : ""}`}>{children}</div>
    </AppShell>
  );
}
