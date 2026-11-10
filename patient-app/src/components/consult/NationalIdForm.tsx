import React, { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, Input } from '../../../../packages/ui-native/src';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { normaliseNationalId } from '../../utils/nationalId';

/**
 * Owner decision 6 (2026-11-10): the national ID / iqama number is asked for only when a medical report needs it: when it is requested at
 * booking, or when the doctor issued one and the number is missing (the PDF waits until it is added). Checked here as the server checks it,
 * then PUT /care/sick-leaves/national-id (stored encrypted, shown in full only on the report). `onSaved` lets the screen go on.
 */
export function NationalIdForm({ onSaved }: { onSaved?: () => void }) {
  const { theme, t, c, flow, k } = useScreenUi();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (busy) return;
    const id = normaliseNationalId(value);
    if (!id) {
      setError(k('consult.nationalId.invalid'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/care/sick-leaves/national-id', { method: 'PUT', body: JSON.stringify({ national_id: id }) });
      setSaved(true);
      setValue('');
      onSaved?.();
    } catch (e) {
      logError('consultations:national-id', e);
      setError(k('consult.nationalId.failed'));
    } finally {
      setBusy(false);
    }
  };

  if (saved) return <Text accessibilityLiveRegion="polite" style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('consult.nationalId.saved')}</Text>;
  return (
    <Card theme={theme} padding="sm">
      <View style={{ gap: 8 }} testID="national-id-form">
        <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{k('consult.nationalId.title')}</Text>
        <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, ...flow }}>{k('consult.nationalId.hint')}</Text>
        <Input label={k('consult.nationalId.label')} value={value} onChange={setValue} keyboardType="number" theme={theme} testID="national-id-input" />
        {error ? <Text accessibilityLiveRegion="polite" style={{ ...scale(t, 'meta', 'regular'), color: c.status.danger.fg, ...flow }}>{error}</Text> : null}
        <Button label={busy ? k('consult.nationalId.saving') : k('consult.nationalId.save')} loading={busy} disabled={busy || value.trim() === ''} onPress={() => void save()} theme={theme} testID="national-id-save" />
      </View>
    </Card>
  );
}
