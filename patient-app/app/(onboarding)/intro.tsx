import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, Pressable, View, useWindowDimensions, type ViewToken } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, FIcon, Screen, SERVICE_ICONS, StickyFooter, type FillIconName, type ServiceTone } from '../../../packages/ui-native/src';
import { AUTH_COLUMN, AuthFooter, useAuthUi } from '../../src/components/auth/AuthKit';
import { LocalizedText } from '../../src/components/LocalizedText';
import { NabdLogo } from '../../src/components/NabdLogo';
import { step as scale } from '../../src/components/screen/ScreenKit';
import { markIntroDone } from '../../src/utils/onboardingGate';

/**
 * Onboarding intro, the second step of the first launch (language, intro, Welcome; once, owner decision 6) — the sign-in kit's look (canvas/Welcome.dc.html, AuthKit): the Noon Dot on top with "Skip",
 * one slide at a time (the service's filled icon on a white tile, a title and a line), the dots, and the CTA in the
 * sticky footer. No board is drawn for the intro itself; it follows Welcome.
 */

interface Slide {
  title: string;
  body: string;
  icon: FillIconName;
  tone: ServiceTone;
}

/** The app's five intro slides, each on its service of the handoff service map (the AI assistant is the Home board's sparkle on violet). */
const SLIDES: Slide[] = [
  { title: 'رعايتك الصحية الشاملة', body: 'احجز أفضل الأطباء في جميع التخصصات في ثوانٍ', ...SERVICE_ICONS.consult },
  { title: 'صيدليتك في جيبك', body: 'اطلب الأدوية والمستلزمات الطبية مع توصيل سريع لبابك', ...SERVICE_ICONS.pharmacy },
  { title: 'فحوصاتك من المنزل', body: 'احجز التحاليل والأشعة مع زيارة منزلية وأسعار مقارنة', ...SERVICE_ICONS.lab },
  { title: 'تمريض متخصص في بيتك', body: 'خدمات تمريضية احترافية على مدار الساعة في منزلك', ...SERVICE_ICONS.nursing },
  { title: 'ذكاء اصطناعي يرافق صحتك', body: 'مساعد ذكي يحلل أعراضك ويترجم وصفاتك ويتابع صحتك يومياً', icon: 'sparkle', tone: 'violet' },
];

/** The column's side padding, as in AuthBody. */
const SIDE = 20;

export default function OnboardingIntro() {
  const { theme, t, c, tr } = useAuthUi();
  const { width } = useWindowDimensions();
  // the slide width is the column's content width; the first guess is replaced by the measured one
  const [slideW, setSlideW] = useState(Math.min(width, 440) - 2 * SIDE);
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const list = useRef<FlatList<Slide>>(null);
  const last = index === SLIDES.length - 1;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
  }, []);

  // the slide on screen, whatever the reading direction (the scroll offset is not: it is mirrored in RTL)
  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((v) => v.isViewable && v.index != null);
    if (first?.index != null) setIndex(first.index);
  }).current;

  const goTo = useCallback(
    (i: number) => {
      setIndex(i);
      list.current?.scrollToIndex({ index: i, animated: !reduceMotion });
    },
    [reduceMotion],
  );

  const finish = useCallback(async () => {
    await markIntroDone(); // never throws: a storage failure only means the flag is kept for this session
    router.replace('/(auth)/welcome' as Href);
  }, []);

  const next = () => (last ? void finish() : goTo(index + 1));

  const footer = (
    <StickyFooter theme={theme}>
      <AuthFooter>
        <Button label={tr(last ? 'ابدأ رحلتك الصحية' : 'التالي')} variant="primary" size="lg" fullWidth theme={theme} onPress={next} testID="onboarding-next" />
      </AuthFooter>
    </StickyFooter>
  );

  return (
    <Screen theme={theme} edges={['top', 'start', 'end']} footer={footer} testID="onboarding-intro">
      <View style={{ ...AUTH_COLUMN, flex: 1, paddingHorizontal: SIDE, paddingTop: 7, paddingBottom: 16 }}>
        {/* the mark, centred, with Skip at the end and a balance at the start */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ minWidth: 64 }} />
          <NabdLogo size={30} variant="text" theme={theme} label={tr('نبض بلس')} />
          <Pressable accessibilityRole="button" accessibilityLabel={tr('تخطي')} onPress={() => void finish()} hitSlop={8} testID="onboarding-skip" style={{ minWidth: 64, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
            <LocalizedText style={{ ...scale(t, 'body', 'medium'), color: c.text.primary }}>تخطي</LocalizedText>
          </Pressable>
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }} onLayout={(e) => setSlideW(e.nativeEvent.layout.width)}>
          <FlatList
            ref={list}
            data={SLIDES}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(s) => s.title}
            getItemLayout={(_, i) => ({ length: slideW, offset: slideW * i, index: i })}
            onViewableItemsChanged={onViewable}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            style={{ flexGrow: 0 }}
            renderItem={({ item }) => (
              <View style={{ width: slideW, alignItems: 'center', gap: 28, paddingVertical: 16 }}>
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 148, height: 148, borderRadius: 44, backgroundColor: c.bg.surface, boxShadow: t.shadow.feature, alignItems: 'center', justifyContent: 'center' }}>
                  <FIcon icon={item.icon} tone={item.tone} chip="none" size={72} theme={theme} />
                </View>
                <View style={{ gap: 8, alignItems: 'center', paddingHorizontal: 8 }}>
                  <LocalizedText accessibilityRole="header" style={{ ...scale(t, 'authTitle', 'bold'), color: c.text.primary, textAlign: 'center' }}>
                    {item.title}
                  </LocalizedText>
                  <LocalizedText style={{ ...scale(t, 'body', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{item.body}</LocalizedText>
                </View>
              </View>
            )}
          />
        </View>

        {/* the dots: 44 hit areas around the 8 dots, the current one drawn long */}
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', justifyContent: 'center' }}>
          {SLIDES.map((s, i) => (
            <Pressable key={s.title} accessibilityRole="tab" accessibilityState={{ selected: i === index }} accessibilityLabel={`${i + 1} / ${SLIDES.length}`} onPress={() => goTo(i)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: i === index ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i === index ? c.text.primary : c.border.strong }} />
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}
