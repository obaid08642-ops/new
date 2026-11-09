import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Button } from '../../../../packages/ui-native/src';
import { Notice } from '../pharmacy/OfferKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { canReportNoShow, noShowOpensAt } from '../../utils/providerNoShow';

/**
 * "The doctor did not come" (POST /care/appointments/:id/provider-no-show): appears 10 minutes after the start and only for a visit that
 * never started; a second step says what it does (the visit is cancelled, a full refund at once) before anything is sent. The server
 * decides again: its refusal is an error, never a success. `onDone` reloads the appointment (it is now cancelled).
 */
export function ProviderNoShow({ appointmentId, status, slotStart, onDone }: { appointmentId: string; status?: string; slotStart?: string; onDone: () => void }) {
  const { theme, t, c, flow, k } = useScreenUi();
  const [now, setNow] = useState(() => Date.now());
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  // wake the screen when the button should appear (the screen was opened before the 10 minutes were up)
  useEffect(() => {
    const opensAt = noShowOpensAt(status, slotStart);
    if (opensAt === null) return undefined;
    const wait = opensAt - Date.now();
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(wait + 500, 2_147_000_000));
    return () => clearTimeout(timer);
  }, [status, slotStart]);

  const send = async () => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      await apiFetch(`/care/appointments/${encodeURIComponent(appointmentId)}/provider-no-show`, { method: 'POST', body: JSON.stringify({}) });
      setDone(true);
      setAsking(false);
      onDone();
    } catch (e) {
      logError('consultations:provider-no-show', e);
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  if (done) return <Notice tone="info" text={k('consult.noShow.done')} />;
  if (!canReportNoShow(status, slotStart, now)) return null;
  if (!asking) return <Button label={k('consult.noShow.button')} variant="outline" size="md" fullWidth onPress={() => setAsking(true)} theme={theme} testID="detail-no-show" />;
  return (
    <>
      <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{k('consult.noShow.confirmBody')}</Text>
      {error ? <Notice tone="danger" text={k('consult.noShow.error')} /> : null}
      <Button label={k('consult.noShow.confirm')} size="md" fullWidth loading={busy} onPress={() => void send()} theme={theme} testID="detail-no-show-confirm" />
      <Button label={k('consult.noShow.keep')} variant="outline" size="md" fullWidth disabled={busy} onPress={() => setAsking(false)} theme={theme} testID="detail-no-show-keep" />
    </>
  );
}
