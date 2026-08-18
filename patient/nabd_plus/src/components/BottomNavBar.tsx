import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { BlurView } from 'expo-blur';
import { router, usePathname } from 'expo-router';
import { useApp } from '../context/AppContext';
import { lightColors, darkColors } from '../theme/colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function BottomNavBar() {
  const pathname = usePathname();
  const { isDark, lang } = useApp();
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === 'ar' || lang === 'ur' || true;

  const getActiveTab = () => {
    if (pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index') return 0;
    if (pathname.includes('/pharmacy')) return 1;
    if (pathname.includes('/consultations')) return 2;
    if (pathname.includes('/diagnostics')) return 3;
    if (pathname.includes('/nursing')) return 4;
    return -1;
  };
  const activeTab = getActiveTab();

  const handlePress = (screen: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    router.push(screen);
  };

  // RTL row-reverse: first items appear on the RIGHT. Requested layout:
  // right = الرئيسية + الصيدلية · center FAB = الاستشارات · left = التحاليل + التمريض.
  // "صحتي" tab removed — it is already reachable from the home page.
  const navItems = [
    { icon: 'home', label: 'الرئيسية', screen: '/(tabs)' },
    { icon: 'prescriptions', label: 'الصيدلية', screen: '/(tabs)/pharmacy' },
    { icon: 'stethoscope', label: 'استشارات', screen: '/(tabs)/consultations', isFab: true },
    { icon: 'science', label: 'تحاليل', screen: '/(tabs)/diagnostics' },
    { icon: 'healing', label: 'تمريض', screen: '/(tabs)/nursing' },
  ];

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={[styles.navContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} pointerEvents="box-none">
        
        {/* Background Blur layer - clipped */}
        <BlurView 
          intensity={80} 
          tint={isDark ? 'dark' : 'light'} 
          style={[StyleSheet.absoluteFill, styles.navBg, { 
            backgroundColor: isDark ? 'rgba(30,40,60,0.6)' : 'rgba(255,255,255,0.65)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)',
          }]}
        />

        {navItems.map((item, idx) => {
          if (item.isFab) {
            return (
              <View key={idx} style={styles.navItem} pointerEvents="box-none">
                <TouchableOpacity activeOpacity={0.8} style={styles.fab} onPress={() => handlePress(item.screen)}>
                  <View style={[styles.fabInner, { backgroundColor: colors.p, borderColor: colors.bg }]}>
                    <Text style={{ fontFamily: 'MaterialSymbolsRounded', color: '#fff', fontSize: 26 }}>
                      {item.icon}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            );
          }
          
          const isActive = activeTab === idx;
          return (
            <TouchableOpacity 
              key={idx} 
              activeOpacity={0.6}
              style={styles.navItem} 
              onPress={() => handlePress(item.screen)}
            >
              <Text style={{ 
                fontFamily: 'MaterialSymbolsRounded', 
                fontSize: isActive ? 24 : 22, 
                color: isActive ? colors.p : colors.t3,
                opacity: isActive ? 1 : 0.6,
                marginBottom: 2
              }}>
                {item.icon}
              </Text>
              <Text style={{
                fontSize: 9,
                fontWeight: isActive ? '800' : '600',
                color: isActive ? colors.p : colors.t3,
                opacity: isActive ? 1 : 0.6
              }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    zIndex: 50,
    alignItems: 'center',
    paddingBottom: 20,
    paddingHorizontal: 14,
  },
  navContainer: {
    width: '100%',
    maxWidth: 420,
    height: 64,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    overflow: 'visible', // allow FAB to pop out
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  navBg: {
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden', // clips the blur
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 2,
  },
  fab: {
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -32, // pops out
  },
  fabInner: {
    width: 58,
    height: 58,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowColor: '#23B5CE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  }
});
