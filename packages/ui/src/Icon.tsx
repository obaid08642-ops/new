import * as React from 'react';
import {
  Bell,
  CalendarBlank,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  Check,
  CheckCircle,
  Clock,
  CreditCard,
  DownloadSimple,
  Funnel,
  Gear,
  Heart,
  House,
  List,
  MagnifyingGlass,
  MapPin,
  Minus,
  Phone,
  Plus,
  ShoppingCart,
  SignOut,
  Star,
  Trash,
  User,
  UsersThree,
  Warning,
  X,
} from '@phosphor-icons/react';

import {
  ILLUSTRATED,
  ILLUSTRATED_ICONS,
  ICON_TINT,
  type IllustratedIcon,
  type Prim,
} from '../icons/illustrated';
import {
  GRID as ILLUSTRATION_GRID,
  ILLUSTRATIONS,
  ILLUSTRATION_META,
  ILLUSTRATION_NAMES,
  type IllustrationName,
} from '../icons/illustrations';

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

/** The curated small-UI set. One line set, one weight, no per-screen additions. */
const LINE = {
  bell: Bell,
  calendar: CalendarBlank,
  'caret-down': CaretDown,
  'caret-left': CaretLeft,
  'caret-right': CaretRight,
  'caret-up': CaretUp,
  check: Check,
  'check-circle': CheckCircle,
  clock: Clock,
  card: CreditCard,
  download: DownloadSimple,
  filter: Funnel,
  settings: Gear,
  heart: Heart,
  home: House,
  list: List,
  search: MagnifyingGlass,
  pin: MapPin,
  minus: Minus,
  phone: Phone,
  plus: Plus,
  cart: ShoppingCart,
  signout: SignOut,
  star: Star,
  trash: Trash,
  user: User,
  users: UsersThree,
  warning: Warning,
  close: X,
} as const;

export const LINE_ICON_NAMES = Object.keys(LINE) as Array<keyof typeof LINE>;
export type LineIconName = keyof typeof LINE;

export type IconName = IllustratedIcon | LineIconName;

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
const SIZES: Record<IconSize, number> = { sm: 20, md: 24, lg: 32, xl: 46, hero: 88 };

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

/* ------------------------------------------------- illustrated (one geometry) */

function paintFor(prim: Prim, key: 'fill' | 'stroke'): string | undefined {
  const value = (prim as Record<string, unknown>)[key];
  if (value === undefined || value === 'none') return undefined;
  return `var(--nabd-color-iconArt-${value}, ${FALLBACK_ART[String(value)]})`;
}

const FALLBACK_ART: Record<string, string> = {
  ink: '#0B1B2B',
  paper: '#FFFFFF',
  coral: '#FF6B73',
  amber: '#FFD166',
  blue: '#6E8BFF',
  blueSoft: '#9DB0FF',
  mint: '#3FBF9A',
  mintSoft: '#6FE0B8',
  violet: '#C3A8FF',
  lavender: '#D2B8FF',
  pink: '#F4B8E4',
  lime: '#8EDC5E',
  skin: '#FFB38A',
};

function PrimNode({ prim }: { prim: Prim }) {
  if (prim.el === 'g') {
    const [angle, cx, cy] = prim.rotate ?? [0, 0, 0];
    return (
      <g transform={`rotate(${angle} ${cx} ${cy})`}>
        {prim.children.map((child, i) => (
          <PrimNode key={i} prim={child} />
        ))}
      </g>
    );
  }
  if (prim.el === 'path') {
    return (
      <path
        d={prim.d}
        fill={paintFor(prim, 'fill') ?? 'none'}
        stroke={paintFor(prim, 'stroke')}
        strokeWidth={prim.strokeWidth}
        opacity={prim.opacity}
      />
    );
  }
  if (prim.el === 'circle') {
    return (
      <circle
        cx={prim.cx}
        cy={prim.cy}
        r={prim.r}
        fill={paintFor(prim, 'fill')}
        stroke={paintFor(prim, 'stroke')}
        strokeWidth={prim.strokeWidth}
        opacity={prim.opacity}
      />
    );
  }
  return (
    <rect
      x={prim.x}
      y={prim.y}
      width={prim.w}
      height={prim.h}
      rx={prim.rx}
      fill={paintFor(prim, 'fill')}
      stroke={paintFor(prim, 'stroke')}
      strokeWidth={prim.strokeWidth}
      opacity={prim.opacity}
    />
  );
}

