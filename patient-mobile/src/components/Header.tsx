import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar, Modal, TouchableWithoutFeedback } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { lightColors, darkColors } from '../theme/colors';
import { router, usePathname } from 'expo-router';

export default function Header() {
  const { isDark, toggleTheme, lang, setLang } = useApp() as any;
  const toggleDark = toggleTheme;
  const changeLang = setLang;
  const pathname = usePathname();
  const currentScreen = pathname;

  // Format pathname as title, e.g. "/pharmacy" -> "Pharmacy"
  const headerTitle = pathname === '/' ? 'Home' : pathname.replace('/', '').charAt(0).toUpperCase() + pathname.replace('/', '').slice(1);

  const canGoBack = router.canGoBack();
  const goBack = () => router.back();
  const insets = useSafeAreaInsets();
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur';

  const [langMenuVisible, setLangMenuVisible] = useState(false);
  const langs = ['ar', 'en', 'ur', 'tl', 'hi'];

  const handleLangChange = (l: string) => {
    changeLang(l);
    setLangMenuVisible(false);
  };

  const getLangLabel = () => {
    switch(lang) {
      case 'ar': return 'ع';
      case 'en': return 'EN';
      case 'ur': return 'اردو';
      case 'tl': return 'TL';
      case 'hi': return 'हिं';
      default: return 'ع';
    }
  };

  const mainScreens = ['/', '/(tabs)', '/index'];

  // If not a main screen, render the sleek transparent back button
  if (!mainScreens.includes(currentScreen) && !currentScreen.startsWith('/(tabs)')) {
    if (!canGoBack) return null;
    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, paddingTop: Math.max(insets.top, StatusBar.currentHeight || 44), paddingHorizontal: 16 }}>
        <TouchableOpacity onPress={goBack} style={[styles.iconButton, { alignSelf: isRTL ? 'flex-end' : 'flex-start', backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }]}>
          <Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 24, color: isDark ? '#fff' : '#141A2A' }}>
            {isRTL ? 'arrow_forward' : 'arrow_back'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Premium gradient per theme
  const gradColors: [string, string] = isDark
    ? ['rgba(10,16,34,0.97)', 'rgba(18,26,52,0.97)']
    : ['rgba(255,255,255,0.96)', 'rgba(240,248,255,0.96)'];

  return (
    <View style={styles.headerWrapper}>
      {/* Blur layer (iOS) */}
      {Platform.OS === 'ios' && (
        <BlurView intensity={88} tint={isDark ? 'dark' : 'extraLight'} style={StyleSheet.absoluteFill} />
      )}

      {/* Gradient tint */}
      <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />

      {/* Glowing cyan bottom line */}
      <LinearGradient
        colors={['transparent', '#23B5CE55', '#23B5CEBB', '#23B5CE55', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.glowBorder}
      />

      {/* Content */}
      <View style={[styles.safeArea, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: insets.top }]}>

        {/* ── Left cluster (RTL: right) ── */}
        <View style={[styles.cluster, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {canGoBack && (
            <TouchableOpacity onPress={goBack} style={styles.iconButton}>
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 24, color: colors.n }}>
                {isRTL ? 'arrow_forward' : 'arrow_back'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Theme toggle */}
          <TouchableOpacity
            onPress={toggleDark}
            style={[styles.pill, {
              backgroundColor: isDark ? 'rgba(35,181,206,0.18)' : 'rgba(35,181,206,0.1)',
              borderColor: isDark ? 'rgba(35,181,206,0.35)' : 'rgba(35,181,206,0.22)',
            }]}
          >
            <Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 18, color: '#23B5CE' }}>
              {isDark ? 'dark_mode' : 'light_mode'}
            </Text>
          </TouchableOpacity>

          {/* Language */}
          <TouchableOpacity
            onPress={() => setLangMenuVisible(true)}
            style={[styles.pill, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)',
              minWidth: 42,
            }]}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: colors.n }}>{getLangLabel()}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Center ── */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.title, { color: colors.pd }]} numberOfLines={1}>{headerTitle}</Text>
        </View>

        {/* ── Right cluster (RTL: left) ── */}
        <View style={[styles.cluster, { justifyContent: 'flex-end', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[styles.iconButton, { position: 'relative' }]}
            onPress={() => router.push('/notifications')}
          >
            <Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 24, color: colors.t3 }}>notifications</Text>
            <View style={[styles.notifDot, { [isRTL ? 'right' : 'left']: 6 }]} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.avatarBtn}>
            <LinearGradient
              colors={['#23B5CE', '#1594AC']}
              style={{ width: '100%', height: '100%', borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: 'MaterialSymbolsRounded', fontSize: 20, color: '#fff' }}>person</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Language dropdown */}
      <Modal visible={langMenuVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setLangMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.langMenu, { backgroundColor: colors.s, borderColor: colors.bd, left: isRTL ? undefined : 60, right: isRTL ? 60 : undefined }]}>
              {langs.map(l => {
                const label = l === 'ar' ? 'العربية' : l === 'en' ? 'English' : l === 'ur' ? 'اردو' : l === 'tl' ? 'Tagalog' : 'हिन्दी';
                return (
                  <TouchableOpacity key={l} style={[styles.langItem, lang === l && { backgroundColor: colors.bg }]} onPress={() => handleLangChange(l)}>
                    <Text style={{ fontSize: 14, fontWeight: lang === l ? '700' : '500', color: lang === l ? colors.p : colors.n, textAlign: isRTL ? 'right' : 'left' }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    zIndex: 50,
    shadowColor: '#23B5CE',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  glowBorder: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 1.5,
  },
  safeArea: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  cluster: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 36, height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    height: 32,
    minWidth: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  avatarBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  notifDot: {
    position: 'absolute',
    top: 5,
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: 'white',
  },
  modalOverlay: { flex: 1, backgroundColor: 'transparent' },
  langMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 90 : (StatusBar.currentHeight || 24) + 46,
    width: 120,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 6,
    shadowColor: 'rgba(20,26,42,0.15)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 5,
  },
  langItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
});
