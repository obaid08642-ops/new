import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NScroll, NBtn } from '../../components/ui';
import { SP, FS, FW, R } from '../../constants';

export function FacilityAnnouncementsScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [message, setMessage] = useState('');
  
  const [announcements, setAnnouncements] = useState([
    { id: 'a-1', text: 'تنبيه: سيتم إغلاق البوابة الجنوبية للصيانة يوم الخميس.', date: '2026-07-18', sender: 'الإدارة' },
    { id: 'a-2', text: 'نرحب بانضمام د. سارة محمد لفريق عمل قسم الأطفال.', date: '2026-07-17', sender: 'الموارد البشرية' }
  ]);

  const handleBroadcast = () => {
    if (!message.trim()) return;
    const newAnnouncement = {
      id: `a-${Date.now()}`,
      text: message,
      date: new Date().toISOString().split('T')[0],
      sender: AR ? 'مدير المنشأة' : 'Facility Admin'
    };
    setAnnouncements([newAnnouncement, ...announcements]);
    setMessage('');
    show(AR ? 'تم إرسال الإعلان لجميع المزودين' : 'Announcement broadcasted to all providers', 'success');
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
            <NBtn label={AR ? 'نشر التعميم' : 'Broadcast'} onPress={handleBroadcast} style={{ marginTop: SP.md }} />
          </NCard>

          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'التعاميم السابقة' : 'Previous Announcements'}
          </Text>

          {announcements.map(ann => (
            <NCard key={ann.id} style={{ marginBottom: SP.md }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.sm }}>
                <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text }}>
                  {ann.sender}
                </Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
                  {ann.date}
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
