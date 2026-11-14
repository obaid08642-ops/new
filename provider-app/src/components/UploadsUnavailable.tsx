import React from 'react';
import { Text, View } from 'react-native';
import { useLang, useTheme } from '../context';
import { FS, FW, R, SP } from '../constants';

/** Shown instead of an upload / camera / gallery / file button while the backend reports uploads_enabled === false. */
export function UploadsUnavailable({ style }: { style?: object }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  return (
    <View testID="uploads-unavailable" style={[{ backgroundColor: theme.warnBg, borderRadius: R.lg, padding: SP.md }, style]}>
      <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.warn, textAlign: AR ? 'right' : 'left' }}>
        {AR ? 'رفع الملفات غير متاح مؤقتًا. حاول لاحقًا.' : 'File uploads are temporarily unavailable. Try again later.'}
      </Text>
    </View>
  );
}
