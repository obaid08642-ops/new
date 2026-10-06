"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppShell } from "@/components-next/ui-generated/shells";
import { BottomTabBar } from "@/components-next/ui-generated/components/Surfaces";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import type { BottomTabItem } from "@/components-next/ui-generated/components/contract";
import { NabdMark } from "@/components-next/nabd-mark";
import { LocaleSelector } from "@/components-next/locale-selector";
import { ThemeToggle } from "@/components-next/theme-toggle";
import { getDirection, type Locale } from "@/lib/i18n";
import styles from "./core.module.css";

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
  children: ReactNode;
};

export function CoreShell({ locale, title, backHref, search, cancelHref, width = "wide", children }: CoreShellProps) {
  const router = useRouter();
  const shell = useTranslations("CoreShell");
  const shared = useTranslations("Shared");
  const searchT = useTranslations("Search");
  const rtl = getDirection(locale) === "rtl";

  const tabs: Array<BottomTabItem & { href: string }> = [
    { id: "home", label: shared("navHome"), icon: "house", href: `/${locale}` },
    { id: "pharmacy", label: shared("navPharmacy"), icon: "pill", href: `/${locale}/pharmacy` },
    { id: "consult", label: shared("navDoctors"), icon: "stethoscope", href: `/${locale}/consultations/doctors`, raised: true },
    { id: "labs", label: shared("navDiagnostics"), icon: "test-tube", href: `/${locale}/diagnostics/labs` },
    { id: "nursing", label: shared("navNursing"), icon: "first-aid-kit", href: `/${locale}/home-care` },
  ];

  const sections = [
    { id: "home", label: shared("navHome"), href: `/${locale}` },
    { id: "pharmacy", label: shared("navPharmacy"), href: `/${locale}/pharmacy` },
    { id: "consult", label: shared("navDoctors"), href: `/${locale}/consultations/doctors` },
    { id: "labs", label: shared("navDiagnostics"), href: `/${locale}/diagnostics/labs` },
    { id: "nursing", label: shared("navNursing"), href: `/${locale}/home-care` },
  ];

  const topBar = (
    <div className={styles.bar}>
      {!search && backHref ? (
        <Link href={backHref} className={`${styles.iconLink} ${styles.phoneOnly}`} aria-label={shell("back")}>
          <Icon name={rtl ? "caret-right" : "caret-left"} size={22} tone="currentColor" />
        </Link>
      ) : null}
      {!search && title ? <h1 className={`${styles.phoneTitle} ${styles.phoneOnly}`}>{title}</h1> : null}

      <Link href={`/${locale}`} className={`${styles.brand} ${styles.wideOnly}`} aria-label={shared("brand")}>
        <NabdMark size={34} variant="text" />
        <span className={styles.wordmark} aria-hidden="true">
          {locale === "ar" ? "نبض" : "Nabd"}<span className={styles.plus}>+</span>
        </span>
      </Link>

      {search ? (
        <>
          <div className={styles.search}>{search}</div>
          {cancelHref ? <Link href={cancelHref} className={`${styles.cancel} ${styles.phoneOnly}`}>{searchT("cancel")}</Link> : null}
        </>
      ) : (
        <nav className={styles.sections} aria-label={shell("mainNav")}>
          {sections.map((s) => (
            <Link key={s.id} href={s.href} className={styles.section}>{s.label}</Link>
          ))}
        </nav>
      )}

      <div className={`${styles.tools} ${styles.wideOnly}`}>
        <LocaleSelector current={locale} label={shell("language")} />
        <ThemeToggle label={shared("theme")} />
        <Link href={`/${locale}/notifications`} className={styles.iconLink} aria-label={shell("notifications")}>
          <Icon name="bell" size={20} tone="currentColor" />
        </Link>
        <Link href={`/${locale}/cart`} className={styles.iconLink} aria-label={shell("cart")}>
          <Icon name="cart" size={20} tone="currentColor" />
        </Link>
        <Link href={`/${locale}/profile`} className={styles.iconLink} aria-label={shared("account")}>
          <Icon name="user" size={20} tone="currentColor" />
        </Link>
      </div>
    </div>
  );

  return (
    <AppShell
      className={`nabd-core ${styles.root}`}
      topBar={topBar}
      tabBarLabel={shell("mainNav")}
      tabBar={
        <BottomTabBar
          label={shell("sections")}
          items={tabs.map(({ id, label, icon, raised }) => ({ id, label, icon, raised }))}
          value=""
          onChange={(id) => {
            const target = tabs.find((t) => t.id === id);
            if (target) router.push(target.href);
          }}
        />
      }
    >
      <div className={`${styles.page} ${width === "narrow" ? styles.narrow : ""}`}>{children}</div>
    </AppShell>
  );
}
