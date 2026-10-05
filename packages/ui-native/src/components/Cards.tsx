import * as React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { ConsultMode, DoctorCardProps, OfferCardProps, ProductCardProps, ProgressRingProps, TimelineProps } from '../../../ui/components/contract';
import { tokens, type ThemeName } from '../../../design-tokens/dist/ts/tokens';
import { FILL_ICON_PATHS, FILL_ICON_VIEWBOX, type FillIconName } from '../../../ui/icons/fill';
import { CLOCK_PATH, MARK_VIEWBOX_24, PLUS_SQUARE_PATH, SEAL_CHECK_PATH, SEAL_PATH } from '../../../ui/icons/marks';
import { withAlpha } from '../shells/shellTokens';
import { FIcon } from './FIcon';
import { Rating } from './Surfaces';

/**
 * DoctorCard, ProductCard, OfferCard, Timeline and ProgressRing — handoff §3,
 * React Native. Same props and geometry as packages/ui/components/Cards.tsx;
 * colours and shadows from tokens(theme). Optional data is hidden when absent.
 */

type Themed = { theme?: ThemeName };

function Glyph({ name, size, color }: { name: FillIconName; size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox={FILL_ICON_VIEWBOX}>
      <Path d={FILL_ICON_PATHS[name]} fill={color} />
    </Svg>
  );
}

/** A vertical gradient behind a box, as an SVG so it renders on every platform. */
function GradientFill({ from, to, id, radius = 0 }: { from: string; to: string; id: string; radius?: number }) {
  return (
    <Svg style={{ position: 'absolute', top: 0, start: 0, end: 0, bottom: 0 }} width="100%" height="100%">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" rx={radius} ry={radius} fill={`url(#${id})`} />
    </Svg>
  );
}

