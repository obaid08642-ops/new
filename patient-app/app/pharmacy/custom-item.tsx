// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
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
import { apiFetch } from "../../src/utils/api";
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

export default function CustomItemScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [prescriptionUrl, setPrescriptionUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // E2: real prescription upload (was a fake toggle that uploaded nothing)
  const pickPrescription = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showLocalizedAlert('الإذن مطلوب', 'نحتاج إذن الوصول للصور لرفع الوصفة.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, quality: 0.85 });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploading(true);
      const form = new FormData();
      form.append('file', { uri: asset.uri, name: asset.fileName || 'prescription.jpg', type: asset.mimeType || 'image/jpeg' } as any);
      form.append('folder', 'support');
      const res = await apiFetch('/media/upload', { method: 'POST', body: form });
      if (res?.url) {
        setPrescriptionUrl(res.url);
      } else {
        showLocalizedAlert('تعذر رفع الوصفة', 'حاول مرة أخرى.');
      }
    } catch (e: any) {
      showLocalizedAlert('تعذر رفع الوصفة', e?.message || 'حاول مرة أخرى.');
    } finally {
      setUploading(false);
    }
  };

  // E2: real submission — persisted as a support request the pharmacy team actually receives
  const handleSubmit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const lines = [
        `الدواء المطلوب: ${name.trim()}`,
        dose.trim() ? `الجرعة/التركيز: ${dose.trim()}` : null,
        qty.trim() ? `الكمية: ${qty.trim()}` : null,
        note.trim() ? `ملاحظات: ${note.trim()}` : null,
      ].filter(Boolean).join('\n');
      await apiFetch('/support/requests', {
        method: 'POST',
        body: JSON.stringify({
          subject: `طلب دواء خاص: ${name.trim()}`,
          message: lines,
          category: 'PHARMACY_CUSTOM_ITEM',
          priority: 'medium',
          attachments: prescriptionUrl ? [prescriptionUrl] : [],
        }),
      });
      setSubmitted(true);
    } catch (e: any) {
      showLocalizedAlert('تعذر إرسال الطلب', e?.message || 'تحقق من اتصالك وحاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: 14,
          backgroundColor: colors.background,
        }}
      >
        <Icon name="shopping_cart" size={24} color={colors.primary} />
        <AppText variant="h5" color={colors.textPrimary}>
          تم إرسال الطلب!
        </AppText>
        <AppText variant="bodySM" color={colors.textSecondary} align="center">
          استلم فريق الصيدلية طلبك وسيراجعه — سيصلك الرد عبر مركز الدعم
        </AppText>
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/pharmacy")}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 14,
            paddingHorizontal: 28,
            paddingVertical: 12,
          }}
        >
          <AppText variant="labelMD" color="#fff">
            العودة للصيدلية
          </AppText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <AppText variant="h4">طلب دواء خاص</AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
      >
        <View
          style={[
            styles.infoCard,
            { backgroundColor: isDark ? "rgba(91,168,79,0.15)" : "#DCFCE7" },
          ]}
        >
          <View
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon
              name="medication"
              size={16}
              color={isDark ? colors.success : "#166534"}
            />
            <AppText
              variant="bodySM"
              color={isDark ? colors.success : "#166534"}
              style={{ flex: 1 }}
            >
              إذا لم تجد دواءك في الصيدلية، أرسل طلبك وسنبحث عنه من أقرب
              الصيدليات الشريكة
            </AppText>
          </View>
        </View>
        {[
          {
            label: "اسم الدواء *",
            val: name,
            setter: setName,
            placeholder: "مثال: ميتفورمين 500mg",
          },
          {
            label: "الجرعة / التركيز",
            val: dose,
            setter: setDose,
            placeholder: "مثال: 500mg",
          },
          {
            label: "الكمية",
            val: qty,
            setter: setQty,
            placeholder: "مثال: 2 علبة",
            type: "numeric",
          },
        ].map((f, i) => (
          <View
            key={i}
            style={[
              styles.fieldCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
          >
            <AppText
              variant="labelSM"
              color={colors.textPrimary}
              style={{ marginBottom: 6 }}
            >
              {f.label}
            </AppText>
            <TextInput
              style={[
                styles.fieldInput,
                {
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              value={f.val}
              onChangeText={f.setter as any}
              placeholder={f.placeholder}
              placeholderTextColor={colors.textTertiary}
              textAlign="right"
              keyboardType={
                (f as any).type === "numeric" ? "number-pad" : "default"
              }
            />
          </View>
        ))}
        <View
          style={[
            styles.fieldCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
        >
          <AppText
            variant="labelSM"
            color={colors.textPrimary}
            style={{ marginBottom: 6 }}
          >
            ملاحظات إضافية
          </AppText>
          <TextInput
            style={[
              styles.textArea,
              {
                color: colors.textPrimary,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            value={note}
            onChangeText={setNote}
            placeholder="أي معلومات إضافية..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            textAlign="right"
          />
        </View>
        <TouchableOpacity
          onPress={pickPrescription}
          disabled={uploading}
          style={[
            styles.prescBtn,
            {
              backgroundColor: prescriptionUrl
                ? isDark
                  ? "rgba(91,168,79,0.15)"
                  : "#DCFCE7"
                : colors.surface,
              borderColor: prescriptionUrl
                ? colors.success
                : colors.border,
            },
          ]}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <AppText
              variant="labelMD"
              color={prescriptionUrl ? colors.success : colors.textPrimary}
            >
              {prescriptionUrl
                ? "تم رفع الوصفة ✓"
                : "رفع الوصفة الطبية (اختياري)"}
            </AppText>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!name.trim() || submitting}
          style={{ opacity: !name.trim() || submitting ? 0.5 : 1 }}
        >
          <View style={[styles.submitBtn, { backgroundColor: colors.primary }]}>
            <View
              style={{
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 6,
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="upload" size={16} color="#fff" />
                  <AppText
                    variant="labelMD"
                    color="#fff"
                    style={{ fontWeight: "800" }}
                  >
                    إرسال الطلب
                  </AppText>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>
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
  infoCard: { borderRadius: 14, padding: 12 },
  infoText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "400",
    textAlign: "right",
    lineHeight: 18,
  },
  fieldCard: {
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 8,
  },
  fieldInput: {
    borderRadius: 10,
    borderWidth: 1,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "400",
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    minHeight: 80,
    fontSize: 13,
    fontWeight: "400",
  },
  prescBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 14,
    alignItems: "center",
  },
  prescBtnText: { fontSize: 14, fontWeight: "700" },
  submitBtn: {
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});