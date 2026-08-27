// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useApp } from '../../src/context/AppContext';
import { resolveColor } from '../../src/theme/colors';
import { apiFetch } from '../../src/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../../src/constants';
import { decodeJwt } from '../../src/utils/jwt';
import { createRegistrationTransaction } from '../../src/services/auth/RegistrationTransaction';

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import { LocalizedText } from '../../src/components/LocalizedText';

WebBrowser.maybeCompleteAuthSession();

const AuthField = ({ label, icon, placeholder, value, onChangeText, isPass, isDark, isRTL, focusedInput, setFocusedInput, showPassword, setShowPassword }: any) => (
  <View style={styles.inputWrapper}>
    <LocalizedText style={[styles.inputLabel, { color: resolveColor('var(--t3)', isDark), textAlign: isRTL ? 'right' : 'left' } ]}>{label}</LocalizedText>
    <View style={[
      styles.inputContainer, 
      { backgroundColor: resolveColor('var(--s)', isDark), flexDirection: isRTL ? 'row-reverse' : 'row', borderColor: focusedInput === label ? resolveColor('var(--p)', isDark) : resolveColor('var(--bd)', isDark) } ]}>
      <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 20, color: resolveColor('var(--t3)', isDark), marginHorizontal: 10 }}>{icon}</LocalizedText>
      <TextInput 
        style={[styles.input, { color: resolveColor('var(--n)', isDark), textAlign: isRTL ? 'right' : 'left' }]}
        placeholder={placeholder}
        placeholderTextColor={resolveColor('var(--t3)', isDark)}
        secureTextEntry={isPass && !showPassword}
        keyboardType={label.includes('هاتف') ? 'phone-pad' : label.includes('بريد') ? 'email-address' : 'default'}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocusedInput(label)}
        onBlur={() => setFocusedInput(null)}
      />
      {isPass && (
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 10 }}>
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 18, color: resolveColor('var(--t3)', isDark) }}>
            {showPassword ? 'visibility_off' : 'visibility'}
          </LocalizedText>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

