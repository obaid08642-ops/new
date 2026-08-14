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

export default function WishlistScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [items, setItems] = useState<any[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/users/me/wishlist');
        if (data && Array.isArray(data)) setItems(data);
      } catch (err) {}
    })();
  }, []);

  const removeFromWishlist = async (id: string) => {
    setItems((p) => p.filter((i) => i.id !== id));
    try {
      await apiFetch(`/users/me/wishlist/${id}`, 'POST');
    } catch (err) {}
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
              >
                <Icon name="info" size={16} color="#F0695C" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.cartBtn,
                  {
                    backgroundColor: item.inStock
                      ? colors.secondary
                      : colors.textDisabled,
                  },
                ]}
                disabled={!item.inStock}
              >
                <Icon name="shopping_cart" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.wishInfo}>
              <AppText variant="bodySM">{item.name}</AppText>
              <AppText variant="bodySM">{item.brand}</AppText>
              <View style={styles.wishPricing}>
                <AppText variant="bodySM">{item.price} ر</AppText>
                {item.discount > 0 && (
                  <View
                    style={[
                      styles.discountBadge,
                      { backgroundColor: "#FEE2E2" },
                    ]}
                  >
                    <AppText variant="bodySM">-{item.discount}%</AppText>
                  </View>
                )}
              </View>
              <View
                style={[
                  styles.stockBadge,
                  { backgroundColor: item.inStock ? "#DCFCE7" : "#FEE2E2" },
                ]}
              >
                <AppText variant="bodySM">
                  {item.inStock ? " متوفر" : " غير متوفر"}
                </AppText>
              </View>
            </View>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/pharmacy/product-detail",
                  params: { id: item.id, name: item.name },
                })
              }
              style={[
                styles.wishEmoji,
                {
                  backgroundColor: isDark
                    ? colors.background
                    : colors.backgroundSecondary,
                },
              ]}
            >
              <AppText variant="bodySM">{item.emoji}</AppText>
            </TouchableOpacity>
          </View>
        )}
      />
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
  shopBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
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
