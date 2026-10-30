import { localizedText } from "@/lib/i18n/localized-field";
import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components-next/ui-generated/components/Button";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { SERVICE_ICONS, type FillIconName, type ServiceTone } from "@/components-next/ui-generated/icons/fill";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { allowedImageUrl } from "@/lib/image-hosts";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { LiveFilter } from "./live-filter";
import { SuggestSearchForm } from "./suggest-search-form";
import type { SuggestScope } from "@/lib/search/suggest";
import { PhotoWithFallback } from "./photo-with-fallback";
import consult from "@/components-next/consult/consult.module.css";
import type { DiagArtKey } from "@/components-next/ui-generated/icons/diag-art";
import { DiagArt } from "./diag-art";
import styles from "./diag.module.css";

/** The laboratory and radiology services' own icon and tone, from the handoff service map (never written as a colour name). */
export const LAB = SERVICE_ICONS.lab;
export const RADIOLOGY = SERVICE_ICONS.radiology;

/** The name, description or line a catalogue row has in the page's language, else the other language (lib/i18n/localized-field.ts). */
export function pickText(locale: string, ar: string | undefined, en: string | undefined): string | undefined {
  return localizedText({ locale, ar, en });
}

export { money, hoursText, minutesText } from "@/lib/diagnostics-format";

/** A section heading with an optional link to the whole list ("كل الباقات"). */
export function SectionHead({ id, title, href, linkLabel }: { id: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className={styles.sectionHead}>
      <h2 id={id} className={styles.sectionTitle}>{title}</h2>
      {href && linkLabel ? <Link href={href} className={styles.sectionLink}>{linkLabel}</Link> : null}
    </div>
  );
}

/**
 * The search pill of the hub and the catalogues: a GET form (the query is in the URL, it works before the page is
 * interactive). `children` are the hidden inputs or extra fields the screen's filters need.
 */
export function SearchForm({ action, name = "q", defaultValue, placeholder, label, submitLabel, below, live = false, sticky = false, suggest }: { action?: string; name?: string; defaultValue?: string; placeholder: string; label: string; submitLabel: string; below?: ReactNode; /** Filter as you type (a list on the same page). */ live?: boolean; /** Live suggestions of this service under the field (the page's language and the service's scope). */ suggest?: { locale: string; scope: SuggestScope }; /** The search stays under the header while a long list scrolls. */ sticky?: boolean }) {
  if (suggest && !live) return <SuggestSearchForm action={action} name={name} defaultValue={defaultValue} placeholder={placeholder} label={label} submitLabel={submitLabel} below={below} sticky={sticky} locale={suggest.locale} scope={suggest.scope} />;
  return (
    <form method="get" action={action} role="search" className={sticky ? `${styles.searchForm} ${styles.searchSticky}` : styles.searchForm}>
      <div className={consult.search}>
        <label className={consult.searchField}>
          <Icon name="search" size={20} tone="secondary" />
          <span className="sr-only">{label}</span>
          <input name={name} defaultValue={defaultValue} placeholder={placeholder} className={consult.searchInput} />
        </label>
        <Button type="submit" label={submitLabel} size="lg" />
      </div>
      {below}
      {live ? <LiveFilter /> : null}
    </form>
  );
}

/** A checkbox of a filter form ("home collection only"): a 44 tall label. */
export function CheckField({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className={styles.check}>
      <input type="checkbox" name={name} value="1" defaultChecked={defaultChecked} />
      <span>{label}</span>
    </label>
  );
}

/** A white tile with a tinted icon that goes to a page ("نتائجي", "قارن الأسعار"). */
export function QuickLink({ href, icon, tone, label }: { href: string; icon: FillIconName; tone: ServiceTone; label: string }) {
  return (
    <Link href={href} className={styles.quick}>
      <FIcon icon={icon} tone={tone} size={40} />
      <span>{label}</span>
    </Link>
  );
}

export type Tag = { label: string; tone: ServiceTone };

/** One row of a list of tests: the name (a link to its page), its tags, the price and the add button, the board's "تحاليل شائعة" row. */
export function TestRow({ href, title, tags = [], note, price, addHref, addLabel, addSlot }: { href: string; title: ReactNode; tags?: Tag[]; note?: string; price?: string; addHref?: string; addLabel?: string; addSlot?: ReactNode }) {
  return (
    <li>
      <div className={styles.test}>
        <Link href={href} className={styles.testMain}>
          <span className={styles.testName}>{title}</span>
          {tags.length > 0 || note ? (
            <span className={styles.tags}>
              {tags.map((tag) => <StatusChip key={tag.label} label={tag.label} tone={tag.tone} />)}
              {note ? <span className={styles.tagNote}>{note}</span> : null}
            </span>
          ) : null}
        </Link>
        {price ? <span className={styles.price}><bdi>{price}</bdi></span> : null}
        {addSlot ?? null}
        {!addSlot && addHref && addLabel ? (
          <Link href={addHref} className={styles.addBtn} aria-label={addLabel}>
            <Icon name="plus" size={18} tone="currentColor" />
          </Link>
        ) : null}
      </div>
    </li>
  );
}

