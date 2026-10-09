import type { ReactNode } from "react";
import Link from "next/link";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import type { FillIconName, ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { getDirection, type Locale } from "@/lib/i18n";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "./settings.module.css";

export type NavRow = { href: string; icon: FillIconName; tone: ServiceTone; title: string; sub?: ReactNode };

/**
 * The link rows of canvas/Account and the settings hub: one white card, a soft tile, a title, a line and a caret that
 * mirrors in right-to-left. Every row is a page; the texts are the caller's (message files or the server's).
 */
export function NavRows({ label, rows, locale }: { label: string; rows: NavRow[]; locale: Locale }) {
  const caret = getDirection(locale) === "rtl" ? "caret-left" : "caret-right";
  return (
    <nav className={styles.navCard} aria-label={label}>
      <ul className={styles.navList}>
        {rows.map((row) => (
          <li key={row.href}>
            <Link href={row.href} className={styles.navRow}>
              <FIcon icon={row.icon} tone={row.tone} size={40} />
              <span className={styles.navText}>
                <span className={styles.navTitle}>{row.title}</span>
                {row.sub ? <span className={styles.navSub}>{row.sub}</span> : null}
              </span>
              <span className={styles.navCaret}><Icon name={caret} size={18} tone="secondary" /></span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** A titled group (the board's section heading over a card). */
export function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 id={id} className={rx.h2}>{title}</h2>
      {children}
    </section>
  );
}

/** The white card that holds a list of rows with no padding of its own (switches, sessions, storage). */
export function FlushCard({ label, children }: { label?: string; children: ReactNode }) {
  return <div className={styles.flush} role={label ? "group" : undefined} aria-label={label}>{children}</div>;
}
