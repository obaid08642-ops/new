import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, StatusBar } from 'react-native';
import { useTheme, useLang } from '../../context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NHeader, NCard, NBtn, NInput } from '../../components/ui';
import { I } from '../../components/icons';
import { SP, R, FS, FW } from '../../constants';
import client from '../../api/client';
import { useAuth, useToast } from '../../context';

export function PendingDashboard({ onExplore, onLogout, providerType }: { onExplore: () => void; onLogout: () => void; providerType?: string }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { user } = useAuth();
  const AR = lang === 'ar';
  const { show } = useToast();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    // If we have user info, check if email is verified
    // (Assuming user object has email_verified field)
    if (user?.email) setEmailVerified(true);
  }, [user]);

  const sendOtp = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      await client.post('/auth/send-otp', { identifier: user.email });
      setOtpSent(true);
    } catch (e) {
      show(AR ? 'فشل إرسال رمز التحقق' : 'Failed to send OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || !user?.email) return;
    setLoading(true);
    try {
      await client.post('/auth/verify-otp', { identifier: user.email, code: otp });
      setEmailVerified(true);
       // refresh global state
    } catch (e) {
      show(AR ? 'رمز غير صحيح أو منتهي الصلاحية' : 'Invalid OTP or expired', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.statusBar} />
      <ScrollView contentContainerStyle={{ padding: SP.xl, paddingTop: insets.top + 12, paddingBottom: 48 }}>
        
        <View style={{ alignItems: 'center', marginBottom: SP.xxl }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: theme.warnBg,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: SP.lg,
          }}>
            <I name="hourglass" size={36} color="#FFF" />
          </View>
          <Text style={{ fontSize: FS['3xl'], fontWeight: FW.bold, color: theme.text, textAlign: 'center', marginBottom: SP.sm }}>
            {AR ? 'حسابك قيد المراجعة' : 'Account Under Review'}
          </Text>
          <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center', lineHeight: 24 }}>
            {AR
              ? 'تم استلام طلبك بنجاح وهو الآن قيد المراجعة الإدارية. ستتمكن من ممارسة عملك بمجرد اعتماده.'
              : 'Your application has been received and is under administrative review. You can start working once approved.'}
          </Text>
        </View>

        {!emailVerified && user?.email && (
          <NCard style={{ marginBottom: SP.xl, borderColor: theme.warn, borderWidth: 1 }}>
            <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.warn, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
              {AR ? 'تأكيد البريد الإلكتروني' : 'Verify Email Address'}
            </Text>
            <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
              {AR ? `نحتاج لتأكيد بريدك الإلكتروني (${user.email}) لضمان أمان حسابك.` : `Please verify your email (${user.email}) to secure your account.`}
            </Text>
            
            {!otpSent ? (
              <NBtn label={AR ? 'إرسال رمز التحقق' : 'Send Verification Code'} onPress={sendOtp} loading={loading} />
            ) : (
              <View>
                <NInput
                  label={AR ? 'أدخل الرمز' : 'Enter Code'}
                  value={otp}
                  onChange={setOtp}
                  kbType="number-pad"
                  placeholder="123456"
                />
                <NBtn label={AR ? 'تأكيد الرمز' : 'Verify'} onPress={verifyOtp} loading={loading} />
              </View>
            )}
          </NCard>
        )}

        {emailVerified && (
          <NCard style={{ marginBottom: SP.xl, backgroundColor: theme.successBg, borderColor: theme.success, borderWidth: 1 }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.success, textAlign: 'center' }}>
              {AR?'البريد الإلكتروني مؤكد':'Email Verified'}
            </Text>
          </NCard>
        )}

        <NCard style={{ marginBottom: SP.xl }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
            {AR ? 'الخطوات القادمة' : 'Next Steps'}
          </Text>
          {[
            { ar: 'مراجعة التراخيص والمستندات', en: 'Review licenses and documents' },
            { ar: 'مراجعة المواعيد وقائمة الأسعار', en: 'Review schedules and pricing' },
            { ar: 'اعتماد الحساب و تفعيله', en: 'Account approval and activation' }
          ].map((s, i) => (
            <View key={i} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: SP.sm }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary, marginHorizontal: SP.sm }} />
              <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? s.ar : s.en}</Text>
            </View>
          ))}
        </NCard>

        <NBtn label={AR ? 'استكشاف التطبيق' : 'Explore App'} onPress={onExplore} style={{ marginBottom: SP.md }} />
        <NBtn label={AR ? 'تسجيل الخروج' : 'Log Out'} variant="ghost" onPress={onLogout} />

      </ScrollView>
    </View>
  );
}
