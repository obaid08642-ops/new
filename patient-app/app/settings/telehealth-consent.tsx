import React from 'react';

import { LegalDocument } from '../../src/components/legal/LegalKit';
import { useScreenUi } from '../../src/components/screen/ScreenKit';

/** D-38: the telehealth consent; the text is the legal service's `telehealth_consent` (/legal/policy, with lang). */
export default function TelehealthConsentScreen() {
  const { k } = useScreenUi();
  return <LegalDocument policyKey="telehealth_consent" title={k('legal.telehealth.title')} testID="legal-telehealth-consent" />;
}
