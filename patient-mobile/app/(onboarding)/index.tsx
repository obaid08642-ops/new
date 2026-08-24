// @ts-nocheck

import React, { useRef, useState, useCallback } from 'react';
import {
  View, StyleSheet, Dimensions, TouchableOpacity,
  FlatList, Animated, StatusBar, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../src/constants';
import { Colors, Spacing, BorderRadius } from '../../src/theme';
import { Icon } from '../../src/components/Icon';
import { useApp } from '../../src/context/AppContext';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';

const { width, height } = Dimensions.get('window');


const SLIDES = [
  {
    id: '1',
    icon: 'hospital' as const,
    title: 'رعايتك الصحية الشاملة',
    subtitle: 'احجز أفضل الأطباء في جميع التخصصات في ثوانٍ',
    gradient: ['#23B5CE', '#8FD4E3', '#00C9A7'],
    accent: '#00C9A7',
  },
  {
    id: '2',
    icon: 'medication' as const,
    title: 'صيدليتك في جيبك',
    subtitle: 'اطلب الأدوية والمستلزمات الطبية مع توصيل سريع لبابك',
    gradient: ['#00977D', '#00C9A7', '#33D4B8'],
    accent: '#23B5CE',
  },
  {
    id: '3',
    icon: 'flask' as const,
    title: 'فحوصاتك من المنزل',
    subtitle: 'احجز التحاليل والأشعة مع زيارة منزلية وأسعار مقارنة',
    gradient: ['#6B21A8', '#7A6BEA', '#A78BFA'],
    accent: '#F0A526',
  },
  {
    id: '4',
    icon: 'stethoscope' as const,
    title: 'تمريض متخصص في بيتك',
    subtitle: 'خدمات تمريضية احترافية على مدار الساعة في منزلك',
    gradient: ['#0E7490', '#0891B2', '#22D3EE'],
    accent: '#FF6B6B',
  },
  {
    id: '5',
    icon: 'robot' as const,
    title: 'ذكاء اصطناعي يرافق صحتك',
    subtitle: 'مساعد ذكي يحلل أعراضك ويترجم وصفاتك ويتابع صحتك يومياً',
    gradient: ['#1E1B4B', '#312E81', '#23B5CE'],
    accent: '#00C9A7',
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleNext = useCallback(async () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      try {
        try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true');
    } catch (e) {
      // Storage failure - non-critical
    }
      } catch (e) {
        // Storage failure - non-critical, continue navigation
      }
      router.replace('/(onboarding)/language');
    }
  }, [currentIndex]);

  const handleSkip = useCallback(async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true');
    } catch (e) {
      // Storage failure - non-critical
    }
    router.replace('/(onboarding)/language');
  }, []);

  const renderSlide = ({ item, index }: { item: typeof SLIDES[0]; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const scale = scrollX.interpolate({ inputRange, outputRange: [0.85, 1, 0.85] });
    const opacity = scrollX.interpolate({ inputRange, outputRange: [0.5, 1, 0.5] });
    const translateY = scrollX.interpolate({ inputRange, outputRange: [40, 0, 40] });

    return (
      <View style={styles.slide}>
        <View
          style={StyleSheet.absoluteFillObject}
        />
        {/* Decorative circles */}
        <View style={[styles.circle1, { borderColor: item.accent + '40' }]} />
        <View style={[styles.circle2, { borderColor: item.accent + '20' }]} />
        <View style={[styles.circle3, { borderColor: '#ffffff15' }]} />

        {/* Emoji Illustration */}
        <Animated.View style={[styles.emojiContainer, { transform: [{ scale }, { translateY }], opacity }]}>
          <View style={[styles.emojiBackground, { backgroundColor: 'rgba(255,255,255,0.15)' } ]}>
            <View style={[styles.emojiInner, { backgroundColor: 'rgba(255,255,255,0.2)' } ]}>
              <Icon name={item.icon} size={64} color="#fff" />
            </View>
          </View>
          {/* Floating accent dots */}
          <View style={[styles.dot1, { backgroundColor: item.accent }]} />
          <View style={[styles.dot2, { backgroundColor: colors.surface }]} />
          <View style={[styles.dot3, { backgroundColor: item.accent + '80' }]} />
        </Animated.View>
      </View>
    );
  };

  const current = SLIDES[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: true,
        })}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        renderItem={renderSlide}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 16 } ]}>
        <View style={styles.logo}>
          <AppText variant="bodySM">نبض</AppText>
          <View style={styles.logoPlusBadge}>
            <AppText variant="bodySM">+</AppText>
          </View>
        </View>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <AppText variant="bodySM">تخطي</AppText>
        </TouchableOpacity>
      </View>

      {/* Bottom Content */}
      <View style={[styles.bottomContent, { paddingBottom: insets.bottom + 20 } ]}>
        {/* Dot Indicators */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, i) => {
            const dotWidth = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [8, 28, 8],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [0.4, 1, 0.4],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]} />
            );
          })}
        </View>

        {/*Content */}
        <View style={styles.textContent}>
          <AppText variant="bodySM">{current.title}</AppText>
          <AppText variant="bodySM">{current.subtitle}</AppText>
        </View>

        {/* CTA Button */}
        <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
          <View
            style={styles.nextBtn}
          >
            <View style={styles.nextBtnInner}>
              <AppText variant="bodySM">
                {currentIndex === SLIDES.length - 1 ? 'ابدأ رحلتك الصحية' : 'التالي'}
              </AppText>
              <AppText variant="bodySM">
                {currentIndex === SLIDES.length - 1 ? '' : '←'}
              </AppText>
            </View>
          </View>
        </TouchableOpacity>

        {/* Step Counter */}
        <AppText variant="bodySM">
          {currentIndex + 1} / {SLIDES.length}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#23B5CE' },
  slide: { width, height, justifyContent: 'center', alignItems: 'center' },
  circle1: {
    position: 'absolute', width: width * 1.2, height: width * 1.2,
    borderRadius: width * 0.6, borderWidth: 1,
    top: -width * 0.3, right: -width * 0.3,
  },
  circle2: {
    position: 'absolute', width: width * 0.8, height: width * 0.8,
    borderRadius: width * 0.4, borderWidth: 1,
    bottom: height * 0.2, left: -width * 0.2,
  },
  circle3: {
    position: 'absolute', width: width * 0.5, height: width * 0.5,
    borderRadius: width * 0.25, borderWidth: 1,
    top: height * 0.15, left: width * 0.1,
  },
  emojiContainer: {
    alignItems: 'center', justifyContent: 'center',
    marginTop: -80,
  },
  emojiBackground: {
    width: 200, height: 200, borderRadius: 100,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  emojiInner: {
    width: 160, height: 160, borderRadius: 80,
    justifyContent: 'center', alignItems: 'center',
  },
  emoji: { fontSize: 80 } as any,
  dot1: { position: 'absolute', width: 16, height: 16, borderRadius: 8, top: 10, right: -10 },
  dot2: { position: 'absolute', width: 10, height: 10, borderRadius: 5, bottom: 20, left: -20, opacity: 0.7 },
  dot3: { position: 'absolute', width: 24, height: 24, borderRadius: 12, bottom: -10, right: 20 },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  logo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  logoPlusBadge: {
    backgroundColor: '#00C9A7', borderRadius: 10,
    width: 20, height: 20, justifyContent: 'center', alignItems: 'center',
  },
  logoPlus: { color: '#fff', fontSize: 14, fontWeight: '900' } as any,
  skipBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  skip: { color: '#fff', fontSize: 14, fontWeight: '600' } as any,
  bottomContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 28, paddingTop: 24,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderTopLeftRadius: 40, borderTopRightRadius: 40,
    backdropFilter: 'blur(20px)',
  },
  dotsContainer: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 6, marginBottom: 20 },
  dot: {
    height: 8, borderRadius: 4, backgroundColor: 'transparent',
  },
  textContent: { marginBottom: 24, alignItems: 'flex-end' },
  title: {
    color: '#fff', fontSize: 26, fontWeight: '800',
    textAlign: 'right', marginBottom: 10, lineHeight: 36,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '400',
    textAlign: 'right', lineHeight: 24,
  } as any,
  nextBtn: {
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  nextBtnInner: {
    flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 18, paddingHorizontal: 28, gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  nextBtnArrow: { color: '#fff', fontSize: 20 } as any,
  stepCounter: {
    color: 'rgba(255,255,255,0.5)', textAlign: 'center',
    fontSize: 12, fontWeight: '400', marginTop: 4,
  },
});
