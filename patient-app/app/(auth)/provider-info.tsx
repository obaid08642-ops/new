import React from 'react';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';

import { NoticePage } from '../../src/components/legal/LegalKit';
import { useScreenUi } from '../../src/components/screen/ScreenKit';
import { logout } from '../../src/store/slices/authSlice';

/** A provider account signed in to the patient app: continue as a patient or go back to the sign-in. */
export default function ProviderInfoScreen() {
  const { k } = useScreenUi();
  const dispatch = useDispatch();
  // "Sign out" signs out for real (clears the stored session and the cart) before the sign-in (needs-review issue 782).
  return (
    <NoticePage
      testID="provider-info"
      headline={k('legal.provider.title')}
      body={k('legal.provider.body')}
      primary={{ label: k('legal.provider.continue'), onPress: () => router.replace('/(tabs)') }}
      secondary={{ label: k('legal.provider.logout'), onPress: () => { dispatch(logout()); router.replace('/(auth)/login'); } }}
    />
  );
}
