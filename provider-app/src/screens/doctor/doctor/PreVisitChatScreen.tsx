import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme, useLang, useToast } from '../../../context';
import { NBtn, NCard, NInput, NHeader } from '../../../components/ui';
import { SP } from '../../../constants';
import client from '../../../api/client';

export function PreVisitChatScreen({ apt, onBack, onNavigate }: { apt: any, onBack: () => void, onNavigate: (s: string, p?: any) => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  // the conversation the patient opened from consultations/chat-with-doctor
  const loadChat = useCallback(async () => {
    if (!apt?.id) return;
    try {
      const res = await client.get(`/provider/chat/appointment/${encodeURIComponent(apt.id)}`);
      const rows = res.data?.messages || [];
      setMessages(rows.map((m: any) => ({ id: m.id, text: m.body, sender: m.sender_id === apt?.patient_id ? 'patient' : 'doctor', attachment: m.attachment_url || '' })));
    } catch { /* keep what is on screen */ }
  }, [apt?.id, apt?.patient_id]);
  useEffect(() => { loadChat(); const t = setInterval(loadChat, 8000); return () => clearInterval(t); }, [loadChat]);

  const handleSend = async () => {
    if (!msg.trim()) return;
    setLoading(true);
    try {
      await client.post('/provider/chat/send', { appointment_id: apt?.id, message: msg });
      setMessages(prev => [...prev, { id: Date.now().toString(), text: msg, sender: 'doctor', attachment: '' }]);
      setMsg('');
    } catch (err) {
      show(AR ? 'فشل إرسال الرسالة' : 'Failed to send message', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'محادثة ما قبل الموعد' : 'Pre-visit Chat'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.lg }}>
        <Text style={{ textAlign: 'center', color: theme.textSub, marginBottom: SP.lg }}>
          {/* Needs-review issue 1157: decision 24, chat runs from confirmation to the end of the follow-up window */}
          {AR ? 'المحادثة متاحة من تأكيد الحجز حتى نهاية فترة المتابعة' : 'Chat is open from booking confirmation until the follow-up window ends'}
        </Text>
        
        {messages.map(m => (
          <NCard key={m.id} style={{ padding: SP.lg, marginBottom: SP.sm, backgroundColor: m.sender === 'doctor' ? theme.primary + '15' : theme.surface2 }}>
            <Text style={{ color: theme.text, textAlign: m.sender === 'doctor' ? (AR ? 'left' : 'right') : (AR ? 'right' : 'left') }}>{m.text}</Text>
            {m.attachment ? <Text style={{ color: theme.primary, marginTop: SP.xs, textAlign: AR ? 'right' : 'left' }}>{AR ? 'مرفق: ' : 'Attachment: '}{m.attachment}</Text> : null}
          </NCard>
        ))}
      </ScrollView>
      <View style={{ padding: SP.lg, borderTopWidth: 1, borderColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, alignItems: 'center' }}>
        <View style={{ flex: 1 }}><NInput value={msg} onChange={setMsg} placeholder={AR ? 'اكتب رسالة...' : 'Type a message...'} /></View>
        <NBtn label={AR ? 'إرسال' : 'Send'} onPress={handleSend} disabled={loading || !msg.trim()} style={{ width: 100 }} />
      </View>
    </View>
  );
}
