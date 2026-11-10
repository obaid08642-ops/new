import React, { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NBtn, NCard, NInput } from '../../components/ui';
import { SP, FS, FW } from '../../constants';
import client from '../../api/client';
import { MAX_SLOT_CAPACITY, parseCapacity, SLOT_CAPACITY_URL } from './labSlotCapacity';

// The lab sets how many patients it takes at the same time slot. It applies at once to the slot picker and to new bookings.
export function LabSlotCapacityCard() {
  const { theme } = useTheme();
  const { isRTL, t } = useLang();
  const { show } = useToast();
  const [value, setValue] = useState('1');
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try { const r = await client.get(SLOT_CAPACITY_URL); setValue(String(r.data?.slot_capacity ?? 1)); setLoaded(true); } catch { setFailed(true); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const n = parseCapacity(value);
    if (n === null) { show(t('labCapacity.invalid', { max: MAX_SLOT_CAPACITY }), 'warning'); return; }
    setSaving(true);
    try { await client.put(SLOT_CAPACITY_URL, { slot_capacity: n }); show(t('labCapacity.saved'), 'success'); }
    catch { show(t('labCapacity.failed'), 'error'); } finally { setSaving(false); }
  };

  return (
    <NCard style={{ marginTop: SP.lg }}>
      <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: isRTL ? 'right' : 'left' }}>{t('labCapacity.title')}</Text>
      <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: isRTL ? 'right' : 'left', marginVertical: SP.sm }}>{t('labCapacity.hint')}</Text>
      {failed ? (
        <NBtn label={t('labCapacity.retry')} variant="outline" onPress={load} />
      ) : (
        <>
          <NInput label={t('labCapacity.label')} value={value} onChange={(v) => setValue(v.replace(/[^0-9]/g, '').slice(0, 2))} kbType="number-pad" maxLen={2} editable={loaded} />
          <NBtn label={t('labCapacity.save')} onPress={save} loading={saving} disabled={saving || !loaded} />
        </>
      )}
    </NCard>
  );
}
