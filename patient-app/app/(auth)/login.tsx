// @ts-nocheck
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

import { useApp } from '../../src/context/AppContext';
import { resolveColor } from '../../src/theme/colors';
// storeAuthSession lives in the shared network client (root utils/api.ts) —
// src/utils/api.ts is a legacy thin wrapper that does not export it.
import { apiFetch, storeAuthSession } from '../../utils/api';
import { decodeJwt } from '../../src/utils/jwt';
import { STORAGE_KEYS } from '../../src/constants';

import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import { LocalizedText } from '../../src/components/LocalizedText';

WebBrowser.maybeCompleteAuthSession();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

export default function LoginScreen() {
  const { isDark, lang } = useApp() as any;
  const insets = useSafeAreaInsets();
  
  const isRTL = lang === 'ar' || lang === 'ur' || true; // Force RTL for Arabic

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;

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
      // M1: no more dummy token fallback — a real session or an explicit error
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
      setErrorMessage(err.message || `فشل تسجيل الدخول بواسطة ${provider}`);
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
        setErrorMessage('فشل تسجيل الدخول عبر آبل');
      }
    }
  };

  const handleLogin = async () => {
    setErrorMessage(null);
    if (isLockedOut) {
      const remaining = Math.ceil((lockoutUntil! - Date.now()) / 60000);
      setErrorMessage(`تم تجاوز المحاولات. حاول بعد ${remaining} دقائق`);
      return;
    }
    if (!phone || phone.length < 9) { 
      setErrorMessage('أدخل بريد إلكتروني أو هاتف صحيح'); 
      return; 
    }
    if (!password || password.length < 6) { 
      setErrorMessage('كلمة المرور 6 أحرف على الأقل'); 
      return; 
    }
    
    setLoading(true);
    try {
        const fullPhone = phone.startsWith('+') ? phone : `+966${phone.replace(/^0+/, '')}`;
        const res = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ phone: fullPhone, password }),
        });
        // M1: backend returns { user, token: { accessToken, refreshToken } }
        const token = typeof res?.token === 'string' ? res.token : (res?.token?.accessToken || null);

      if (!token) {
        setAttempts(prev => {
          const next = prev + 1;
          if (next >= MAX_ATTEMPTS) setLockoutUntil(Date.now() + LOCKOUT_MS);
          return next;
        });
        setErrorMessage('تحقق من البيانات وحاول مجدداً');
        setLoading(false);
        return;
      }
      
      // M1: persist both access + refresh tokens through the shared session helper
      await storeAuthSession(res?.token);
      setAttempts(0);
      setLockoutUntil(null);

      const decoded = decodeJwt(token);
      const userRole = decoded?.role || 'patient';
      if (userRole !== 'patient') {
        router.replace('/(auth)/provider-info' as any);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) { 
      setErrorMessage(err.message || 'فشل تسجيل الدخول، حاول مجدداً');
      setAttempts(prev => {
        const next = prev + 1;
        if (next >= MAX_ATTEMPTS) setLockoutUntil(Date.now() + LOCKOUT_MS);
        return next;
      });
    }
    setLoading(false);
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

  const NpLogoSmall = ({ size = 60 }: { size?: number }) => (
    <View style={{ width: size, height: size, shadowColor: resolveColor('var(--p)', isDark), shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 30, elevation: 12 }}>
      <View 
        style={{ position: 'absolute', inset: 0, borderRadius: size * 0.3 }}/>
      <Svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' } as any}>
        <Path d="M18 52 H38 l5 -22 l9 44 l6 -30 l5 8 H82" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: resolveColor('var(--bg)', isDark) }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      
      <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingTop: insets.top + 20, paddingBottom: 120, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: resolveColor('var(--s)', isDark), borderColor: resolveColor('var(--bd)', isDark) } ]}>
          <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 22, color: resolveColor('var(--n)', isDark) }}>
            {isRTL ? 'arrow_forward' : 'arrow_back'}
          </LocalizedText>
        </TouchableOpacity>

        <View style={{ marginBottom: 30 }}>
          <NpLogoSmall />
        </View>

        <LocalizedText style={[styles.title, { color: resolveColor('var(--n)', isDark), textAlign: isRTL ? 'right' : 'left' } ]}>
          أهلاً بعودتك
        </LocalizedText>
        <LocalizedText style={[styles.subtitle, { color: resolveColor('var(--t2)', isDark), textAlign: isRTL ? 'right' : 'left' } ]}>
          سجّل دخولك لمتابعة رعايتك الصحية
        </LocalizedText>

        {/* Phone Input */}
        <View style={styles.inputWrapper}>
          <LocalizedText style={[styles.inputLabel, { color: resolveColor('var(--t3)', isDark), textAlign: isRTL ? 'right' : 'left' } ]}>البريد الإلكتروني</LocalizedText>
          <View style={[
            styles.inputContainer, 
            { backgroundColor: resolveColor('var(--s)', isDark), flexDirection: isRTL ? 'row-reverse' : 'row', borderColor: focusedInput === 'phone' ? resolveColor('var(--p)', isDark) : resolveColor('var(--bd)', isDark) } ]}>
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 20, color: resolveColor('var(--t3)', isDark), marginHorizontal: 10 }}>mail</LocalizedText>
            <TextInput 
              style={[styles.input, { color: resolveColor('var(--n)', isDark), textAlign: isRTL ? 'right' : 'left' }]}
              placeholder="example@mail.com"
              placeholderTextColor={resolveColor('var(--t3)', isDark)}
              keyboardType="email-address" autoCapitalize="none"
              value={phone}
              onChangeText={setPhone}
              onFocus={() => setFocusedInput('phone')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>
        </View>

        {/* Password Input */}
        <View style={styles.inputWrapper}>
          <LocalizedText style={[styles.inputLabel, { color: resolveColor('var(--t3)', isDark), textAlign: isRTL ? 'right' : 'left' } ]}>كلمة المرور</LocalizedText>
          <View style={[
            styles.inputContainer, 
            { backgroundColor: resolveColor('var(--s)', isDark), flexDirection: isRTL ? 'row-reverse' : 'row', borderColor: focusedInput === 'password' ? resolveColor('var(--p)', isDark) : resolveColor('var(--bd)', isDark) } ]}>
            <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 20, color: resolveColor('var(--t3)', isDark), marginHorizontal: 10 }}>lock</LocalizedText>
            <TextInput 
              style={[styles.input, { color: resolveColor('var(--n)', isDark), textAlign: isRTL ? 'right' : 'left' }]}
              placeholder="••••••••"
              placeholderTextColor={resolveColor('var(--t3)', isDark)}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 10 }}>
              <LocalizedText style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 18, color: resolveColor('var(--t3)', isDark) }}>
                {showPassword ? 'visibility_off' : 'visibility'}
              </LocalizedText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', marginBottom: 24 }}>
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
            <LocalizedText style={{ fontSize: 12, color: resolveColor('var(--p)', isDark), fontWeight: '800' }}>
              نسيت كلمة المرور؟
            </LocalizedText>
          </TouchableOpacity>
        </View>

        {errorMessage && (
          <View style={{ backgroundColor: '#FEE2E2', padding: 12, borderRadius: 12, marginBottom: 16 }}>
            <LocalizedText style={{ color: '#EF4444', textAlign: 'right', fontWeight: '700', fontSize: 13 }}>{errorMessage}</LocalizedText>
          </View>
        )}

        <TouchableOpacity 
          onPress={handleLogin} 
          disabled={loading}
          style={[styles.primaryBtn, { backgroundColor: resolveColor('var(--p)', isDark), shadowColor: resolveColor('var(--p)', isDark), opacity: loading ? 0.7 : 1 }]} 
          activeOpacity={0.8}
        >
          <LocalizedText style={styles.primaryBtnText}>{loading ? 'جاري التحقق...' : 'تسجيل الدخول'}</LocalizedText>
        </TouchableOpacity>

        {/* OTP Login Option */}
        <TouchableOpacity 
          onPress={() => router.push({ pathname: '/(auth)/otp', params: { phone: '+966' + phone.replace(/^0+/, ''), mode: 'login' } })} 
          style={[styles.secondaryBtn, { borderColor: resolveColor('var(--p)', isDark), marginTop: 12 }]} 
          activeOpacity={0.8}
        >
          <LocalizedText style={[styles.secondaryBtnText, { color: resolveColor('var(--p)', isDark) } ]}>الدخول برمز التحقق (OTP)</LocalizedText>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: resolveColor('var(--bd)', isDark) }}/>
          <LocalizedText style={{ fontSize: 10, color: resolveColor('var(--t3)', isDark), marginHorizontal: 12, fontWeight: '800' }}>أو الدخول بواسطة</LocalizedText>
          <View style={{ flex: 1, height: 1, backgroundColor: resolveColor('var(--bd)', isDark) }}/>
        </View>

        {/* Social Logins */}
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
          <LocalizedText style={{ fontSize: 13, color: resolveColor('var(--t2)', isDark), fontWeight: '700' }}>ليس لديك حساب؟ </LocalizedText>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <LocalizedText style={{ fontSize: 13, color: resolveColor('var(--p)', isDark), fontWeight: '800' }}>سجل الآن</LocalizedText>
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
    marginBottom: 30
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
  subtitle: { fontSize: 13, fontWeight: '600', marginBottom: 30 },
  inputWrapper: { marginBottom: 16 },
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
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '800' },
});
