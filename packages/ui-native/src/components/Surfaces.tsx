import * as React from 'react';
import {
  I18nManager,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type {
  AvatarProps,
  BadgeProps,
  BottomTabBarProps,
  CardProps,
  ChipProps,
  ListItemProps,
  MapPinCardProps,
  NavBarProps,
  PriceTagProps,
  RatingProps,
  SectionHeaderProps,
  ServiceTileProps,
  SidebarProps,
  TabItem,
  TabsProps,
  Tone,
} from '../../../ui/components/contract';
import { Icon, IllustratedIconView } from '../Icon';
import { FIcon } from './FIcon';
import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX, SERVICE_ICONS } from '../../../ui/icons/fill';
import { TabBar as ShellTabBar } from '../shells/TabBar';
import { tokens } from '../../../design-tokens/dist/ts/tokens';
import { withAlpha } from '../shells/shellTokens';

/**
 * The layout and navigation surfaces — 12.A7, React Native.
 *
 * Same props and the same semantics as the web file. The interesting difference
 * is navigation: a web `<nav>` is a landmark a screen reader can jump to, while a
 * native tab bar is reached with `accessibilityRole="tablist"` on a container
 * that also declares where the tabs are, because on a phone there is no "jump to
 * navigation" gesture to fall back on.
 */

type TonePair = { fg: string; bg: string };

const TONE_STYLE: Record<Tone, TonePair> = {
  neutral: { fg: '#5B6673', bg: '#F4F6F8' },
  primary: { fg: '#0B1B2B', bg: '#F4F6F8' },
  success: { fg: '#1B7A4B', bg: '#E7F5EC' },
  warning: { fg: '#8A5A00', bg: '#FDF3E0' },
  danger: { fg: '#B3202C', bg: '#FDECEE' },
  info: { fg: '#1F5FBF', bg: '#E8F0FD' },
};

const DARK_TONE_STYLE: Record<Tone, TonePair> = {
  neutral: { fg: '#C2CBD6', bg: '#12263A' },
  primary: { fg: '#F5F5F7', bg: '#12263A' },
  success: { fg: '#6FE0B8', bg: '#12301F' },
  warning: { fg: '#FFD166', bg: '#2E2410' },
  danger: { fg: '#FF9AA2', bg: '#33161A' },
  info: { fg: '#9DB0FF', bg: '#16233F' },
};

/** A function, not a const: the components below call it at render time
 *  and a `const` arrow declared after them would be in the temporal dead zone. */
function tones(dark: boolean): Record<Tone, TonePair> {
  return dark ? DARK_TONE_STYLE : TONE_STYLE;
}

/* ------------------------------------------------------------------- chips */

export interface NativeChipProps extends ChipProps {
  onPress?: () => void;
  theme?: 'light' | 'dark';
}

/**
 * The filter chip of canvas/Search: 38 tall (44 with hitSlop), radius 19, 14pt;
 * a surface pill with a subtle border, or ink with a bold label when selected.
 * Same geometry as the web renderer.
 */
export function Chip({ label, count, startIcon, selected = false, loading = false, disabled = false, testID, onPress, theme = 'light' }: NativeChipProps) {
  const c = tokens(theme).color;
  const inert = disabled || loading;
  const fg = selected ? c.action.selected.fg : c.text.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: inert }}
      accessibilityLabel={count !== undefined ? `${label} ${count}` : label}
      disabled={inert}
      onPress={inert ? undefined : onPress}
      hitSlop={{ top: 3, bottom: 3 }}
      testID={testID}
      style={{
        height: 38,
        paddingHorizontal: 14,
        borderRadius: 19,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: selected ? c.action.selected.bg : c.bg.surface,
        borderWidth: selected ? 0 : 1,
        borderColor: c.border.subtle,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {startIcon ? <Icon name={startIcon} size={16} theme={theme} color={fg} /> : null}
      <Text style={{ fontSize: 14, fontFamily: selected ? 'ReadexPro-700' : 'ReadexPro-500', color: fg }}>{label}</Text>
      {count !== undefined ? <Text style={{ fontSize: 12, fontFamily: 'ReadexPro-400', color: fg, opacity: 0.7 }}>{count}</Text> : null}
    </Pressable>
  );
}

