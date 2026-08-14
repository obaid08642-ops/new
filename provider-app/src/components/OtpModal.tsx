import React, { useState, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme, useLang } from '../context';
import { FS, FW, R, SP } from '../constants';
import { NBtn } from './ui';
import { I as NIcon } from './icons';

interface OtpModalProps {
  visible: boolean;
  onClose: () => void;
  onVerify: (otp: string) => Promise<boolean>;
  target: string;
  type?: 'email' | 'phone';
}

export const OtpModal = ({ visible, onClose, onVerify, target, type = 'phone' }: OtpModalProps) => {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const inputs = useRef<Array<TextInput | null>>([]);

  const handleChange = (val: string, index: number) => {
    if (val.length > 1) val = val[val.length - 1]; // keep only last char
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    setError('');

    if (val && index < 3) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (val: string, index: number) => {
    if (!val && index > 0) {
      inputs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      setError('');
    }
  };

  const submit = async () => {
    const code = otp.join('');
    if (code.length < 4) {
      setError(AR ? 'الرجاء إدخال الرمز كاملاً' : 'Please enter the full code');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const success = await onVerify(code);
      if (success) {
        setOtp(['', '', '', '']);
        onClose();
      } else {
        setError(AR ? 'رمز التحقق غير صحيح' : 'Invalid verification code');
      }
    } catch (e: any) {
      setError(e.message || (AR ? 'حدث خطأ ما' : 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, padding: SP.xl, paddingBottom: Platform.OS === 'ios' ? 40 : SP.xl }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.xl }}>
            <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>
              {AR ? 'رمز التحقق' : 'Verification Code'}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: SP.sm, backgroundColor: theme.surface2, borderRadius: R.full }}>
              <NIcon name="close" size={20} color={theme.textSub} />
            </TouchableOpacity>
          </View>

          <View style={{ alignItems: 'center', marginBottom: SP.xl }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.primary + '15', alignItems: 'center', justifyContent: 'center', marginBottom: SP.md }}>
              {type === 'phone' ? <NIcon name="phone" size={32} color={theme.primary} /> : <NIcon name="email" size={32} color={theme.primary} />}
            </View>
            <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center', lineHeight: 24, paddingHorizontal: SP.xl }}>
              {AR ? 'أدخل الرمز المكون من 4 أرقام المرسل إلى' : 'Enter the 4-digit code sent to'}
            </Text>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.xs }}>
              {target}
            </Text>
          </View>

          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'center', gap: SP.md, marginBottom: SP.xl }}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={el => { inputs.current[index] = el; }}
                value={digit}
                onChangeText={(val) => handleChange(val, index)}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace') handleBackspace(digit, index);
                }}
                keyboardType="numeric"
                maxLength={1}
                style={{
                  width: 56,
                  height: 64,
                  borderRadius: R.lg,
                  borderWidth: 2,
                  borderColor: digit ? theme.primary : error ? theme.danger : theme.border,
                  backgroundColor: theme.inputBg,
                  fontSize: FS["3xl"] || 24,
                  fontWeight: FW.bold,
                  textAlign: 'center',
                  color: theme.text
                }}
              />
            ))}
          </View>

          {error ? (
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: SP.sm, marginBottom: SP.xl }}>
              <NIcon name="alert-circle" size={16} color={theme.danger} />
              <Text style={{ color: theme.danger, fontSize: FS.sm }}>{error}</Text>
            </View>
          ) : null}

          <NBtn 
            label={loading ? (AR ? 'جاري التحقق...' : 'Verifying...') : (AR ? 'تأكيد الرمز' : 'Verify Code')} 
            onPress={submit} 
            disabled={loading || otp.join('').length < 4}
          />
          
          <TouchableOpacity style={{ marginTop: SP.lg, alignItems: 'center' }}>
            <Text style={{ fontSize: FS.sm, color: theme.primary, fontWeight: FW.med }}>
              {AR ? 'إعادة إرسال الرمز' : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
