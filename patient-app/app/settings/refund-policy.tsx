import React from 'react';

import { LegalDocument } from '../../src/components/legal/LegalKit';
import { useScreenUi } from '../../src/components/screen/ScreenKit';

/** D-38: the cancellation and refund policy; the text is the legal service's `refund_policy` (/legal/policy, with lang). */
export default function RefundPolicyScreen() {
  const { k } = useScreenUi();
  return <LegalDocument policyKey="refund_policy" title={k('legal.refund.title')} testID="legal-refund-policy" />;
}
