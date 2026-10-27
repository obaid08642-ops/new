import type { ReactNode } from "react";
import Link from "next/link";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import type { ServiceTone } from "@/components-next/ui-generated/icons/fill";
import type { DiagArtKey } from "@/components-next/ui-generated/icons/diag-art";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { DiagArt } from "./diag-art";
import { ItemPicture } from "./item-picture";
import styles from "./diag.module.css";

export type ItemTag = { label: string; tone: ServiceTone };

/**
 * A catalogue test or scan as a large card: its picture next to the name, the tags / note and the price, and the two actions (`actions`:
 * "Add to cart" and "Order now", a client island). The picture is the item's OWN image (`imageUrl`); the CATEGORY illustration (`art`: blood, X-ray ...) is only the fallback
 * when it has none or it fails to load.
 */
export function ItemCard({ href, title, tags = [], note, rating, price, art, imageUrl, actions }: { href: string; title: string; tags?: ItemTag[]; note?: string; rating?: string; price?: string; art: DiagArtKey; imageUrl?: string; actions: ReactNode }) {
  return (
    <li>
      <article className={styles.itemCard}>
        <Link href={href} className={styles.itemMain}>
          <ItemPicture imageUrl={imageUrl} fallback={<DiagArt art={art} size={56} />} />
          <span className={styles.testMain}>
            <span className={styles.testName}>{title}</span>
            {tags.length > 0 ? <span className={styles.tags}>{tags.map((tag) => <StatusChip key={tag.label} label={tag.label} tone={tag.tone} />)}</span> : null}
            {note ? <span className={styles.tagNote}>{note}</span> : null}
            {rating ? <span className={styles.tagNote}>{rating}</span> : null}
            {price ? <span className={styles.price}><bdi>{price}</bdi></span> : null}
          </span>
        </Link>
        <div className={styles.itemActions}>{actions}</div>
      </article>
    </li>
  );
}

/** "Show more" under a paged catalogue list: a link, so the next step works without script. */
export function ShowMore({ href, label }: { href: string; label: string }) {
  return <div className={styles.showMore}><ButtonLink href={href} label={label} variant="outline" size="md" /></div>;
}
