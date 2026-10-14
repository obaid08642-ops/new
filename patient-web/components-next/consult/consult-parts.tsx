import type { ReactNode } from "react";
import Link from "next/link";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { SERVICE_ICONS, type FillIconName, type ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "./consult.module.css";

/** The consultation service's own icon and tone, from the handoff service map (never written as a colour name). */
export const CONSULT = SERVICE_ICONS.consult;

/** A white card with a heading (the board card: radius 24, hairline, soft shadow). */
export function SectionCard({ id, title, children }: { id: string; title?: string; children: ReactNode }) {
  return (
    <section className={rx.card} aria-labelledby={title ? id : undefined}>
      {title ? <h2 id={id} className={styles.sectionTitle}>{title}</h2> : null}
      {children}
    </section>
  );
}

export type FactRow = { label: string; value: ReactNode; icon?: FillIconName; tone?: ServiceTone };

/** Label and value rows (canvas/BookingConfirm): a soft 38 tile when the row has an icon, the label above the value. */
export function Facts({ rows, label }: { rows: FactRow[]; label?: string }) {
  return (
    <ul className={styles.facts} aria-label={label}>
      {rows.map((row) => (
        <li className={styles.fact} key={row.label}>
          {row.icon ? <FIcon icon={row.icon} tone={row.tone ?? CONSULT.tone} size={38} /> : null}
          <span className={styles.factText}>
            <span className={styles.factLabel}>{row.label}</span>
            <span className={styles.factValue}>{row.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A short list of sentences (policy, preparation) with a quiet bullet. */
export function BulletList({ items, label }: { items: string[]; label?: string }) {
  return <ul className={styles.plain} aria-label={label}>{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

/** The tile, a title and a line at the top of a detail page. */
export function Hero({ icon = CONSULT.icon, tone = CONSULT.tone, title, sub, children }: { icon?: FillIconName; tone?: ServiceTone; title: string; sub?: string; children?: ReactNode }) {
  return (
    <section className={`${rx.card} ${styles.hero}`}>
      <FIcon icon={icon} tone={tone} size={52} />
      <div className={styles.heroText}>
        <h2 className={styles.heroTitle}>{title}</h2>
        {sub ? <span className={styles.heroSub}>{sub}</span> : null}
        {children}
      </div>
    </section>
  );
}

/** The page's actions: full-width buttons that stack on phones and sit side by side from 768. */
export function Actions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

export type LinkAction = { href: string; label: string; variant?: "primary" | "outline" | "ghost"; external?: boolean };

/** Links drawn as the design system's buttons. An external link (a map, a phone) is a plain anchor with the same classes. */
export function ActionLinks({ actions }: { actions: LinkAction[] }) {
  if (actions.length === 0) return null;
  return (
    <Actions>
      {actions.map((action) =>
        action.external ? (
          <a key={action.href} href={action.href} target={action.href.startsWith("tel:") ? undefined : "_blank"} rel="noreferrer" className={`nabd-button nabd-button--${action.variant ?? "outline"} nabd-button--lg ${rx.linkButton}`}>
            <span className="nabd-button__label">{action.label}</span>
          </a>
        ) : (
          <ButtonLink key={action.href} href={action.href} label={action.label} variant={action.variant ?? "primary"} />
        ),
      )}
    </Actions>
  );
}

/** A row on a white card that goes to a page: a tile, a title, a line and a caret that mirrors in right-to-left. */
export function RowCard({ href, icon = CONSULT.icon, tone = CONSULT.tone, title, sub, extra, caret }: { href?: string; icon?: FillIconName; tone?: ServiceTone; title: string; sub?: string; extra?: ReactNode; caret?: ReactNode }) {
  const body = (
    <>
      <FIcon icon={icon} tone={tone} size={44} />
      <span className={styles.rowBody}>
        <span className={styles.rowTitle}>{title}</span>
        {sub ? <span className={styles.rowSub}>{sub}</span> : null}
        {extra}
      </span>
      {caret ? <span className={styles.rowEndIcon}>{caret}</span> : null}
    </>
  );
  return href ? <Link href={href} className={styles.rowCard}>{body}</Link> : <div className={styles.rowCard}>{body}</div>;
}

/** The notice line under a screen (what the page does not show, what happens next). */
export function Notice({ children, warn = false }: { children: ReactNode; warn?: boolean }) {
  return <p className={`${styles.notice} ${warn ? styles.noticeWarn : ""}`}>{children}</p>;
}
