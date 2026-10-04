import React, { useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Platform, SafeAreaView, Alert } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import { useTheme, useLang } from '../context';
import { FS, FW, R, SP } from '../constants';
import { I as NIcon } from './icons';

interface SignatureCanvasModalProps {
  visible: boolean;
  onClose: () => void;
  onOK: (signatureBase64: string) => void;
}

export const SignatureCanvasModal = ({ visible, onClose, onOK }: SignatureCanvasModalProps) => {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  const ref = useRef<any>(null);

  const handleOK = (signature: string) => {
    onOK(signature);
    onClose();
  };

  const handleClear = () => {
    ref.current?.clearSignature();
  };

  const handleConfirm = () => {
    ref.current?.readSignature();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: SP.lg }}>
          <View style={{ width: '100%', height: 400, backgroundColor: theme.surface, borderRadius: R.xl, overflow: 'hidden', paddingBottom: SP.xl }}>
            
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', padding: SP.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>
                {AR ? 'التوقيع الإلكتروني' : 'Electronic Signature'}
              </Text>
              <TouchableOpacity onPress={onClose} style={{ padding: SP.sm, backgroundColor: theme.surface2, borderRadius: R.full }}>
                <NIcon name="close" size={20} color={theme.textSub} />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
              <SignatureScreen
                ref={ref}
                onOK={handleOK}
                onEmpty={() => {
                  Alert.alert(AR ? 'عذراً' : 'Sorry', AR ? 'الرجاء رسم التوقيع داخل المربع أولاً' : 'Please draw your signature inside the box first');
                }}
                webStyle={`
                  .m-signature-pad { box-shadow: none; border: none; margin: 0; height: 100%; }
                  .m-signature-pad--body { border: none; }
                  .m-signature-pad--footer { display: none; margin: 0px; }
                  body,html { width: 100%; height: 100%; margin: 0; padding: 0; }
                `}
                autoClear={true}
                descriptionText={AR ? 'وقع هنا' : 'Sign Here'}
                penColor={theme.text}
              />
            </View>

            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', paddingHorizontal: SP.lg, paddingTop: SP.lg }}>
              <TouchableOpacity 
                onPress={handleClear} 
                style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.xs, paddingVertical: SP.sm, paddingHorizontal: SP.lg, borderRadius: R.md, backgroundColor: theme.surface2 }}
              >
                <NIcon name="refresh" size={16} color={theme.textSub} />
                <Text style={{ color: theme.textSub, fontWeight: FW.med, fontSize: FS.md }}>{AR ? 'مسح' : 'Clear'}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleConfirm} 
                style={{ paddingVertical: SP.sm, paddingHorizontal: SP.xl, borderRadius: R.md, backgroundColor: theme.primary }}
              >
                <Text style={{ color: '#FFF', fontWeight: FW.bold, fontSize: FS.md }}>{AR ? 'حفظ التوقيع' : 'Save Signature'}</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};
