import type { ReactNode } from "react";
import Link from "next/link";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import type { FillIconName, ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { getDirection, type Locale } from "@/lib/i18n";
import type { RequestTone } from "@/lib/insurance/view";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "./insurance.module.css";

const TONE_CLASS: Record<RequestTone, string> = { good: styles.badgeGood, wait: styles.badgeWait, bad: styles.badgeBad, plain: "" };

/** A status in words, coloured by the status tokens (never by the words: the caller says which tone). */
export function StatusBadge({ tone = "plain", children }: { tone?: RequestTone; children: ReactNode }) {
  return <span className={`${styles.badge} ${TONE_CLASS[tone]}`}><bdi>{children}</bdi></span>;
}

/** The mirrored caret at the end of a row that goes to a page. */
export function RowCaret({ locale }: { locale: Locale }) {
  return <span className={styles.caret}><Icon name={getDirection(locale) === "rtl" ? "caret-left" : "caret-right"} size={16} tone="secondary" /></span>;
}

/** The board's policy card: the insurer, the plan and whether a policy is recorded (the three things the server tells us). */
export function PolicyCard({ title, sub, badge, tone }: { title: string; sub?: string; badge: string; tone: RequestTone }) {
  return (
    <section className={`${rx.card} ${styles.policy}`}>
      <div className={styles.policyTop}>
        <FIcon icon="shield-check" tone="blue" size={44} />
        <StatusBadge tone={tone}>{badge}</StatusBadge>
      </div>
      <div>
        <p className={styles.policyName}>{title}</p>
        {sub ? <span className={styles.policySub}>{sub}</span> : null}
      </div>
    </section>
  );
}

export type Shortcut = { href: string; label: string; icon: FillIconName; tone: ServiceTone };

/** The board's three shortcut tiles under the card. */
export function ShortcutGrid({ label, items }: { label: string; items: Shortcut[] }) {
  return (
    <ul className={styles.shortcuts} aria-label={label}>
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className={styles.shortcut}>
            <FIcon icon={item.icon} tone={item.tone} size={42} />
            <span>{item.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The tabs of the hub: link tabs whose state is the `?tab=` of the URL, scrolling sideways when the labels do not fit. */
export function InsuranceTabs<T extends string>({ label, base, options, active }: { label: string; base: string; options: Array<{ value: T; label: string }>; active: T }) {
  return (
    <nav className={styles.tabs} aria-label={label}>
      {options.map((option) => (
        <Link key={option.value} href={`${base}?tab=${option.value}`} aria-current={option.value === active ? "page" : undefined} replace>{option.label}</Link>
      ))}
    </nav>
  );
}

/** A white card around rows. */
export function RowsList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className={`${rx.card} ${rx.cardFlush}`} aria-label={label}>
      <ul className={styles.rows}>{children}</ul>
    </section>
  );
}

/** One row: a title, a line under it, a status badge and, when it goes to a page, the caret. */
export function InsuranceRow({ href, title, sub, badge, locale }: { href?: string; title: string; sub?: ReactNode; badge?: ReactNode; locale: Locale }) {
  const body = (
    <>
      <span className={styles.rowBody}>
        <span className={styles.rowTitle}>{title}</span>
        {sub ? <span className={styles.rowSub}>{sub}</span> : null}
      </span>
      {badge}
      {href ? <RowCaret locale={locale} /> : null}
    </>
  );
  return <li>{href ? <Link href={href} className={styles.row}>{body}</Link> : <div className={styles.row}>{body}</div>}</li>;
}
