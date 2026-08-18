// @ts-nocheck
// app/health/edit-profile.tsx
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  Image,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { apiFetch } from "../../src/utils/api";
import { useEffect } from "react";
import { Icon } from "../../src/components/Icon";
import { useGuestGuard } from "../../src/hooks/useGuestGuard";
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
} from "../../src/components/ui";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["ذكر", "أنثى"];

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  // Guests CAN edit their profile — stored on their device-bound guest account.

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    dob: "",
    gender: "ذكر",
    bloodType: "O+",
    height: "",
    weight: "",
    nationalId: "",
  });
  const [allergies, setAllergies] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [newAllergy, setNewAllergy] = useState("");
  const [newCondition, setNewCondition] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await apiFetch<any>('/users/me/profile');
        if (data) {
          setForm({
            name: data.full_name || "",
            phone: data.phone || "",
            email: data.email || "",
            dob: data.dob || "",
            gender: data.gender || "ذكر",
            bloodType: data.blood_type || "O+",
            height: data.height ? String(data.height) : "",
            weight: data.weight ? String(data.weight) : "",
            nationalId: data.national_id || "",
          });
          if (data.allergies) setAllergies(data.allergies);
          if (data.chronic_conditions) setConditions(data.chronic_conditions);
          if (data.chronic_diseases && !data.chronic_conditions) setConditions(data.chronic_diseases);
          if (data.avatar_url) setAvatarUrl(data.avatar_url);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadProfile();
  }, []);

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const removeAllergy = (a: string) =>
    setAllergies((p) => p.filter((x) => x !== a));
  const addAllergy = () => {
    if (newAllergy.trim()) {
      setAllergies((p) => [...p, newAllergy.trim()]);
      setNewAllergy("");
    }
  };

  const addCondition = () => {
    if (newCondition.trim() && !conditions.includes(newCondition.trim())) {
      setConditions((p) => [...p, newCondition.trim()]);
      setNewCondition("");
    }
  };

  const pickAvatar = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showLocalizedAlert('الصلاحية مطلوبة', 'نحتاج إذن الوصول للصور لتغيير الصورة الشخصية');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName || 'avatar.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as any);
      formData.append('folder', 'avatars');
      const res = await apiFetch<any>('/media/upload', { method: 'POST', body: formData });
      const url = res?.url || res?.data?.url;
      if (url) {
        setAvatarUrl(url);
        await apiFetch('/users/me/profile', {
          method: 'PATCH',
          body: JSON.stringify({ avatar_url: url }),
        });
      }
    } catch (err: any) {
      showLocalizedAlert('تعذّر رفع الصورة', err?.message || 'حدث خطأ أثناء رفع الصورة');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiFetch('/users/me/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: form.name,
          phone: form.phone,
          email: form.email,
          dob: form.dob,
          gender: form.gender,
          blood_type: form.bloodType,
          height: Number(form.height) || undefined,
          weight: Number(form.weight) || undefined,
          national_id: form.nationalId,
          allergies,
          chronic_conditions: conditions,
        }),
      });
      router.back();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const Field = ({ label, field, keyboard = "default", iconName }: any) => (
    <View style={styles.fieldWrap}>
      <AppText variant="bodySM">{label}</AppText>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: isDark
              ? colors.background
              : colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        {iconName && (
          <Icon name={iconName} size={18} color={colors.textTertiary} />
        )}
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          value={form[field as keyof typeof form]}
          onChangeText={(v) => update(field, v)}
          keyboardType={keyboard}
          textAlign="right"
          placeholderTextColor={colors.textTertiary}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 8,
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ width: 44 }} />
          <AppText variant="h3" color={colors.textPrimary}>
            تعديل الملف الصحي
          </AppText>
          <IconButton
            icon="back"
            bg={colors.surfaceSecondary}
            color={colors.textPrimary}
            onPress={() => router.back()}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View
            style={[styles.avatar, { backgroundColor: colors.primarySurface, overflow: 'hidden' }]}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Icon name="person" size={40} color={colors.primary} />
            )}
          </View>
          <TouchableOpacity
            onPress={pickAvatar}
            style={[
              styles.changeAvatarBtn,
              { backgroundColor: colors.primary },
            ]}
          >
            <Icon name="camera" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Personal Info */}
        <Card
          style={[
            {
              backgroundColor: isDark ? colors.surface : colors.white,
              padding: 16,
              gap: 10,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name="person" size={18} color={colors.primary} />
            <AppText variant="h6">البيانات الشخصية</AppText>
          </View>
          <Field label="الاسم الكامل" field="name" iconName="edit" />
          <Field
            label="رقم الجوال"
            field="phone"
            keyboard="phone-pad"
            iconName="smartphone"
          />
          <Field
            label="البريد الإلكتروني"
            field="email"
            keyboard="email-address"
            iconName="mail"
          />
          <Field label="تاريخ الميلاد" field="dob" iconName="calendar_today" />
          <Field
            label="رقم الهوية"
            field="nationalId"
            keyboard="number-pad"
            iconName="badge"
          />

          {/* Gender */}
          <View style={styles.fieldWrap}>
            <AppText variant="bodySM">الجنس</AppText>
            <View style={styles.optionsRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => update("gender", g)}
                  style={[
                    styles.optBtn,
                    form.gender === g && { backgroundColor: colors.primary },
                  ]}
                >
                  <AppText
                    variant="bodySM"
                    color={form.gender === g ? "#fff" : colors.textPrimary}
                  >
                    {g}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        {/* Health Data */}
        <Card
          style={[
            {
              backgroundColor: isDark ? colors.surface : colors.white,
              padding: 16,
              gap: 10,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name="favorite" size={18} color="#F0695C" />
            <AppText variant="h6">البيانات الصحية</AppText>
          </View>
          <View style={styles.twoCol}>
            <View style={styles.halfField}>
              <AppText variant="bodySM">الطول (سم)</AppText>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark
                      ? colors.background
                      : colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={form.height}
                  onChangeText={(v) => update("height", v)}
                  keyboardType="number-pad"
                  textAlign="center"
                />
              </View>
            </View>
            <View style={styles.halfField}>
              <AppText variant="bodySM">الوزن (كجم)</AppText>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark
                      ? colors.background
                      : colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={form.weight}
                  onChangeText={(v) => update("weight", v)}
                  keyboardType="number-pad"
                  textAlign="center"
                />
              </View>
            </View>
          </View>

          {/* Blood Type */}
          <View style={styles.fieldWrap}>
            <View
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name="bloodtype" size={16} color="#F0695C" />
              <AppText variant="bodySM">فصيلة الدم</AppText>
            </View>
            <View style={styles.bloodTypesRow}>
              {BLOOD_TYPES.map((bt) => (
                <TouchableOpacity
                  key={bt}
                  onPress={() => update("bloodType", bt)}
                  style={[
                    styles.btBtn,
                    form.bloodType === bt && {
                      backgroundColor: "#F0695C",
                      borderColor: "#F0695C",
                    },
                  ]}
                >
                  <AppText
                    variant="bodySM"
                    color={form.bloodType === bt ? "#fff" : colors.textPrimary}
                  >
                    {bt}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        {/* Allergies */}
        <Card
          style={[
            {
              backgroundColor: isDark ? colors.surface : colors.white,
              padding: 16,
              gap: 10,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name="warning" size={18} color="#F0A526" />
            <AppText variant="h6">الحساسية</AppText>
          </View>
          <View style={styles.tagsRow}>
            {allergies.map((a) => (
              <TouchableOpacity
                key={a}
                onPress={() => removeAllergy(a)}
                style={[styles.allergyTag, { backgroundColor: "#FEE2E2" }]}
              >
                <Icon name="info" size={14} color="#F0695C" />
                <AppText
                  variant="caption"
                  color="#DC2626"
                  style={{ fontWeight: "bold" }}
                >
                  {a}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.addAllergyRow}>
            <TouchableOpacity
              onPress={addAllergy}
              style={[
                styles.addAllergyBtn,
                { backgroundColor: colors.primary },
              ]}
            >
              <AppText variant="bodySM" color="#fff">
                إضافة
              </AppText>
            </TouchableOpacity>
            <TextInput
              style={[
                styles.addAllergyInput,
                {
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  backgroundColor: isDark
                    ? colors.background
                    : colors.backgroundSecondary,
                },
              ]}
              value={newAllergy}
              onChangeText={setNewAllergy}
              placeholder="أضف حساسية..."
              placeholderTextColor={colors.textTertiary}
              textAlign="right"
            />
          </View>
        </Card>

        {/* Chronic Conditions */}
        <Card
          style={[
            {
              backgroundColor: isDark ? colors.surface : colors.white,
              padding: 16,
              gap: 10,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name="local_hospital" size={18} color="#23B5CE" />
            <AppText variant="h6">الأمراض المزمنة</AppText>
          </View>
          <View style={styles.tagsRow}>
            {conditions.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setConditions((p) => p.filter((x) => x !== c))}
                style={[styles.conditionTag, { backgroundColor: "#FEF3C7" }]}
              >
                <AppText
                  variant="caption"
                  color="#D97706"
                  style={{ fontWeight: "bold" }}
                >
                  {c} ✕
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.addAllergyRow}>
            <TouchableOpacity
              onPress={addCondition}
              style={[
                styles.addAllergyBtn,
                { backgroundColor: colors.primary },
              ]}
            >
              <AppText variant="bodySM" color="#fff">
                إضافة
              </AppText>
            </TouchableOpacity>
            <TextInput
              style={[
                styles.addAllergyInput,
                {
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  backgroundColor: isDark
                    ? colors.background
                    : colors.backgroundSecondary,
                },
              ]}
              value={newCondition}
              onChangeText={setNewCondition}
              placeholder="أضف مرضاً مزمنة..."
              placeholderTextColor={colors.textTertiary}
              textAlign="right"
            />
          </View>
        </Card>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: insets.bottom + 8,
            backgroundColor: isDark ? colors.surface : colors.white,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          <View style={styles.saveButton}>
            <View
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 8,
              }}
            >
              {!isSaving && <Icon name="check" size={18} color="#fff" />}
              <AppText
                variant="bodySM"
                color="#fff"
                style={{ fontWeight: "bold" }}
              >
                {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </AppText>
            </View>
          </View>
        </TouchableOpacity>
      </View>
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
  saveBtn: { fontSize: 15, fontWeight: "800" },
  content: { padding: 16, gap: 12 },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 8,
    position: "relative",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  changeAvatarBtn: {
    position: "absolute",
    bottom: 8,
    right: "38%",
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "700", textAlign: "right" },
  fieldIcon: { fontSize: 14, marginLeft: 8 },
  inputRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    height: 46,
    paddingHorizontal: 12,
  },
  input: { flex: 1, fontSize: 14, fontWeight: "400" },
  optionsRow: { flexDirection: "row-reverse", gap: 10 },
  optBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    paddingVertical: 10,
    alignItems: "center",
  },
  twoCol: { flexDirection: "row-reverse", gap: 10 },
  halfField: { flex: 1, gap: 6 },
  bloodTypesRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  btBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tagsRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  allergyTag: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addAllergyRow: { flexDirection: "row-reverse", gap: 8, marginTop: 4 },
  addAllergyInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "400",
  },
  addAllergyBtn: {
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  conditionTag: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  addConditionBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bottomBar: { paddingHorizontal: 16, paddingTop: 12 },
  saveButton: {
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
