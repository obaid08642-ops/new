// @ts-nocheck
import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Modal, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { FontAwesome, FontAwesome6 } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightColors, darkColors } from '../../src/theme/colors';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';
import { guestLogin } from '../../src/store/slices/authSlice';
import { apiFetch } from '../../src/utils/api';

const { width } = Dimensions.get('window');

export default function Welcome() {
  const dispatch = useDispatch();
  const [loadingGuest, setLoadingGuest] = useState(false);
  const handleGuestLogin = async () => {
    setLoadingGuest(true);
    try {
      const res = await apiFetch('/auth/guest', { method: 'POST', body: JSON.stringify({}) });
      if (res?.token) {
        dispatch(guestLogin({ user: res.user, token: res.token }));
        router.push('/(tabs)');
      }
    } catch (err) {
      console.log('Guest login error', err);
    } finally {
      setLoadingGuest(false);
    }
  };
  const { isDark, toggleTheme, lang, setLang } = useApp() as any;
  const toggleDark = toggleTheme;
  const changeLang = setLang;
  const login = () => {};
  const go = (screen: string) => {
    if (screen === 'sH') router.push('/(tabs)');
    else if (screen === 's86') router.push('/(auth)/register');
    else if (screen === 's85') router.push('/(auth)/login');
  };
  const colors = isDark ? darkColors : lightColors;
  const [langModalVisible, setLangModalVisible] = useState(false);
  
  const langs = [
    { code: 'ar', name: 'العربية' },
    { code: 'en', name: 'English' },
    { code: 'fil', name: 'Filipino' },
    { code: 'hi', name: 'हिन्दी' },
    { code: 'ur', name: 'اردو' },
    { code: 'bn', name: 'বাংলা' }
  ];
  
  const resolveColor = (c) => {
    if (!c || typeof c !== 'string') return '#000';
    if (c.startsWith('var(')) {
      const v = c.replace('var(--', '').replace(')', '');
      return colors[v] || c;
    }
    return c;
  };

  const isRTL = lang === 'ar' || lang === 'ur';

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  }, [fadeAnim, slideAnim]);

  const NpLogo = ({ size = 96 }) => (
    <View style={{ width: size, height: size }}>
      <View 
        style={{ position: 'absolute', inset: 0, borderRadius: size * 0.3 }}
      />
      <Svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <Path d="M18 52 H38 l5 -22 l9 44 l6 -30 l5 8 H82" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: resolveColor('var(--bg)') } ]}>
      
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, width: '100%', zIndex: 10 }}>
        {/* Theme Toggle */}
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={toggleDark}
          style={{ width: 50, height: 28, borderRadius: 14, backgroundColor: isDark ? resolveColor('var(--p)') : '#E5E8EE', padding: 2, justifyContent: 'center' }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.s, transform: [{ translateX: isDark ? (isRTL ? -22 : 22) : 0 }], shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 }}/>
        </TouchableOpacity>

        {/* Language Button */}
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => setLangModalVisible(true)}
          style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: colors.s, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.bd }}
        >
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.n, fontSize: 16, marginLeft: isRTL ? 6 : 0, marginRight: isRTL ? 0 : 6 }}>language</Text>
          <Text style={{ color: colors.n, fontSize: 13, fontWeight: '700' }}>{langs.find(l => l.code === lang)?.name || 'Language'}</Text>
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: colors.t3, fontSize: 16, marginRight: isRTL ? 4 : 0, marginLeft: isRTL ? 0 : 4 }}>arrow_drop_down</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={langModalVisible} transparent animationType="fade">
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setLangModalVisible(false)}>
          <View style={{ width: 240, backgroundColor: colors.s, borderRadius: 16, padding: 8 }}>
            {langs.map(l => (
              <TouchableOpacity 
                key={l.code} 
                style={{ paddingVertical: 12, paddingHorizontal: 16, flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 8, backgroundColor: lang === l.code ? colors.bg : 'transparent' }} onPress={() => { changeLang(l.code); setLangModalVisible(false); }}
              >
                <Text style={{ fontSize: 15, fontWeight: lang === l.code ? '800' : '600', color: lang === l.code ? resolveColor('var(--p)') : colors.n }}>{l.name}</Text>
                {lang === l.code && <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: resolveColor('var(--p)'), fontSize: 18 }}>check</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={{ marginBottom: 24, shadowColor: resolveColor('var(--p)'), shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 30, elevation: 12 }}>
          <NpLogo size={96} />
        </View>

        <Text style={[styles.title, { color: resolveColor('var(--n)') } ]}>{lang === 'ar' ? 'نبض بلس' : 'Nabd Plus'}</Text>
        
        <Text style={[styles.subtitle, { color: resolveColor('var(--t2)') } ]}>
          {lang === 'ar' 
            ? 'رعايتك الصحية المتكاملة في تطبيق واحد — استشارات، صيدلية، تحاليل، وأكثر' 
            : 'Your complete healthcare in one app — consultations, pharmacy, labs, and more'}
        </Text>

        <TouchableOpacity 
          style={[styles.primaryBtn, { backgroundColor: colors.n, shadowColor: colors.n, marginBottom: 12 }]} 
          onPress={handleGuestLogin}
          activeOpacity={0.8}
        >
          <Text style={[styles.primaryBtnText, { color: '#fff' } ]}>{lang === 'ar' ? 'الاستمرار بدون تسجيل' : 'Continue as Guest'}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.primaryBtn, { backgroundColor: resolveColor('var(--p)'), shadowColor: resolveColor('var(--p)') }]} 
          onPress={() => go('s86')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnText}>{lang === 'ar' ? 'تسجيل' : 'Register'}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.secondaryBtn, { backgroundColor: resolveColor('var(--s)') }]} 
          onPress={() => go('s85')}
          activeOpacity={0.8}
        >
          <Text style={[styles.secondaryBtnText, { color: resolveColor('var(--n)') } ]}>{lang === 'ar' ? 'تسجيل دخول' : 'Log In'}</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 24, width: '100%', alignItems: 'center' }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 20, width: '80%' }}>
            <View style={{ flex: 1, height: 1, backgroundColor: resolveColor('var(--bd)') }}/>
            <Text style={{ textAlign: 'center', color: resolveColor('var(--t3)'), fontSize: 13, paddingHorizontal: 12, fontWeight: '600' }}>
              {lang === 'ar' ? 'أو الدخول بواسطة' : 'Or continue with'}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: resolveColor('var(--bd)') }}/>
          </View>
          
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 16 }}>
            {/* Google */}
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={[styles.modernSocialBtn, { backgroundColor: isDark ? '#1A2540' : '#FFFFFF' }]} activeOpacity={0.8}>
            <FontAwesome name="google" size={20} color={isDark ? "#FFFFFF" : "#DB4437"} />
          </TouchableOpacity>

          {/* Apple */}
          {Platform.OS === 'ios' && (
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={[styles.modernSocialBtn, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]} activeOpacity={0.8}>
            <FontAwesome name="apple" size={24} color={isDark ? "#000000" : "#FFFFFF"} />
          </TouchableOpacity>
          )}

          {/* Snapchat */}
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={[styles.modernSocialBtn, { backgroundColor: '#FFFC00' }]} activeOpacity={0.8}>
            <FontAwesome name="snapchat-ghost" size={24} color="#000000" />
          </TouchableOpacity>

          {/* X (Twitter) */}
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={[styles.modernSocialBtn, { backgroundColor: isDark ? '#1A2540' : '#FFFFFF' }]} activeOpacity={0.8}>
            <FontAwesome6 name="x-twitter" size={20} color={isDark ? "#FFFFFF" : "#000000"} />
          </TouchableOpacity>
        </View>
      </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 50,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 280,
  },
  primaryBtn: {
    width: '100%',
    maxWidth: 320,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    width: '100%',
    maxWidth: 320,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
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
});
