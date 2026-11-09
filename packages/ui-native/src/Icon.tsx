import * as React from 'react';
import { ActivityIndicator } from 'react-native';
import Svg, { Circle, Path, Rect, G as SvgG } from 'react-native-svg';
import type { IconProps as PhosphorIconProps } from 'phosphor-react-native';
// One deep import per glyph (the package allows `src/icons/*`): `import *` from the package root put every one of its ~1,500 icons in the bundle (5.7 MB of source) for the 32 used here.
import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { CalendarBlankIcon } from 'phosphor-react-native/src/icons/CalendarBlank';
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { CaretUpIcon } from 'phosphor-react-native/src/icons/CaretUp';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { CreditCardIcon } from 'phosphor-react-native/src/icons/CreditCard';
import { DownloadSimpleIcon } from 'phosphor-react-native/src/icons/DownloadSimple';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { EyeSlashIcon } from 'phosphor-react-native/src/icons/EyeSlash';
import { FunnelIcon } from 'phosphor-react-native/src/icons/Funnel';
import { GearIcon } from 'phosphor-react-native/src/icons/Gear';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { HouseIcon } from 'phosphor-react-native/src/icons/House';
import { ListIcon } from 'phosphor-react-native/src/icons/List';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { MapPinIcon } from 'phosphor-react-native/src/icons/MapPin';
import { MinusIcon } from 'phosphor-react-native/src/icons/Minus';
import { PhoneIcon } from 'phosphor-react-native/src/icons/Phone';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { ShoppingCartIcon } from 'phosphor-react-native/src/icons/ShoppingCart';
import { SignOutIcon } from 'phosphor-react-native/src/icons/SignOut';
import { SlidersHorizontalIcon } from 'phosphor-react-native/src/icons/SlidersHorizontal';
import { StarIcon } from 'phosphor-react-native/src/icons/Star';
import { TrashIcon } from 'phosphor-react-native/src/icons/Trash';
import { UserIcon } from 'phosphor-react-native/src/icons/User';
import { UsersThreeIcon } from 'phosphor-react-native/src/icons/UsersThree';
import { WarningIcon } from 'phosphor-react-native/src/icons/Warning';
import { XIcon } from 'phosphor-react-native/src/icons/X';

import { tokens, type ThemeName } from '../../design-tokens/dist/ts/tokens';
import {
  ILLUSTRATED,
  ILLUSTRATED_ICONS,
  ICON_TINT,
  type IllustratedIcon,
  type Prim,
} from '../../ui/icons/illustrated';
import {
  LINE_ICON_NAMES as SHARED_LINE_NAMES,
  type IconName as SharedIconName,
  type LineIconName as SharedLineIconName,
} from '../../ui/icons/names';
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

/**
 * Keyed by the SHARED name union, exactly as the web map is, so a name added to
 * `packages/ui/icons/names.ts` and mapped on the web is a compile error here
 * until the native glyph exists. `phosphor-react-native` exports each glyph
 * under the suffixed `BellIcon` name with the bare one deprecated, so the
 * suffixed form is what is referenced.
 */
const LINE: Record<SharedLineIconName, React.FC<GlyphProps>> = {
  bell: BellIcon,
  calendar: CalendarBlankIcon,
  search: MagnifyingGlassIcon,
  cart: ShoppingCartIcon,
  user: UserIcon,
  users: UsersThreeIcon,
  home: HouseIcon,
  heart: HeartIcon,
  clock: ClockIcon,
  pin: MapPinIcon,
  phone: PhoneIcon,
  card: CreditCardIcon,
  star: StarIcon,
  check: CheckIcon,
  'check-circle': CheckCircleIcon,
  close: XIcon,
  plus: PlusIcon,
  minus: MinusIcon,
  filter: FunnelIcon,
  sliders: SlidersHorizontalIcon,
  eye: EyeIcon,
  'eye-slash': EyeSlashIcon,
  settings: GearIcon,
  list: ListIcon,
  download: DownloadSimpleIcon,
  trash: TrashIcon,
  warning: WarningIcon,
  signout: SignOutIcon,
  'caret-down': CaretDownIcon,
  'caret-up': CaretUpIcon,
  'caret-left': CaretLeftIcon,
  'caret-right': CaretRightIcon,
};

export const LINE_ICON_NAMES = SHARED_LINE_NAMES;
export type LineIconName = SharedLineIconName;

export type IconName = IllustratedIcon | SharedIconName;

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
  /** An exact colour for a line icon (e.g. the label colour of the button it sits in); wins over `tone`. */
  color?: string;
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
  color,
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
      color={color ?? toneColour(tone, theme)}
      testID={testID ?? `icon-${name}`}
      accessibilityLabel={title}
      accessibilityRole={title ? 'image' : 'none'}
      accessible={Boolean(title)}
    />
  );
}

/* ------------------------------------------------------------------ spinner */

/**
 * Spinner — the native counterpart of the web one. Same job, same a11y
 * contract: `aria-hidden` equivalent, because the element that owns the loading
 * STATE is the one that announces it.
 *
 * React Native ships a spinner, so this wraps `ActivityIndicator` rather than
 * reimplementing an arc with react-native-svg — the native one inherits the
 * platform's reduced-motion handling for free.
 */
export function Spinner({ size = 20, color }: { size?: number; color?: string }) {
  return (
    <ActivityIndicator
      size="small"
      color={color}
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/* ------------------------------------------------------------- illustrations */

/**
 * The illustrated artwork on its own, for a service tile that supplies its own
 * background and badge. The web wrapper has the same export, so a tile is the
 * same component on both platforms rather than "a ServiceTile on the web and
 * something else on the phone".
 */
export function IllustratedIconView({
  name,
  size,
  theme = 'light',
}: {
  name: IllustratedIcon;
  size: number;
  theme?: ThemeName;
}) {
  const prims = ILLUSTRATED[name];
  if (!prims) throw new Error(`Unknown illustrated icon: ${name}`);
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden>
      {prims.map((prim, i) => (
        <PrimNode key={i} prim={prim} />
      ))}
    </Svg>
  );
}


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
