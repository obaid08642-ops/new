import React from 'react';
import { router } from 'expo-router';

import { NoticePage } from '../../src/components/legal/LegalKit';
import { useScreenUi } from '../../src/components/screen/ScreenKit';

/** A provider account signed in to the patient app: continue as a patient or go back to the sign-in. */
export default function ProviderInfoScreen() {
  const { k } = useScreenUi();
  return (
    <NoticePage
      testID="provider-info"
      headline={k('legal.provider.title')}
      body={k('legal.provider.body')}
      primary={{ label: k('legal.provider.continue'), onPress: () => router.replace('/(tabs)') }}
      secondary={{ label: k('legal.provider.logout'), onPress: () => router.replace('/(auth)/login') }}
    />
  );
}
