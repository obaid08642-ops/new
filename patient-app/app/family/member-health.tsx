// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
  Avatar,
  SectionHeader,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

// DEFAULT_MEMBER removed

export default function MemberHealthScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();

  const memberId = (params.id as string) || "";
  const memberName = (params.name as string) || "فاطمة أحمد";
  const memberRelation = (params.relation as string) || "ابنة";

  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemberHealth();
  }, [memberId]);

  const loadMemberHealth = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/family/member-health/${memberId}`);
      // Structure the data to match expected fields
      setMember({
        name: memberName,
        relation: memberRelation,
        age: res.age || 12,
        vitals: [
          {
            label: "نبض القلب",
            value: res.vitals?.heart_rate?.value || "76",
            unit: "bpm",
            status: "طبيعي",
            color: "#16A34A",
          },
          {
            label: "ضغط الدم",
            value: res.vitals?.bp?.value || "120/80",
            unit: "mmHg",
            status: "طبيعي",
            color: "#23B5CE",
          },
          {
            label: "الوزن",
            value: res.weight || "38",
            unit: "كغ",
            status: "طبيعي",
            color: "#16A34A",
          },
        ],
        meds: (res.meds || [])
          .map((m: any) => ({
            name: m.medicine_name_ar || m.medicine_name_en,
            dose: m.dose,
            freq: m.frequency,
          }))
          .slice(0, 3),
        nextAppointment: res.nextAppointment || null,
      });
    } catch (err) {
      console.error("Could not fetch family member health details:", err);
      setMember({
        name: memberName,
        relation: memberRelation,
        age: "--",
        vitals: [],
        meds: [],
        nextAppointment: null,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          st.c,
          {
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 8,
          paddingHorizontal: 16,
        }}
      >
        <View style={st.hdrRow}>
          <IconButton
            icon="settings"
            bg="rgba(255,255,255,0.18)"
            color="#fff"
            onPress={() =>
              router.push({
                pathname: "/family/permissions",
                params: {
                  id: memberId,
                  name: memberName,
                  relation: memberRelation,
                },
              })
            }
          />
          <AppText variant="h4" color="#fff">
            صحة الفرد
          </AppText>
          <IconButton
            icon="back"
            bg="rgba(255,255,255,0.18)"
            color="#fff"
            onPress={() => router.back()}
          />
        </View>
        <View style={{ alignItems: "center", gap: 8 }}>
          <Avatar
            size={72}
            icon="user"
            bg="rgba(255,255,255,0.18)"
            iconColor="#fff"
          />
          <AppText variant="h3" color="#fff">
            {member.name}
          </AppText>
          <View style={{ flexDirection: "row-reverse", gap: 8 }}>
            <Badge
              label={member.relation}
              color="#fff"
              bg="rgba(255,255,255,0.2)"
            />
            <Badge
              label={`${member.age} سنة`}
              color="#fff"
              bg="rgba(255,255,255,0.2)"
            />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}
      >
        {/* Vitals */}
        <SectionHeader title="المؤشرات الحيوية" />
        {member.vitals.length === 0 ? <AppText color={colors.textTertiary}>لا توجد مؤشرات مسجلة</AppText> : (
          <View style={{ flexDirection: "row-reverse", gap: 12 }}>
            {member.vitals.map((v: any, i: number) => (
              <Card key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                <AppText variant="h3" color={v.color}>
                  {v.value}
                </AppText>
                <AppText variant="caption" color={colors.textTertiary}>
                  {v.unit}
                </AppText>
                <AppText variant="labelSM">{v.label}</AppText>
                <Badge label={v.status} color={v.color} />
              </Card>
            ))}
          </View>
        )}

        {/* Medications */}
        <SectionHeader title="الأدوية" />
        {member.meds.length === 0 ? <AppText color={colors.textTertiary}>لا توجد أدوية مسجلة</AppText> : null}
        {member.meds.map((m: any, i: number) => (
          <Card
            key={i}
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={[st.medIcon, { backgroundColor: colors.primarySurface }]}
            >
              <Icon name="medication" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <AppText variant="h6">{m.name}</AppText>
              <AppText variant="caption" color={colors.textTertiary}>
                {m.dose} · {m.freq}
              </AppText>
            </View>
          </Card>
        ))}

        {/* Appointment */}
        {member.nextAppointment && (
          <>
            <SectionHeader title="الموعد القادم" />
            <Card
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={[st.medIcon, { backgroundColor: colors.secondarySurface }]}
              >
                <Icon name="doctor" size={20} color={colors.secondary} />
              </View>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <AppText variant="h6">{member.nextAppointment.doctor}</AppText>
                <AppText variant="caption" color={colors.textTertiary}>
                  {member.nextAppointment.spec} · {member.nextAppointment.date}
                </AppText>
              </View>
            </Card>
          </>
        )}

        {/* Actions */}
        <View style={{ gap: 10, marginTop: 8 }}>
          <Button
            label="محادثة"
            variant="outline"
            icon="chat"
            onPress={() => router.push("/family/chat")}
          />
          <Button
            label="مكالمة صوتية"
            variant="outline"
            icon="call"
            onPress={() => router.push("/family/voice-call")}
          />
          <Button
            label="حجز موعد نيابةً"
            variant="gradient"
            icon="calendarCheck"
            onPress={() => router.push("/(tabs)/consultations")}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  hdrRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  medIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
