import * as React from 'react';
import Svg, { Circle, Path, Rect, G as SvgG } from 'react-native-svg';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
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
} from 'phosphor-react-native';

import { tokens, type ThemeName } from '../../design-tokens/dist/ts/tokens';
import {
  ILLUSTRATED,
  ILLUSTRATED_ICONS,
  ICON_TINT,
  type IllustratedIcon,
  type Prim,
} from '../../ui/icons/illustrated';
import {
  GRID as ILLUSTRATION_GRID,
  ILLUSTRATIONS,
  ILLUSTRATION_META,
  ILLUSTRATION_NAMES,
  type IllustrationName,
} from '../../ui/icons/illustrations';

/**
 * `<Icon>` — the ONE icon entry point for patient-app and provider-app (12.A6).
 *
 * The same split as the web wrapper, and the same geometry: the illustrated
 * artwork comes from `packages/ui/icons/illustrated.ts`, so an app icon and a
 * website icon are the same drawing.
 *
 *   - illustrated — flat brand artwork for service tiles, category tiles,
 *     avatars and empty states;
 *   - line (default) — one Phosphor regular set for buttons, lists and the tab
 *     bar, where the artwork would be too heavy at 20px.
 *
 * React Native has no CSS custom properties, so the tone is resolved from the
 * generated token module for the active theme instead of a CSS var.
 */

/**
 * phosphor-react-native publishes an `IconProps` that omits the React Native
 * accessibility props, but its `IconBase` spreads the remaining props straight
 * onto `<Svg>` (see src/lib/icon-base.tsx in the package), so they DO reach the
 * native view. Widening the type states that contract here instead of casting at
 * every call site — and it keeps the a11y test meaningful, because a cast would
 * hide a future phosphor release that stopped spreading.
 */
type GlyphProps = PhosphorIconProps & {
  accessibilityLabel?: string;
  accessibilityRole?: 'none' | 'image';
  accessible?: boolean;
};

const LINE: Record<string, React.FC<GlyphProps>> = {
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
} as const satisfies Record<string, React.FC<GlyphProps>>;

export const LINE_ICON_NAMES = Object.keys(LINE) as Array<keyof typeof LINE>;
export type LineIconName = keyof typeof LINE;
export type IconName = IllustratedIcon | LineIconName;

export type IconSize = 'sm' | 'md' | 'lg' | 'xl' | 'hero';
const SIZES: Record<IconSize, number> = { sm: 20, md: 24, lg: 32, xl: 46, hero: 88 };

export interface IconProps {
  name: IconName;
  size?: IconSize | number;
  weight?: 'line' | 'illustrated';
  /** A colour token name (primary, secondary, onBrand, favorite). */
  tone?: 'primary' | 'secondary' | 'onBrand' | 'favorite';
  /** Which theme to resolve the colour in. Defaults to light. */
  theme?: ThemeName;
  /** Accessible name. Omit when the icon sits beside visible text. */
  title?: string;
  testID?: string;
}

function toneColour(tone: IconProps['tone'], theme: ThemeName): string {
  const t = tokens(theme);
  switch (tone) {
    case 'secondary':
      return t.color.icon.secondary;
    case 'onBrand':
      return t.color.icon.onBrand;
    case 'favorite':
      return t.color.icon.favorite;
    default:
      return t.color.icon.primary;
  }
}

