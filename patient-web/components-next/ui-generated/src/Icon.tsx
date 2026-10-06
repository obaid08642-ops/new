"use client";

// GENERATED FILE — DO NOT EDIT.
//
// Mirrored from packages/ui/src/Icon.tsx by tools/design/sync-ui-components.mjs.
//
// patient-web cannot import from packages/: Turbopack refuses to resolve outside
// the app root, and the type checker does not, so the failure only appears at
// `next build`. This file is a copy, not a port — the renderer a screen uses and
// the renderer the conformance gallery exercises are the same code, so the
// artwork cannot drift between them. Run the script after changing the package;
// `--check` in CI fails if this drifts.
//
// tests/module-boundary.test.ts enforces the boundary this mirror exists to work
// around.
import * as React from 'react';
import { ILLUSTRATED_ICONS, type IllustratedIcon } from '../icons/illustrated-names';
import {
  LINE_ICON_NAMES as SHARED_LINE_NAMES,
  type IconName as SharedIconName,
  type LineIconName as SharedLineIconName,
} from '../icons/names';
import { LINE_ICON_PATHS, LINE_ICON_VIEWBOX } from '../icons/line';

/**
 * `<Icon>` — the ONE icon entry point for patient-web and admin (12.A6).
 *
 * Two families, deliberately kept apart, exactly as §A6 requires:
 *
 *   - **illustrated** (`weight="illustrated"`) — the flat brand artwork for
 *     service tiles, category tiles, avatars and empty states. Nine icons,
 *     transcribed from the approved canvas, one geometry in
 *     `../icons/illustrated.ts`, so web and React Native can never drift.
 *   - **line** (the default) — a single Phosphor *regular* set for the small UI
 *     inside buttons, lists and the tab bar, where illustrated artwork would be
 *     too heavy to read at 20px.
 *
 * The point of the wrapper is that a screen never picks a colour or a size: both
 * come from the design tokens, so `size="lg"` is the same 46px in every screen
 * and the colour follows the theme.
 *
 * Illustrated artwork carries NO label: the label beside it is app text from
 * i18n, so it is localisable and reaches a screen reader. The illustrated icons
 * are therefore `aria-hidden` by default; pass `title` when one stands alone.
 */


export const LINE_ICON_NAMES = SHARED_LINE_NAMES;
export type LineIconName = SharedLineIconName;

export type IconName = IllustratedIcon | SharedIconName;

export type IconSize = 'sm' | 'md' | 'lg' | 'xl' | 'hero';
export type IconTone =
  | 'primary'
  | 'secondary'
  | 'onBrand'
  | 'favorite'
  | (string & Record<never, never>);

/** tokens.json: font.size is the only place a pixel size for type lives, so the
 *  icon scale is declared here next to it and mirrored into the token file by
 *  12.A2. Values match the canvas (IconSet: 46 / 88 inside a 76 / 128 tile). */
export const SIZES: Record<IconSize, number> = { sm: 20, md: 24, lg: 32, xl: 46, hero: 88 };

/** tokens.json: color.icon.*, with the theme resolved by the caller's CSS vars. */
const TONE_VAR: Record<string, string> = {
  primary: 'var(--nabd-color-icon-primary, #0B1B2B)',
  secondary: 'var(--nabd-color-icon-secondary, #6E6E73)',
  onBrand: 'var(--nabd-color-icon-onBrand, #FFFFFF)',
  favorite: 'var(--nabd-color-icon-favorite, #D42A38)',
};

export interface IconProps {
  name: IconName;
  size?: IconSize | number;
  /** Which family to draw from. Defaults to the line set. */
  weight?: 'line' | 'illustrated';
  /** A colour token name, or the tint of an illustrated icon. */
  tone?: IconTone;
  /** Accessible name. Omit when the icon sits beside visible text. */
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

/* ------------------------------------------------- illustrated (loaded on demand) */

type IllustratedViewProps = Pick<IconProps, 'size' | 'title' | 'className' | 'style'> & { name: IllustratedIcon };

/** Set by Illustrated.tsx when it loads; from then on illustrated icons render synchronously. */
let illustratedRenderer: React.ComponentType<IllustratedViewProps> | null = null;
export function registerIllustratedRenderer(renderer: React.ComponentType<IllustratedViewProps>): void {
  illustratedRenderer = renderer;
}
const LazyIllustrated = React.lazy(() => import('./Illustrated').then((m) => ({ default: m.IllustratedIconView })));

/* -------------------------------------------------------------------- icon */

export function Icon({
  name,
  size = 'md',
  weight = 'line',
  tone = 'primary',
  title,
  className,
  style,
  onClick,
}: IconProps) {
  const px = typeof size === 'number' ? size : (SIZES[size] ?? SIZES.md);

  if (weight === 'illustrated' || (ILLUSTRATED_ICONS as readonly string[]).includes(name)) {
    const props = { name: name as IllustratedIcon, size: px, title, className, style };
    if (illustratedRenderer) {
      const Illustrated = illustratedRenderer;
      return <Illustrated {...props} />;
    }
    // Not loaded yet: the artwork comes in its own chunk (see Illustrated.tsx). The placeholder keeps the box.
    return (
      <React.Suspense
        fallback={<svg className="nabd-icon nabd-icon--illustrated" width={px} height={px} aria-hidden="true" />}
      >
        <LazyIllustrated {...props} />
      </React.Suspense>
    );
  }

  const path = LINE_ICON_PATHS[name as LineIconName];
  if (!path) {
    throw new Error(
      `Unknown icon: ${String(name)}. Use an illustrated icon (${ILLUSTRATED_ICONS.join(', ')}) ` +
        `or a line icon (${LINE_ICON_NAMES.join(', ')}).`,
    );
  }

  const colour = TONE_VAR[tone] ?? `var(--nabd-color-iconArt-${tone}, ${tone})`;

  // The regular outline of the Phosphor glyph (icons/line.ts), drawn here: no icon library at runtime.
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={['nabd-icon', 'nabd-icon--line', className].filter(Boolean).join(' ')}
      width={px}
      height={px}
      fill={colour}
      viewBox={LINE_ICON_VIEWBOX}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      role={title ? 'img' : undefined}
      onClick={onClick}
      data-icon={name}
      style={style}
    >
      <path d={path} />
    </svg>
  );
}

export { ILLUSTRATED_ICONS };
export type { IllustratedIcon };
export default Icon;
