import React from 'react';

import { LegalDocument } from '../../src/components/legal/LegalKit';
import { useScreenUi } from '../../src/components/screen/ScreenKit';

/** Terms of use: reachable before sign-in; the text is the legal service's `patient_terms`. */
export default function TermsScreen() {
  const { k } = useScreenUi();
  return <LegalDocument policyKey="patient_terms" title={k('legal.terms.title')} testID="legal-terms" />;
}
