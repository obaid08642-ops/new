import Link from "next/link";
import styles from "./pharmacy.module.css";

/**
 * The filter chip of the design system (`Chip`, canvas/Search) as a link: choosing a category is a navigation
 * (its own URL, indexable), not a toggle. It uses the same classes as `Chip` (ui-generated/components/css/Surfaces.css),
 * so the two look identical; `tests/pharmacy-browse.test.tsx` pins the class names to the component.
 */
export function ChipLink({ href, label, count, selected = false }: { href: string; label: string; count?: number; selected?: boolean }) {
  return (
    <Link href={href} className={`nabd-chip ${styles.chipLink}`} aria-current={selected ? "page" : undefined}>
      <span className={`nabd-chip__pill${selected ? " nabd-chip__pill--selected" : ""}`}>
        {label}
        {count !== undefined ? <span className="nabd-chip__count">{count}</span> : null}
      </span>
    </Link>
  );
}
