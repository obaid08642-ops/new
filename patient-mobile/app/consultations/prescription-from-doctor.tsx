// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
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
  SectionHeader,
} from "../../src/components/ui";

import { apiFetch } from '../../src/utils/api';

export default function PrescriptionFromDoctorScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [addedToReminders, setAddedToReminders] = useState<string[]>([]);
  const [ordering, setOrdering] = useState(false);
  const [prescription, setPrescription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchPrescription();
  }, []);

  const fetchPrescription = async () => {
    try {
      // In production: apiFetch('/prescriptions/active')
      setPrescription(null);
    } catch (e) {
      console.log('Error fetching prescription', e);
    } finally {
      setLoading(false);
    }
  };

  const addToReminder = (id: string) => {
    setAddedToReminders((p) => [...p, id]);
    // In production: auto-create medication reminder with freq/duration/instruction
  };

  const addAllToReminders = () => {
    if (prescription?.medications) {
      setAddedToReminders(prescription.medications.map((m: any) => m.id));
    }
  };

  const orderFromPharmacy = () => {
    setOrdering(true);
    setTimeout(() => {
      setOrdering(false);
      router.push("/pharmacy/rx-order");
    }, 600);
  };

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View
        style={[
          st.hdr,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <IconButton
          icon="download"
          onPress={() => {
            /* Requires backend API integration */
          }}
        />
        <AppText variant="h4">وصفة طبية</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 140 }}
      >
        {loading ? (
          <AppText>جاري التحميل...</AppText>
        ) : !prescription ? (
          <AppText style={{ textAlign: 'center', marginTop: 40 }}>لا توجد وصفات طبية نشطة حالياً.</AppText>
        ) : (
          <>
            {/* Doctor info */}
            <Card
              style={{
                flexDirection: "row-reverse",
                gap: 12,
                alignItems: "center",
              }}
            >
              <View
                style={[st.docAvatar, { backgroundColor: colors.primarySurface }]}
              >
                <Icon name="doctor" size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1, alignItems: "flex-end", gap: 3 }}>
                <AppText variant="h5">{prescription.doctor}</AppText>
                <AppText variant="caption" color={colors.textTertiary}>
                  {prescription.spec}
                </AppText>
                <AppText variant="caption" color={colors.textTertiary}>
                  {prescription.date}
                </AppText>
              </View>
              <Badge
                label="وصفة رسمية"
                color={colors.success}
                icon="check_circle"
              />
            </Card>

            {/* Diagnosis */}
            <Card>
              <SectionHeader title="التشخيص" />
              <AppText variant="bodySM" color={colors.textSecondary}>
                {prescription.diagnosis}
              </AppText>
            </Card>

            {/* Medications */}
            <View
              style={{
                flexDirection: "row-reverse",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <SectionHeader
                title={`الأدوية (${prescription.medications?.length || 0})`}
              />
              <TouchableOpacity onPress={addAllToReminders}>
                <AppText variant="labelMD" color={colors.primary}>
                  إضافة الكل للتذكير
                </AppText>
              </TouchableOpacity>
            </View>

            {prescription.medications?.map((med: any) => {
              const added = addedToReminders.includes(med.id);
              return (
                <Card key={med.id}>
                  <View
                    style={{
                      flexDirection: "row-reverse",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={[
                        st.medIcon,
                        { backgroundColor: colors.primarySurface },
                      ]}
                    >
                      <Icon name="medication" size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
                      <AppText variant="h5">{med.name}</AppText>
                      <AppText variant="bodySM" color={colors.textTertiary}>
                        {med.dose}
                      </AppText>
                    </View>
                  </View>

                  <View
                    style={[st.detailsGrid, { borderColor: colors.borderLight }]}
                  >
                    {[
                      { icon: "clock", label: "التكرار", value: med.freq },
                      { icon: "calendar", label: "المدة", value: med.duration },
                      { icon: "food", label: "التعليمات", value: med.instruction },
                      {
                        icon: "medication",
                        label: "الجرعة",
                        value: `${med.pills} حبة`,
                      },
                    ].map((d, i) => (
                      <View key={i} style={st.detailItem}>
                        <Icon
                          name={d.icon as any}
                          size={14}
                          color={colors.textTertiary}
                        />
                        <AppText variant="caption" color={colors.textTertiary}>
                          {d.label}
                        </AppText>
                        <AppText variant="labelSM" color={colors.textPrimary}>
                          {d.value}
                        </AppText>
                      </View>
                    ))}
                  </View>

                  <View
                    style={{ flexDirection: "row-reverse", gap: 8, marginTop: 10 }}
                  >
                    <Button
                      label={added ? "تمت الإضافة " : "إضافة للتذكير"}
                      variant={added ? "ghost" : "outline"}
                      icon={added ? "check-circle" : "bell"}
                      size="sm"
                      full={false}
                      disabled={added}
                      onPress={() => addToReminder(med.id)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      label="التفاصيل"
                      variant="ghost"
                      icon="info"
                      size="sm"
                      full={false}
                      onPress={() =>
                        router.push({
                          pathname: "/pharmacy/product-detail",
                          params: { productId: med.id },
                        })
                      }
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              );
            })}

            {/* Requested Labs */}
            {prescription.labs && prescription.labs.length > 0 && (
              <>
                <SectionHeader title={`التحاليل المطلوبة (${prescription.labs.length})`} />
                {prescription.labs.map((lab: any) => (
                  <Card key={lab.id}>
                    <View style={{ flexDirection: "row-reverse", gap: 12, alignItems: "center" }}>
                      <View style={[st.medIcon, { backgroundColor: colors.infoSurface }]}>
                        <Icon name="activity" size={22} color={colors.info} />
                      </View>
                      <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
                        <AppText variant="h5">{lab.name}</AppText>
                        <AppText variant="bodySM" color={colors.textTertiary}>{lab.instructions || 'صائم 8 ساعات'}</AppText>
                      </View>
                    </View>
                  </Card>
                ))}
              </>
            )}

            {/* Doctor notes */}
            <Card style={{ backgroundColor: colors.warningSurface }}>
              <View
                style={{
                  flexDirection: "row-reverse",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <Icon name="edit" size={18} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <AppText variant="h6" color={colors.warning}>
                    ملاحظات الطبيب
                  </AppText>
                  <AppText variant="bodySM" color={colors.textSecondary}>
                    {prescription.notes}
                  </AppText>
                </View>
              </View>
            </Card>

            {/* Follow-up CTA */}
            <Card
              onPress={() => router.push("/consultations/follow-up")}
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={[st.medIcon, { backgroundColor: colors.secondarySurface }]}
              >
                <Icon name="calendar" size={22} color={colors.secondary} />
              </View>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <AppText variant="h6">حجز موعد متابعة</AppText>
                <AppText variant="caption" color={colors.textTertiary}>
                  المطلوب: بعد أسبوعين
                </AppText>
              </View>
              <Icon name="chevronLeft" size={18} color={colors.textTertiary} />
            </Card>
          </>
        )}
      </ScrollView>

      {/* Bottom */}
      <View
        style={[
          st.bottom,
          {
            paddingBottom: insets.bottom + 8,
            backgroundColor: colors.surface,
            borderTopColor: colors.borderLight,
          },
        ]}
      >
        <View style={{ flexDirection: "row-reverse", gap: 10 }}>
          <Button
            label="طلب من الصيدلية"
            variant="gradient"
            icon="shopping_cart"
            loading={ordering}
            onPress={orderFromPharmacy}
            full={false}
            style={{ flex: 1 }}
          />
          {prescription?.labs?.length > 0 && (
            <Button
              label="احجز موعد مختبر"
              variant="outline"
              icon="activity"
              onPress={() => router.push("/diagnostics/search")}
              full={false}
              style={{ flex: 1 }}
            />
          )}
          <Button
            label="تحميل PDF"
            variant="outline"
            icon="download"
            onPress={() => {
              /* Requires backend API integration */
            }}
            full={false}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  docAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  medIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  detailsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
    gap: 8,
  },
  detailItem: { width: "47%", alignItems: "flex-end", gap: 2 },
  bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