export function Badge({ content, tone = 'danger', max = 99, testID, theme = 'light' }: BadgeProps & { theme?: 'light' | 'dark' }) {
  const n = typeof content === 'number' ? content : Number.parseInt(content, 10);
  const shown = Number.isFinite(n) && n > max ? `${max}+` : String(content);

  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        minWidth: 20,
        height: 20,
        paddingHorizontal: 5,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tones(theme === 'dark')[tone].fg,
      }}
    >
      <Text style={{ fontSize: 11, fontFamily: 'ReadexPro-700', color: '#FFFFFF' }}>{shown}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------- cards */

/**
 * The board card (canvas/OrderTracking, Cart, CareHub): surface, radius 24, a
 * hairline ring, the soft card shadow; `tint` is the hero card's wash from the
 * surface into the tone's soft colour (radius 28). Same as the web renderer.
 */
export function Card({
  title,
  subtitle,
  elevation = 'card',
  padding = 'md',
  footer,
  tint,
  children,
  testID,
  theme = 'light',
}: CardProps & { theme?: 'light' | 'dark' }) {
  const t = tokens(theme);
  const c = t.color;
  const pad = { none: 0, sm: 14, md: 16, lg: 18 }[padding];
  const gid = `nabd-card-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <View
      testID={testID}
      style={{
        backgroundColor: tint ? 'transparent' : c.bg.surface,
        borderRadius: tint ? 28 : 24,
        borderWidth: 1,
        borderColor: tint ? withAlpha(c.service[tint].fg, 0.1) : c.border.hairline,
        boxShadow: elevation === 'raised' ? t.shadow.raised : elevation === 'card' && !tint ? t.shadow.card : undefined,
        overflow: tint ? 'hidden' : 'visible',
        padding: pad,
        gap: 12,
      }}
    >
      {tint ? (
        <Svg style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0 }} width="100%" height="100%">
          <Defs>
            {/* 160° on the board: mostly top to bottom, a little across */}
            <LinearGradient id={gid} x1="0.33" y1="0" x2="0.67" y2="1">
              <Stop offset="0" stopColor={c.bg.surface} />
              <Stop offset="1" stopColor={c.service[tint].bg} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid})`} />
        </Svg>
      ) : null}
      {/* above the wash: a positioned sibling paints over static content on web */}
      <View style={{ gap: 12, zIndex: 1 }}>
      {title || subtitle ? (
        <View style={{ gap: 2 }}>
          {title ? <Text accessibilityRole="header" style={{ fontSize: 15, fontFamily: 'ReadexPro-700', color: c.text.primary }}>{title}</Text> : null}
          {subtitle ? <Text style={{ fontSize: 12.5, fontFamily: 'ReadexPro-400', color: c.text.secondary }}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
      {footer ? (
        <View style={{ borderTopWidth: 1, borderTopColor: c.border.subtle, paddingTop: 12 }}>
          <Text style={{ fontSize: 13, fontFamily: 'ReadexPro-400', color: c.text.secondary }}>{footer}</Text>
        </View>
      ) : null}
      </View>
    </View>
  );
}

export function ListItem({
  title,
  subtitle,
  meta,
  startIcon,
  endIcon,
  endContent = 'chevron',
  onEndPressLabel,
  selected = false,
  disabled = false,
  loading = false,
  leading,
  onPress,
  testID,
  theme = 'light',
}: ListItemProps & { theme?: 'light' | 'dark'; onPress?: () => void }) {
  const dark = theme === 'dark';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, meta].filter(Boolean).join(', ')}
      accessibilityState={{ selected, disabled: disabled || loading }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        minHeight: 44,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: selected ? (dark ? '#F5F5F7' : '#0B1B2B') : 'transparent',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {leading ? (
        <FIcon icon={leading.icon} tone={leading.tone} size={40} theme={theme} />
      ) : startIcon ? (
        <Icon name={startIcon} size={20} theme={theme} tone="secondary" />
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontFamily: 'ReadexPro-500', color: selected ? (dark ? '#0B1B2B' : '#F5F5F7') : dark ? '#F5F5F7' : '#0B1B2B' }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 12, fontFamily: 'ReadexPro-400', color: selected ? (dark ? '#0B1B2B' : '#C2CBD6') : dark ? '#C2CBD6' : '#5B6673' }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta ? <Text style={{ fontSize: 15, fontFamily: 'ReadexPro-400', color: dark ? '#C2CBD6' : '#5B6673' }}>{meta}</Text> : null}
      {endIcon ? <Icon name={endIcon} size={20} theme={theme} tone="secondary" /> : null}
      {/* the chevron points where the row leads: left when the page reads right to left, right otherwise */}
      {endContent === 'chevron' ? <Icon name={I18nManager.isRTL ? 'caret-left' : 'caret-right'} size={16} theme={theme} tone="secondary" /> : null}
      {endContent === 'check' ? <Icon name="check" size={20} theme={theme} /> : null}
      {endContent === 'switch' ? (
        <View
          accessibilityRole="switch"
          accessibilityState={{ checked: selected }}
          accessibilityLabel={onEndPressLabel ?? title}
          style={{
            width: 44,
            height: 26,
            borderRadius: 13,
            padding: 3,
            backgroundColor: selected ? '#D42A38' : dark ? '#2A3A4D' : '#D5DBE4',
            alignItems: selected ? 'flex-end' : 'flex-start',
          }}
        >
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' }} />
        </View>
      ) : null}
    </Pressable>
  );
}

