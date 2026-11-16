import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NScroll, NBadge, NBtn } from '../../components/ui';
import { SP, FS, FW, R } from '../../constants';
import client from '../../api/client';

export function FacilityUnifiedCalendarScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang, t, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [events, setEvents] = useState<any[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  React.useEffect(() => {
    client.get('/provider/facility/calendar')
      // the server returns scheduled_at / patient_id / provider_id / service_type / status (no names): map them to what the card shows
      .then(res => setEvents((Array.isArray(res.data) ? res.data : []).map((e: any) => ({
        ...e,
        time: e.time || (e.scheduled_at ? new Date(e.scheduled_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''),
        patient: e.patient || e.patient_name || (e.patient_id ? String(e.patient_id).slice(0, 8) : '—'),
        resource: e.resource || e.service_type || '—',
        provider: e.provider || e.provider_name || (e.provider_id ? String(e.provider_id).slice(0, 8) : '—'),
        type: e.type || (e.kind === 'surgery' || e.kind === 'emergency' ? e.kind : 'consultation'),
      }))))
      .catch(() => { setEvents([]); setLoadFailed(true); });
  }, []);

  async function act(id: string, action: 'confirm' | 'cancel') {
    if (!id) return;
    setActingId(id);
    try {
      await client.patch(`/care/appointments/${id}/${action}`, {});
      show(action === 'confirm' ? (tt('rraz.fb7658b0')) : (tt('rraz.bd8eef41')), 'success');
      const res = await client.get('/provider/facility/calendar').catch(() => null);
      if (res?.data) setEvents(res.data);
    } catch (err: any) {
      show(err?.response?.data?.message || (tt('rraz.b1ec89a1')), 'error');
    } finally {
      setActingId(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('rraz.403739f0')} onBack={onBack} />
      
      <View style={{ padding: SP.md, backgroundColor: theme.surface }}>
        <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center' }}>
          {tt('rraz.ee11fc3a')}
        </Text>
      </View>

      <NScroll>
        <View style={{ padding: SP.xl }}>
          {loadFailed && events.length === 0 ? <Text style={{ textAlign: 'center', color: theme.danger, marginVertical: SP.xl }}>{t('pa3.facilityCalendar.1')}</Text> : null}
          {events.map(ev => (
            <NCard key={ev.id} style={{ marginBottom: SP.md, borderLeftWidth: 4, borderLeftColor: ev.type === 'surgery' ? theme.warn : ev.type === 'emergency' ? theme.danger : theme.primary }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                    {ev.time} - {ev.patient}
                  </Text>
                  <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
                    {tt('rraz.1962b616')} <Text style={{ color: theme.text }}>{ev.resource}</Text>
                  </Text>
                  <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                    {tt('rraz.d3208a77')} <Text style={{ color: theme.text }}>{ev.provider}</Text>
                  </Text>
                </View>
                <NBadge 
                  label={ev.type === 'surgery' ? (tt('rraz.e6103c85')) : ev.type === 'emergency' ? (tt('rraz.b8ae12d8')) : (tt('rraz.3861d419'))} 
                  variant={ev.type === 'emergency' ? 'danger' : ev.type === 'surgery' ? 'warning' : 'primary'} 
                />
              </View>
              {ev.type !== 'surgery' && ev.type !== 'emergency' && ev.id ? (
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: 8, marginTop: 8 }}>
                  <View style={{ flex: 1 }}><NBtn label={tt('rraz.449fee30')} size="sm" loading={actingId === ev.id} onPress={() => act(ev.id, 'confirm')} /></View>
                  <View style={{ flex: 1 }}><NBtn label={tt('rraz.210b779f')} size="sm" variant="danger" loading={actingId === ev.id} onPress={() => act(ev.id, 'cancel')} /></View>
                </View>
              ) : null}
            </NCard>
          ))}
        </View>
      </NScroll>
    </View>
  );
}
