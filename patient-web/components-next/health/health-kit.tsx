import type { ReactNode } from "react";
import Link from "next/link";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import type { FillIconName, ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { LinkSegmented } from "@/components-next/consult/link-segmented";
import { Notice } from "@/components-next/consult/consult-parts";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "./health.module.css";

export type HealthTabOption<T extends string> = { value: T; label: string; extra?: string };

/**
 * The tabs of a merged health screen (merge map rule 1): link tabs whose state is the `?tab=` of the URL, so a redirect or
 * a shared link can open one, and it works before the page is interactive. Nothing but the tab name is ever in the URL.
 */
export function HealthTabs<T extends string>({ label, base, options, active }: { label: string; base: string; options: Array<HealthTabOption<T>>; active: T }) {
  return <LinkSegmented label={label} value={active} options={options.map((option) => ({ value: option.value, label: option.label, href: `${base}?tab=${option.value}${option.extra ?? ""}` }))} />;
}

/** A section's heading and, on the end, a link to where the rest lives (canvas/HealthHub: "المؤشرات … سجّل قراءة"). */
export function SectionHead({ id, title, action }: { id: string; title: string; action?: { href: string; label: string } }) {
  return (
    <div className={styles.sectionHead}>
      <h2 id={id} className={styles.sectionTitle}>{title}</h2>
      {action ? <Link href={action.href} className={styles.sectionLink}>{action.label}</Link> : null}
    </div>
  );
}

/** One vital on the board's tile: the label and glyph, the value with its unit, and when it was measured. Every value is the server's. */
export function VitalTile({ href, label, value, unit, when, icon, tone }: { href?: string; label: string; value: ReactNode; unit?: string; when?: ReactNode; icon: FillIconName; tone: ServiceTone }) {
  const body = (
    <>
      <span className={styles.tileTop}>
        <span className={styles.tileLabel}>{label}</span>
        <FIcon icon={icon} tone={tone} size={20} chip="none" />
      </span>
      <span className={styles.tileValue}><bdi>{value}</bdi>{unit ? <> <span className={styles.tileUnit}>{unit}</span></> : null}</span>
      {when ? <span className={styles.tileWhen}>{when}</span> : null}
    </>
  );
  return href ? <Link href={href} className={styles.tile}>{body}</Link> : <div className={styles.tile}>{body}</div>;
}

/** A white card around a list of rows (the board's "records" and "today's medicines" cards). */
export function RowsCard({ id, label, children }: { id?: string; label: string; children: ReactNode }) {
  return (
    <section className={`${rx.card} ${rx.cardFlush}`} aria-label={label} id={id}>
      <ul className={styles.rows}>{children}</ul>
    </section>
  );
}

/** What a part of a page could not load, said in place so the rest of the page still works. */
export function PartUnavailable({ children }: { children: ReactNode }) {
  return <div role="alert"><Notice warn>{children}</Notice></div>;
}
