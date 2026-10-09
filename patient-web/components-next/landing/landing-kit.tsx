import type { ReactNode } from "react";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { Notice, RowCard } from "@/components-next/consult/consult-parts";
import { LinkEmptyState } from "@/components-next/pharmacy/link-empty-state";
import rx from "@/components-next/pharmacy/rx.module.css";
import { Caret } from "@/components-next/nursing/nursing-parts";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import type { FillIconName, ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { getDirection, type Locale } from "@/lib/i18n";
import styles from "./landing.module.css";

/**
 * The frame of the public directory and detail pages (Batch 13: doctors by specialty and city, facilities, conditions, home
 * nursing, labs, radiology, services, pharmacies). Every page is the same shape as the consultation screens (the shell,
 * the title, a one-line intro, sections of cards and rows) so the public pages and the app pages read as one product. All
 * of it is server markup, so the page stays static: it reads no cookie and no header, and the text is the caller's.
 */

/** The page: the shell with its top bar, the page title (the phone header and, from 768, the h1) and a one-line intro. */
export function LandingPage({ locale, title, intro, backHref, children }: { locale: Locale; title: string; intro?: string; backHref?: string; children: ReactNode }) {
  return (
    <ConsultPage locale={locale} title={title} backHref={backHref} width="wide">
      {intro ? <p className={rx.lead}>{intro}</p> : null}
      {children}
    </ConsultPage>
  );
}

/** A titled block of the page. */
export function LandingSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 id={id} className={rx.h2}>{title}</h2>
      {children}
    </section>
  );
}

/** Cards side by side from the width of two (a doctor, a service); each child is one `<li>`. */
export function CardGrid({ label, children }: { label: string; children: ReactNode }) {
  return <ul className={styles.grid} aria-label={label}>{children}</ul>;
}

/** A row that goes to a page (a hospital, a clinic): the tile, the name, a line and the caret that points the reader's way. */
export function EntityRow({ locale, href, icon, tone, title, sub }: { locale: Locale; href?: string; icon: FillIconName; tone: ServiceTone; title: string; sub?: string }) {
  return <RowCard href={href} icon={icon} tone={tone} title={title} sub={sub} caret={href ? <Caret rtl={getDirection(locale) === "rtl"} /> : undefined} />;
}

/** A listed service, test or pharmacy: its tile, name and line, short facts as chips, and one action as a page link. */
export function ServiceCard({ icon, tone, title, sub, chips = [], chipTone, actionHref, actionLabel }: { icon: FillIconName; tone: ServiceTone; title: string; sub?: string; chips?: string[]; chipTone?: ServiceTone; actionHref: string; actionLabel: string }) {
  return (
    <article className={`${rx.card} ${styles.card}`}>
      <div className={styles.cardHead}>
        <FIcon icon={icon} tone={tone} size={44} />
        <div className={styles.cardText}>
          <h3 className={styles.cardTitle}>{title}</h3>
          {sub ? <p className={styles.cardSub}>{sub}</p> : null}
        </div>
      </div>
      <ChipSet label={title} items={chips} tone={chipTone ?? tone} />
      <ButtonLink href={actionHref} label={actionLabel} variant="outline" size="md" fullWidth />
    </article>
  );
}

/** Short facts as chips (symptoms, departments, insurers); nothing is drawn for an empty list. */
export function ChipSet({ label, items, tone }: { label: string; items: string[]; tone: ServiceTone }) {
  if (items.length === 0) return null;
  return (
    <ul className={styles.chips} aria-label={label}>
      {items.map((item) => (
        <li key={item}><StatusChip label={item} tone={tone} /></li>
      ))}
    </ul>
  );
}

/** The board's empty state for a list with nobody on it yet, with its way out as a page link. */
export function LandingEmpty({ icon, tone, title, body, actionLabel, actionHref }: { icon: FillIconName; tone: ServiceTone; title: string; body?: string; actionLabel?: string; actionHref?: string }) {
  return (
    <div className={rx.state} role="status">
      <LinkEmptyState icon={icon} tone={tone} title={title} body={body} actionLabel={actionLabel} actionHref={actionHref} />
    </div>
  );
}

export { Notice };