export default function RegisterScreen() {
  const { isDark, lang } = useApp() as any;
  const insets = useSafeAreaInsets();
  
  const isRTL = lang === 'ar' || lang === 'ur' || true; // Force RTL

  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirmPw: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  });

  React.useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      handleOAuthBackend('google', response.authentication.accessToken);
    }
  }, [response]);

  const [reqX, resX, promptAsyncX] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_X_CLIENT_ID || '',
      scopes: ['tweet.read', 'users.read', 'offline.access'],
      redirectUri: AuthSession.makeRedirectUri({ scheme: 'nabdplus' }),
    },
    { authorizationEndpoint: 'https://twitter.com/i/oauth2/authorize', tokenEndpoint: 'https://api.twitter.com/2/oauth2/token' }
  );

  const [reqSnap, resSnap, promptAsyncSnap] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_SNAPCHAT_CLIENT_ID || '',
      scopes: ['https://auth.snapchat.com/oauth2/api/user.display_name'],
      redirectUri: AuthSession.makeRedirectUri({ scheme: 'nabdplus' }),
    },
    { authorizationEndpoint: 'https://accounts.snapchat.com/accounts/oauth2/auth', tokenEndpoint: 'https://accounts.snapchat.com/accounts/oauth2/token' }
  );

  React.useEffect(() => {
    if (resX?.type === 'success' && resX.authentication?.accessToken) {
      handleOAuthBackend('x', resX.authentication.accessToken);
    }
  }, [resX]);

  React.useEffect(() => {
    if (resSnap?.type === 'success' && resSnap.authentication?.accessToken) {
      handleOAuthBackend('snapchat', resSnap.authentication.accessToken);
    }
  }, [resSnap]);

  const handleOAuthBackend = async (provider: string, token: string) => {
    try {
      setLoading(true);
      const res = await apiFetch('/auth/social-login', {
        method: 'POST',
        body: JSON.stringify({ provider, token }),
      });
      // M1: real session only — no dummy token fallback
      const jwtToken = typeof res?.token === 'string' ? res.token : (res?.token?.accessToken || null);
      if (!jwtToken) throw new Error('لم يستلم التطبيق جلسة صالحة من الخادم');
      try { await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, jwtToken); }
      catch (_err) { await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, jwtToken); }
      
      const decoded = decodeJwt(jwtToken);
      if (decoded?.role !== 'patient') {
        router.replace('/(auth)/provider-info' as any);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setErrorMessage(err.message || `فشل التسجيل بواسطة ${provider}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        handleOAuthBackend('apple', credential.identityToken);
      }
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        setErrorMessage('فشل التسجيل عبر آبل');
      }
    }
  };

  const validate = () => {
    setErrorMessage(null);
    if (!form.name || form.name.length < 3) { setErrorMessage('الاسم مطلوب (3 أحرف على الأقل)'); return false; }
    if (!form.phone || form.phone.length < 9) { setErrorMessage('رقم هاتف صحيح مطلوب'); return false; }
    if (!form.email || !form.email.includes('@')) { setErrorMessage('البريد الإلكتروني مطلوب وصحيح'); return false; }
    if (!form.password || form.password.length < 6) { setErrorMessage('كلمة المرور 6 أحرف على الأقل'); return false; }
    if (form.password !== form.confirmPw) { setErrorMessage('كلمتا المرور غير متطابقتين'); return false; }
    if (!agreed) { setErrorMessage('يرجى الموافقة على الشروط والأحكام أولاً'); return false; }
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await apiFetch('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email: form.email.trim().toLowerCase(), purpose: 'register' }),
      });
      setLoading(false);
      // Forcing +966 for real backend
      const fullPhone = form.phone.startsWith('+') ? form.phone : `+966${form.phone.replace(/^0+/, '')}`;
      const registrationTransactionId = createRegistrationTransaction({
        fullName: form.name,
        phone: fullPhone,
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      router.push({
        pathname: '/(auth)/otp',
        params: {
          transactionId: registrationTransactionId,
          mode: 'register',
        },
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل إرسال رمز التحقق');
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    if (provider === 'google') {
      promptAsync();
    } else if (provider === 'apple') {
      handleAppleLogin();
    } else if (provider === 'x' || provider === 'twitter') {
      promptAsyncX();
    } else if (provider === 'snapchat') {
      promptAsyncSnap();
    } else {
      setErrorMessage('مزود تسجيل الدخول غير مدعوم حالياً.');
    }
  };


  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: resolveColor('var(--bg)', isDark) }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingTop: insets.top + 20, paddingBottom: 120, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: resolveColor('var(--s)', isDark), borderColor: resolveColor('var(--bd)', isDark) } ]}>
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 22, color: resolveColor('var(--n)', isDark) }}>
            {isRTL ? 'arrow_forward' : 'arrow_back'}
          </LocalizedText>
        </TouchableOpacity>

        <LocalizedText style={[styles.title, { color: resolveColor('var(--n)', isDark), textAlign: isRTL ? 'right' : 'left' } ]}>إنشاء حساب</LocalizedText>
        <LocalizedText style={[styles.subtitle, { color: resolveColor('var(--t2)', isDark), textAlign: isRTL ? 'right' : 'left' } ]}>انضم لنبض بلس وابدأ رحلتك الصحية</LocalizedText>

        <AuthField 
          label={'الاسم الكامل'} 
          icon="person" 
          placeholder={'أحمد السالم'} 
          value={form.name} 
          onChangeText={(t: string) => setForm({...form, name: t})} 
          isDark={isDark} isRTL={isRTL} focusedInput={focusedInput} setFocusedInput={setFocusedInput}
        />
        
        <AuthField 
          label={'رقم الهاتف'} 
          icon="mobile" 
          placeholder={'0500000000'} 
          value={form.phone} 
          onChangeText={(t: string) => setForm({...form, phone: t.replace(/\D/g, '')})} 
          isDark={isDark} isRTL={isRTL} focusedInput={focusedInput} setFocusedInput={setFocusedInput}
        />
        
        <AuthField 
          label={'البريد الإلكتروني'} 
          icon="mail" 
          placeholder="example@mail.com" 
          value={form.email} 
          onChangeText={(t: string) => setForm({...form, email: t})} 
          isDark={isDark} isRTL={isRTL} focusedInput={focusedInput} setFocusedInput={setFocusedInput}
        />
        
        <AuthField 
          label={'كلمة المرور'} 
          icon="lock" 
          placeholder="••••••••" 
          value={form.password} 
          onChangeText={(t: string) => setForm({...form, password: t})} 
          isPass 
          isDark={isDark} isRTL={isRTL} focusedInput={focusedInput} setFocusedInput={setFocusedInput} showPassword={showPassword} setShowPassword={setShowPassword}
        />

        <AuthField 
          label={'تأكيد كلمة المرور'} 
          icon="lock" 
          placeholder="••••••••" 
          value={form.confirmPw} 
          onChangeText={(t: string) => setForm({...form, confirmPw: t})} 
          isPass 
          isDark={isDark} isRTL={isRTL} focusedInput={focusedInput} setFocusedInput={setFocusedInput} showPassword={showPassword} setShowPassword={setShowPassword}
        />

        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', marginVertical: 6, marginBottom: 24 }}>
          <TouchableOpacity onPress={() => setAgreed(!agreed)} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', flexShrink: 0 }} activeOpacity={0.8}>
            <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: agreed ? resolveColor('var(--p)', isDark) : 'transparent', borderWidth: agreed ? 0 : 1.5, borderColor: resolveColor('var(--bd)', isDark), alignItems: 'center', justifyContent: 'center', marginLeft: isRTL ? 8 : 0, marginRight: isRTL ? 8 : 0 }}>
              {agreed && <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 14, color: '#fff' }}>check</LocalizedText>}
            </View>
          </TouchableOpacity>
          <LocalizedText style={{ fontSize: 11, color: resolveColor('var(--t2)', isDark), lineHeight: 18, textAlign: isRTL ? 'right' : 'left', flex: 1, fontWeight: '600' }}>
            أوافق على <LocalizedText onPress={() => router.push('/(auth)/terms')} style={{ color: resolveColor('var(--p)', isDark), fontWeight: '800' }}>الشروط والأحكام</LocalizedText> و<LocalizedText onPress={() => router.push('/(auth)/privacy')} style={{ color: resolveColor('var(--p)', isDark), fontWeight: '800' }}>سياسة الخصوصية</LocalizedText>
          </LocalizedText>
        </View>

        {errorMessage && (
          <View style={{ backgroundColor: '#FEE2E2', padding: 12, borderRadius: 12, marginBottom: 16 }}>
            <LocalizedText style={{ color: '#EF4444', textAlign: 'right', fontWeight: '700', fontSize: 13 }}>{errorMessage}</LocalizedText>
          </View>
        )}

        <TouchableOpacity 
          onPress={handleRegister} 
          disabled={loading}
          style={[styles.primaryBtn, { backgroundColor: resolveColor('var(--p)', isDark), shadowColor: resolveColor('var(--p)', isDark), opacity: loading ? 0.7 : 1 }]} 
          activeOpacity={0.8}
        >
          <LocalizedText style={styles.primaryBtnText}>{loading ? 'جاري الإرسال...' : 'إنشاء الحساب'}</LocalizedText>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: resolveColor('var(--bd)', isDark) }}/>
          <LocalizedText style={{ fontSize: 10, color: resolveColor('var(--t3)', isDark), marginHorizontal: 12, fontWeight: '800' }}>أو التسجيل بواسطة</LocalizedText>
          <View style={{ flex: 1, height: 1, backgroundColor: resolveColor('var(--bd)', isDark) }}/>
        </View>

        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 12 }}>
          {/* Google */}
          <TouchableOpacity onPress={() => handleSocialLogin('google')} style={[styles.modernSocialBtn, { backgroundColor: isDark ? '#1A2540' : '#FFFFFF' }]} activeOpacity={0.8}>
            <FontAwesome5 name="google" size={20} color={isDark ? "#FFFFFF" : "#DB4437"} />
          </TouchableOpacity>

          {/* Apple */}
          {Platform.OS === 'ios' && (
          <TouchableOpacity onPress={() => handleSocialLogin('apple')} style={[styles.modernSocialBtn, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]} activeOpacity={0.8}>
            <FontAwesome5 name="apple" size={24} color={isDark ? "#000000" : "#FFFFFF"} />
          </TouchableOpacity>
          )}

          {/* Snapchat */}
          <TouchableOpacity onPress={() => handleSocialLogin('snapchat')} style={[styles.modernSocialBtn, { backgroundColor: '#FFFC00' }]} activeOpacity={0.8}>
            <FontAwesome5 name="snapchat-ghost" size={24} color="#000000" />
          </TouchableOpacity>

          {/* X (Twitter) */}
          <TouchableOpacity onPress={() => handleSocialLogin('twitter')} style={[styles.modernSocialBtn, { backgroundColor: isDark ? '#1A2540' : '#FFFFFF' }]} activeOpacity={0.8}>
            <FontAwesome6 name="x-twitter" size={20} color={isDark ? "#FFFFFF" : "#000000"} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row-reverse', justifyContent: 'center', marginTop: 32 }}>
          <LocalizedText style={{ fontSize: 13, color: resolveColor('var(--t2)', isDark), fontWeight: '700' }}>لديك حساب بالفعل؟ </LocalizedText>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <LocalizedText style={{ fontSize: 13, color: resolveColor('var(--p)', isDark), fontWeight: '800' }}>تسجيل الدخول</LocalizedText>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24
  },
  modernSocialBtn: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  title: { fontSize: 26, fontWeight: '900', marginBottom: 6 },
  subtitle: { fontSize: 13, fontWeight: '600', marginBottom: 26 },
  inputWrapper: { marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  inputContainer: {
    borderWidth: 1.5,
    borderRadius: 16,
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    fontWeight: '600'
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' }
});