/* -------------------------------------------------------------------- icon */

export function IllustratedIconView({
  name,
  size,
  title,
  className,
  style,
}: Pick<IconProps, 'name' | 'size' | 'title' | 'className' | 'style'> & { name: IllustratedIcon }) {
  const px = typeof size === 'number' ? size : (SIZES[size ?? 'lg'] ?? SIZES.lg);
  const prims = ILLUSTRATED[name];
  if (!prims) throw new Error(`Unknown illustrated icon: ${name}`);

  return (
    <svg
      className={['nabd-icon', 'nabd-icon--illustrated', className].filter(Boolean).join(' ')}
      width={px}
      height={px}
      viewBox="0 0 48 48"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      data-icon={name}
      data-tint={ICON_TINT[name]}
      style={style}
    >
      {title ? <title>{title}</title> : null}
      {prims.map((prim, i) => (
        <PrimNode key={i} prim={prim} />
      ))}
    </svg>
  );
}

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
    return (
      <IllustratedIconView
        name={name as IllustratedIcon}
        size={px}
        title={title}
        className={className}
        style={style}
      />
    );
  }

  const Glyph = LINE[name as LineIconName];
  if (!Glyph) {
    throw new Error(
      `Unknown icon: ${String(name)}. Use an illustrated icon (${ILLUSTRATED_ICONS.join(', ')}) ` +
        `or a line icon (${LINE_ICON_NAMES.join(', ')}).`,
    );
  }

  const colour = TONE_VAR[tone] ?? `var(--nabd-color-iconArt-${tone}, ${tone})`;

  return (
    <Glyph
      className={['nabd-icon', 'nabd-icon--line', className].filter(Boolean).join(' ')}
      size={px}
      weight="regular"
      color={colour}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      role={title ? 'img' : undefined}
      onClick={onClick}
      data-icon={name}
      style={style}
    />
  );
}

/* ------------------------------------------------------------- illustrations */

/**
 * `<Illustration>` — the SCENE set for 12.A6: onboarding, empty states, errors
 * and success. Kept out of `<Icon>` on purpose, because a scene is not an icon:
 * it is a picture with a job (say what is happening) that is always paired with a
 * headline and a body from i18n, and those strings carry the meaning for a screen
 * reader. So the picture itself is `aria-hidden` unless it stands alone and is
 * given a `title` — the same contract as the illustrated icons.
 *
 * The scenes are on a 64 grid, the icons on 48, so `size` here is the size of the
 * whole picture and the art scales inside it.
 */
export interface IllustrationProps {
  name: IllustrationName;
  /** The rendered box. The 128px tile is the canvas default for empty states. */
  size?: IconSize | number;
  /** Accessible name, when the scene stands alone. */
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Illustration({ name, size = 'xl', title, className, style }: IllustrationProps) {
  const px = typeof size === 'number' ? size : (SIZES[size] ?? SIZES.xl);
  const prims = ILLUSTRATIONS[name];
  if (!prims) {
    throw new Error(
      `Unknown illustration: ${name}. Use one of ${ILLUSTRATION_NAMES.join(', ')}.`,
    );
  }
  const meta = ILLUSTRATION_META[name];

  return (
    <svg
      className={['nabd-illustration', `nabd-illustration--${meta.kind}`, className]
        .filter(Boolean)
        .join(' ')}
      width={px}
      height={px}
      viewBox={`0 0 ${ILLUSTRATION_GRID} ${ILLUSTRATION_GRID}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      data-illustration={name}
      data-kind={meta.kind}
      data-tone={meta.tone}
      style={style}
    >
      {title ? <title>{title}</title> : null}
      {prims.map((prim, i) => (
        <PrimNode key={i} prim={prim} />
      ))}
    </svg>
  );
}

export { ILLUSTRATED_ICONS, ICON_TINT, ILLUSTRATIONS, ILLUSTRATION_META, ILLUSTRATION_NAMES };
export type { IllustratedIcon, IllustrationName };
export default Icon;
