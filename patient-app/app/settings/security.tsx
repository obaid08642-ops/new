// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { LocalizedTextInput as TextInput } from '@/components/LocalizedTextInput';
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
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
import { apiFetch } from "../../src/utils/api";

export default function SecuritySettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [biometric, setBiometric] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [showPassChange, setShowPassChange] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load biometric & 2FA preferences from backend
  useEffect(() => {
    apiFetch<any>('/users/me/security-settings')
      .then(res => {
        if (res) {
          if (res.biometric !== undefined) setBiometric(res.biometric);
          if (res.two_factor !== undefined) setTwoFactor(res.two_factor);
        }
      })
      .catch(() => {});
  }, []);

  const toggleBiometric = async (val: boolean) => {
    setBiometric(val);
    apiFetch('/users/me/security-settings', { method: 'PATCH', body: JSON.stringify({ biometric: val }) }).catch(() => {});
  };

  const toggleTwoFactor = async (val: boolean) => {
    setTwoFactor(val);
    apiFetch('/users/me/security-settings', { method: 'PATCH', body: JSON.stringify({ two_factor: val }) }).catch(() => {});
  };

  const handleChangePass = async () => {
    if (newPass !== confirmPass) {
      Alert.alert('خطأ', 'كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }
    setIsSaving(true);
    try {
      await apiFetch('/users/me/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPass, new_password: newPass }),
      });
      Alert.alert('نجح', 'تم تغيير كلمة المرور بنجاح');
      setShowPassChange(false);
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (e: any) {
      Alert.alert('خطأ', e?.message || 'فشل تغيير كلمة المرور، تأكد من كلمة المرور الحالية');
    } finally {
      setIsSaving(false);
    }
  };

  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    apiFetch<any[]>('/users/me/sessions')
      .then(res => setSessions(res || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: isDark ? colors.surface : colors.white,
          },
        ]}
      >
        <AppText variant="h4">الأمان</AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Biometric */}
        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? colors.surface : colors.white },
          ]}
        >
          <AppText variant="bodySM">المصادقة البيومترية</AppText>
          <View style={styles.toggleRow}>
            <Switch
              value={biometric}
              onValueChange={toggleBiometric}
              trackColor={{ false: colors.border, true: colors.primary + "50" }}
              thumbColor={biometric ? colors.primary : colors.textTertiary}
            />
            <View style={styles.toggleInfo}>
              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Icon name="fingerprint" size={16} color={colors.primary} />
                <AppText variant="bodySM">البصمة / Face ID</AppText>
              </View>
              <AppText variant="bodySM">تسجيل الدخول بسرعة وأمان</AppText>
            </View>
          </View>
          <View style={styles.toggleRow}>
            <Switch
              value={twoFactor}
              onValueChange={toggleTwoFactor}
              trackColor={{ false: colors.border, true: colors.primary + "50" }}
              thumbColor={twoFactor ? colors.primary : colors.textTertiary}
            />
            <View style={styles.toggleInfo}>
              <View
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Icon name="security" size={16} color={colors.primary} />
                <AppText variant="bodySM">التحقق الثنائي (2FA)</AppText>
              </View>
              <AppText variant="bodySM">كود SMS عند كل تسجيل دخول</AppText>
            </View>
          </View>
        </View>

        {/* Change Password */}
        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? colors.surface : colors.white },
          ]}
        >
          <View style={styles.cardHeader}>
            <TouchableOpacity
              onPress={() => setShowPassChange(!showPassChange)}
            >
              <AppText variant="bodySM">
                {showPassChange ? "إلغاء" : "تغيير"}
              </AppText>
            </TouchableOpacity>
            <View
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="lock" size={16} color={colors.primary} />
              <AppText variant="bodySM">كلمة المرور</AppText>
            </View>
          </View>
          {showPassChange && (
            <View style={styles.passForm}>
              {[
                {
                  label: "الكلمة الحالية",
                  val: currentPass,
                  setter: setCurrentPass,
                },
                { label: "الكلمة الجديدة", val: newPass, setter: setNewPass },
                {
                  label: "تأكيد الكلمة الجديدة",
                  val: confirmPass,
                  setter: setConfirmPass,
                },
              ].map((f, i) => (
                <View key={i} style={styles.passField}>
                  <AppText variant="bodySM">{f.label}</AppText>
                  <View
                    style={[
                      styles.passInput,
                      {
                        backgroundColor: isDark
                          ? colors.background
                          : colors.backgroundSecondary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <TextInput
                      style={[styles.passText, { color: colors.textPrimary }]}
                      value={f.val}
                      onChangeText={f.setter as any}
                      secureTextEntry
                      textAlign="right"
                      placeholder="••••••••"
                      placeholderTextColor={colors.textTertiary}
                    />
                    <Icon name="eyeOff" size={16} color={colors.textTertiary} />
                  </View>
                </View>
              ))}
              <TouchableOpacity
                onPress={handleChangePass}
                disabled={!currentPass || !newPass || isSaving}
                activeOpacity={0.85}
                style={{ opacity: !currentPass || !newPass ? 0.5 : 1 }}
              >
                <View style={styles.savePassBtn}>
                  <AppText variant="bodySM">
                    {isSaving ? "جاري الحفظ..." : "حفظ كلمة المرور"}
                  </AppText>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Active Sessions */}
        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? colors.surface : colors.white },
          ]}
        >
          <AppText variant="h5">الجلسات النشطة</AppText>
          {loading ? (
            <AppText variant="bodySM" style={{ textAlign: "center", marginTop: 20 }}>جاري تحميل الجلسات...</AppText>
          ) : sessions.length === 0 ? (
            <AppText variant="bodySM" style={{ textAlign: "center", marginTop: 20 }}>لا توجد جلسات أخرى</AppText>
          ) : (
            sessions.map((s, i) => (
              <View
                key={i}
                style={[styles.sessionRow, { borderBottomColor: colors.border }]}
              >
                {!s.current && (
                  <TouchableOpacity
                    style={[
                      styles.endSessionBtn,
                      { backgroundColor: colors.errorSurface },
                    ]}
                  >
                    <AppText variant="bodySM">إنهاء</AppText>
                  </TouchableOpacity>
                )}
                <View style={styles.sessionInfo}>
                  <AppText variant="bodySM">{s.device}</AppText>
                  <AppText variant="bodySM">
                    {s.location} • {s.time}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.sessionIcon,
                    {
                      backgroundColor: s.current
                        ? "#DCFCE7"
                        : isDark
                          ? colors.background
                          : colors.backgroundSecondary,
                    },
                  ]}
                >
                  <Icon name="user" size={20} color={colors.primary} />
                  {s.current && <View style={styles.activeDot} />}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
  title: { fontSize: 17, fontWeight: "800" },
  card: {
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  togglePassBtn: { fontSize: 13, fontWeight: "700" },
  toggleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  toggleInfo: { flex: 1, alignItems: "flex-end", gap: 2 },
  toggleLabel: { fontSize: 14, fontWeight: "700" },
  toggleSub: { fontSize: 11, fontWeight: "400" },
  passForm: { gap: 10, marginTop: 8 },
  passField: { gap: 5 },
  passLabel: { fontSize: 12, fontWeight: "700", textAlign: "right" },
  passInput: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    height: 46,
    paddingHorizontal: 12,
  },
  passText: { flex: 1, fontSize: 14, fontWeight: "400" },
  savePassBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  savePassText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  sessionRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  activeDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#5BA84F",
    borderWidth: 2,
    borderColor: "#fff",
  },
  sessionInfo: { flex: 1, alignItems: "flex-end", gap: 2 },
  sessionDevice: { fontSize: 13, fontWeight: "700" },
  sessionMeta: { fontSize: 11, fontWeight: "400" },
  endSessionBtn: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  endSessionText: { color: "#F0695C", fontSize: 11, fontWeight: "700" },
});
