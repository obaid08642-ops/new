import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { contractFileName, saveContractPdf } from '../../utils/contractFile';
import { fetchMyContract } from '../../components/MyContract';
import client from '../../api/client';
import { sendEmailOtp, verifyEmailOtp } from '../../api/otp';
import { useTheme, useLang, useToast } from '../../context';
import { C } from '../../constants';

export function RegistrationSuccess({ onDone, email, providerType = 'provider' }: { onDone: () => void; email?: string; providerType?: string }) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [verified, setVerified] = useState(false);
  const [contractLoading, setContractLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email) { show(tt('regdone.3a0874f7'), 'error'); return; }
    setLoading(true);
    try {
      await sendEmailOtp(email);
      setOtpSent(true);
      show(tt('regdone.83308132'), 'success');
    } catch {
      show(tt('regdone.643574d2'), 'error');
    } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (!otp || otp.length < 6) {
      show(tt('regdone.282fb67e'), 'error');
      return;
    }
    setLoading(true);
    try {
      const ok = await verifyEmailOtp(email || '', otp);
      if (ok) {
        setVerified(true);
        show(tt('regdone.220feb76'), 'success');
      } else {
        show(tt('regdone.95facdd2'), 'error');
      }
    } catch {
      show(tt('regdone.ccd69287'), 'error');
    } finally { setLoading(false); }
  };

  /** Download the signed partnership contract PDF (only when admin granted visibility). */
  const downloadContract = async () => {
    setContractLoading(true);
    try {
      const data = await fetchMyContract(AR ? 'ar' : 'en');
      const b64 = data?.pdf_base64;
      if (!b64) throw new Error('empty');
      await saveContractPdf(b64, contractFileName(data?.sha256));
      show(tt('regdone.1fe27450'), 'success');
    } catch (e: any) {
      // 404: nothing signed yet. The signer is never refused: there is no admin switch over their own contract.
      show(e?.response?.status === 404 ? (tt('regdone.39203eef')) : (tt('regdone.a0cc1939')), 'error');
    } finally { setContractLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingTop: 24 + insets.top, paddingBottom: 24 + insets.bottom, paddingLeft: 24 + insets.left, paddingRight: 24 + insets.right }}>
        
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.primary + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
          <Ionicons name={verified ? "checkmark-circle" : "mail-unread"} size={48} color={theme.primary} />
        </View>

        <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text, marginBottom: 12, textAlign: 'center' }}>
          {tt('regdone.02a4542e')}
        </Text>
        
        <Text style={{ fontSize: 16, color: theme.textSub, textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
          {tt('regdone.ae51e9b9')}
        </Text>

        {!verified ? (
          <View style={{ width: '100%', backgroundColor: theme.card, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 8 }}>
              {tt('regdone.c3d0ede2')}
            </Text>
            <Text style={{ fontSize: 14, color: theme.textSub, marginBottom: 16 }}>
              {email ? (AR ? `يرجى تأكيد بريدك الإلكتروني: ${email}` : `Please verify your email: ${email}`) : (tt('regdone.eeabd13e'))}
            </Text>

            {!otpSent ? (
              <TouchableOpacity 
                onPress={handleSendOtp}
                disabled={loading}
                style={{ backgroundColor: theme.primary, padding: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
                {loading ? <ActivityIndicator color={C.white} /> : (
                  <>
                    <Ionicons name="send" size={20} color={C.white} style={{ marginEnd: 8 }} />
                    <Text style={{ color: C.white, fontSize: 16, fontWeight: '600' }}>
                      {tt('regdone.c4a24798')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View>
                <TextInput
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder={tt('regdone.d476c74e')}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  importantForAutofill="yes"
                  style={{ backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14, fontSize: 18, textAlign: 'center', letterSpacing: 4, marginBottom: 16, color: theme.text, writingDirection: 'ltr' }}
                />
                <TouchableOpacity 
                  onPress={handleVerify}
                  disabled={loading}
                  style={{ backgroundColor: theme.primary, padding: 14, borderRadius: 12, alignItems: 'center' }}>
                  {loading ? <ActivityIndicator color={C.white} /> : (
                    <Text style={{ color: C.white, fontSize: 16, fontWeight: '600' }}>
                      {tt('regdone.c470c8c7')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={{ width: '100%', backgroundColor: theme.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 24, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="checkmark-circle" size={24} color={theme.success} style={{ marginEnd: 12 }} />
            <Text style={{ fontSize: 14, color: theme.success, fontWeight: '600' }}>
              {tt('regdone.3770e714')}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={downloadContract}
          disabled={contractLoading}
          style={{ width: '100%', backgroundColor: theme.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12, flexDirection: 'row', justifyContent: 'center' }}>
          {contractLoading ? <ActivityIndicator color={C.white} /> : (
            <>
              <Ionicons name="document-text" size={20} color={C.white} style={{ marginEnd: 8 }} />
              <Text style={{ color: C.white, fontSize: 16, fontWeight: '600' }}>
                {tt('regdone.8297b508')}
              </Text>
            </>
          )}
        </TouchableOpacity>

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
            {tt('regdone.44e5dadf')}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
