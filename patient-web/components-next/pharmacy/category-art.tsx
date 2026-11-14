import { CATEGORY_ART, CATEGORY_ART_TONE, CATEGORY_ART_VIEWBOX, type CategoryArtKey, type CategoryArtRole } from "@/components-next/ui-generated/icons/category-art";
import styles from "./category-art.module.css";

const FILL: Record<CategoryArtRole, string> = { bg: styles.fBg, fg: styles.fFg, ink: styles.fInk, coral: styles.fCoral, surface: styles.fSurface };
const STROKE: Record<CategoryArtRole, string> = { bg: styles.sBg, fg: styles.sFg, ink: styles.sInk, coral: styles.sCoral, surface: styles.sSurface };

/**
 * The thin web renderer of the shared category illustration (packages/ui/icons/category-art.ts). The shapes and the roles
 * come from the module; the roles are classes that read the tokens' CSS variables, so dark mode follows and the CSP
 * (no style attributes) is respected. Decorative: the tile's label names the category.
 */
export function CategoryArt({ art, size = 48 }: { art: CategoryArtKey; size?: number }) {
  return (
    <svg className={styles.art} viewBox={CATEGORY_ART_VIEWBOX} width={size} height={size} aria-hidden="true" focusable="false">
      {CATEGORY_ART[art].map((shape, i) => (
        <path
          key={i}
          d={shape.d}
          className={`${shape.fill ? FILL[shape.fill] : styles.fNone} ${shape.stroke ? STROKE[shape.stroke] : ""}`}
          strokeWidth={shape.stroke ? shape.sw ?? 2 : undefined}
        />
      ))}
    </svg>
  );
}

/** The service-tone class of an illustration (sets the --nabd-tone-* variables the roles read). */
export const categoryArtToneClass = (art: CategoryArtKey): string => `nabd-tone--${CATEGORY_ART_TONE[art]}`;
