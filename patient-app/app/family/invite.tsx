// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, Input, SegmentedControl, SectionHeader } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

export default function FamilyInviteScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [method, setMethod] = useState('link');
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInviteCode();
  }, []);

  const loadInviteCode = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/family/invite', { method: 'POST' });
      setInviteCode(res.invite_code);
    } catch (err: any) {
      // If user is not the owner (e.g. they are just a member, or doesn't have a group yet), 
      // let's try to create a group first or show error
      if (err.message && err.message.includes('You must be the group owner')) {
        // Assume they need to be owner
      }
      setInviteCode('NABDAH-ERROR');
    } finally {
      setLoading(false);
    }
  };

  const shareLink = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({ message: `انضم لعائلتي على نبض بلس! استخدم الكود: ${inviteCode}\nhttps://nabdahplus.app/join/${inviteCode}` });
    } catch {}
  };

  const copyCode = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h4">دعوة فرد للعائلة</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
          {/* Member info */}
          <Card>
            <SectionHeader title="بيانات الفرد (اختياري)" />
            <Input value={name} onChangeText={setName} placeholder="اسم الفرد" icon="user" />
            <SegmentedControl value={relation} onChange={setRelation} options={[
              { key: 'spouse', label: 'زوج/ة' }, { key: 'child', label: 'ابن/ة' },
              { key: 'parent', label: 'والد/ة' }, { key: 'other', label: 'آخر' },
            ]} />
          </Card>

          {/* Invite method */}
          <Card>
            <SectionHeader title="طريقة الدعوة" />
            <SegmentedControl value={method} onChange={setMethod} options={[
              { key: 'link', label: 'لينك', icon: 'link' },
              { key: 'qr', label: 'QR Code', icon: 'qrScan' },
              { key: 'code', label: 'كود', icon: 'edit' },
            ]} />

            {method === 'link' && (
              <View style={{ marginTop: 16, gap: 10 }}>
                <View style={[st.linkBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border } ]}>
                  <AppText variant="bodyXS" color={colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>https://nabdahplus.app/join/{inviteCode}</AppText>
                  <TouchableOpacity onPress={copyCode}>
                    <Icon name={copied ? 'check-circle' : 'copy'} size={20} color={copied ? colors.success : colors.primary} />
                  </TouchableOpacity>
                </View>
                <Button label="مشاركة الرابط" variant="gradient" icon="share" onPress={shareLink} />
              </View>
            )}

            {method === 'qr' && (
              <View style={{ marginTop: 16, alignItems: 'center', gap: 12 }}>
                <View style={[st.qrBox, { backgroundColor: colors.surface, borderColor: colors.border } ]}>
                  <View style={st.qrGrid}>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <View key={i} style={[st.qrCell, { backgroundColor: i % 2 === 0 ? colors.textPrimary : 'transparent' }]} />
                    ))}
                  </View>
                  <AppText variant="caption" color={colors.textTertiary} style={{ marginTop: 8 }}>{inviteCode}</AppText>
                </View>
                <AppText variant="bodySM" color={colors.textTertiary} align="center">اطلب من الشخص مسح هذا الكود بكاميرا التطبيق</AppText>
              </View>
            )}

            {method === 'code' && (
              <View style={{ marginTop: 16, alignItems: 'center', gap: 12 }}>
                <View style={[st.codeBox, { backgroundColor: colors.primarySurface } ]}>
                  <AppText variant="displayMD" color={colors.primary} style={{ letterSpacing: 4 }}>{inviteCode}</AppText>
                </View>
                <TouchableOpacity onPress={copyCode} style={{ flexDirection: 'row-reverse', gap: 6, alignItems: 'center' }}>
                  <Icon name={copied ? 'check-circle' : 'copy'} size={16} color={copied ? colors.success : colors.primary} />
                  <AppText variant="labelMD" color={copied ? colors.success : colors.primary}>{copied ? 'تم النسخ!' : 'نسخ الكود'}</AppText>
                </TouchableOpacity>
                <AppText variant="bodySM" color={colors.textTertiary} align="center">أرسل هذا الكود للشخص ليدخله في تطبيقه</AppText>
              </View>
            )}
          </Card>

          {/* Permissions preview */}
          <Card style={{ backgroundColor: colors.infoSurface }}>
            <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'flex-start' }}>
              <Icon name="shield" size={20} color={colors.info} />
              <View style={{ flex: 1 }}>
                <AppText variant="h6" color={colors.info}>الصلاحيات</AppText>
                <AppText variant="bodySM" color={colors.textSecondary}>بعد قبول الدعوة يمكنك التحكم في صلاحيات الفرد — مشاهدة المؤشرات، الأدوية، الحجز نيابةً، وغيرها</AppText>
              </View>
            </View>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  linkBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  qrBox: { width: 200, height: 200, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  qrGrid: { width: 120, height: 120, flexDirection: 'row', flexWrap: 'wrap' },
  qrCell: { width: 40, height: 40 },
  codeBox: { paddingHorizontal: 32, paddingVertical: 20, borderRadius: 18 },
});
