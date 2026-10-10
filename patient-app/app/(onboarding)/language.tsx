import React from 'react';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, Card, Radio, Screen, StickyFooter } from '../../../packages/ui-native/src';
import { AuthBody, AuthFooter, AuthTitle, AuthTopBar, useAuthUi } from '../../src/components/auth/AuthKit';
import { LANGUAGES, useApp, type LangCode } from '../../src/context/AppContext';

/**
 * Onboarding, language — the sign-in kit's look with the Settings board's language card (canvas/Settings.dc.html):
 * one white card, a Radio row per language (its own name, the English name beside it, the action-coloured ring
 * when chosen), "Continue" in the sticky footer. First screen of the first launch (no back button); the chosen language is applied at once, Continue opens the intro.
 */
export default function OnboardingLanguage() {
  const { lang, setLang } = useApp();
  const { theme, tr, isRTL } = useAuthUi();
  const dir = isRTL ? 'rtl' : 'ltr';
  // the language is applied at once (the app context saves it and sets the layout direction)
  const pick = (code: LangCode) => setLang(code);
  const next = () => router.replace('/(onboarding)/intro' as Href);

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
        <AuthTopBar />
        <AuthTitle title="اختر لغتك" sub="يمكنك تغييرها لاحقًا من الإعدادات." />
        <View style={{ marginTop: 24 }}>
          <Card elevation="flat" padding="none" theme={theme}>
            <View>
              {LANGUAGES.map((l, i) => (
                <Radio
                  key={l.code}
                  label={l.native}
                  meta={l.label}
                  selected={lang === l.code}
                  onChange={() => pick(l.code)}
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
