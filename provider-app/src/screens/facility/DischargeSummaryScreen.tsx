import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NScroll, NBtn } from '../../components/ui';
import { SP, FS, FW, R } from '../../constants';

export function DischargeSummaryScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [diagnosis, setDiagnosis] = useState('');
  const [medications, setMedications] = useState('');
  const [instructions, setInstructions] = useState('');

  const handleSave = () => {
    show(AR ? 'تم حفظ ملخص الخروج بنجاح' : 'Discharge summary saved successfully', 'success');
    onBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'ملخص الخروج (Discharge)' : 'Discharge Summary'} onBack={onBack} />
      
      <NScroll>
        <View style={{ padding: SP.xl }}>
          <NCard style={{ marginBottom: SP.xl }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.md }}>
              <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{AR ? 'المريض:' : 'Patient:'}</Text>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>أحمد سعيد</Text>
            </View>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{AR ? 'رقم الملف:' : 'MRN:'}</Text>
              <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text }}>MRN-8472</Text>
            </View>
          </NCard>

          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'التشخيص النهائي' : 'Final Diagnosis'}
          </Text>
          <TextInput
            style={{
              backgroundColor: theme.surface, borderRadius: R.md, padding: SP.md,
              color: theme.text, height: 80, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left',
              marginBottom: SP.lg
            }}
            placeholder={AR ? 'اكتب التشخيص...' : 'Enter diagnosis...'}
            placeholderTextColor={theme.textSub}
            multiline
            value={diagnosis}
            onChangeText={setDiagnosis}
          />

          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'الأدوية الموصوفة' : 'Prescribed Medications'}
          </Text>
          <TextInput
            style={{
              backgroundColor: theme.surface, borderRadius: R.md, padding: SP.md,
              color: theme.text, height: 80, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left',
              marginBottom: SP.lg
            }}
            placeholder={AR ? 'أدخل الأدوية...' : 'Enter medications...'}
            placeholderTextColor={theme.textSub}
            multiline
            value={medications}
            onChangeText={setMedications}
          />

          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'تعليمات ما بعد الخروج' : 'Post-Discharge Instructions'}
          </Text>
          <TextInput
            style={{
              backgroundColor: theme.surface, borderRadius: R.md, padding: SP.md,
              color: theme.text, height: 100, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left',
              marginBottom: SP.xl
            }}
            placeholder={AR ? 'تعليمات الراحة والمراجعة...' : 'Rest and follow-up instructions...'}
            placeholderTextColor={theme.textSub}
            multiline
            value={instructions}
            onChangeText={setInstructions}
          />

          <NBtn label={AR ? 'حفظ ملخص الخروج' : 'Save Discharge Summary'} onPress={handleSave} />
        </View>
      </NScroll>
    </View>
  );
}
