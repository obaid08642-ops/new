// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';
import * as ImagePicker from 'expo-image-picker';
import { pickLocalized } from '../../src/utils/localize';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

export default function AddPolicyScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [company, setCompany] = useState('');
  const [policyNum, setPolicyNum] = useState('');
  const [memberId, setMemberId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [ocrUsed, setOcrUsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);

  React.useEffect(() => {
    apiFetch('/insurance/companies')
      .then(res => setCompanies(Array.isArray(res) ? res : []))
      .catch(() => setCompanies([]));
  }, []);

  const handleScanCard = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        showLocalizedAlert('إذن الكاميرا', 'نحتاج إذن الكاميرا لمسح بطاقة التأمين.');
        return;
      }
      const shot = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
      if (shot.canceled || !shot.assets?.[0]?.base64) return;
      setIsScanning(true);
      const res = await apiFetch('/insurance/ocr-extract', {
        method: 'POST',
        body: JSON.stringify({ image_base64: shot.assets[0].base64, mime_type: 'image/jpeg' }),
      });
      if (res.success && res.extracted_data) {
        const data = res.extracted_data;
        if (data.policy_number) setPolicyNum(data.policy_number);
        if (data.national_id) setMemberId(data.national_id);
        if (data.member_name) setMemberName(data.member_name);
        if (data.expiry_date) setExpiry(data.expiry_date);
        // Match the extracted provider name against the real companies list
        if (data.provider) {
          const needle = String(data.provider).toLowerCase();
          const match = companies.find(c =>
            String(c.name_ar || '').toLowerCase().includes(needle) ||
            String(c.name_en || '').toLowerCase().includes(needle) ||
            needle.includes(String(c.code || '').toLowerCase()));
          if (match) setCompany(match.id);
        }
        setOcrUsed(true);
        showLocalizedAlert('نجح المسح', 'تم استخراج البيانات المرئية من البطاقة — راجعها قبل الحفظ.');
      }
    } catch (err: any) {
      showLocalizedAlert('خطأ', err.message || 'فشل التعرف على البطاقة — أدخل البيانات يدويًا');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = async () => {
    if (!company || !policyNum) return;
    setIsSaving(true);
    try {
      const compObj = companies.find(c => c.id === company);
      await apiFetch('/insurance/save-policy', {
        method: 'POST',
        body: JSON.stringify({
          provider: pickLocalized(compObj?.name_ar, compObj?.name_en) || compObj?.code,
          company_id: compObj?.code,
          policy_number: policyNum,
          ...(expiry ? { expiry_date: expiry } : {}),
          ...(memberName ? { member_name: memberName } : {}),
          national_id: memberId || undefined,
          verified: false,
          ocr_extracted: ocrUsed,
        }),
      });
      router.replace('/insurance/hub');
    } catch (err: any) {
      showLocalizedAlert('خطأ', err.message || 'فشل حفظ بوليصة التأمين');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: isDark ? colors.surface : colors.white } ]}>
        <AppText variant="bodySM">إضافة بوليصة تأمين</AppText>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
        {/* Scan Card Option */}
        <TouchableOpacity
          onPress={handleScanCard}
          disabled={isScanning}
          style={[styles.scanCard, { backgroundColor: isDark ? colors.surface : '#EBF3FF', borderColor: colors.primary + '40' } ]}>
          {isScanning ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <View>
                <AppText variant="bodySM">مسح بطاقة التأمين</AppText>
                <AppText variant="bodySM">صوّر بطاقتك وسنستخرج البيانات تلقائياً</AppText>
              </View>
              <Icon name="camera" size={28} color={colors.primary} />
            </>
          )}
        </TouchableOpacity>

        <View style={styles.orRow}>
          <View style={[styles.orLine, { backgroundColor: colors.border }]} />
          <AppText variant="bodySM">أو أدخل يدوياً</AppText>
          <View style={[styles.orLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Company Selection */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">شركة التأمين</AppText>
          {companies.length === 0 && (
            <AppText variant="bodySM" color={colors.textTertiary}>لا توجد شركات تأمين متعاقدة متاحة حاليًا</AppText>
          )}
          <View style={styles.companiesGrid}>
            {companies.map(c => (
              <TouchableOpacity key={c.id} onPress={() => setCompany(c.id)}
                style={[styles.companyBtn, company === c.id && { borderColor: colors.primary, backgroundColor: colors.primary + '12' } ]}>
                <AppText variant="bodySM">{pickLocalized(c.name_ar, c.name_en) || c.code}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Policy Details */}
        <View style={[styles.card, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
          <AppText variant="bodySM">بيانات البوليصة</AppText>
          {[
            { label: 'رقم البوليصة', val: policyNum, setter: setPolicyNum, placeholder: 'رقم البوليصة كما في البطاقة' },
            { label: 'رقم العضوية / الهوية الوطنية', val: memberId, setter: setMemberId, placeholder: 'الهوية الوطنية / الإقامة' },
            { label: 'اسم العضو (اختياري)', val: memberName, setter: setMemberName, placeholder: 'الاسم كما في البطاقة' },
            { label: 'تاريخ الانتهاء (اختياري)', val: expiry, setter: setExpiry, placeholder: 'YYYY-MM-DD' },
          ].map((f, i) => (
            <View key={i} style={styles.fieldWrap}>
              <AppText variant="bodySM">{f.label}</AppText>
              <View style={[styles.inputRow, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary, borderColor: colors.border } ]}>
                <TextInput style={[styles.input, { color: colors.textPrimary }]} value={f.val} onChangeText={f.setter as any}
                  placeholder={f.placeholder} placeholderTextColor={colors.textTertiary} textAlign="right" />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8, backgroundColor: isDark ? colors.surface : colors.white } ]}>
        <TouchableOpacity onPress={handleSave} disabled={!company || !policyNum || isSaving}
          activeOpacity={0.85} style={{ opacity: !company || !policyNum ? 0.6 : 1 }}>
          <View style={[styles.saveBtn, { backgroundColor: '#0f3460' }]}>
            <AppText variant="bodySM">{isSaving ? 'جاري الحفظ...' : 'حفظ وإضافة البوليصة '}</AppText>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14 },
  title: { fontSize: 17, fontWeight: '800' },
  content: { padding: 16, gap: 12 },
  scanCard: { borderRadius: 18, borderWidth: 1.5, padding: 16, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  scanTitle: { fontSize: 15, fontWeight: '800', textAlign: 'right', marginBottom: 4 },
  scanSub: { fontSize: 12, fontWeight: '400', textAlign: 'right' },
  orRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 13, fontWeight: '400' },
  card: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right', marginBottom: 12 },
  companiesGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  companyBtn: { width: '22%', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)', padding: 10, alignItems: 'center', gap: 4 },
  companyLogo: { fontSize: 22 },
  companyName: { fontSize: 9, fontWeight: '700', textAlign: 'center', lineHeight: 13 },
  fieldWrap: { marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '700', textAlign: 'right', marginBottom: 6 },
  inputRow: { flexDirection: 'row-reverse', alignItems: 'center', borderRadius: 12, borderWidth: 1, height: 46, paddingHorizontal: 12 },
  input: { flex: 1, fontSize: 14, fontWeight: '400' },
  bottomBar: { paddingHorizontal: 16, paddingTop: 12 },
  saveBtn: { height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