/** canvas/HomeApp.dc.html: a 108pt surface card, radius 22, the service's <FIcon> over a 13/600 label. */
const TILE_CHIP = { sm: 44, md: 50, lg: 56 } as const;

export function ServiceTile({
  name,
  label,
  size = 'md',
  badge,
  disabled = false,
  onPress,
  testID,
  theme = 'light',
}: ServiceTileProps & { theme?: 'light' | 'dark'; onPress?: () => void }) {
  const t = tokens(theme);
  const { icon, tone } = SERVICE_ICONS[name];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={{
        minHeight: 108,
        paddingHorizontal: 8,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: t.color.border.hairline,
        backgroundColor: t.color.bg.surface,
        boxShadow: t.shadow.card,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <FIcon icon={icon} tone={tone} size={TILE_CHIP[size]} theme={theme} />
      <Text style={{ fontSize: 13, fontFamily: 'ReadexPro-700', color: t.color.text.primary, textAlign: 'center' }}>{label}</Text>
      {badge ? (
        <View style={{ position: 'absolute', top: 8, end: 8 }}>
          <Badge content={badge} theme={theme} />
        </View>
      ) : null}
    </Pressable>
  );
}

/** Section title with an optional trailing action (canvas/HomeApp.dc.html: 18/700, link 13/500). */
export function SectionHeader({ title, actionLabel, testID, theme = 'light', onActionPress }: SectionHeaderProps & { theme?: 'light' | 'dark'; onActionPress?: () => void }) {
  const t = tokens(theme);
  return (
    <View testID={testID} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <Text accessibilityRole="header" style={{ fontSize: 18, fontFamily: 'ReadexPro-700', color: t.color.text.primary, flexShrink: 1 }}>
        {title}
      </Text>
      {actionLabel ? (
        <Pressable accessibilityRole="link" accessibilityLabel={actionLabel} onPress={onActionPress} hitSlop={12}>
          <Text style={{ fontSize: 13, fontFamily: 'ReadexPro-500', color: t.color.text.link }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Avatar({ name, size = 'md', src, status = 'none', testID, theme = 'light' }: AvatarProps & { theme?: 'light' | 'dark' }) {
  const t = tokens(theme);
  const box = size === 'sm' ? 32 : size === 'md' ? 44 : 64;
  const dark = theme === 'dark';
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('');
  // canvas/HomeApp.dc.html: tinted disc, 2pt surface gap, 2pt coral ring
  const ring = {
    width: box,
    height: box,
    borderRadius: box / 2,
    backgroundColor: t.color.avatar.bg,
    borderWidth: 2,
    borderColor: t.color.bg.surface,
    boxShadow: `0 0 0 2px ${t.color.avatar.ring}`,
  };

  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={name}
      style={{ width: box, height: box }}
    >
      {src ? (
        // a real photo; the wrapper carries the name
        <Image
          source={{ uri: src }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={ring}
        />
      ) : (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[ring, { alignItems: 'center', justifyContent: 'center' }]}
        >
          {initials ? (
            <Text style={{ fontSize: Math.round(box * 0.36), fontWeight: '700', color: t.color.text.primary }}>{initials}</Text>
          ) : (
            <Icon name="user" size={Math.round(box * 0.5)} theme={theme} tone="secondary" />
          )}
        </View>
      )}
      {status !== 'none' ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute',
            bottom: 0,
            insetInlineEnd: 0,
            width: 12,
            height: 12,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: dark ? '#12263A' : '#FFFFFF',
            backgroundColor:
              status === 'online' ? '#1B7A4B' : status === 'alert' ? '#B3202C' : '#8A94A0',
          }}
        />
      ) : null}
    </View>
  );
}

export function PriceTag({ amount, currency, was, note, testID, theme = 'light' }: PriceTagProps & { theme?: 'light' | 'dark' }) {
  const dark = theme === 'dark';
  const dim = dark ? '#C2CBD6' : '#5B6673';
  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
      {was ? <Text style={{ fontSize: 15, color: dim, textDecorationLine: 'line-through' }}>{was}</Text> : null}
      <Text style={{ fontSize: 17, fontWeight: '700', color: dark ? '#F5F5F7' : '#0B1B2B' }}>{amount}</Text>
      {currency ? <Text style={{ fontSize: 12, color: dim }}>{currency}</Text> : null}
      {note ? <Text style={{ fontSize: 11, color: dim }}>{note}</Text> : null}
    </View>
  );
}

/** DoctorCard board rating: one filled star, value, (count). Nothing without real ratings. */
export function Rating({ value, count, max = 5, size = 'sm', surface = 'default', formatLabel, testID, theme = 'light' }: RatingProps & { theme?: 'light' | 'dark' }) {
  if (value == null || !(count > 0)) return null;
  const t = tokens(theme);
  const px = size === 'sm' ? 16 : 20;
  const shown = value.toFixed(1);
  const onBrand = surface === 'onBrand';
  const ink = onBrand ? t.color.action.primary.fg : t.color.text.primary;
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={formatLabel ? formatLabel(value, count) : `${shown} out of ${max}, ${count} ratings`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
    >
      <Svg width={px} height={px} viewBox="0 0 256 256">
        <Path d={FILL_ICON_PATHS.star} fill={onBrand ? t.color.icon.ratingStarOnBrand : t.color.icon.ratingStar} />
      </Svg>
      <Text style={{ fontSize: size === 'sm' ? 14 : 16, fontWeight: '700', color: ink }}>{shown}</Text>
      <Text style={{ fontSize: 12, color: ink, opacity: 0.85 }}>{`(${count})`}</Text>
    </View>
  );
}

export function MapPinCard({
  title,
  address,
  distance,
  actionLabel,
  startIcon = 'pin',
  loading = false,
  disabled = false,
  testID,
  theme = 'light',
}: MapPinCardProps & { theme?: 'light' | 'dark' }) {
  const dark = theme === 'dark';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, address, distance].filter(Boolean).join(', ')}
      disabled={disabled}
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        borderRadius: 16,
        backgroundColor: dark ? '#12263A' : '#FFFFFF',
        elevation: 2,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon name={startIcon} size={24} theme={theme} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: dark ? '#F5F5F7' : '#0B1B2B' }}>{title}</Text>
        {address ? <Text style={{ fontSize: 11, color: dark ? '#C2CBD6' : '#5B6673' }}>{address}</Text> : null}
      </View>
      {distance ? <Text style={{ fontSize: 12, color: dark ? '#C2CBD6' : '#5B6673' }}>{distance}</Text> : null}
      {actionLabel ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="caret-left" size={18} theme={theme} tone="secondary" />
        </View>
      ) : null}
    </Pressable>
  );
}

