import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { Notice } from './pharmacy/OfferKit';
import { useScreenUi } from './screen/ScreenKit';
import { permissions, type PermissionStatus } from '../services/PermissionsManager';
import { askNotificationsInContext } from '../utils/notifications';

/**
 * The in-context notification prompt (owner decision 6, 2026-10-10: permissions are asked where a feature needs them, never in
 * onboarding). It reads what the phone already says without asking. Allowed: nothing is drawn. Not asked yet: a short
 * reason (`bodyKey`) and "Turn on", which shows the phone's own dialog. Refused: the dialog cannot be shown again, so the
 * prompt says so and offers the phone's settings. It re-reads when the app returns from the settings.
 */
export function NotificationAsk({ bodyKey }: { bodyKey: string }) {
  const { k } = useScreenUi();
  const [status, setStatus] = useState<PermissionStatus | null>(null);

  const read = useCallback(() => {
    permissions
      .check('notifications')
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    read();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') read();
    });
    return () => sub.remove();
  }, [read]);

  if (status === null || status === 'granted') return null;

  if (status === 'denied' || status === 'restricted') {
    return <Notice tone="warning" text={k('notifAsk.blocked')} actionLabel={k('notifAsk.openSettings')} onAction={() => void Linking.openSettings()} />;
  }
  return <Notice tone="info" text={k(bodyKey)} actionLabel={k('notifAsk.turnOn')} onAction={() => void askNotificationsInContext().then(setStatus)} />;
}
