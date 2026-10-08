import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { FIcon, type FillIconName, type ServiceTone } from '../../../../packages/ui-native/src';
import { CARE_TONE } from '../consult/ConsultKit';
import { Tag, Price } from '../diagnostics/DiagKit';
import { Glyph } from '../pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';

/**
 * What the nursing (home care) screens share (Batch 4, slice 4-app): the status words of a visit or a request, the service
 * card of the hub grid and the nurse card of the choice list. Tones are the service map's, the text is a translation key or
 * what the server sent; a screen holds no colour, no font size and no sentence of its own.
 */

export type NursingTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** The server's state of a nursing visit or an insurance request as its label key and status tone (unknown = neutral "other", never the raw code). */
export function nursingStatus(raw: unknown): { key: string; tone: NursingTone } {
  switch (String(raw ?? '').toUpperCase()) {
    case 'NEW_REQUEST':
      return { key: 'nur.status.new', tone: 'warning' };
    case 'PENDING_INSURANCE':
      return { key: 'nur.status.pendingInsurance', tone: 'warning' };
    case 'WAITING_COPAY':
      return { key: 'nur.status.waitingCopay', tone: 'warning' };
    case 'APPROVED_FULL':
      return { key: 'nur.status.approvedFull', tone: 'success' };
    case 'APPROVED_PARTIAL':
      return { key: 'nur.status.approvedPartial', tone: 'info' };
    case 'REJECTED':
      return { key: 'nur.status.rejected', tone: 'danger' };
    case 'CONFIRMED':
      return { key: 'nur.status.confirmed', tone: 'info' };
    case 'IN_PROGRESS':
      return { key: 'nur.status.inProgress', tone: 'info' };
    case 'COMPLETED':
      return { key: 'nur.status.completed', tone: 'success' };
    case 'CANCELLED':
      return { key: 'nur.status.cancelled', tone: 'danger' };
    default:
      return { key: 'nur.status.other', tone: 'neutral' };
  }
}

/** The glyph of a nursing service from its catalogue id; every one is in the nursing tone of the service map. */
const SERVICE_GLYPH: Record<string, FillIconName> = { 'svc-iv': 'drop', 'svc-wound': 'first-aid', blood_test: 'test-tube', catheter: 'syringe' };
export function serviceGlyph(id: unknown): { icon: FillIconName; tone: ServiceTone } {
  return { icon: SERVICE_GLYPH[String(id ?? '')] ?? 'first-aid-kit', tone: CARE_TONE };
}

export interface ServiceCardProps {
  title: string;
  desc?: string;
  image?: string | null;
  icon: FillIconName;
  price: number | null;
  /** Open the service (the card). */
  onPress: () => void;
  actionLabel: string;
  /** The quick action under the price (book now). */
  onAction: () => void;
  testID?: string;
}

/** The hub's service card (board ServiceHub): a nursing-tone wash, the image or glyph, name, line, price and the ink book button. Two to a row. */
export function ServiceCard({ title, desc, image, icon, price, onPress, actionLabel, onAction, testID }: ServiceCardProps) {
  const { theme, t, c, flow } = useScreenUi();
  const look = c.service[CARE_TONE];
  return (
    <View testID={testID} style={{ flexBasis: '47%', flexGrow: 1, minWidth: 148, borderRadius: 24, backgroundColor: look.bg, padding: 14, gap: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={[title, desc].filter(Boolean).join(', ')} onPress={onPress} style={({ pressed }) => ({ gap: 8, minHeight: 44, opacity: pressed ? 0.9 : 1 })}>
        {image ? <Image accessibilityIgnoresInvertColors source={{ uri: image }} style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: c.bg.surface }} resizeMode="cover" /> : <FIcon icon={icon} tone={CARE_TONE} size={56} theme={theme} />}
        <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{title}</Text>
        {desc ? (
          <Text numberOfLines={2} style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{desc}</Text>
        ) : null}
        {price !== null ? <Price amount={price} size="bodyStrong" /> : null}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`${actionLabel}, ${title}`} onPress={onAction} style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, backgroundColor: c.action.selected.bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
        <Text style={{ ...scale(t, 'small', 'bold'), color: c.action.selected.fg, textAlign: 'center' }}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

export interface NurseCardProps {
  name: string;
  facility?: string;
  rating?: number | null;
  /** "3 km away", already formatted; omitted when the server sent no distance. */
  distance?: string;
  /** Free now (true), busy (false), or unknown (null = no tag). */
  availableLabel?: { label: string; tone: ServiceTone | 'neutral' } | null;
  price: number | null;
  /** What replaces the price when the server sent none ("set when booking"). */
  priceFallback: string;
  actionLabel: string;
  onPress: () => void;
  testID?: string;
}

/** A nurse of the choice list (board ServiceHub card): glyph, name, facility, rating and distance, availability, price and the select action. */
export function NurseCard({ name, facility, rating, distance, availableLabel, price, priceFallback, actionLabel, onPress, testID }: NurseCardProps) {
  const { theme, t, c, flow, num } = useScreenUi();
  const stars = typeof rating === 'number' && rating > 0 ? num(rating, { maximumFractionDigits: 1 }) : '';
  return (
    <View testID={testID} style={{ borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, padding: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <FIcon icon="user-circle" tone={CARE_TONE} size={52} theme={theme} />
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{name}</Text>
          {facility ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Glyph name="hospital" size={14} color={c.icon.secondary} />
              <Text style={{ flex: 1, minWidth: 0, ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{facility}</Text>
            </View>
          ) : null}
          {stars || distance ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              {stars ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Glyph name="star" size={14} color={c.icon.ratingStar} />
                  <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary }}>{stars}</Text>
                </View>
              ) : null}
              {distance ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{distance}</Text> : null}
            </View>
          ) : null}
        </View>
      </View>
      {availableLabel ? <Tag label={availableLabel.label} tone={availableLabel.tone} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>{price !== null ? <Price amount={price} size="h4" /> : <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.secondary, ...flow }}>{priceFallback}</Text>}</View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${actionLabel}, ${name}`} onPress={onPress} style={({ pressed }) => ({ minHeight: 44, minWidth: 96, paddingHorizontal: 18, paddingVertical: 6, borderRadius: 15, backgroundColor: c.action.primary.bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
          <Text style={{ ...scale(t, 'small', 'bold'), color: c.action.primary.fg, textAlign: 'center' }}>{actionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}
