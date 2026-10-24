import React from 'react';

import { Input } from '../../../../packages/ui-native/src';
import { Section } from '../consult/ConsultKit';
import { useScreenUi } from '../screen/ScreenKit';
import { parseCopay } from '../../utils/differentiators';

/**
 * The two optional card figures of a policy (owner decision 2026-10-24): the copay share in percent (0..100) and the cap in
 * SAR (0 or more), as printed on the card. They only feed the "your estimated share" line of a booking; the server decides
 * the final amount. The caller keeps the two texts, asks `parseCopay` before saving and sends `copay_percent` and
 * `copay_cap_sar` (the backend DTO names).
 */
export function CopayFields({ percent, cap, onPercent, onCap, showErrors, idPrefix }: { percent: string; cap: string; onPercent: (v: string) => void; onCap: (v: string) => void; showErrors: boolean; idPrefix: string }) {
  const { k, theme } = useScreenUi();
  const check = parseCopay(percent, cap);
  const bad = showErrors && !check.ok ? check.field : null;
  return (
    <Section title={k('insurance.copay.title')}>
      <Input label={k('insurance.copay.percent')} placeholder={k('insurance.copay.percentHint')} hint={k('insurance.copay.hint')} error={bad === 'percent' ? k('insurance.copay.percentError') : undefined} invalid={bad === 'percent'} keyboardType="decimal" value={percent} onChange={onPercent} theme={theme} testID={`${idPrefix}-copay-percent`} />
      <Input label={k('insurance.copay.cap')} placeholder={k('insurance.copay.capHint')} error={bad === 'cap' ? k('insurance.copay.capError') : undefined} invalid={bad === 'cap'} keyboardType="decimal" value={cap} onChange={onCap} theme={theme} testID={`${idPrefix}-copay-cap`} />
    </Section>
  );
}
