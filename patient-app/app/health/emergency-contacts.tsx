// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import { AppText } from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

export default function EmergencyContactsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [phone, setPhone] = useState("");

  async function load() {
    try {
      const res = await apiFetch('/health/emergency-contacts');
      setContacts(Array.isArray(res) ? res : res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  const addContact = async () => {
    if (!name.trim() || !phone.trim()) {
      showLocalizedAlert("تنبيه", "يرجى إدخال الاسم ورقم الجوال");
      return;
    }
    setSaving(true);
    try {
      const doc = await apiFetch('/health/emergency-contacts', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          relation: relation.trim() || undefined,
          isPrimary: contacts.length === 0,
        }),
      });
      setContacts((prev) => [...prev, doc]);
      setShowAdd(false);
      setName(""); setRelation(""); setPhone("");
    } catch (err: any) {
      showLocalizedAlert("تعذّر الحفظ", err?.message || "حدث خطأ أثناء إضافة جهة الاتصال");
    } finally {
      setSaving(false);
    }
  };

  const removeContact = (c: any) => {
    showLocalizedAlert("حذف جهة الاتصال", `هل تريد حذف ${c.name}؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/health/emergency-contacts/${c.id}`, { method: 'DELETE' });
            setContacts((prev) => prev.filter((x) => x.id !== c.id));
          } catch (err: any) {
            showLocalizedAlert("تعذّر الحذف", err?.message || "حدث خطأ أثناء الحذف");
          }
        },
      },
    ]);
  };

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: isDark ? colors.surface : colors.white,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => setShowAdd(true)}
          style={[styles.addBtn, { backgroundColor: colors.primarySurface }]}
        >
          <AppText variant="bodySM">+ إضافة</AppText>
        </TouchableOpacity>
        <AppText variant="bodySM">جهات الطوارئ </AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}
        {!loading && contacts.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 60, gap: 8 }}>
            <Icon name="call" size={44} color={colors.textTertiary} />
            <AppText variant="bodySM" color={colors.textSecondary}>
              لا توجد جهات طوارئ بعد — أضف شخصاً يمكن الاتصال به عند الحاجة
            </AppText>
          </View>
        )}
        {contacts.map((c) => (
          <View
            key={c.id}
            style={[
              styles.card,
              {
                backgroundColor: isDark ? colors.surface : colors.white,
                borderRightWidth: c.isPrimary ? 4 : 0,
                borderRightColor: "#F0695C",
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${c.phone}`)}
              style={[styles.callBtn, { backgroundColor: "#DCFCE7" }]}
            >
              <Icon name="call" size={18} color="#5BA84F" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => removeContact(c)}
              style={[styles.callBtn, { backgroundColor: "#FEE2E2", marginLeft: 8 }]}
            >
              <Icon name="trash" size={18} color="#F0695C" />
            </TouchableOpacity>
            <View style={styles.info}>
              <AppText variant="bodySM">{c.name}</AppText>
              <AppText variant="bodySM">
                {[c.relation, c.phone].filter(Boolean).join(" • ")}
              </AppText>
              {c.isPrimary && (
                <View style={styles.primaryBadge}>
                  <AppText variant="bodySM">رئيسي</AppText>
                </View>
              )}
            </View>
            <View style={[styles.avatar, { backgroundColor: "#FEE2E2" }]}>
              <Icon name="user" size={20} color={colors.primary} />
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? colors.surface : colors.white }]}>
              <AppText variant="h6" style={{ textAlign: 'center', marginBottom: 16 }}>إضافة جهة طوارئ</AppText>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="الاسم"
                placeholderTextColor={colors.textTertiary}
                value={name}
                onChangeText={setName}
                textAlign="right"
              />
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="صلة القرابة (اختياري)"
                placeholderTextColor={colors.textTertiary}
                value={relation}
                onChangeText={setRelation}
                textAlign="right"
              />
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="رقم الجوال"
                placeholderTextColor={colors.textTertiary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textAlign="right"
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={addContact}
                  disabled={saving}
                  style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
                >
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <AppText variant="bodySM" color="#fff">حفظ</AppText>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowAdd(false)} style={[styles.saveBtn, { backgroundColor: colors.borderLight }]}>
                  <AppText variant="bodySM">إلغاء</AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, alignItems: "flex-end", gap: 2 },
  primaryBadge: {
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    fontSize: 15,
  },
  saveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
  },
});