/* -------------------------------------------------------------- navigation */

function TabButton({
  item,
  active,
  onSelect,
  layout,
  dark,
}: {
  item: TabItem;
  active: boolean;
  onSelect?: (id: string) => void;
  layout: 'line' | 'segmented' | 'bar';
  dark: boolean;
}) {
  const ink = active ? (dark ? '#0B1B2B' : '#FFFFFF') : dark ? '#C2CBD6' : '#5B6673';
  const bg =
    layout === 'segmented'
      ? active
        ? dark ? '#F5F5F7' : '#FFFFFF'
        : 'transparent'
      : layout === 'bar'
        ? active
          ? '#D42A38'
          : 'transparent'
        : 'transparent';

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled: item.disabled }}
      accessibilityLabel={item.badge !== undefined ? `${item.label}, ${item.badge}` : item.label}
      disabled={item.disabled}
      onPress={() => onSelect?.(item.id)}
      style={{
        minHeight: 48,
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        backgroundColor: bg,
        borderRadius: 12,
        opacity: item.disabled ? 0.5 : 1,
        // A 3px underline is the canvas's active affordance for a line tab.
        borderBottomWidth: layout === 'line' && active ? 3 : 0,
        borderBottomColor: '#D42A38',
      }}
    >
      <View>
        <Icon name={item.icon} size={22} theme={dark ? 'dark' : 'light'} tone="secondary" />
        {item.badge !== undefined ? (
          <View style={{ position: 'absolute', top: -6, insetInlineEnd: -10 }}>
            <Badge content={item.badge} theme={dark ? 'dark' : 'light'} />
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: active ? '700' : '500', color: ink }}>
        {item.label}
      </Text>
    </Pressable>
  );
}