const useGradientId = (prefix: string) => `${prefix}-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

/* ------------------------------------------------------------ DoctorCard */

const MODE: Record<ConsultMode, { icon: FillIconName; tone: 'blue' | 'mint' | 'violet' }> = {
  clinic: { icon: 'hospital', tone: 'blue' },
  home: { icon: 'house', tone: 'mint' },
  online: { icon: 'video-camera', tone: 'violet' },
};

export interface NativeDoctorCardProps extends DoctorCardProps, Themed {
  /** The whole card opens the doctor's page. */
  onPress?: () => void;
  onBook?: () => void;
}

export function DoctorCard({
  name,
  photoSrc,
  tone = 'blue',
  verifiedLabel,
  availableLabel,
  grade,
  specialty,
  place,
  modes = [],
  rating,
  nextSlot,
  price,
  currency,
  bookLabel,
  onPress,
  onBook,
  testID,
  theme = 'light',
}: NativeDoctorCardProps) {
  const t = tokens(theme);
  const c = t.color;
  const gid = useGradientId('nabd-doc');
  return (
    <Pressable
      accessibilityRole={onPress ? 'link' : undefined}
      onPress={onPress}
      testID={testID}
      style={{ borderRadius: 28, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, boxShadow: t.shadow.feature, overflow: 'hidden' }}
    >
      <View style={{ padding: 16, flexDirection: 'row', gap: 14 }}>
        <View
          style={{
            width: 104,
            height: 118,
            // the board's organic shape, as the corner radii React Native supports
            borderTopLeftRadius: 52,
            borderTopRightRadius: 50,
            borderBottomRightRadius: 52,
            borderBottomLeftRadius: 56,
            backgroundColor: c.service[tone].bg,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {photoSrc ? (
            <Image source={{ uri: photoSrc }} accessibilityIgnoresInvertColors style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Glyph name="user" size={44} color={c.service[tone].fg} />
          )}
          {availableLabel ? (
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={availableLabel}
              style={{ position: 'absolute', bottom: 8, end: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: c.presence.online, borderWidth: 3, borderColor: c.bg.surface }}
            />
          ) : null}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 17, fontFamily: 'ReadexPro-700', color: c.text.primary }}>{name}</Text>
            {verifiedLabel ? (
              <View accessible accessibilityRole="image" accessibilityLabel={verifiedLabel}>
                <Svg width={17} height={17} viewBox={MARK_VIEWBOX_24}>
                  <Path d={SEAL_PATH} fill={c.service.blue.fg} />
                  <Path d={SEAL_CHECK_PATH} fill="none" stroke={c.icon.onSolid} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
            ) : null}
          </View>
          {grade ? (
            <View style={{ alignSelf: 'flex-start', height: 24, paddingHorizontal: 10, borderRadius: 12, backgroundColor: c.service.blue.bg, justifyContent: 'center' }}>
              <Text style={{ fontSize: 12, fontFamily: 'ReadexPro-700', color: c.service.blue.fg }}>{grade}</Text>
            </View>
          ) : null}
          {specialty ? <Text style={{ fontSize: 13, fontFamily: 'ReadexPro-400', color: c.text.tertiary }}>{specialty}</Text> : null}
          {place ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Glyph name="map-pin" size={14} color={c.action.primary.bg} />
              <Text style={{ fontSize: 12.5, fontFamily: 'ReadexPro-400', color: c.text.secondary }}>{place}</Text>
            </View>
          ) : null}
          {modes.length ? (
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {modes.map(({ mode, label }) => (
                <View key={mode} style={{ height: 26, paddingHorizontal: 9, borderRadius: 13, backgroundColor: c.service[MODE[mode].tone].bg, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Glyph name={MODE[mode].icon} size={13} color={c.service[MODE[mode].tone].fg} />
                  <Text style={{ fontSize: 11.5, fontFamily: 'ReadexPro-700', color: c.service[MODE[mode].tone].fg }}>{label}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
      <View>
        <GradientFill from={c.action.primary.gradient.from} to={c.action.primary.gradient.to} id={gid} />
        {/* above the gradient: a positioned sibling paints over static content on web */}
        <View style={{ paddingVertical: 12, paddingStart: 12, paddingEnd: 14, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 1 }}>
        {rating ? <Rating value={rating.value} count={rating.count} surface="onBrand" theme={theme} /> : null}
        {nextSlot ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Svg width={15} height={15} viewBox={MARK_VIEWBOX_24}>
              <Path d={CLOCK_PATH} fill="none" stroke={c.action.primary.fg} strokeWidth={2} strokeLinecap="round" />
            </Svg>
            <Text style={{ fontSize: 13, fontFamily: 'ReadexPro-400', color: c.action.primary.fg }}>{nextSlot}</Text>
          </View>
        ) : null}
        {price ? (
          <Text style={{ marginStart: 'auto', fontSize: 16, fontFamily: 'ReadexPro-700', color: c.action.primary.fg }}>
            {price}
            {currency ? <Text style={{ fontSize: 11, fontFamily: 'ReadexPro-400' }}>{` ${currency}`}</Text> : null}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={bookLabel}
          onPress={onBook ?? onPress}
          hitSlop={{ top: 2, bottom: 2 }}
          style={{ marginStart: price ? 0 : 'auto', height: 40, paddingHorizontal: 18, borderRadius: 14, backgroundColor: c.bg.surface, justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 15, fontFamily: 'ReadexPro-700', color: c.action.primary.bg }}>{bookLabel}</Text>
        </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

/* ----------------------------------------------------------- ProductCard */

export interface NativeProductCardProps extends ProductCardProps, Themed {
  onPress?: () => void;
  onAdd?: () => void;
  /**
   * The picture, when the app draws it itself (patient-app: expo-image with a disk cache and a fixed size). It
   * fills the 132 tall media box in place of `imageSrc`; the box, its colour and the discount badge stay the board's.
   */
  image?: React.ReactNode;
}

export function ProductCard({ name, meta, price, currency, imageSrc, image, discountLabel, rxLabel, addLabel, onPress, onAdd, loading = false, disabled = false, testID, theme = 'light' }: NativeProductCardProps) {
  const t = tokens(theme);
  const c = t.color;
  const inert = disabled || loading;
  return (
    <View testID={testID} style={{ borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, boxShadow: t.shadow.card, padding: 10, gap: 8 }}>
      <Pressable accessibilityRole={onPress ? 'link' : undefined} onPress={onPress} style={{ gap: 8 }}>
        <View style={{ height: 132, borderRadius: 18, backgroundColor: c.bg.media, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {image ?? (imageSrc ? (
            <Image source={{ uri: imageSrc }} accessibilityIgnoresInvertColors style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          ) : (
            <Glyph name="pill" size={40} color={c.icon.secondary} />
          ))}
          {discountLabel ? (
            <View style={{ position: 'absolute', top: 8, start: 8, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: c.action.primary.bg, justifyContent: 'center' }}>
              <Text style={{ fontSize: 11, fontFamily: 'ReadexPro-700', color: c.action.primary.fg }}>{discountLabel}</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontSize: 14, lineHeight: 19.6, fontFamily: 'ReadexPro-700', color: c.text.primary }}>{name}</Text>
        {meta ? <Text style={{ fontSize: 12, fontFamily: 'ReadexPro-400', color: c.text.secondary }}>{meta}</Text> : null}
      </Pressable>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {/* the price is drawn only when the API sent one (a made-up 0 is never shown) */}
          {price ? (
            <Text style={{ fontSize: 16, fontFamily: 'ReadexPro-700', color: c.text.primary }}>
              {price}
              {currency ? <Text style={{ fontSize: 11, fontFamily: 'ReadexPro-400' }}>{` ${currency}`}</Text> : null}
            </Text>
          ) : null}
          {rxLabel ? <Text style={{ fontSize: 11, fontFamily: 'ReadexPro-700', color: c.status.warning.fg }}>{rxLabel}</Text> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={addLabel}
          accessibilityState={{ disabled: inert, busy: loading }}
          disabled={inert}
          onPress={inert ? undefined : onAdd}
          hitSlop={2}
          testID={testID ? `${testID}-add` : undefined}
          style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: c.action.selected.bg, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}
        >
          <Svg width={18} height={18} viewBox={FILL_ICON_VIEWBOX}>
            <Path d={PLUS_SQUARE_PATH} fill={c.action.selected.fg} />
          </Svg>
        </Pressable>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------- OfferCard */

export interface NativeOfferCardProps extends OfferCardProps, Themed {
  onPress?: () => void;
}

export function OfferCard({ title, provider, price, currency, was, tag, icon, tone, onPress, testID, theme = 'light' }: NativeOfferCardProps) {
  const t = tokens(theme);
  const c = t.color;
  return (
    <Pressable
      accessibilityRole={onPress ? 'link' : undefined}
      onPress={onPress}
      testID={testID}
      style={{ width: 236, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, boxShadow: t.shadow.card, overflow: 'hidden' }}
    >
      <View style={{ height: 112, backgroundColor: c.service[tone].bg, alignItems: 'center', justifyContent: 'center' }}>
        <FIcon icon={icon} tone={tone} chip="none" size={56} theme={theme} />
        {tag ? (
          <View style={{ position: 'absolute', top: 10, start: 10, height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: c.bg.surface, justifyContent: 'center' }}>
            <Text style={{ fontSize: 11, fontFamily: 'ReadexPro-700', color: c.text.primary }}>{tag}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ paddingVertical: 12, paddingHorizontal: 14, gap: 4 }}>
        <Text style={{ fontSize: 14.5, fontFamily: 'ReadexPro-700', color: c.text.primary }}>{title}</Text>
        {provider ? <Text style={{ fontSize: 12, fontFamily: 'ReadexPro-400', color: c.text.secondary }}>{provider}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
          <Text style={{ fontSize: 17, fontFamily: 'ReadexPro-700', color: c.text.price }}>{price}</Text>
          {currency ? <Text style={{ fontSize: 11, fontFamily: 'ReadexPro-400', color: c.text.secondary }}>{currency}</Text> : null}
          {was ? <Text style={{ fontSize: 12, fontFamily: 'ReadexPro-400', color: c.text.secondary, textDecorationLine: 'line-through' }}>{was}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

/* -------------------------------------------------------------- Timeline */

export function Timeline({ steps, label, testID, theme = 'light' }: TimelineProps & Themed) {
  const c = tokens(theme).color;
  return (
    <View accessibilityRole="list" accessibilityLabel={label} testID={testID} style={{ gap: 14 }}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const done = step.state === 'done';
        const current = step.state === 'current';
        const lineReached = !last && steps[i + 1].state !== 'upcoming';
        const dot = current ? 22 : 16;
        return (
          <View
            key={step.id}
            accessible
            accessibilityLabel={[step.label, step.time].filter(Boolean).join(', ')}
            accessibilityState={{ selected: current }}
            style={{ flexDirection: 'row', gap: 12, minHeight: last ? 30 : 56 }}
          >
            <View style={{ alignItems: 'center', width: 24 }}>
              <View
                style={{
                  width: dot,
                  height: dot,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: done || current ? c.action.primary.bg : c.bg.surface,
                  borderWidth: done || current ? 0 : 2,
                  borderColor: c.border.strong,
                  boxShadow: current ? `0 0 0 6px ${withAlpha(c.action.primary.bg, 0.15)}` : undefined,
                }}
              >
                {done ? <Glyph name="check-circle" size={12} color={c.action.primary.fg} /> : null}
              </View>
              {last ? null : <View style={{ flex: 1, width: 2, marginVertical: 4, backgroundColor: lineReached ? c.action.primary.bg : c.border.subtle }} />}
            </View>
            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 15, fontFamily: current ? 'ReadexPro-700' : 'ReadexPro-500', color: step.state === 'upcoming' ? c.text.secondary : c.text.primary }}>{step.label}</Text>
              {step.time ? <Text style={{ fontSize: 12, fontFamily: 'ReadexPro-400', color: c.text.secondary }}>{step.time}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ---------------------------------------------------------- ProgressRing */

export function ProgressRing({ value, tone, label, size = 104, valueText, caption, testID, theme = 'light' }: ProgressRingProps & Themed) {
  const c = tokens(theme).color;
  const v = Math.min(1, Math.max(0, value));
  const centre = size / 2;
  const stroke = (10 / 104) * size;
  const r = (44 / 104) * size;
  const circumference = 2 * Math.PI * r;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      testID={testID}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={centre} cy={centre} r={r} fill="none" stroke={c.service[tone].bg} strokeWidth={stroke} />
        <Circle
          cx={centre}
          cy={centre}
          r={r}
          fill="none"
          stroke={c.service[tone].solid.to}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - v)}
          rotation={-90}
          origin={`${centre}, ${centre}`}
        />
      </Svg>
      <View style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, alignItems: 'center', justifyContent: 'center' }}>
        {valueText ? <Text style={{ fontSize: (24 / 104) * size, fontFamily: 'ReadexPro-700', color: c.text.primary }}>{valueText}</Text> : null}
        {caption ? <Text style={{ fontSize: 11, fontFamily: 'ReadexPro-400', color: c.text.secondary }}>{caption}</Text> : null}
      </View>
    </View>
  );
}
