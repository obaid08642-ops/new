import Link from "next/link";
import { CategoryArt, categoryArtToneClass } from "./category-art";
import { categoryArtKey, type CategoryArtKey } from "@/components-next/ui-generated/icons/category-art";
import styles from "./pharmacy.module.css";

/** One category as a large tile: the illustration over the name. No product count (owner, 2026-10-26). */
export function CategoryTile({ href, label, selected = false, art }: { href: string; label: string; selected?: boolean; art?: CategoryArtKey }) {
  const key = art ?? categoryArtKey(label);
  return (
    <Link href={href} className={`${styles.hubTile} ${styles.catTile} ${categoryArtToneClass(key)}`} aria-current={selected ? "page" : undefined} data-selected={selected ? "true" : undefined}>
      <CategoryArt art={key} size={48} />
      <span className={styles.hubLabel}>{label}</span>
    </Link>
  );
}
