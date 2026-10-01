// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
} from "../../src/components/ui";

import { apiFetch } from '../../src/utils/api';
import { logError } from '../../src/utils/logger';
import { useCart } from '../../src/context/CartContext';
import { pickLocalized } from '../../src/utils/localize';
import { ScreenState } from '../../src/components/ScreenStates';

export default function WishlistScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const { addItem } = useCart();

  const [items, setItems] = useState<any[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  const loadWishlist = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/users/me/wishlist');
      if (data && Array.isArray(data)) setItems(data);
    } catch (err) {
      setError('تعذر تحميل قائمة الأمنيات');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { loadWishlist(); }, []);

  const removeFromWishlist = async (id: string) => {
    const prev = items;
    setItems((p) => p.filter((i) => i.id !== id));
    try {
      await apiFetch(`/users/me/wishlist/${id}`, { method: 'POST' });
    } catch (err) {
      setItems(prev); // revert on failure
    }
  };

  const addToCart = async (item: any) => {
    setAddingId(item.id);
    try {
      await addItem({
        id: item.id,
        name: pickLocalized(item.name_ar, item.name_en) || item.name || 'منتج',
        price: item.price ?? 0,
        rx: !!item.rx || !!item.requires_prescription,
        image: item.image,
      });
    } catch (err) {
      logError('pharmacy:wishlist', err);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: isDark ? colors.surface : colors.white,
          },
        ]}
      >
        <AppText variant="bodySM">قائمة الأمنيات</AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScreenState loading={loading} error={error} empty={!loading && !error && items.length === 0} emptyTitle="لا توجد منتجات في قائمة الأمنيات" onRetry={loadWishlist}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="favorite" size={20} color={colors.primary} />
            <AppText variant="bodySM">قائمة الأمنيات فارغة</AppText>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.shopBtn, { backgroundColor: colors.secondary }]}
            >
              <AppText variant="bodySM">ابدأ التسوق</AppText>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.wishCard,
              { backgroundColor: isDark ? colors.surface : colors.white },
            ]}
          >
            <View style={styles.wishLeft}>
              <TouchableOpacity
                onPress={() => removeFromWishlist(item.id)}
                style={[styles.removeBtn, { backgroundColor: "#FEE2E2" }]}
                accessibilityLabel="إزالة من المفضلة"
              >
                <Icon name="delete" size={16} color="#F0695C" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => addToCart(item)}
                style={[styles.cartBtn, { backgroundColor: item.available === false ? colors.textDisabled : colors.secondary }]}
                disabled={item.available === false || addingId === item.id}
              >
                <Icon name="shopping_cart" size={16} color="var(--nabd-bg.surface-light)" />
              </TouchableOpacity>
            </View>
            <View style={styles.wishInfo}>
              <AppText variant="bodySM">{pickLocalized(item.name_ar, item.name_en) || 'منتج'}</AppText>
              {!!item.requires_prescription && (
                <View style={[styles.discountBadge, { backgroundColor: "#EDE9FE" }]}>
                  <AppText variant="bodySM">يتطلب روشتة</AppText>
                </View>
              )}
              <View style={styles.wishPricing}>
                <AppText variant="bodySM">{Number(item.price || 0).toFixed(2)} ر.س</AppText>
              </View>
              <View style={[styles.stockBadge, { backgroundColor: item.available === false ? "#FEE2E2" : "#DCFCE7" }]}>
                <AppText variant="bodySM">{item.available === false ? " غير متوفر" : " متوفر"}</AppText>
              </View>
            </View>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/pharmacy/product-detail",
                  params: { id: item.id, name: item.name_ar },
                })
              }
              style={[styles.wishEmoji, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary }]}
            >
              <Icon name="medication" size={26} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      />
      </ScreenState>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  title: { fontSize: 18, fontWeight: "800" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: "400" },
  shopBtn: {
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  shopBtnText: { color: "var(--nabd-bg.surface-light)", fontSize: 15, fontWeight: "800" },
  wishCard: {
    borderRadius: 18,
    padding: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  wishEmoji: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  wishInfo: { flex: 1, alignItems: "flex-end", gap: 4 },
  wishName: { fontSize: 14, fontWeight: "800" },
  wishBrand: { fontSize: 11, fontWeight: "400" },
  wishPricing: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  wishPrice: { fontSize: 16, fontFamily: "Cairo-ExtraBold" },
  discountBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  stockBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  wishLeft: { gap: 8 },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
