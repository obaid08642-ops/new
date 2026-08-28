// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon, IconName } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
  Avatar,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

interface Permission {
  key: string;
  label: string;
  desc: string;
  icon: IconName;
  enabled: boolean;
}

const INITIAL_PERMS: Permission[] = [
  {
    key: "vitals",
    label: "مشاهدة المؤشرات الحيوية",
    desc: "الضغط والسكر والوزن",
    icon: "pulse",
    enabled: false,
  },
  {
    key: "meds",
    label: "مشاهدة الأدوية",
    desc: "قائمة الأدوية والتذكيرات",
    icon: "medication",
    enabled: false,
  },
  {
    key: "reports",
    label: "مشاهدة التقارير",
    desc: "نتائج التحاليل والأشعة",
    icon: "fileDocument",
    enabled: false,
  },
  {
    key: "appointments",
    label: "مشاهدة المواعيد",
    desc: "مواعيد الأطباء والاستشارات",
    icon: "calendar",
    enabled: false,
  },
  {
    key: "booking",
    label: "الحجز نيابةً",
    desc: "حجز مواعيد واستشارات",
    icon: "calendar-check",
    enabled: false,
  },
  {
    key: "pharmacy",
    label: "الطلب من الصيدلية",
    desc: "طلب أدوية نيابةً",
    icon: "shopping_cart",
    enabled: false,
  },
  {
    key: "payment",
    label: "الدفع نيابةً",
    desc: "الدفع من محفظتك لهذا الفرد",
    icon: "wallet",
    enabled: false,
  },
  {
    key: "location",
    label: "مشاركة الموقع",
    desc: "الوصول لموقع الفرد عند الطوارئ",
    icon: "location",
    enabled: false,
  },
  {
    key: "emergency",
    label: "إشعارات الطوارئ",
    desc: "استلام تنبيه عند طلب SOS",
    icon: "emergency",
    enabled: false,
  },
];

export default function FamilyPermissionsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const params = useLocalSearchParams();

  const memberId = (params.id as string);
  const memberName = (params.name as string) || "فرد من العائلة";
  const memberRelation = (params.relation as string) || "قريب";

  const [perms, setPerms] = useState<Permission[]>(INITIAL_PERMS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    // Load the member's CURRENT grants so the toggles reflect reality.
    (async () => {
      try {
        const group = await apiFetch("/family/my-group");
        const member = (group?.members || []).find((m: any) => m.user_id === memberId);
        const granted: string[] = member?.permissions || [];
        setPerms((p) => p.map((perm) => ({ ...perm, enabled: granted.includes(perm.key) })));
      } catch (err) {
        // No group / network — keep defaults, save will surface any error
        console.error("Could not load current permissions:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [memberId]);

  const toggle = (key: string) => {
    setPerms((p) =>
      p.map((perm) =>
        perm.key === key ? { ...perm, enabled: !perm.enabled } : perm,
      ),
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const activeKeys = perms.filter((p) => p.enabled).map((p) => p.key);

      try {
        // Owner path: replace the member's permission set directly (grant + revoke)
        await apiFetch(`/family/member/${memberId}/permissions`, {
          method: "PATCH",
          body: JSON.stringify({ permissions: activeKeys }),
        });
      } catch (ownerErr: any) {
        // Not the owner → fall back to the approval-request flow
        await apiFetch("/family/permissions/request", {
          method: "POST",
          body: JSON.stringify({
            target_member_id: memberId,
            permissions: activeKeys,
          }),
        });
      }

      setNotified(true);
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (err) {
      console.error(err);
      showLocalizedAlert('خطأ', 'تعذر حفظ الصلاحيات');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async () => {
    showLocalizedAlert(
      "تأكيد الإزالة",
      `هل أنت متأكد من رغبتك في إزالة ${memberName} من العائلة؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إزالة",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await apiFetch(`/family/remove-member/${memberId}`, {
                method: "DELETE",
              });
              router.back();
            } catch (err) {
              console.error(err);
              router.back();
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
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
        <View style={{ width: 40 }} />
        <AppText variant="h4">إدارة الصلاحيات</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 160 }}
      >
        {/* Member info */}
        <Card
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Avatar
            size={52}
            icon="user"
            bg={colors.primarySurface}
            iconColor={colors.primary}
          />
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <AppText variant="h5">{memberName}</AppText>
            <Badge label={memberRelation} color={colors.secondary} />
          </View>
        </Card>

        {/* Permissions list */}
        <Card padding={0}>
          {perms.map((perm, i) => (
            <View
              key={perm.key}
              style={[
                st.permRow,
                i < perms.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.borderLight,
                },
              ]}
            >
              <Switch
                value={perm.enabled}
                onValueChange={() => toggle(perm.key)}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
              <View style={{ flex: 1, alignItems: "flex-end", gap: 2 }}>
                <AppText variant="h6">{perm.label}</AppText>
                <AppText variant="caption" color={colors.textTertiary}>
                  {perm.desc}
                </AppText>
              </View>
              <View
                style={[
                  st.permIcon,
                  {
                    backgroundColor: perm.enabled
                      ? colors.primarySurface
                      : colors.surfaceSecondary,
                  },
                ]}
              >
                <Icon
                  name={perm.icon}
                  size={20}
                  color={perm.enabled ? colors.primary : colors.textTertiary}
                />
              </View>
            </View>
          ))}
        </Card>

        {/* Danger zone */}
        <Card style={{ backgroundColor: colors.errorSurface }}>
          <Button
            label="إزالة الفرد من العائلة"
            variant="ghost"
            icon="trash"
            onPress={handleRemoveMember}
            style={{ alignSelf: "center" }}
          />
        </Card>
      </ScrollView>

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
        {notified && (
          <Card
            style={{ backgroundColor: colors.successSurface, marginBottom: 8 }}
          >
            <View
              style={{
                flexDirection: "row-reverse",
                gap: 8,
                alignItems: "center",
              }}
            >
              <Icon name="check_circle" size={20} color={colors.success} />
              <AppText variant="bodySM" color={colors.success}>
                تم الحفظ وإرسال طلب الصلاحيات للعضو للموافقة عليها
              </AppText>
            </View>
          </Card>
        )}
        <Card style={{ backgroundColor: colors.infoSurface, marginBottom: 8 }}>
          <View
            style={{
              flexDirection: "row-reverse",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <Icon name="info" size={16} color={colors.info} />
            <AppText
              variant="caption"
              color={colors.textSecondary}
              style={{ flex: 1 }}
            >
              عند حفظ التغييرات سيتم إرسال الصلاحيات إلى العضو للمراجعة
              والموافقة.
            </AppText>
          </View>
        </Card>
        <Button
          label="طلب تعديل الصلاحيات"
          variant="gradient"
          size="lg"
          icon="check_circle"
          loading={saving}
          onPress={handleSave}
        />
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
  permRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  permIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bottom: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});
