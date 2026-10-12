import React from 'react';
import { Linking } from 'react-native';

import { Gate } from '../consult/ConsultKit';
import { Notice, useRemote } from '../health/HealthKit';
import { CareScreen, PrimaryAction, ltr } from '../care/CareKit';
import { useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { parseUrgentHelp, type UrgentHelp } from '../../utils/urgent-help';

/**
 * The one urgent-help screen (owner decision 14, 2026-10-10): a calm page with a `tel:` button whose number is the one the
 * admin set (GET /mental-health/urgent-help, public, key `mental_health_urgent_help`). No number is written in the app:
 * without one there is no button and the page says so. No ambulance, no location sharing, no crisis handling in the app.
 * The old /emergency/sos, /sos-active and /tracking routes redirect here.
 */
export function UrgentHelpView() {
  const { k } = useScreenUi();
  const help = useRemote<UrgentHelp | null>(async () => parseUrgentHelp(await apiFetch('/mental-health/urgent-help')), [], 'emergency:urgent-help');
  const number = help.data;
  const call = () => { if (number) Linking.openURL(`tel:${number.dial}`).catch(() => undefined); };

  return (
    <CareScreen title={k('emergency.title')} testID="urgent-help">
      <Notice tone="info" text={k('emergency.intro')} testID="urgent-help-intro" />
      <Gate status={help.status} onRetry={() => void help.reload()}>
        {number ? (
          <PrimaryAction label={k('emergency.call', { number: ltr(number.phone) })} onPress={call} testID="urgent-help-call" />
        ) : (
          <Notice tone="warning" text={k('emergency.unavailable')} testID="urgent-help-unavailable" />
        )}
      </Gate>
      <Notice tone="warning" text={k('emergency.note')} />
    </CareScreen>
  );
}
