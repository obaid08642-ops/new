// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  IconButton,
  Button,
  Badge,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

interface SavedCard {
  id: string;
  type: "visa" | "mastercard" | "mada";
  last4: string;
  holderName: string;
  expiry: string;
  isDefault: boolean;
  gradient: [string, string];
}

const CARD_TYPE_LABELS: Record<string, string> = {
  visa: "VISA",
  mastercard: "MASTERCARD",
  mada: "MADA",
};

const CARD_TYPE_ICONS: Record<string, string> = {
  visa: "card",
  mastercard: "card",
  mada: "shield",
};

// INITIAL_CARDS removed, using backend data

export default function CardsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/wallet/cards");
      if (res && res.cards) {
        setCards(res.cards);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const setDefaultCard = async (cardId: string) => {
    // Basic optimistic update for now since backend only supports get/add/remove
    setCards((prev) =>
      prev.map((c) => ({
        ...c,
        isDefault: c.id === cardId,
      })),
    );
  };

  const removeCard = (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (card?.isDefault && cards.length > 1) {
      Alert.alert(
        "تنبيه",
        "لا يمكن حذف البطاقة الافتراضية. قم بتعيين بطاقة أخرى كافتراضية أولاً.",
        [{ text: "حسناً" }],
      );
      return;
    }
    Alert.alert(
      "حذف البطاقة",
      `هل تريد حذف البطاقة المنتهية بـ ${card?.last4}؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await apiFetch(`/wallet/cards/${cardId}`, {
                method: "DELETE",
              });
              if (res && res.cards) setCards(res.cards);
            } catch (e) {
              Alert.alert("خطأ", "تعذر حذف البطاقة");
            }
          },
        },
      ],
    );
  };

  const renderCardPreview = (card: SavedCard, index: number) => (
    <Animated.View
      key={card.id}
      entering={FadeInDown.delay(200 + index * 120).duration(500)}
    >
      <View style={styles.cardPreview}>
        <View style={styles.cardPreviewTop}>
          <View style={styles.cardTypeBadge}>
            <AppText variant="labelSM" color="#fff">
              {CARD_TYPE_LABELS[card.type]}
            </AppText>
          </View>
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 6,
            }}
          >
            {card.isDefault && (
              <View style={styles.defaultBadge}>
                <Icon name="check" size={12} color="#fff" />
                <AppText variant="caption" color="#fff">
                  افتراضية
                </AppText>
              </View>
            )}
            <Icon
              name={CARD_TYPE_ICONS[card.type] as any}
              size={24}
              color="rgba(255,255,255,0.8)"
            />
          </View>
        </View>

        <View style={styles.cardNumberRow}>
          <AppText variant="h4" color="#fff" style={styles.cardNumber}>
            {"•••• •••• •••• " + card.last4}
          </AppText>
        </View>

        <View style={styles.cardPreviewBottom}>
          <View style={styles.cardDetailGroup}>
            <AppText variant="caption" color="rgba(255,255,255,0.6)">
              الصلاحية
            </AppText>
            <AppText variant="labelMD" color="#fff">
              {card.expiry}
            </AppText>
          </View>
          <View style={styles.cardDetailGroup}>
            <AppText variant="caption" color="rgba(255,255,255,0.6)">
              حامل البطاقة
            </AppText>
            <AppText variant="labelMD" color="#fff">
              {card.holderName}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.cardActions}>
        {!card.isDefault && (
          <TouchableOpacity
            onPress={() => setDefaultCard(card.id)}
            style={[
              styles.actionBtn,
              { backgroundColor: colors.primarySurface },
            ]}
            activeOpacity={0.7}
          >
            <AppText variant="labelSM" color={colors.primary}>
              تعيين كافتراضية
            </AppText>
            <Icon name="check_circle" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => removeCard(card.id)}
          style={[styles.actionBtn, { backgroundColor: colors.errorSurface }]}
          activeOpacity={0.7}
        >
          <AppText variant="labelSM" color={colors.error}>
            حذف
          </AppText>
          <Icon name="trash" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <Animated.View
      entering={FadeInDown.delay(200).duration(500)}
      style={styles.emptyState}
    >
      <View
        style={[
          styles.emptyIconWrap,
          { backgroundColor: colors.primarySurface },
        ]}
      >
        <Icon name="card" size={48} color={colors.primary} />
      </View>
      <AppText variant="h4" color={colors.textPrimary} align="center">
        لا توجد بطاقات محفوظة
      </AppText>
      <AppText variant="bodySM" color={colors.textTertiary} align="center">
        أضف بطاقة دفع لتتمكن من الدفع بسرعة وسهولة عند حجز المواعيد أو طلب
        الأدوية
      </AppText>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <View style={{ width: 40 }} />
        <AppText variant="h4">بطاقاتي</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={[
            styles.infoBanner,
            { backgroundColor: colors.primarySurface },
          ]}
        >
          <View style={styles.infoBannerRow}>
            <Icon name="lock" size={18} color={colors.primary} />
            <AppText
              variant="bodySM"
              color={colors.primary}
              style={{ flex: 1 }}
            >
              بطاقاتك مشفرة ومحمية بمعايير PCI DSS. لا نحتفظ بالبيانات الكاملة
              للبطاقة.
            </AppText>
          </View>
        </Animated.View>

        {cards.length > 0 && (
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <AppText variant="h5" style={styles.sectionLabel}>
              البطاقات المحفوظة ({cards.length})
            </AppText>
          </Animated.View>
        )}

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 40 }}
          />
        ) : cards.length > 0 ? (
          <View style={styles.cardsList}>
            {cards.map((card, index) => renderCardPreview(card, index))}
          </View>
        ) : (
          renderEmptyState()
        )}

        <Animated.View entering={FadeInDown.delay(500).duration(500)}>
          <AppText variant="h5" style={styles.sectionLabel}>
            طرق الدفع المدعومة
          </AppText>
          <Card>
            <View style={styles.supportedMethods}>
              {[
                { label: "فيزا", type: "VISA" },
                { label: "ماستركارد", type: "MASTERCARD" },
                { label: "مدى", type: "MADA" },
              ].map((method, i) => (
                <View
                  key={method.type}
                  style={[
                    styles.methodItem,
                    { backgroundColor: colors.primarySurface },
                  ]}
                >
                  <Icon name="card" size={18} color={colors.primary} />
                  <AppText variant="labelSM" color={colors.primary}>
                    {method.label}
                  </AppText>
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>
      </ScrollView>

      <Animated.View
        entering={FadeInDown.delay(600).duration(500)}
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: colors.surface,
            borderTopColor: colors.borderLight,
          },
        ]}
      >
        <Button
          label="إضافة بطاقة جديدة"
          icon="add"
          variant="gradient"
          onPress={() => {
            Alert.alert("إضافة بطاقة", "اختر نوع البطاقة", [
              {
                text: "Visa",
                onPress: async () => {
                  const res = await apiFetch("/wallet/cards", {
                    method: "POST",
                    body: JSON.stringify({
                      type: "visa",
                      cardNumber: "1234567890124521",
                      holderName: "Ahmed",
                      expiry: "12/26",
                    }),
                  });
                  if (res && res.cards) setCards(res.cards);
                },
              },
              {
                text: "Mada",
                onPress: async () => {
                  const res = await apiFetch("/wallet/cards", {
                    method: "POST",
                    body: JSON.stringify({
                      type: "mada",
                      cardNumber: "1234567890128832",
                      holderName: "Ahmed",
                      expiry: "09/27",
                    }),
                  });
                  if (res && res.cards) setCards(res.cards);
                },
              },
              { text: "إلغاء", style: "cancel" },
            ]);
          }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 120,
  },
  infoBanner: {
    borderRadius: 14,
    padding: 14,
  },
  infoBannerRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
  },
  sectionLabel: {
    marginTop: 4,
  },
  cardsList: {
    gap: 16,
  },
  cardPreview: {
    borderRadius: 20,
    padding: 20,
    height: 190,
    justifyContent: "space-between",
  },
  cardPreviewTop: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTypeBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  cardNumberRow: {
    alignItems: "center",
  },
  cardNumber: {
    letterSpacing: 2,
    fontWeight: "700",
  },
  cardPreviewBottom: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cardDetailGroup: {
    gap: 2,
  },
  cardActions: {
    flexDirection: "row-reverse",
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyState: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 48,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  supportedMethods: {
    flexDirection: "row-reverse",
    gap: 10,
  },
  methodItem: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
