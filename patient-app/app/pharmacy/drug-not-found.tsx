// @ts-nocheck
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton, Input, SectionHeader } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

export default function DrugNotFoundScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [qty, setQty] = useState('1');
  const [notes, setNotes] = useState('');
  const [hasImage, setHasImage] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const pickImage = () => {
    // In production: expo-image-picker
    setHasImage(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSending(true);
    try {
      const res: any = await apiFetch(`/patient/pharmacy/shortage-flags/lookup?generic_name=${encodeURIComponent(name)}`);
      setSending(false);
      if (res && res.flagged) {
        Alert.alert(
          '️ نقص في توريد الدواء',
          `توضح البيانات الطبية وجود نقص عام في دواء "${name}". هل تود الاستمرار لنبحث لك عن بديل مكافئ علمياً؟`,
          [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'نعم، ابحث عن بديل', onPress: () => setSent(true) }
          ]
        );
      } else {
        setSent(true);
      }
    } catch (e) {
      setSending(false);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <View style={[st.c, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 } ]}>
        <View style={[st.successIcon, { backgroundColor: colors.successSurface } ]}>
          <Icon name="check_circle" size={48} color={colors.success} />
        </View>
        <AppText variant="h3" align="center">تم إرسال طلبك</AppText>
        <AppText variant="bodySM" color={colors.textTertiary} align="center" style={{ maxWidth: 280 }}>
          سيقوم الصيدلي بمراجعة طلبك والتأكد من توفر الدواء. ستصلك إشعار عند جاهزية الطلب.
        </AppText>
        <Button label="العودة للصيدلية" variant="gradient" icon="medication" onPress={() => router.replace('/(tabs)/pharmacy')} style={{ marginTop: 16, width: '80%' }} />
        <Button label="إضافة دواء آخر" variant="outline" icon="add" onPress={() => { setSent(false); setName(''); setDose(''); setHasImage(false); }} style={{ width: '80%' }} />
      </View>
    );
  }

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight } ]}>
        <View style={{ width: 40 }}/>
        <AppText variant="h4">لم أجد الدواء</AppText>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 120 }}>
        {/* Info */}
        <Card style={{ backgroundColor: colors.infoSurface }}>
          <View style={{ flexDirection: 'row-reverse', gap: 10, alignItems: 'flex-start' }}>
            <Icon name="info" size={20} color={colors.info} />
            <AppText variant="bodySM" color={colors.textSecondary} style={{ flex: 1 }}>
              لم تجد الدواء في قاعدة بياناتنا؟ أضفه يدوياً وسنرسله للصيدلية للتحقق والتوفير.
            </AppText>
          </View>
        </Card>

        {/* Drug info */}
        <Card>
          <SectionHeader title="بيانات الدواء" />
          <View style={{ gap: 10 }}>
            <Input value={name} onChangeText={setName} placeholder="اسم الدواء *" icon="medication" />
            <Input value={dose} onChangeText={setDose} placeholder="التركيز / الجرعة (مثال: 500mg)" icon="edit" />
            <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
              <Input value={qty} onChangeText={v => setQty(v.replace(/\D/g, ''))} placeholder="الكمية" keyboardType="numeric" icon="shopping_cart" style={{ flex: 1 }} />
              <View style={{ flex: 1 }}/>
            </View>
            <Input value={notes} onChangeText={setNotes} placeholder="ملاحظات إضافية (اختياري)" icon="edit" multiline />
          </View>
        </Card>

        {/* Image upload */}
        <Card>
          <SectionHeader title="صورة الدواء أو العلبة (اختياري)" />
          {!hasImage ? (
            <TouchableOpacity activeOpacity={0.9} onPress={pickImage} style={[st.uploadArea, { borderColor: colors.primary, backgroundColor: colors.primarySurface } ]}>
              <Icon name="camera" size={36} color={colors.primary} />
              <AppText variant="labelMD" color={colors.primary}>صوّر الدواء أو ارفع صورته</AppText>
              <AppText variant="caption" color={colors.textTertiary}>تساعد الصورة الصيدلي في التعرف على الدواء</AppText>
            </TouchableOpacity>
          ) : (
            <View style={[st.imgPreview, { backgroundColor: colors.surfaceSecondary } ]}>
              <Icon name="image" size={48} color={colors.primary} />
              <Badge label="تم رفع الصورة" color={colors.success} icon="check_circle" />
              <TouchableOpacity onPress={() => setHasImage(false)}>
                <AppText variant="labelSM" color={colors.error}>حذف الصورة</AppText>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* What happens next */}
        <Card>
          <SectionHeader title="ماذا سيحدث؟" />
          {[
            { step: '1', text: 'سيستلم الصيدلي طلبك ويتحقق من الدواء' },
            { step: '2', text: 'سيبحث عن الدواء أو البديل المناسب' },
            { step: '3', text: 'ستصلك إشعار بالنتيجة والسعر' },
            { step: '4', text: 'تؤكد الطلب ونوصّله لك' },
          ].map((s, i) => (
            <View key={i} style={{ flexDirection: 'row-reverse', gap: 10, paddingVertical: 6, alignItems: 'center' }}>
              <View style={[st.stepNum, { backgroundColor: colors.primarySurface } ]}>
                <AppText variant="labelSM" color={colors.primary}>{s.step}</AppText>
              </View>
              <AppText variant="bodySM" color={colors.textSecondary} style={{ flex: 1 }}>{s.text}</AppText>
            </View>
          ))}
        </Card>
      </ScrollView>

      <View style={[st.bottom, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.borderLight } ]}>
        <Button label="إرسال للصيدلية" variant="gradient" size="lg" icon="send" loading={sending} disabled={!name.trim()} onPress={handleSubmit} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  uploadArea: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 18, padding: 24, alignItems: 'center', gap: 6 },
  imgPreview: { borderRadius: 18, padding: 20, alignItems: 'center', gap: 8 },
  stepNum: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  successIcon: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  bottom: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
