import React, { useState, useRef, useEffect } from 'react';
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
  onResend?: () => void | Promise<void>;
}

const OTP_LEN = 6;

export const OtpModal = ({ visible, onClose, onVerify, target, type = 'email', onResend }: OtpModalProps) => {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LEN).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputs = useRef<Array<TextInput | null>>([]);

  // Reset + autofocus the FIRST (leftmost, logical index 0) box whenever the modal opens.
  useEffect(() => {
    if (visible) {
      setOtp(Array(OTP_LEN).fill(''));
      setError('');
      const t = setTimeout(() => inputs.current[0]?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [visible]);

  /** Distribute a (possibly multi-digit) string across boxes starting at `startIndex`. */
  const distribute = (digits: string, startIndex: number) => {
    const clean = digits.replace(/\D/g, '').slice(0, OTP_LEN - startIndex);
    if (!clean) return;
    setOtp(prev => {
      const next = [...prev];
      for (let i = 0; i < clean.length; i++) next[startIndex + i] = clean[i];
      return next;
    });
    setError('');
    const nextEmpty = startIndex + clean.length;
    if (nextEmpty < OTP_LEN) inputs.current[nextEmpty]?.focus();
    else inputs.current[OTP_LEN - 1]?.blur();
  };

  const handleChange = (val: string, index: number) => {
    // Autofill / paste of the full code (keyboard suggestion or SMS autofill)
    if (val.length > 1) {
      distribute(val, index === 0 ? 0 : index);
      return;
    }
    if (val && !/^\d$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    setError('');
    if (val && index < OTP_LEN - 1) inputs.current[index + 1]?.focus();
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
    if (code.length < OTP_LEN) {
      setError(AR ? 'الرجاء إدخال الرمز كاملاً' : 'Please enter the full code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const success = await onVerify(code);
      if (success) {
        setOtp(Array(OTP_LEN).fill(''));
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
              {AR ? 'أدخل الرمز المكون من 6 أرقام المرسل إلى' : 'Enter the 6-digit code sent to'}
            </Text>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.xs }}>
              {target}
            </Text>
          </View>

          {/* Code boxes: ALWAYS logical LTR order (digit 1 leftmost) regardless of app language.
              I18nManager.forceRTL flips 'row' automatically, so we compensate to keep LTR. */}
          <View style={{ flexDirection: 'row', direction: 'ltr', justifyContent: 'center', gap: SP.md, marginBottom: SP.xl }}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={el => { inputs.current[index] = el; }}
                value={digit}
                onChangeText={(val) => handleChange(val, index)}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace') handleBackspace(digit, index);
                }}
                keyboardType="number-pad"
                maxLength={index === 0 ? OTP_LEN : 1}
                autoComplete={index === 0 ? (Platform.OS === 'android' ? 'sms-otp' : 'one-time-code') : 'off'}
                textContentType={index === 0 ? 'oneTimeCode' : 'none'}
                importantForAutofill={index === 0 ? 'yes' : 'no'}
                style={{
                  width: 48,
                  height: 60,
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
            disabled={loading || otp.join('').length < OTP_LEN}
          />

          <TouchableOpacity style={{ marginTop: SP.lg, alignItems: 'center' }} onPress={onResend} disabled={!onResend}>
            <Text style={{ fontSize: FS.sm, color: theme.primary, fontWeight: FW.med }}>
              {AR ? 'إعادة إرسال الرمز' : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
