import Link from "next/link";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import {
  SPECIALTY_ART, SPECIALTY_ART_TONE, SPECIALTY_ART_VIEWBOX, type SpecialtyArtKey, type SpecialtyArtRole, type SpecialtyTileModel,
} from "@/components-next/ui-generated/icons/specialty-art";
import styles from "./specialty-tiles.module.css";

const FILL: Record<SpecialtyArtRole, string> = { bg: styles.fBg, fg: styles.fFg, ink: styles.fInk, coral: styles.fCoral, surface: styles.fSurface };
const STROKE: Record<SpecialtyArtRole, string> = { bg: styles.sBg, fg: styles.sFg, ink: styles.sInk, coral: styles.sCoral, surface: styles.sSurface };

/** The shared specialty illustration (packages/ui/icons/specialty-art.ts) drawn with token classes; decorative, the tile's label names it. */
export function SpecialtyArt({ art, size = 48 }: { art: SpecialtyArtKey; size?: number }) {
  return (
    <svg className={styles.art} viewBox={SPECIALTY_ART_VIEWBOX} width={size} height={size} aria-hidden="true" focusable="false">
      {SPECIALTY_ART[art].map((shape, i) => (
        <path key={i} d={shape.d} className={`${shape.fill ? FILL[shape.fill] : styles.fNone} ${shape.stroke ? STROKE[shape.stroke] : ""}`} strokeWidth={shape.stroke ? shape.sw ?? 2 : undefined} />
      ))}
    </svg>
  );
}

export type SpecialtyTileProps = {
  href: string;
  label: string;
  /** The illustration; null draws the fill icon the specialty always had (a specialty with no illustration yet is never blank). */
  art: SpecialtyArtKey | null;
  selected?: boolean;
  comingSoon?: boolean;
  comingSoonLabel?: string;
};

/** One specialty tile: the illustration over the name; a specialty with no doctor yet is muted and says "Coming soon". */
export function SpecialtyTile({ href, label, art, selected = false, comingSoon = false, comingSoonLabel }: SpecialtyTileProps) {
  const tone = art ? SPECIALTY_ART_TONE[art] : "blue";
  return (
    <Link
      href={href}
      className={`${styles.tile} nabd-tone--${tone}`}
      aria-label={comingSoon && comingSoonLabel ? `${label}, ${comingSoonLabel}` : label}
      aria-current={selected ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      data-soon={comingSoon ? "true" : undefined}
      data-art={art ?? "fallback"}
    >
      <span className={styles.picture}>{art ? <SpecialtyArt art={art} size={48} /> : <FIcon icon="stethoscope" tone="blue" size={48} />}</span>
      <span className={styles.label}>{label}</span>
      {comingSoon && comingSoonLabel ? <span className={styles.soon}>{comingSoonLabel}</span> : null}
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
  comingSoonLabel: string;
  selectedSlug?: string;
  tiles: readonly SpecialtyTileModel[];
  hrefOf: (slug: string) => string;
};

/** "All" first, the specialties with doctors (most doctors first), those without (Coming soon), then "All specialties" (the grid with search). */
export function SpecialtyRow({ label, allLabel, allHref, allSelected, moreLabel, moreHref, comingSoonLabel, selectedSlug, tiles, hrefOf }: SpecialtyRowProps) {
  return (
    <nav aria-label={label}>
      <ul className={styles.row}>
        <li><SpecialtyTile href={allHref} label={allLabel} art="all" selected={allSelected} /></li>
        {tiles.map((tile) => (
          <li key={tile.slug}>
            <SpecialtyTile href={hrefOf(tile.slug)} label={tile.name} art={tile.art} selected={tile.slug === selectedSlug} comingSoon={tile.comingSoon} comingSoonLabel={comingSoonLabel} />
          </li>
        ))}
        <li><SpecialtyTile href={moreHref} label={moreLabel} art="more" /></li>
      </ul>
    </nav>
  );
}

/** The full grid of the specialties page (no "All" or "All specialties" tiles). */
export function SpecialtyGrid({ label, comingSoonLabel, tiles, hrefOf }: { label: string; comingSoonLabel: string; tiles: readonly SpecialtyTileModel[]; hrefOf: (slug: string) => string }) {
  return (
    <ul className={styles.grid} aria-label={label}>
      {tiles.map((tile) => (
        <li key={tile.slug}><SpecialtyTile href={hrefOf(tile.slug)} label={tile.name} art={tile.art} comingSoon={tile.comingSoon} comingSoonLabel={comingSoonLabel} /></li>
      ))}
    </ul>
  );
}
