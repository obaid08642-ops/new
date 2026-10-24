import React from 'react';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';

import { NoticePage } from '../../src/components/legal/LegalKit';
import { useScreenUi } from '../../src/components/screen/ScreenKit';
import { providerLinks } from '../../src/config/providerLinks';
import { logout } from '../../src/store/slices/authSlice';

/**
 * A provider account tried to sign in to the patient app. No patient session was started (nothing is stored): this
 * page says to use the provider app / site, with the store links and web address that the build is configured with.
 */
export default function ProviderInfoScreen() {
  const { k } = useScreenUi();
  const dispatch = useDispatch();
  const links = providerLinks();
  const open = (url: string) => () => { void Linking.openURL(url).catch(() => {}); };
  const more = [
    links.ios ? { label: k('legal.provider.appStore'), onPress: open(links.ios) } : null,
    links.android ? { label: k('legal.provider.googlePlay'), onPress: open(links.android) } : null,
    links.web ? { label: k('legal.provider.web'), onPress: open(links.web) } : null,
  ].filter((x): x is { label: string; onPress: () => void } => x !== null);
  return (
    <NoticePage
      testID="provider-info"
      headline={k('legal.provider.title')}
      body={k('legal.provider.body')}
      more={more}
      secondary={{ label: k('legal.provider.back'), onPress: () => { dispatch(logout()); router.replace('/(auth)/login'); } }}
    />
  );
}
