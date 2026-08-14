// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { AppText } from "../../src/components/ui";
import { Colors } from "../../src/theme";
const theme = { colors: Colors.light };
import Icon from "@expo/vector-icons/MaterialIcons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useDiagnosticsCart } from "../../src/context/DiagnosticsCartContext";
import { apiFetch } from "../../src/utils/api";

export default function LabComparison() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { addItem } = useDiagnosticsCart();
  const [adding, setAdding] = useState(false);

  const testName = name || "باقة الفحص الشامل";

  const [loading, setLoading] = useState(true);
  const [labs, setLabs] = useState<any[]>([]);
  const [basePrice, setBasePrice] = useState(0);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiFetch(`/labs/services/${id}`),
      apiFetch(`/labs/compatible-providers?testIds=${id}`)
    ]).then(([svcRes, labsRes]: any) => {
      const price = (svcRes?.data || svcRes)?.price || 299;
      setBasePrice(price);
      
      const compatible = (labsRes?.data || labsRes || []).map((l: any, i: number) => ({
        ...l,
        price: Math.round(price * (l.priceMultiplier || 1)),
        bestValue: i === 0, // best value recommendation
      }));
      setLabs(compatible);
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, [id]);

  const handleBook = async (lab: any) => {
    setAdding(true);
    // Ask user if they want Home Visit or Clinic Visit (if home visit is available)
    if (lab.homeVisitAvailable) {
      Alert.alert(
        "تحديد مكان الخدمة",
        "هل تفضل زيارة فرع المختبر أم إرسال فني لسحب العينة من منزلك؟",
        [
          { text: "إلغاء", style: "cancel", onPress: () => setAdding(false) },
          { text: "زيارة الفرع", onPress: () => processAdd(lab, false) },
          {
            text: "سحب من المنزل (+٥٠ ر.س)",
            onPress: () => processAdd(lab, true),
          },
        ],
      );
    } else {
      await processAdd(lab, false);
    }
  };

  const processAdd = async (lab: any, isHomeVisit: boolean) => {
    try {
      await addItem({
        id: id || "test1",
        name: `${testName} - ${lab.name}`,
        price: lab.price,
        kind: "lab",
        provider: lab.name,
        isHomeVisit,
        turnaroundTime: lab.time,
        icon: "biotech",
        iconBg: `${lab.color}15`,
        iconColor: lab.color,
      });
      router.push("/diagnostics/cart");
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Icon
            name="arrow-forward"
            size={24}
            color={theme.colors.textPrimary}
          />
        </TouchableOpacity>
        <AppText variant="h2" style={styles.headerTitle}>
          مقارنة المختبرات
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoBox}>
          <AppText style={{ fontSize: 13, color: theme.colors.textSecondary }}>
            مقارنة الأسعار لـ:
          </AppText>
          <AppText
            variant="h3"
            style={{ marginTop: 4, color: theme.colors.primary }}
          >
            {testName}
          </AppText>
        </View>

        {loading ? (
          <AppText style={{ textAlign: 'center', marginTop: 40, color: theme.colors.textSecondary }}>جاري تحميل المختبرات المتوفرة...</AppText>
        ) : (
          labs.map((lab) => (
            <View
            key={lab.id}
            style={[styles.labCard, lab.bestValue && styles.labCardBest]}
          >
            {lab.bestValue && (
              <View style={styles.bestValueBadge}>
                <AppText
                  style={{
                    fontSize: 10,
                    color: theme.colors.primary,
                    fontWeight: "bold",
                  }}
                >
                  الأفضل قيمة
                </AppText>
              </View>
            )}

            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 16, fontWeight: "900" }}>
                  {lab.name}
                </AppText>
                <View style={styles.ratingRow}>
                  <Icon name="star" size={14} color="#F5A623" />
                  <AppText
                    style={{
                      fontSize: 12,
                      color: theme.colors.textSecondary,
                      marginLeft: 4,
                    }}
                  >
                    {lab.rating}
                  </AppText>
                  {lab.homeVisitAvailable && (
                    <View style={styles.homeBadge}>
                      <Icon
                        name="home"
                        size={10}
                        color={theme.colors.secondary}
                      />
                      <AppText
                        style={{
                          fontSize: 9,
                          color: theme.colors.secondary,
                          marginLeft: 2,
                        }}
                      >
                        سحب منزلي متاح
                      </AppText>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.priceCol}>
                <AppText
                  style={{
                    fontSize: 24,
                    fontWeight: "900",
                    color: theme.colors.primary,
                  }}
                >
                  {lab.price}
                </AppText>
                <AppText
                  style={{ fontSize: 10, color: theme.colors.textSecondary }}
                >
                  ر.س
                </AppText>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.timeBox}>
                <AppText
                  style={{ fontSize: 10, color: theme.colors.textSecondary }}
                >
                  النتيجة خلال
                </AppText>
                <AppText style={{ fontSize: 13, fontWeight: "bold" }}>
                  {lab.time}
                </AppText>
              </View>
              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => handleBook(lab)}
                disabled={adding}
              >
                <AppText
                  style={{ fontSize: 13, fontWeight: "bold", color: "#fff" }}
                >
                  احجز الآن
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        )))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    paddingTop: 60,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, textAlign: "center", marginRight: 40 },
  scrollContent: { padding: 24 },
  infoBox: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: `${"transparent"}10`,
    borderRadius: 16,
  },
  labCard: {
    backgroundColor: "transparent",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
    position: "relative",
  },
  labCardBest: { borderColor: "transparent" },
  bestValueBadge: {
    position: "absolute",
    top: -12,
    right: 20,
    backgroundColor: `${"transparent"}15`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  homeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${"transparent"}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 10,
  },
  priceCol: { alignItems: "flex-end" },
  cardFooter: { flexDirection: "row", gap: 12 },
  timeBox: {
    flex: 1,
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bookBtn: {
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
