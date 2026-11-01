import React, { useState, useEffect, useRef } from 'react';
import { Text, TextInput, View, type TextInputInstance } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';

import { Button, Screen, StickyFooter } from '../../../packages/ui-native/src';
import { apiFetch } from '../../src/utils/api';
import { STORAGE_KEYS } from '../../src/constants';
import { startSession } from '../../src/utils/authSession';
import { serverMessage } from '../../src/utils/serverMessage';
import { LocalizedText } from '../../src/components/LocalizedText';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { applyOtpInput, requestOtp, verifyOtp } from '../../src/auth/patientAuth';
import { AuthAltLine, AuthBody, AuthFooter, AuthLink, AuthTitle, AuthTopBar, FONT, focusRing, useAuthUi } from '../../src/components/auth/AuthKit';

export default function OtpScreen() {
  const { theme, c, tr } = useAuthUi();
  const dispatch = useDispatch();
    const params = useLocalSearchParams();

  const identifier = ((params.identifier as string) || '').trim();
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6 digits for our backend
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const inputs = useRef<(TextInputInstance | null)[]>([]);

  useEffect(() => { 
    if (timer > 0) { 
      const t = setTimeout(() => setTimer(timer - 1), 1000); 
      return () => clearTimeout(t); 
    } 
  }, [timer]);

  const handleChange = (text: string, index: number) => {
    // a pasted or auto-filled code arrives whole in one box: spread it over the boxes (applyOtpInput)
    const { boxes, focus } = applyOtpInput(otp, text, index);
    setOtp(boxes);
    if (text && focus !== index) inputs.current[focus]?.focus();
    else if (text && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleResend = async () => {
    if (resending || timer > 0) return;
    if (!identifier) {
      showLocalizedAlert('common.errorTitle', 'auth.otp.noAccountToResend');
      return;
    }
    setResending(true);
    try {
      const { otp_no_channel } = await requestOtp(apiFetch, identifier);
      if (otp_no_channel) {
        showLocalizedAlert('common.errorTitle', 'auth.otp.noChannel');
        return;
      }
      setTimer(60);
      setOtp(['', '', '', '', '', '']);
    } catch (e: any) {
      showLocalizedAlert('common.errorTitle', serverMessage(e, 'auth.otp.resendFailed'));
    } finally {
      setResending(false);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleConfirm = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      showLocalizedAlert('common.errorTitle', 'auth.otp.incomplete');
      return;
    }
    
    setLoading(true);
    try {
      const pair = await verifyOtp(apiFetch, identifier, code);
      // A wrong, used or expired code never reaches here (the backend refuses it).
      // Secure storage only, both tokens (the access token lasts an hour; without the refresh token the session
      // would end with it), then the auth slice learns of the user.
      const session = await startSession({ token: { accessToken: pair.accessToken, refreshToken: pair.refreshToken } }, dispatch);
      if (!session.ok) {
        showLocalizedAlert('common.errorTitle', 'auth.err.notStored');
        setLoading(false);
        return;
      }
      // Remove any legacy plaintext mirror but never fall back to it.
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN).catch(() => {});
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true');

      if (session.role !== 'patient') {
        router.replace('/(auth)/provider-info' as any);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      showLocalizedAlert('common.errorTitle', serverMessage(err, 'errors.otpInvalid'));
    } finally {
      setLoading(false);
    }
  };

  const byEmail = identifier.includes('@');
  const countdown = `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}`;

  return (
    <Screen
      theme={theme}
      keyboard
      scroll
      footer={
        <StickyFooter theme={theme}>
          <AuthFooter>
            <Button
              label={tr(loading ? 'common.pleaseWait' : 'auth.otp.confirm')}
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              theme={theme}
              onPress={handleConfirm}
              testID="otp-submit"
            />
            <AuthAltLine link={byEmail ? 'auth.otp.changeEmail' : 'auth.otp.changePhone'} onPress={() => router.back()} />
          </AuthFooter>
        </StickyFooter>
      }
    >
      <AuthBody>
      <AuthTopBar onBack={() => router.back()} />
      <AuthTitle title={byEmail ? 'auth.otp.titleEmail' : 'auth.otp.titlePhone'} sub="auth.otp.sub">
        {identifier ? (
          <Text style={{ fontFamily: FONT.medium, color: c.text.primary }}>
            {' '}
            <Text style={{ writingDirection: 'ltr' }}>{identifier}</Text>
          </Text>
        ) : null}
      </AuthTitle>

      <View style={{ marginTop: 26, gap: 18 }}>
        <View accessibilityRole="none" accessibilityLabel={tr('auth.code')} style={{ flexDirection: 'row', direction: 'ltr', gap: 8 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const active = focusedIndex === i;
            return (
              <TextInput
                key={i}
                ref={(el: TextInputInstance | null) => { inputs.current[i] = el; }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 64,
                  borderRadius: 16,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? c.text.primary : c.border.subtle,
                  backgroundColor: c.bg.surface,
                  boxShadow: active ? focusRing(theme) : undefined,
                  textAlign: 'center',
                  fontFamily: FONT.bold,
                  fontSize: 26,
                  color: c.text.primary,
                  outlineStyle: 'none',
                } as object}
                maxLength={6}
                keyboardType="number-pad"
                textContentType={i === 0 ? 'oneTimeCode' : 'none'}
                autoComplete={i === 0 ? 'sms-otp' : 'off'}
                accessibilityLabel={`${tr('auth.code')} ${i + 1}`}
                value={otp[i]}
                onChangeText={(text) => handleChange(text, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                onFocus={() => setFocusedIndex(i)}
                onBlur={() => setFocusedIndex(null)}
                selectTextOnFocus
                testID={`otp-box-${i}`}
              />
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          {timer > 0 ? (
            <>
              <LocalizedText style={{ flex: 1, fontFamily: FONT.regular, fontSize: 14, lineHeight: 21, color: c.text.secondary, textAlign: 'auto' }}>
                {'auth.otp.notReceivedSpam'}
              </LocalizedText>
              <Text accessibilityLabel={`${tr('auth.otp.resendIn')} ${countdown}`} style={{ fontFamily: FONT.bold, fontSize: 14, color: c.text.primary, writingDirection: 'ltr' }}>
                {countdown}
              </Text>
            </>
          ) : (
            <>
              <LocalizedText style={{ fontFamily: FONT.regular, fontSize: 14, color: c.text.secondary }}>{'auth.otp.notReceived'}</LocalizedText>
              <AuthLink label="auth.otp.resend" weight="bold" disabled={resending} onPress={() => void handleResend()} />
            </>
          )}
        </View>
      </View>
      </AuthBody>
    </Screen>
  );
}
