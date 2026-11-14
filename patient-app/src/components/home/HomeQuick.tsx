import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useSelector } from 'react-redux';

import { FIcon } from '../../../../packages/ui-native/src';
import { SERVICE_ICONS, type FillIconName, type ServiceTone } from '../../../../packages/ui/icons/fill';
import { dateLocaleFor } from '../../utils/dates';
import { apiFetch } from '../../utils/api';
import { PHARMACY_TONE, SECONDARY_TONE } from '../pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';

/**
 * Home, under the service grid: the quick tiles (Reminders, My orders from the pharmacy, and the Map from the top bar), in the tile style of
 * the pharmacy categories, and the "Order again" row (owner layout decisions 6 and e).
 */

const go = (href: string) => router.push(href as Href);

const TILES: { key: string; label: string; icon: FillIconName; tone: ServiceTone; route: string }[] = [
  { key: 'reminders', label: 'pharmacy.hub.reminders', icon: 'bell', tone: SERVICE_ICONS.mind.tone, route: '/health/medications?tab=reminders' },
  { key: 'orders', label: 'pharmacy.hub.orders', icon: 'receipt', tone: PHARMACY_TONE, route: '/orders' },
  // the map left the Home top bar (owner 2026-10-26): it sits here, next to the other quick tiles
  { key: 'map', label: 'services.cat.map', icon: SERVICE_ICONS.map.icon, tone: SERVICE_ICONS.map.tone, route: '/map' },
];

/** Reminders and My orders. `hidden` lists the routes of switched-off modules. */
export function HomeQuickTiles({ isHidden }: { isHidden: (route: string | null | undefined) => boolean }) {
  const { theme, t, c, k } = useScreenUi();
  const shown = TILES.filter((q) => !isHidden(q.route.split('?')[0]));
  if (!shown.length) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {shown.map((q) => (
        <Pressable
          key={q.key}
          accessibilityRole="link"
          accessibilityLabel={k(q.label)}
          testID={`home-quick-${q.key}`}
          onPress={() => go(q.route)}
          style={({ pressed }) => ({ flex: 1, minHeight: 96, borderRadius: 20, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 6, opacity: pressed ? 0.8 : 1 })}
        >
          <FIcon icon={q.icon} tone={q.tone} size={42} theme={theme} />
          <Text style={{ ...scale(t, 'micro', 'bold'), color: c.text.primary, textAlign: 'center' }}>{k(q.label)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

type PharmacyOrder = { id: string; createdAt?: string; governed_state?: string; items?: unknown[] };

/**
 * "Order again": the patient's latest real pharmacy order (GET /patient/pharmacy/orders). Nothing is drawn for a guest, when
 * the call fails, or when there is no past order with items.
 */
export function OrderAgainRow() {
  const { theme, t, c, k, num, lang, flow } = useScreenUi();
  const isMember = useSelector((s: { auth?: { isAuthenticated?: boolean; isGuest?: boolean } }) => Boolean(s.auth?.isAuthenticated && !s.auth?.isGuest));
  const [last, setLast] = useState<{ id: string; count: number; at: string } | null>(null);
  useEffect(() => {
    if (!isMember) {
      setLast(null);
      return;
    }
    let stale = false;
    apiFetch<PharmacyOrder[] | { data?: PharmacyOrder[] }>('/patient/pharmacy/orders')
      .then((res) => {
        if (stale) return;
        const list = Array.isArray(res) ? res : res?.data || [];
        const latest = list
          .filter((o) => o.governed_state !== 'CART_DRAFT' && Array.isArray(o.items) && o.items.length > 0)
          .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))[0];
        setLast(latest ? { id: latest.id, count: latest.items?.length ?? 0, at: latest.createdAt ?? '' } : null);
      })
      .catch(() => {
        if (!stale) setLast(null);
      });
    return () => {
      stale = true;
    };
  }, [isMember]);
  if (!last) return null;
  const when = last.at ? new Date(last.at).toLocaleDateString(dateLocaleFor(lang), { year: 'numeric', month: 'short', day: 'numeric' }) : '';
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={k('pharmacy.hub.reorder')}
      testID="home-order-again"
      onPress={() => router.push({ pathname: '/pharmacy/reorder', params: { orderId: last.id } })}
      style={{ borderRadius: 22, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      <FIcon icon="clock-counter-clockwise" tone={SECONDARY_TONE} size={44} theme={theme} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ ...scale(t, 'bodyStrong'), lineHeight: 21, color: c.text.primary, ...flow }}>{k('pharmacy.hub.reorder')}</Text>
        <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>
          {[last.count === 1 ? k('pharmacy.hub.oneItem') : k('pharmacy.hub.items', { n: num(last.count) }), when].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <View style={{ minHeight: 36, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.action.primary.bg, justifyContent: 'center' }}>
        <Text style={{ ...scale(t, 'small', 'bold'), color: c.action.primary.fg }}>{k('pharmacy.hub.order')}</Text>
      </View>
    </Pressable>
  );
}
