import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useLang, useToast } from '../../context';

export function RegistrationSuccess({ onDone, email, providerType = 'provider' }: { onDone: () => void; email?: string; providerType?: string }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [verified, setVerified] = useState(false);

  const handleSendOtp = async () => {
    setLoading(true);
    // Simulating sending OTP via email
    await new Promise(r => setTimeout(r, 1500));
    setOtpSent(true);
    setLoading(false);
    show(AR ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' : 'Verification code sent to email', 'success');
  };

  const handleVerify = async () => {
    if (!otp || otp.length < 4) {
      show(AR ? 'الرمز غير صحيح' : 'Invalid code', 'error');
      return;
    }
    setLoading(true);
    // Simulating verifying OTP
    await new Promise(r => setTimeout(r, 1000));
    setVerified(true);
    setLoading(false);
    show(AR ? 'تم تأكيد البريد الإلكتروني بنجاح' : 'Email verified successfully', 'success');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.primary + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
          <Ionicons name={verified ? "checkmark-circle" : "mail-unread"} size={48} color={theme.primary} />
        </View>

        <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text, marginBottom: 12, textAlign: 'center' }}>
          {AR ? 'تم إرسال طلبك بنجاح!' : 'Application Submitted!'}
        </Text>
        
        <Text style={{ fontSize: 16, color: theme.textSub, textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
          {AR ? 'طلبك قيد المراجعة حالياً من قبل الإدارة. سيتم إشعارك فور الموافقة.' : 'Your application is under review by admin. You will be notified upon approval.'}
        </Text>

        {!verified ? (
          <View style={{ width: '100%', backgroundColor: theme.card, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 8 }}>
              {AR ? 'تأكيد البريد الإلكتروني' : 'Verify Email Address'}
            </Text>
            <Text style={{ fontSize: 14, color: theme.textSub, marginBottom: 16 }}>
              {email ? (AR ? `يرجى تأكيد بريدك الإلكتروني: ${email}` : `Please verify your email: ${email}`) : (AR ? 'يرجى تأكيد بريدك الإلكتروني لضمان التواصل.' : 'Please verify your email for communication.')}
            </Text>

            {!otpSent ? (
              <TouchableOpacity 
                onPress={handleSendOtp}
                disabled={loading}
                style={{ backgroundColor: theme.primary, padding: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="send" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                      {AR ? 'إرسال رمز التفعيل' : 'Send Verification Code'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder={AR ? 'أدخل الرمز المكون من 4 أرقام' : 'Enter 4-digit code'}
                  keyboardType="number-pad"
                  maxLength={4}
                  style={{ backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14, fontSize: 18, textAlign: 'center', letterSpacing: 4, marginBottom: 16, color: theme.text }}
                />
                <TouchableOpacity 
                  onPress={handleVerify}
                  disabled={loading}
                  style={{ backgroundColor: theme.primary, padding: 14, borderRadius: 12, alignItems: 'center' }}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                      {AR ? 'تأكيد الرمز' : 'Verify Code'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={{ width: '100%', backgroundColor: theme.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 24, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="checkmark-circle" size={24} color={theme.success} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 14, color: theme.success, fontWeight: '600' }}>
              {AR ? 'البريد الإلكتروني مؤكد' : 'Email Verified'}
            </Text>
          </View>
        )}

        <TouchableOpacity 
          onPress={() => {
            if (typeof onDone === 'function') {
              onDone();
            } else {
              console.warn('onDone is not a function');
            }
          }}
          style={{ width: '100%', backgroundColor: theme.card, padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
            {AR ? 'العودة للصفحة الرئيسية' : 'Return to Home'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
