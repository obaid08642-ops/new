import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NScroll, NBtn, NEmpty } from '../../components/ui';
import { SP, FS, FW, R } from '../../constants';
import client from '../../api/client';

export function FacilityAnnouncementsScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [message, setMessage] = useState('');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const res = await client.get('/facility/announcements');
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch { setAnnouncements([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleBroadcast = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await client.post('/facility/announcements', { text: message.trim() });
      setMessage('');
      show(AR ? 'تم نشر التعميم' : 'Announcement published', 'success');
      fetchAll();
    } catch (err: any) {
      show(err?.response?.data?.message || (AR ? 'فشل نشر التعميم' : 'Failed to publish'), 'error');
    } finally { setSending(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'التعاميم والإعلانات' : 'Announcements'} onBack={onBack} />
      
      <NScroll>
        <View style={{ padding: SP.xl }}>
          
          <NCard style={{ marginBottom: SP.xl, backgroundColor: theme.primaryLight, borderColor: theme.primary }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'إرسال تعميم جديد' : 'New Broadcast'}
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.surface,
                borderRadius: R.md,
                padding: SP.md,
                color: theme.text,
                height: 100,
                textAlignVertical: 'top',
                textAlign: AR ? 'right' : 'left'
              }}
              placeholder={AR ? 'اكتب التعميم هنا وسيظهر لجميع المزودين المرتبطين...' : 'Type announcement here to broadcast to all linked providers...'}
              placeholderTextColor={theme.textSub}
              multiline
              value={message}
              onChangeText={setMessage}
            />
            <NBtn label={AR ? 'نشر التعميم' : 'Broadcast'} loading={sending} onPress={handleBroadcast} style={{ marginTop: SP.md }} />
          </NCard>

          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'التعاميم السابقة' : 'Previous Announcements'}
          </Text>

          {loading ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.xl }} />
          ) : announcements.length === 0 ? (
            <NEmpty title={AR ? 'لا توجد تعاميم بعد' : 'No announcements yet'} subtitle={AR ? 'أول تعميم تنشره سيظهر هنا' : 'Announcements you publish will appear here'} />
          ) : announcements.map(ann => (
            <NCard key={ann.id} style={{ marginBottom: SP.md }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.sm }}>
                <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text }}>
                  {ann.sender || (AR ? 'الإدارة' : 'Admin')}
                </Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
                  {(ann.createdAt || '').slice(0, 10)}
                </Text>
              </View>
              <Text style={{ fontSize: FS.md, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                {ann.text}
              </Text>
            </NCard>
          ))}
        </View>
      </NScroll>
    </View>
  );
}
