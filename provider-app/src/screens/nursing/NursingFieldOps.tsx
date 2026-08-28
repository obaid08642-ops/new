import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, TextInput, Switch, Image, Linking } from 'react-native';
import client from '../../api/client';
import { NHeader, NCard, NBtn, NScroll } from '../../components/ui';
import { useTheme, useLang, useToast } from '../../context';
import { FS, FW, R, SP } from '../../constants';
import { I } from '../../components/icons';

export function NursingFieldOps({ order, onBack }: { order: any, onBack: () => void, onRefresh: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'العمليات الميدانية' : 'Field Operations'} onBack={onBack} />
      <NScroll>
        <NCard style={{ borderColor: theme.warn, borderWidth: 1 }}>
          <Text style={{ color: theme.text, fontWeight: FW.bold, fontSize: FS.lg, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'العمليات الميدانية غير متاحة حالياً' : 'Field operations are currently unavailable'}
          </Text>
          <Text style={{ color: theme.textSub, marginTop: SP.md, lineHeight: 22, textAlign: AR ? 'right' : 'left' }}>
            {AR
              ? 'تم إيقاف محاكاة المسافة وGPS والتوقيع وإنهاء الزيارة. لا يمكن تسجيل وصول أو تقديم رعاية أو إنهاء تقرير حتى تتوفر أوامر خادمية تتحقق من هوية الممرض المعتمد، موقع الجهاز، علاقة الزيارة، سجل الحيازة والتوقيع الطبي الخاص.'
              : 'Simulated distance, GPS, signature, and visit completion have been disabled. Check-in, care start, and report completion require server commands that verify the approved nurse, device location, visit relation, custody record, and private clinical signature.'}
          </Text>
          <Text style={{ color: theme.textSub, marginTop: SP.md, textAlign: AR ? 'right' : 'left' }}>
            {AR ? `رقم الزيارة: ${order?.id || '—'}` : `Visit ID: ${order?.id || '—'}`}
          </Text>
        </NCard>
      </NScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: R.md,
    padding: SP.md,
    fontSize: FS.md,
  }
});
