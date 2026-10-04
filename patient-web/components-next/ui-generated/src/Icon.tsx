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
import * as phosphor from '@phosphor-icons/react';
import {
  ILLUSTRATED,
  ILLUSTRATED_ICONS,
  ICON_TINT,
  type IllustratedIcon,
  type Prim,
} from '../icons/illustrated';
import {
  LINE_ICON_NAMES as SHARED_LINE_NAMES,
  type IconName as SharedIconName,
  type LineIconName as SharedLineIconName,
} from '../icons/names';
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

/**
 * The curated small-UI set, keyed by the shared name union.
 *
 * Typed `Record<SharedLineIconName, ...>` on purpose: a name added to
 * `names.ts` without a glyph here, or a glyph here without a name, is a compile
 * error in BOTH renderers. That is the whole point of the union living outside
 * the platform code — the curated set is a decision, and a decision is enforced
 * once.
 */
const LINE: Record<SharedLineIconName, React.ComponentType<Record<string, unknown>>> = {
  bell: phosphor.Bell,
  calendar: phosphor.CalendarBlank,
  search: phosphor.MagnifyingGlass,
  cart: phosphor.ShoppingCart,
  user: phosphor.User,
  users: phosphor.UsersThree,
  home: phosphor.House,
  heart: phosphor.Heart,
  clock: phosphor.Clock,
  pin: phosphor.MapPin,
  phone: phosphor.Phone,
  card: phosphor.CreditCard,
  star: phosphor.Star,
  check: phosphor.Check,
  'check-circle': phosphor.CheckCircle,
  close: phosphor.X,
  plus: phosphor.Plus,
  minus: phosphor.Minus,
  filter: phosphor.Funnel,
  settings: phosphor.Gear,
  list: phosphor.List,
  download: phosphor.DownloadSimple,
  trash: phosphor.Trash,
  warning: phosphor.Warning,
  signout: phosphor.SignOut,
  'caret-down': phosphor.CaretDown,
  'caret-up': phosphor.CaretUp,
  'caret-left': phosphor.CaretLeft,
  'caret-right': phosphor.CaretRight,
  'shield-check': phosphor.ShieldCheck,
  'calendar-days': phosphor.CalendarDots,
  'arrow-right': phosphor.ArrowRight,
  'arrow-left': phosphor.ArrowLeft,
  pill: phosphor.Pill,
  activity: phosphor.Pulse,
  'file-text': phosphor.FileText,
  sparkle: phosphor.Sparkle,
  'message-circle': phosphor.ChatCircleDots,
  stethoscope: phosphor.Stethoscope,
  building2: phosphor.Buildings,
  'heart-pulse': phosphor.Heartbeat,
  'flask-conical': phosphor.Flask,
  'users-round': phosphor.UsersThree,
  'lock-keyhole': phosphor.LockKey,
  'check-circle2': phosphor.CheckCircle,
  gift: phosphor.Gift,
  truck: phosphor.Truck,
  siren: phosphor.Siren,
  'refresh-cw': phosphor.ArrowClockwise,
  moon: phosphor.Moon,
  'book-open': phosphor.BookOpen,
  'clipboard-list': phosphor.ClipboardText,
  'scan-line': phosphor.Scan,
  'alert-circle': phosphor.WarningCircle,
  'circle-alert': phosphor.WarningCircle,
  'shopping-bag': phosphor.ShoppingBag,
  brain: phosphor.Brain,
  flame: phosphor.Flame,
  target: phosphor.Target,
  utensils: phosphor.ForkKnife,
  baby: phosphor.Baby,
  tag: phosphor.Tag,
  lock: phosphor.Lock,
  fingerprint: phosphor.Fingerprint,
  'hard-drive': phosphor.HardDrive,
  camera: phosphor.Camera,
  bookmark: phosphor.Bookmark,
  'qr-code': phosphor.QrCode,
  coins: phosphor.Coins,
  history: phosphor.ClockCounterClockwise,
  send: phosphor.PaperPlaneTilt,
  headphones: phosphor.Headphones,
  mic: phosphor.Microphone,
  share2: phosphor.ShareNetwork,
  factory: phosphor.Factory,
  package: phosphor.Package,
  info: phosphor.Info,
  'arrow-up-right': phosphor.ArrowUpRight,
  'arrow-up-left': phosphor.ArrowUpLeft,
  'map-pinned': phosphor.MapPinArea,
  'rotate-ccw': phosphor.ArrowCounterClockwise,
  volume2: phosphor.SpeakerHigh,
  vibrate: phosphor.Vibrate,
  'bell-ring': phosphor.BellRinging,
  'test-tube2': phosphor.TestTube,
  database: phosphor.Database,
  'house-plus': phosphor.HouseLine,
  'loader-circle': phosphor.CircleNotch,
  loader2: phosphor.CircleNotch,
  'user-round': phosphor.User,
  'user-round-plus': phosphor.UserPlus,
  'git-compare-arrows': phosphor.GitDiff,
  'sliders-horizontal': phosphor.SlidersHorizontal,
  'x-circle': phosphor.XCircle,
  'trending-up': phosphor.TrendUp,
  'trending-down': phosphor.TrendDown,
  'package-search': phosphor.Package,
  'package-check': phosphor.Package,
  hash: phosphor.Hash,
  bot: phosphor.Robot,
  'message-square-quote': phosphor.ChatCenteredText,
};

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
  /**
   * Draw the filled variant (Phosphor `weight="fill"`).
   *
   * Approved by the reviewer, 2026-10-04, in response to `<Star fill="currentColor">`
   * appearing in four screens with nowhere to go. A filled star and an outlined star
   * are different glyphs, not the same glyph with a CSS property set — which is why
   * this is a prop on the component and not a `fill` passed through to the SVG. CSS
   * `fill` on a stroked Phosphor outline produces a shape the design never drew.
   *
   * Applies to the line set only; the illustrated family has no filled variant and
   * ignores it.
   */
  filled?: boolean;
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
  filled = false,
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
      weight={filled ? 'fill' : 'regular'}
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
