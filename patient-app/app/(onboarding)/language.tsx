import React, { useState } from 'react';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, Card, Radio, Screen, StickyFooter } from '../../../packages/ui-native/src';
import { AuthBody, AuthFooter, AuthTitle, AuthTopBar, useAuthUi } from '../../src/components/auth/AuthKit';
import { LANGUAGES, useApp, type LangCode } from '../../src/context/AppContext';

/**
 * Onboarding, language — the sign-in kit's look with the Settings board's language card (canvas/Settings.dc.html):
 * one white card, a Radio row per language (its own name, the English name beside it, the action-coloured ring
 * when chosen), "Continue" in the sticky footer. The chosen language is applied on Continue, as before.
 */
export default function OnboardingLanguage() {
  const { lang, setLang } = useApp();
  const { theme, tr, isRTL } = useAuthUi();
  const dir = isRTL ? 'rtl' : 'ltr';
  // nothing chosen yet means the current language (read at render, so it is right once the app has loaded it)
  const [picked, setPicked] = useState<LangCode | null>(null);
  const selected = picked ?? lang;

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(onboarding)' as Href);
  };
  const next = () => {
    setLang(selected);
    router.replace('/(onboarding)/permissions' as Href);
  };

  const footer = (
    <StickyFooter theme={theme}>
      <AuthFooter>
        <Button label={tr('متابعة')} variant="primary" size="lg" fullWidth theme={theme} onPress={next} testID="language-continue" />
      </AuthFooter>
    </StickyFooter>
  );

  return (
    <Screen theme={theme} edges={['top', 'start', 'end']} scroll footer={footer} testID="onboarding-language">
      <AuthBody>
        <AuthTopBar onBack={back} />
        <AuthTitle title="اختر لغتك" sub="يمكنك تغييرها لاحقًا من الإعدادات." />
        <View style={{ marginTop: 24 }}>
          <Card elevation="flat" padding="none" theme={theme}>
            <View>
              {LANGUAGES.map((l, i) => (
                <Radio
                  key={l.code}
                  label={l.native}
                  meta={l.label}
                  selected={selected === l.code}
                  onChange={() => setPicked(l.code)}
                  divider={i < LANGUAGES.length - 1}
                  direction={dir}
                  theme={theme}
                  testID={`language-${l.code}`}
                />
              ))}
            </View>
          </Card>
        </View>
      </AuthBody>
    </Screen>
  );
}
