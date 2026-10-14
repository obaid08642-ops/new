import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { NabdMark } from "@/components-next/nabd-mark";
import { LocaleSelector } from "@/components-next/locale-selector";
import { ThemeToggle } from "@/components-next/theme-toggle";
import { getDirection, type Locale } from "@/lib/i18n";
import styles from "./auth.module.css";

/**
 * The sign-in family's page (boards Login, Register, Otp, Welcome on a phone;
 * AuthWeb on a desktop).
 *
 *   < 1024  one column on the #F5F5F7 canvas: back button and the Noon Dot mark,
 *           then the form; the primary action sits at the bottom of the screen.
 *   ≥ 1024  AuthWeb: the form column (mark + wordmark, form at 440) beside the
 *           640px hero panel with three service tiles and the three promises.
 *
 * The site header and footer are not drawn on these pages (globals.css), as on
 * the boards; language and theme stay reachable in the top row.
 */
export async function AuthLayout({
  locale,
  backHref,
  showMark = true,
  children,
}: {
  locale: Locale;
  /** Where the back button goes; no button when absent (the first screen of the flow). */
  backHref?: string;
  /** Welcome draws the large Noon Dot in its body, so its top row has no small one. */
  showMark?: boolean;
  children: React.ReactNode;
}) {
  const shared = await getTranslations({ locale, namespace: "Shared" });
  const frame = await getTranslations({ locale, namespace: "AuthFrame" });
  const heroPoints = [frame("heroPoint1"), frame("heroPoint2"), frame("heroPoint3")];
  const rtl = getDirection(locale) === "rtl";
  return (
    <main className={`nabd-auth ${styles.page}`}>
      <div className={styles.column}>
        <div className={styles.top}>
          {backHref ? (
            <Link href={backHref} className={styles.back} aria-label={frame("back")}>
              <Icon name={rtl ? "caret-right" : "caret-left"} size={20} tone="currentColor" />
            </Link>
          ) : (
            <span className={styles.backSpacer} aria-hidden="true" />
          )}
          {showMark ? <Link href={`/${locale}`} className={styles.brand} aria-label={shared("brand")}>
            <NabdMark size={34} variant="text" />
            <span className={styles.wordmark} aria-hidden="true">
              {shared("wordmark")}<span className={styles.plus}>+</span>
            </span>
          </Link> : <span />}
          <div className={styles.tools}>
            <LocaleSelector current={locale} label={shared("language")} />
            <ThemeToggle label={shared("theme")} />
          </div>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
      <aside className={styles.hero} aria-hidden="true">
        <span className={`${styles.tile} ${styles.tileA}`}><FIcon icon={SERVICE_ICONS.pharmacy.icon} tone={SERVICE_ICONS.pharmacy.tone} chip="none" size={96} /></span>
        <span className={`${styles.tile} ${styles.tileB}`}><FIcon icon={SERVICE_ICONS.consult.icon} tone={SERVICE_ICONS.consult.tone} chip="none" size={110} /></span>
        <span className={`${styles.tile} ${styles.tileC}`}><FIcon icon={SERVICE_ICONS.lab.icon} tone={SERVICE_ICONS.lab.tone} chip="none" size={86} /></span>
        <p className={styles.heroTitle}>{frame("heroTitleA")}<br />{frame("heroTitleB")}</p>
        <ul className={styles.points}>
          {heroPoints.map((p) => (
            <li key={p}><span className={styles.check}><Icon name="check" size={16} tone="currentColor" /></span>{p}</li>
          ))}
        </ul>
      </aside>
    </main>
  );
}
