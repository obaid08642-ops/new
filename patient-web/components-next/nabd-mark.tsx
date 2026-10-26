/**
 * NabdMark — the owner-approved "Noon Dot" mark.
 *
 * The geometry is fixed by the brand owner (docs/audit/05 Part A §A1 and
 * docs/design/canvas/Main.dc.html): the open bowl of the Arabic letter ن (a
 * holding hand) with the pulse dot above it. It is byte-identical to
 * packages/brand/src/logo-mark.svg, and the raster assets for the app icons,
 * the favicon and the splash are generated from that same file.
 *
 * The wordmark ("نبض" / "Nabd+") is deliberately NOT part of this component: it
 * is real text, so it uses Readex Pro, is read by screen readers and follows
 * the active locale. Compose it next to the mark, exactly as the canvas does.
 *
 * Only two things may vary: the colours (`variant`) and whether the dot beats.
 */
import * as React from "react";
import "./nabd-mark.css";

/**
 * Owner decision 2026-10-25: the mark is never black. Only the coral bowl and dot (`brand`, on a light or dark page) or the white mark
 * (`onBrand`) on a coral/red tile exist; the old `text` and `ink` variants were removed so black cannot come back.
 */
export type NabdMarkVariant = "brand" | "onBrand";

export interface NabdMarkProps {
  /** Pixel size of the square box. The mark keeps its proportions inside it. */
  size?: number;
  variant?: NabdMarkVariant;
  /** Animate the dot at 60 bpm — the splash, loading and success only. */
  pulse?: boolean;
  /** Accessible name. Omit when the mark sits next to a visible wordmark. */
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

const STROKE: Record<NabdMarkVariant, string> = {
  brand: "var(--nabd-color-brand-coral)",
  onBrand: "var(--nabd-color-text-onBrand)",
};

const DOT: Record<NabdMarkVariant, string> = {
  brand: "var(--nabd-color-brand-coral)",
  onBrand: "var(--nabd-color-text-onBrand)",
};

export function NabdMark({
  size = 36,
  variant = "brand",
  pulse = false,
  title,
  className,
  style,
}: NabdMarkProps) {
  const decorative = title === undefined;
  const classes = ["nabd-mark", pulse && "nabd-mark--pulse", className].filter(Boolean).join(" ");

  return (
    <svg
      className={classes}
      width={size}
      height={size}
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
      data-variant={variant}
      style={style}
    >
      {/* The bowl: the open hand of the letter ن. */}
      <path
        d="M40 104 C40 196 200 196 200 104"
        stroke={STROKE[variant]}
        strokeWidth="36"
        strokeLinecap="round"
        fill="none"
      />
      {/* The dot: the pulse above it, and the only part that ever animates. */}
      <circle className="nabd-mark__dot" cx="120" cy="58" r="24" fill={DOT[variant]} />
    </svg>
  );
}

export default NabdMark;
