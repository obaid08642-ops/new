/**
 * Q79: one tap target per KYC document a registration still lacked (IBAN
 * letter, VAT certificate). Picks a photo or a PDF; the screen uploads it and
 * sends it as a typed document with step2.
 */
import React from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useLang, useTheme } from '../context';

export function KycDocButton({ label, uri, onPicked, error, testID }: { label: string; uri?: string; onPicked: (uri: string, mime: string) => void; error?: string; testID?: string }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  const pick = () => {
    Alert.alert(label, AR ? 'اختر طريقة الرفع' : 'Choose upload method', [
      {
        text: AR ? 'معرض الصور' : 'Photo Gallery',
        onPress: async () => {
          const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
          if (!res.canceled) onPicked(res.assets[0].uri, res.assets[0].mimeType || 'image/jpeg');
        },
      },
      {
        text: AR ? 'ملف PDF' : 'PDF file',
        onPress: async () => {
          const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
          if (!res.canceled) onPicked(res.assets[0].uri, res.assets[0].mimeType || 'application/pdf');
        },
      },
      { text: AR ? 'إلغاء' : 'Cancel', style: 'cancel' },
    ]);
  };
  return (
    <>
      <TouchableOpacity testID={testID} onPress={pick} style={{ padding: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: error ? theme.danger : uri ? theme.success : theme.border, borderRadius: 8, alignItems: 'center', marginTop: 8 }}>
        <Text style={{ color: uri ? theme.success : theme.primary }}>{label}{uri ? ' ✓' : ''}</Text>
      </TouchableOpacity>
      {error ? <Text style={{ color: theme.danger, marginTop: 4 }}>{error}</Text> : null}
    </>
  );
}
