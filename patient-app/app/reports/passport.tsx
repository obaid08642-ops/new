// @ts-nocheck
// app/reports/passport.tsx
import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Share
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  IconButton,
  Button,
} from "../../src/components/ui";
import { apiFetch } from "../../src/utils/api";

// PASSPORT_DATA removed

export default function HealthPassportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [profile, setProfile] = React.useState<any>(null);
  const [passport, setPassport] = React.useState<any>(null);

  React.useEffect(() => {
    apiFetch('/medical-profile').then(res => setProfile(res)).catch(() => {});
    apiFetch('/patients/passport').then(res => setPassport(res)).catch(() => setPassport(null));
  }, []);

  const handleSharePassport = async () => {
    if (!profile) return;
    const name = profile.full_name || 'مريض';
    const bloodType = profile.blood_type || 'غير محدد';
    const allergies = (profile.allergies || []).map((a: any) => a.name).join(', ') || 'لا يوجد';
    
    try {
      await Share.share({
        message: `الملف الطبي السريع للمريض: ${name}\nفصيلة الدم: ${bloodType}\nالحساسية: ${allergies}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
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
        <IconButton icon="back" onPress={() => router.back()} />
        <View style={{ alignItems: "center" }}>
          <AppText variant="h4">جواز السفر الصحي</AppText>
          <AppText variant="caption" color={colors.textTertiary}>
            ملخص طبي سريع للمشاركة الآمنة
          </AppText>
        </View>
        <IconButton icon="share" onPress={handleSharePassport} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          gap: 16,
          paddingBottom: insets.bottom + 60,
        }}
      >
        {/* QR Code Card */}
        <Card style={st.qrCard}>
          <AppText variant="h5" align="center" style={{ marginBottom: 4 }}>
            مسح الملف الطبي السريع
          </AppText>
          <AppText variant="caption" color={colors.textTertiary} align="center">
            اسمح للطبيب أو المسعف بمسح هذا الرمز للوصول الفوري للملخص الطبي
          </AppText>

          {/* Server-signed QR content */}
          <View style={st.qrContainer}>
            <View style={[st.qrSquare, { borderColor: colors.primary }]}> 
              {passport?.qrContent ? (
                <QRCode value={passport.qrContent} size={178} color={colors.textPrimary} backgroundColor={colors.surface} />
              ) : (
                <AppText variant="caption" color={colors.textTertiary} align="center">
                  تعذر إصدار رمز التحقق حالياً. لن يتم عرض رمز بديل غير قابل للتحقق.
                </AppText>
              )}
            </View>
          </View>

          <Badge
            label={passport?.verificationToken ? "رمز تحقق موقّع من المنصة" : "رمز التحقق غير متاح"}
            color={passport?.verificationToken ? colors.success : colors.warning}
            style={{ alignSelf: "center", marginTop: 12 }}
          />
        </Card>

        {/* General Info Card */}
        <Card style={st.infoGrid}>
          <View
            style={[
              st.gridItem,
              { borderLeftWidth: 1, borderLeftColor: colors.borderLight },
            ]}
          >
            <AppText variant="caption" color={colors.textTertiary}>
              فصيلة الدم
            </AppText>
            <AppText variant="h3" color={colors.error}>
              {profile?.blood_type || "غير محدد"}
            </AppText>
          </View>
          <View
            style={[
              st.gridItem,
              { borderLeftWidth: 1, borderLeftColor: colors.borderLight },
            ]}
          >
            <AppText variant="caption" color={colors.textTertiary}>
              العمر / الجنس
            </AppText>
            <AppText variant="h5">
              {profile?.date_of_birth ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / 31557600000) + ' سنة' : '--'} / {profile?.gender === 'female' ? 'أنثى' : 'ذكر'}
            </AppText>
          </View>
          <View style={st.gridItem}>
            <AppText variant="caption" color={colors.textTertiary}>
              المريض
            </AppText>
            <AppText variant="h6" numberOfLines={1}>
              {profile?.full_name || "مريض"}
            </AppText>
          </View>
        </Card>

        {/* Allergies Card */}
        <Card>
          <View
            style={{
              flexDirection: "row-reverse",
              gap: 8,
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Icon name="warning" size={20} color={colors.warning} />
            <AppText variant="h5">حساسية الأدوية أو الأغذية</AppText>
          </View>
          <View
            style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}
          >
            {(!profile?.allergies || profile.allergies.length === 0) ? (
              <AppText variant="caption" color={colors.textTertiary}>لا توجد حساسية مسجلة</AppText>
            ) : null}
            {profile?.allergies?.map((allergy: any, i: number) => (
              <Badge key={i} label={allergy.name} color={colors.warning} />
            ))}
          </View>
        </Card>

        {/* Active Medications */}
        <Card>
          <View
            style={{
              flexDirection: "row-reverse",
              gap: 8,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Icon name="medication" size={20} color={colors.success} />
            <AppText variant="h5">الأدوية المستمرة النشطة</AppText>
          </View>
          {(!profile?.long_term_medications || profile.long_term_medications.length === 0) ? (
             <AppText variant="caption" color={colors.textTertiary} align="right">لا توجد أدوية مستمرة مسجلة</AppText>
          ) : null}
          {profile?.long_term_medications?.map((med: any, i: number) => (
            <View
              key={i}
              style={[
                st.medRow,
                {
                  borderBottomColor: colors.borderLight,
                  borderBottomWidth:
                    i === profile.long_term_medications.length - 1 ? 0 : 1,
                },
              ]}
            >
              <View style={{ alignItems: "flex-start" }}>
                <Badge label="مستمر" color={colors.success} />
              </View>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <AppText variant="labelMD">{med.name}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {med.dosage || med.dose}
                </AppText>
              </View>
            </View>
          ))}
        </Card>

        {/* Emergency Contacts */}
        <Card>
          <View
            style={{
              flexDirection: "row-reverse",
              gap: 8,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Icon name="emergency" size={20} color={colors.error} />
            <AppText variant="h5">جهات اتصال الطوارئ</AppText>
          </View>
          {(!profile?.emergencyContacts || profile.emergencyContacts.length === 0) ? (
            <AppText variant="caption" color={colors.textTertiary} align="right">لا توجد جهات اتصال طوارئ</AppText>
          ) : null}
          {profile?.emergencyContacts?.map((contact: any, i: number) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.8}
              onPress={() =>
                Alert.alert(
                  "اتصال الطوارئ",
                  `هل ترغب في الاتصال بـ ${contact.name}؟`,
                )
              }
              style={[
                st.contactRow,
                {
                  borderBottomColor: colors.borderLight,
                  borderBottomWidth:
                    i === profile.emergencyContacts.length - 1 ? 0 : 1,
                },
              ]}
            >
              <Icon name="call" size={20} color={colors.error} />
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <AppText variant="labelMD">{contact.name}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {contact.phone}
                </AppText>
              </View>
            </TouchableOpacity>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  hdr: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  qrCard: { padding: 20, alignItems: "center" },
  qrContainer: {
    marginTop: 16,
    width: 160,
    height: 160,
    padding: 10,
    backgroundColor: "transparent",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  qrSquare: {
    width: "100%",
    height: "100%",
    borderWidth: 2,
    borderRadius: 10,
    padding: 10,
    justifyContent: "space-between",
  },
  infoGrid: { flexDirection: "row-reverse", paddingVertical: 12 },
  gridItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  medRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  contactRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
});
