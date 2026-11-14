import { DIAG_ART, DIAG_ART_TONE, DIAG_ART_VIEWBOX, type DiagArtKey, type DiagArtRole } from "@/components-next/ui-generated/icons/diag-art";
import styles from "./diag-art.module.css";

const FILL: Record<DiagArtRole, string> = { bg: styles.fBg, fg: styles.fFg, ink: styles.fInk, coral: styles.fCoral, surface: styles.fSurface };
const STROKE: Record<DiagArtRole, string> = { bg: styles.sBg, fg: styles.sFg, ink: styles.sInk, coral: styles.sCoral, surface: styles.sSurface };

/**
 * The category illustration of a test or scan (one art per category, not per item) on a tinted tile. The shapes and roles come from the
 * shared module; the roles are classes that read the tokens' variables, so dark mode follows and the CSP (no style attributes) holds.
 * Decorative: the item's name is next to it. The tile's size is its width and height attributes' box, set with the tile class on the svg wrapper.
 */
export function DiagArt({ art, size = 56 }: { art: DiagArtKey; size?: 40 | 48 | 56 }) {
  return (
    <span className={`${styles.tile} nabd-tone--${DIAG_ART_TONE[art]}`} data-art={art}>
      <svg className={styles.art} viewBox={DIAG_ART_VIEWBOX} width={size} height={size} aria-hidden="true" focusable="false">
        {DIAG_ART[art].map((shape, i) => (
          <path
            key={i}
            d={shape.d}
            className={`${shape.fill ? FILL[shape.fill] : styles.fNone} ${shape.stroke ? STROKE[shape.stroke] : ""}`}
            strokeWidth={shape.stroke ? shape.sw ?? 2 : undefined}
          />
        ))}
      </svg>
    </span>
  );
}
