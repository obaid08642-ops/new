import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NScroll, NBadge, NBtn } from '../../components/ui';
import { SP, FS, FW, R } from '../../constants';
import client from '../../api/client';

export function FacilityUnifiedCalendarScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [events, setEvents] = useState<any[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  React.useEffect(() => {
    client.get('/provider/facility/calendar')
      .then(res => setEvents(res.data || []))
      .catch(() => setEvents([]));
  }, []);

  async function act(id: string, action: 'confirm' | 'cancel') {
    if (!id) return;
    setActingId(id);
    try {
      await client.patch(`/care/appointments/${id}/${action}`, {});
      show(action === 'confirm' ? (AR ? 'تم تأكيد الموعد' : 'Appointment confirmed') : (AR ? 'تم إلغاء الموعد' : 'Appointment cancelled'), 'success');
      const res = await client.get('/provider/facility/calendar').catch(() => null);
      if (res?.data) setEvents(res.data);
    } catch (err: any) {
      show(err?.response?.data?.message || (AR ? 'تعذر تنفيذ الإجراء' : 'Action failed'), 'error');
    } finally {
      setActingId(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'التقويم الموحد (Unified Calendar)' : 'Unified Calendar'} onBack={onBack} />
      
      <View style={{ padding: SP.md, backgroundColor: theme.surface }}>
        <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center' }}>
          {AR ? 'عرض جميع المواعيد المتقاطعة (مزودين / أطباء / موارد)' : 'Cross-provider and resources schedule'}
        </Text>
      </View>

      <NScroll>
        <View style={{ padding: SP.xl }}>
          {events.map(ev => (
            <NCard key={ev.id} style={{ marginBottom: SP.md, borderLeftWidth: 4, borderLeftColor: ev.type === 'surgery' ? theme.warn : ev.type === 'emergency' ? theme.danger : theme.primary }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                    {ev.time} - {ev.patient}
                  </Text>
                  <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? 'المورد:' : 'Resource:'} <Text style={{ color: theme.text }}>{ev.resource}</Text>
                  </Text>
                  <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? 'الطبيب/المزود:' : 'Provider:'} <Text style={{ color: theme.text }}>{ev.provider}</Text>
                  </Text>
                </View>
                <NBadge 
                  label={ev.type === 'surgery' ? (AR ? 'عملية' : 'Surgery') : ev.type === 'emergency' ? (AR ? 'طوارئ' : 'Emergency') : (AR ? 'كشف' : 'Consultation')} 
                  variant={ev.type === 'emergency' ? 'danger' : ev.type === 'surgery' ? 'warning' : 'primary'} 
                />
              </View>
              {ev.type !== 'surgery' && ev.type !== 'emergency' && ev.id ? (
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: 8, marginTop: 8 }}>
                  <View style={{ flex: 1 }}><NBtn label={AR ? 'تأكيد' : 'Confirm'} size="sm" loading={actingId === ev.id} onPress={() => act(ev.id, 'confirm')} /></View>
                  <View style={{ flex: 1 }}><NBtn label={AR ? 'إلغاء' : 'Cancel'} size="sm" variant="danger" loading={actingId === ev.id} onPress={() => act(ev.id, 'cancel')} /></View>
                </View>
              ) : null}
            </NCard>
          ))}
        </View>
      </NScroll>
    </View>
  );
}
