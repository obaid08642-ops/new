import Link from "next/link";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { SPECIALTY_ALL_LOOK, SPECIALTY_MORE_LOOK, type SpecialtyLook, type SpecialtyTileModel } from "@/components-next/ui-generated/icons/specialty-look";
import styles from "./specialty-tiles.module.css";

/** The board's chip (docs/design/canvas/Consult.dc.html): a filled icon of the board's set in a soft tonal chip, 58, over the name. */
const CHIP = 58;

export type SpecialtyTileProps = {
  href: string;
  label: string;
  look: SpecialtyLook;
  selected?: boolean;
};

/** One specialty tile in the board's style (the shared look, packages/ui/icons/specialty-look.ts); decorative icon, the tile's label names it. Every tile opens the doctor search. */
export function SpecialtyTile({ href, label, look, selected = false }: SpecialtyTileProps) {
  return (
    <Link
      href={href}
      className={`${styles.tile} nabd-tone--${look.tone}`}
      aria-label={label}
      aria-current={selected ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
    >
      <span className={styles.picture}><FIcon icon={look.icon} tone={look.tone} chip="soft" size={CHIP} /></span>
      <span className={styles.label}>{label}</span>
    </Link>
  );
}

export type SpecialtyRowProps = {
  label: string;
  allLabel: string;
  allHref: string;
  allSelected: boolean;
  moreLabel: string;
  moreHref: string;
  selectedSlug?: string;
  tiles: readonly SpecialtyTileModel[];
  hrefOf: (slug: string) => string;
};

/** "All" first, the specialties with doctors (most doctors first), the others, then "All specialties" (the grid with search). */
export function SpecialtyRow({ label, allLabel, allHref, allSelected, moreLabel, moreHref, selectedSlug, tiles, hrefOf }: SpecialtyRowProps) {
  return (
    <nav aria-label={label}>
      <ul className={styles.row}>
        <li><SpecialtyTile href={allHref} label={allLabel} look={SPECIALTY_ALL_LOOK} selected={allSelected} /></li>
        {tiles.map((tile) => (
          <li key={tile.slug}>
            <SpecialtyTile href={hrefOf(tile.slug)} label={tile.name} look={tile.look} selected={tile.slug === selectedSlug} />
          </li>
        ))}
        <li><SpecialtyTile href={moreHref} label={moreLabel} look={SPECIALTY_MORE_LOOK} /></li>
      </ul>
    </nav>
  );
}

/** The full grid of the specialties page (no "All" or "All specialties" tiles). */
export function SpecialtyGrid({ label, tiles, hrefOf }: { label: string; tiles: readonly SpecialtyTileModel[]; hrefOf: (slug: string) => string }) {
  return (
    <ul className={styles.grid} aria-label={label}>
      {tiles.map((tile) => (
        <li key={tile.slug}><SpecialtyTile href={hrefOf(tile.slug)} label={tile.name} look={tile.look} /></li>
      ))}
    </ul>
  );
}
