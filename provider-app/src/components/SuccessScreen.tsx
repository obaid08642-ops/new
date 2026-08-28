import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { I as NIcon } from './icons';
import { useTheme, useLang } from '../context';
import { FS, FW, R, SP } from '../constants';

interface SuccessScreenProps {
  onDone: () => void;
  title?: string;
  message?: string;
}

const { width } = Dimensions.get('window');

export const SuccessScreen = ({ onDone, title, message }: SuccessScreenProps) => {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';

  const defaultTitle = AR ? 'نجاح!' : 'Success!';
  const defaultMessage = AR 
    ? 'تم إرسال طلبك بنجاح، وهو الآن قيد المراجعة من الإدارة. سنقوم بالتواصل معك قريباً.' 
    : 'Your application has been submitted successfully and is pending admin approval. We will contact you soon.';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SP.xl }}>
        
        <View style={{ marginBottom: SP.xxl, alignItems: 'center' }}>
          <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#4CAF50' + '20', alignItems: 'center', justifyContent: 'center', marginBottom: SP.lg }}>
            <NIcon name="check-circle" size={64} color="#4CAF50" />
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
          <Text style={{ color: '#FFF', fontSize: FS.md, fontWeight: FW.bold }}>
            {AR ? 'العودة للرئيسية' : 'Back to Home'}
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};
