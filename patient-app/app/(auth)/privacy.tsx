import React from 'react';

import { LegalDocument } from '../../src/components/legal/LegalKit';
import { useScreenUi } from '../../src/components/screen/ScreenKit';

/** Privacy policy: reachable before sign-in; the text is the legal service's `privacy_policy`. */
export default function PrivacyScreen() {
  const { k } = useScreenUi();
  return <LegalDocument policyKey="privacy_policy" title={k('legal.privacy.title')} testID="legal-privacy" />;
}
