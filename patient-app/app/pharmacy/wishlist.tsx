import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { AppHeader, Card, EmptyState, ErrorState, Icon, OfflineState, Screen, StatusChip } from '../../../packages/ui-native/src';
import ProductImage from '../../src/components/ProductImage';
import { Glyph, PHARMACY_TONE, Pill, useAddMedToCart } from '../../src/components/pharmacy/PharmacyKit';
import { COLUMN, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import { medGallery, medName, medPrice, needsRx, type Med } from '../../src/utils/pharmacyCatalog';

/**
 * Wishlist — the PharmacyHub template (canvas/PharmacyHub.dc.html: the media tile, name, price, the Rx note and the
 * ink add button) as a list of rows. The rows are what GET /users/me/wishlist returns; removing a row toggles it with
 * POST /users/me/wishlist/:id and puts it back if the server refuses.
 */

function Row({ item, onRemove, onAdd, onOpen }: { item: Med; onRemove: (m: Med) => void; onAdd: (m: Med) => void; onOpen: (m: Med) => void }) {
  const { theme, t, c, flow, k, money } = useScreenUi();
  const price = medPrice(item);
  const unavailable = item.available === false;
  return (
    <Card padding="sm" theme={theme}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable accessibilityRole="link" accessibilityLabel={medName(item)} onPress={() => onOpen(item)} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 72, height: 72, borderRadius: 16, backgroundColor: c.bg.media, overflow: 'hidden' }}>
            <ProductImage uri={medGallery(item)[0]} style={{ width: '100%', height: '100%' }} iconSize={34} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text numberOfLines={2} style={{ ...scale(t, 'small', 'medium'), lineHeight: 19, color: c.text.primary, ...flow }}>{medName(item)}</Text>
            {price ? (
              <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, ...flow }}>
                {money(price)} <Text style={{ ...scale(t, 'tag', 'regular') }}>{k('pharmacy.currency')}</Text>
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <StatusChip label={unavailable ? k('pharmacy.wishlist.unavailable') : k('pharmacy.wishlist.available')} tone={unavailable ? 'peach' : 'mint'} theme={theme} />
              {needsRx(item) ? <Pill label={k('pharmacy.needsRx')} tone="warning" /> : null}
            </View>
          </View>
        </Pressable>
        <View style={{ gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={k('pharmacy.product.favRemove')}
            onPress={() => onRemove(item)}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 14, backgroundColor: c.status.danger.bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}
          >
            <Glyph name="heart" size={20} color={c.icon.favorite} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={k('pharmacy.addToCart')}
            accessibilityState={{ disabled: unavailable }}
            disabled={unavailable}
            onPress={() => onAdd(item)}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 14, backgroundColor: c.action.selected.bg, alignItems: 'center', justifyContent: 'center', opacity: unavailable ? 0.4 : pressed ? 0.8 : 1 })}
          >
            <Icon name="plus" size={18} color={c.action.selected.fg} />
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

export default function WishlistScreen() {
  const { theme, c, dir, k } = useScreenUi();
  const addToCart = useAddMedToCart();
  const [items, setItems] = useState<Med[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setFailed(null);
    try {
      const data = await apiFetch<Med[] | { data?: Med[] }>('/users/me/wishlist');
      const rows = Array.isArray(data) ? data : data?.data;
      setItems(Array.isArray(rows) ? rows : []);
    } catch (e) {
      logError('pharmacy:wishlist', e);
      setFailed((await isOffline()) ? 'offline' : 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (m: Med) => {
    const before = items;
    setItems((p) => p.filter((i) => i.id !== m.id));
    try {
      await apiFetch(`/users/me/wishlist/${m.id}`, { method: 'POST' });
    } catch {
      setItems(before); // put it back when the server refused
    }
  };

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/pharmacy' as Href);
  };

  let empty: React.ReactNode;
  if (loading) {
    empty = (
      <View accessibilityLabel={k('pharmacy.loading')} accessibilityState={{ busy: true }} style={{ gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ height: 100, borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }} />
        ))}
      </View>
    );
  } else if (failed === 'offline') {
    empty = <OfflineState title={k('pharmacy.offline.title')} body={k('pharmacy.offline.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load()} theme={theme} />;
  } else if (failed === 'error') {
    empty = <ErrorState title={k('pharmacy.wishlist.loadError')} body={k('pharmacy.error.body')} retryLabel={k('pharmacy.retry')} onRetry={() => void load()} theme={theme} />;
  } else {
    empty = <EmptyState icon="heart" tone={PHARMACY_TONE} title={k('pharmacy.wishlist.empty')} body={k('pharmacy.wishlist.emptyBody')} actionLabel={k('pharmacy.wishlist.shop')} onAction={() => router.replace('/(tabs)/pharmacy' as Href)} theme={theme} />;
  }

  return (
    <Screen theme={theme} direction={dir} header={<View style={COLUMN}><AppHeader title={k('pharmacy.favorites')} onBack={back} backLabel={k('pharmacy.back')} theme={theme} direction={dir} /></View>} testID="wishlist-screen">
      <FlatList
        style={{ flex: 1 }}
        data={loading || failed ? [] : items}
        keyExtractor={(i) => String(i.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} tintColor={c.text.primary} />}
        ListEmptyComponent={<View style={{ flex: 1, justifyContent: 'center' }}>{empty}</View>}
        contentContainerStyle={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 12, flexGrow: 1 }}
        renderItem={({ item }) => (
          <Row
            item={item}
            onRemove={remove}
            onAdd={addToCart}
            onOpen={(m) => router.push({ pathname: '/pharmacy/product-detail', params: { id: m.id, name: medName(m) } })}
          />
        )}
      />
    </Screen>
  );
}