function PrimNode({ prim }: { prim: Prim; key?: React.Key }) {
  const art = tokens('light').color.iconArt;
  const colour = (key: unknown) => (typeof key === 'string' ? art[key as keyof typeof art] : undefined);

  if (prim.el === 'g') {
    const [angle, cx, cy] = prim.rotate ?? [0, 0, 0];
    return (
      <SvgG key="g" rotation={angle} origin={`${cx}, ${cy}`}>
        {prim.children.map((child, i) => (
          <PrimNode key={i} prim={child} />
        ))}
      </SvgG>
    );
  }
  if (prim.el === 'path') {
    return (
      <Path
        key="p"
        d={prim.d}
        fill={prim.fill === 'none' ? 'none' : colour(prim.fill) ?? 'none'}
        stroke={colour(prim.stroke)}
        strokeWidth={prim.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={prim.opacity}
      />
    );
  }
  if (prim.el === 'circle') {
    return (
      <Circle
        key="c"
        cx={prim.cx}
        cy={prim.cy}
        r={prim.r}
        fill={colour(prim.fill)}
        stroke={colour(prim.stroke)}
        strokeWidth={prim.strokeWidth}
        opacity={prim.opacity}
      />
    );
  }
  return (
    <Rect
      key="r"
      x={prim.x}
      y={prim.y}
      width={prim.w}
      height={prim.h}
      rx={prim.rx}
      fill={colour(prim.fill)}
      stroke={colour(prim.stroke)}
      strokeWidth={prim.strokeWidth}
      opacity={prim.opacity}
    />
  );
}

export function Icon({
  name,
  size = 'md',
  weight = 'line',
  tone = 'primary',
  theme = 'light',
  title,
  testID,
}: IconProps) {
  const px = typeof size === 'number' ? size : (SIZES[size] ?? SIZES.md);

  if (weight === 'illustrated' || (ILLUSTRATED_ICONS as readonly string[]).includes(name)) {
    const key = name as IllustratedIcon;
    const prims = ILLUSTRATED[key];
    if (!prims) throw new Error(`Unknown illustrated icon: ${name}`);
    return (
      <Svg
        width={px}
        height={px}
        viewBox="0 0 48 48"
        testID={testID ?? `icon-${key}`}
        accessibilityLabel={title}
        accessibilityRole={title ? 'image' : 'none'}
        accessible={Boolean(title)}
      >
        {prims.map((prim, i) => (
          <PrimNode key={i} prim={prim} />
        ))}
      </Svg>
    );
  }

  const Glyph = LINE[name as LineIconName];
  if (!Glyph) {
    throw new Error(
      `Unknown icon: ${String(name)}. Use an illustrated icon (${ILLUSTRATED_ICONS.join(', ')}) ` +
        `or a line icon (${LINE_ICON_NAMES.join(', ')}).`,
    );
  }

  return (
    <Glyph
      size={px}
      weight="regular"
      color={toneColour(tone, theme)}
      testID={testID ?? `icon-${name}`}
      accessibilityLabel={title}
      accessibilityRole={title ? 'image' : 'none'}
      accessible={Boolean(title)}
    />
  );
}

/* ------------------------------------------------------------- illustrations */

/**
 * `<Illustration>` — the SCENE set for 12.A6, the same geometry as the web
 * component so an empty state on Android and the same empty state on the website
 * are one drawing. On a 64 grid (the icons are 48), so `size` is the whole box.
 */
export interface IllustrationProps {
  name: IllustrationName;
  size?: IconSize | number;
  /** Accessible name, when the scene stands alone. */
  title?: string;
  testID?: string;
}

export function Illustration({ name, size = 'xl', title, testID }: IllustrationProps) {
  const px = typeof size === 'number' ? size : (SIZES[size] ?? SIZES.xl);
  const prims = ILLUSTRATIONS[name];
  if (!prims) {
    throw new Error(
      `Unknown illustration: ${name}. Use one of ${ILLUSTRATION_NAMES.join(', ')}.`,
    );
  }
  const meta = ILLUSTRATION_META[name];

  return (
    <Svg
      width={px}
      height={px}
      viewBox={`0 0 ${ILLUSTRATION_GRID} ${ILLUSTRATION_GRID}`}
      testID={testID ?? `illustration-${name}`}
      accessibilityLabel={title}
      accessibilityRole={title ? 'image' : 'none'}
      accessible={Boolean(title)}
    >
      {prims.map((prim, i) => (
        <PrimNode key={i} prim={prim} />
      ))}
    </Svg>
  );
}

export { ILLUSTRATED_ICONS, ICON_TINT, ILLUSTRATIONS, ILLUSTRATION_META, ILLUSTRATION_NAMES };
export type { IllustratedIcon, IllustrationName };
export default Icon;