export function Tabs({ items, value, onChange, variant = 'line', fullWidth = false, testID, theme = 'light' }: TabsProps & { theme?: 'light' | 'dark' }) {
  const dark = theme === 'dark';
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      testID={testID}
      contentContainerStyle={{
        gap: variant === 'segmented' ? 4 : 0,
        padding: variant === 'segmented' ? 4 : 0,
        borderRadius: variant === 'segmented' ? 9999 : 0,
        backgroundColor: variant === 'segmented' ? (dark ? '#12263A' : '#F4F6F8') : 'transparent',
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
      }}
    >
      {items.map((item) => (
        <TabButton key={item.id} item={item} active={item.id === value} onSelect={onChange} layout={variant} dark={dark} />
      ))}
    </ScrollView>
  );
}

export function NavBar({ title, showBack = false, backLabel = 'Back', actions = [], testID, theme = 'light' }: NavBarProps & { theme?: 'light' | 'dark' }) {
  const dark = theme === 'dark';
  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        minHeight: 56,
        paddingHorizontal: 8,
        backgroundColor: dark ? '#12263A' : '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: dark ? '#6E8BFF' : '#D5DBE4',
      }}
    >
      {showBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel={backLabel} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          {/* The chevron points the way the reader travels, which in RTL is the
              opposite of the LTR glyph. */}
          <Icon name="caret-right" size={20} theme={dark ? 'dark' : 'light'} />
        </Pressable>
      ) : null}
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 17, fontWeight: '700', color: dark ? '#F5F5F7' : '#0B1B2B' }}>
        {title}
      </Text>
      {actions.map((a) => (
        <Pressable
          key={a.name}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          accessibilityState={{ disabled: a.disabled }}
          disabled={a.disabled}
          style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name={a.name} size={20} theme={dark ? 'dark' : 'light'} />
        </Pressable>
      ))}
    </View>
  );
}

/**
 * The main tab bar: the DEVICE_STANDARD shell TabBar (packages/ui-native/src/shells),
 * which is canvas/HomeApp's nav 1:1 (floating glass pill, ink active pill with its
 * label, raised coral centre), fed the handoff fill glyphs. Render it inside a
 * SafeAreaProvider; it floats above the bottom inset.
 */
export function BottomTabBar({ items, value, onChange, label = 'Main navigation', testID, theme = 'light' }: BottomTabBarProps & { theme?: 'light' | 'dark' }) {
  return (
    <ShellTabBar
      testID={testID}
      label={label}
      theme={theme}
      value={value}
      onChange={(key) => onChange?.(key)}
      items={items.map((item) => ({
        key: item.id,
        label: item.label,
        raised: item.raised,
        icon: (color: string, size: number) => (
          <Svg width={size} height={size} viewBox={FILL_ICON_VIEWBOX}>
            <Path d={FILL_ICON_PATHS[item.icon]} fill={color} />
          </Svg>
        ),
      }))}
    />
  );
}

export function Sidebar({ title, items, value, onChange, testID, theme = 'light' }: SidebarProps & { theme?: 'light' | 'dark' }) {
  const dark = theme === 'dark';
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={title}
      testID={testID}
      style={{
        gap: 4,
        alignSelf: 'flex-start',
        padding: 8,
        backgroundColor: dark ? '#12263A' : '#FFFFFF',
        borderEndWidth: 1,
        borderEndColor: dark ? '#6E8BFF' : '#D5DBE4',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: dark ? '#8A97A6' : '#8A94A0' }}>{title}</Text>
      {items.map((item) => {
        const active = item.id === value;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active, disabled: item.disabled }}
            accessibilityLabel={item.label}
            disabled={item.disabled}
            onPress={() => onChange?.(item.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              minHeight: 44,
              paddingHorizontal: 8,
              borderRadius: 12,
              backgroundColor: active ? (dark ? '#F5F5F7' : '#0B1B2B') : 'transparent',
              opacity: item.disabled ? 0.5 : 1,
            }}
          >
            <Icon name={item.icon} size={20} theme={dark ? 'dark' : 'light'} tone="secondary" />
            <Text style={{ fontSize: 15, fontWeight: active ? '700' : '500', color: active ? (dark ? '#0B1B2B' : '#F5F5F7') : dark ? '#C2CBD6' : '#5B6673' }}>
              {item.label}
            </Text>
            {item.badge !== undefined ? <Badge content={item.badge} tone="neutral" theme={dark ? 'dark' : 'light'} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
