import React from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
// DEVICE_STANDARD §5: the safe-area-context SafeAreaView (iOS and Android), never react-native's iOS-only one
import { SafeAreaView } from 'react-native-safe-area-context';
import { I as NIcon } from './icons';
import { useTheme, useLang } from '../context';
import { FS, FW, R, SP, C } from '../constants';
import { tokens, withAlpha } from '../theme/tokens';

interface SuccessScreenProps {
  onDone: () => void;
  title?: string;
  message?: string;
}

export const SuccessScreen = ({ onDone, title, message }: SuccessScreenProps) => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const { lang, t: tt } = useLang();
  const AR = lang === 'ar';

  const defaultTitle = tt('rri.2cbff28d');
  const defaultMessage = tt('rri.52df40d2');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SP.xl }}>
        
        <View style={{ marginBottom: SP.xxl, alignItems: 'center' }}>
          <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: withAlpha(tokens.success, 0.20), alignItems: 'center', justifyContent: 'center', marginBottom: SP.lg }}>
            <NIcon name="check-circle" size={64} color={tokens.success} />
          </View>
          
          <Text style={{ fontSize: 28, fontWeight: FW.bold, color: theme.text, marginBottom: SP.md, textAlign: 'center' }}>
            {title || defaultTitle}
          </Text>
          
          <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center', lineHeight: 26, paddingHorizontal: SP.md }}>
            {message || defaultMessage}
          </Text>
        </View>

        <TouchableOpacity 
          onPress={onDone}
          style={{ width: width - SP.xl * 2, backgroundColor: theme.primary, paddingVertical: 16, borderRadius: R.md, alignItems: 'center', position: 'absolute', bottom: SP.xxl }}
        >
          <Text style={{ color: C.white, fontSize: FS.md, fontWeight: FW.bold }}>
            {tt('rri.269c1faf')}
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};