/** A list of `TestRow`s on one white card. */
export function TestList({ label, children }: { label: string; children: ReactNode }) {
  return <ul className={styles.tests} aria-label={label}>{children}</ul>;
}

/** A package of tests on a tinted card (ServiceHub "باقات الفحوصات"): the tile, how many tests, the name, the line, the price and "details". */
export function PackageCard({ href, title, sub, count, price, was, cta, tone = LAB.tone, icon = LAB.icon, art, fluid = false }: { href: string; title: ReactNode; sub?: ReactNode; count?: string; price?: string; was?: string; cta: string; tone?: ServiceTone; icon?: FillIconName; /** The package's category illustration, in place of the service glyph. */ art?: DiagArtKey; fluid?: boolean }) {
  return (
    <Link href={href} className={`${styles.pack} ${fluid ? styles.packFluid : ""} nabd-tone--${tone}`}>
      <span className={styles.packTop}>
        {art ? <DiagArt art={art} size={48} /> : <FIcon icon={icon} tone={tone} size={48} />}
        {count ? <span className={styles.packCount}>{count}</span> : null}
      </span>
      <span className={styles.packBody}>
        <span className={styles.packName}>{title}</span>
        {sub ? <span className={styles.packDesc}>{sub}</span> : null}
      </span>
      <span className={styles.packFoot}>
        {price ? (
          <span className={styles.priceBig}><bdi>{price}</bdi>{was ? <span className={styles.was}><bdi>{was}</bdi></span> : null}</span>
        ) : <span />}
        <span className={styles.packCta}>{cta}</span>
      </span>
    </Link>
  );
}

/** A horizontal run of cards that scrolls on a phone. */
export function Rail({ label, children }: { label: string; children: ReactNode }) {
  return <div className={styles.rail} role="group" aria-label={label}>{children}</div>;
}

/** A radiology service as a tile of a two column grid: the violet tile, the name and "from [price]". */
export function RadiologyTile({ href, title, sub, imageUrl, tags = [] }: { href: string; title: ReactNode; sub?: ReactNode; imageUrl?: string; tags?: Tag[] }) {
  const image = allowedImageUrl(imageUrl);
  return (
    <li>
      <Link href={href} className={styles.rad}>
        {image ? <PhotoWithFallback src={image} sizes="48px" wrapClassName={styles.photo} className={styles.photoImage} fallback={<FIcon icon={RADIOLOGY.icon} tone={RADIOLOGY.tone} size={48} />} /> : <FIcon icon={RADIOLOGY.icon} tone={RADIOLOGY.tone} size={48} />}
        <span className={styles.radName}>{title}</span>
        {sub ? <span className={styles.radSub}>{sub}</span> : null}
        {tags.length > 0 ? <TagRow tags={tags} /> : null}
      </Link>
    </li>
  );
}

/** A laboratory or a catalogue entry as a card with its tile, its name and a line, and tags. */
export function LabCard({ href, title, sub, tags = [], imageUrl, price }: { href: string; title: ReactNode; sub?: ReactNode; tags?: Tag[]; imageUrl?: string; price?: string }) {
  const image = allowedImageUrl(imageUrl);
  return (
    <li>
      <Link href={href} className={styles.lab}>
        <span className={styles.labHead}>
          {image ? <PhotoWithFallback src={image} sizes="48px" wrapClassName={styles.photo} className={styles.photoImage} fallback={<FIcon icon={LAB.icon} tone={LAB.tone} size={48} />} /> : <FIcon icon={LAB.icon} tone={LAB.tone} size={48} />}
          <span className={styles.testMain}>
            <span className={styles.labName}>{title}</span>
            {sub ? <span className={styles.radSub}>{sub}</span> : null}
          </span>
        </span>
        {tags.length > 0 || price ? (
          <span className={styles.packFoot}>
            <span className={styles.tags}>{tags.map((tag) => <StatusChip key={tag.label} label={tag.label} tone={tag.tone} />)}</span>
            {price ? <span className={styles.price}><bdi>{price}</bdi></span> : null}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

/** The tinted notice of the radiology hub ("بعض الفحوصات تحتاج طلب طبيب"). */
export function ReferralNote({ children, tone = RADIOLOGY.tone }: { children: ReactNode; tone?: ServiceTone }) {
  return (
    <div className={`${styles.referral} nabd-tone--${tone}`} role="note">
      <Icon name="check-circle" size={20} tone="currentColor" />
      <span>{children}</span>
    </div>
  );
}

/** A list of links as `StatusChip` tags. */
export function TagRow({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) return null;
  return <div className={styles.tags}>{tags.map((tag) => <StatusChip key={tag.label} label={tag.label} tone={tag.tone} />)}</div>;
}

// the catalogue card and "Show more" live in their own small module (the infinite list is a client island that draws them)
export { ItemCard, ShowMore } from "./item-card";

/** The message key of each category chip / card subtitle (DiagWeb). */
export const CAT_LABEL = { blood: "catBlood", hormones: "catHormones", vitamins: "catVitamins", sugar: "catSugar", urine: "catUrine", liver: "catLiver", xray: "catXray", ct: "catCt", mri: "catMri", ultrasound: "catUltrasound", mammography: "catMammography", ecg: "catEcg" } as const satisfies Record<DiagArtKey, string>;
