import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX } from "@/components-next/ui-generated/icons/fill";
import styles from "@/components-next/settings/settings.module.css";

/** One review's score as five stars (the design system's rating star, filled up to the score). `label` is the translated "n of 5". */
export function Stars({ score, label }: { score: number; label: string }) {
  return (
    <span role="img" aria-label={label} className={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} aria-hidden="true" width={20} height={20} viewBox={FILL_ICON_VIEWBOX}>
          <path d={FILL_ICON_PATHS.star} fill={n <= score ? "var(--nabd-color-icon-ratingStar)" : "var(--nabd-color-border-strong)"} />
        </svg>
      ))}
    </span>
  );
}
