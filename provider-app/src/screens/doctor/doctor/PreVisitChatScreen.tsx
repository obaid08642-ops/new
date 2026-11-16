import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useTheme, useLang, useToast } from '../../../context';
import { NBtn, NCard, NInput, NHeader, NBadge, NConfirm } from '../../../components/ui';
import { SP, FS, FW } from '../../../constants';
import { mapPermissions, consultationActions, threadErrorKey, remainingHoursLabel, ThreadPermissions } from './consultationThread';
import client from '../../../api/client';

export function PreVisitChatScreen({ apt, onBack, onNavigate }: { apt: any, onBack: () => void, onNavigate: (s: string, p?: any) => void }) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [threadId, setThreadId] = useState('');
  const [perm, setPerm] = useState<ThreadPermissions | null>(null);
  const [extendedNow, setExtendedNow] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [busy, setBusy] = useState(false);
  // the conversation the patient opened from consultations/chat-with-doctor
  const loadChat = useCallback(async () => {
    if (!apt?.id) return;
    try {
      const res = await client.get(`/provider/chat/appointment/${encodeURIComponent(apt.id)}`);
      const rows = res.data?.messages || [];
      if (res.data?.thread_id) setThreadId(String(res.data.thread_id));
      setMessages(rows.map((m: any) => ({ id: m.id, text: m.body, sender: m.sender_id === apt?.patient_id ? 'patient' : 'doctor', attachment: m.attachment_url || '' })));
    } catch { /* keep what is on screen */ }
  }, [apt?.id, apt?.patient_id]);
  useEffect(() => { loadChat(); const t = setInterval(loadChat, 8000); return () => clearInterval(t); }, [loadChat]);

  // decision 24: what this thread allows right now (status, window, composer, doctor actions)
  const loadPermissions = useCallback(async () => {
    if (!threadId) return;
    try {
      const res = await client.get(`/chat/threads/${encodeURIComponent(threadId)}/permissions`);
      setPerm(mapPermissions(res.data));
    } catch { /* keep the last known state */ }
  }, [threadId]);
  useEffect(() => { void loadPermissions(); const t = setInterval(loadPermissions, 30000); return () => clearInterval(t); }, [loadPermissions]);

  const actions = perm ? consultationActions(perm, extendedNow) : { canClose: false, canExtend: false };

  const failMessage = (err: unknown) => {
    const k = threadErrorKey(err);
    if (k === 'already_extended') { setExtendedNow(true); return tt('pvc.ddce4c16'); }
    if (k === 'only_doctor') return tt('pvc.6f38534e');
    if (k === 'extend_after_completion') return tt('pvc.b5575ba6');
    return tt('pvc.7c7ae9d5');
  };

  const closeChat = async () => {
    setConfirmClose(false);
    setBusy(true);
    try {
      await client.post(`/chat/threads/${encodeURIComponent(threadId)}/close`);
      show(tt('pvc.578da0fe'), 'success');
      await loadPermissions();
    } catch (err) { show(failMessage(err), 'error'); } finally { setBusy(false); }
  };

  const extendChat = async () => {
    setBusy(true);
    try {
      await client.post(`/chat/threads/${encodeURIComponent(threadId)}/extend`);
      setExtendedNow(true);
      show(tt('pvc.617429c6'), 'success');
      await loadPermissions();
    } catch (err) { show(failMessage(err), 'error'); } finally { setBusy(false); }
  };

  const canWrite = !perm || perm.canChat;

  const handleSend = async () => {
    if (!msg.trim()) return;
    setLoading(true);
    try {
      await client.post('/provider/chat/send', { appointment_id: apt?.id, message: msg });
      setMessages(prev => [...prev, { id: Date.now().toString(), text: msg, sender: 'doctor', attachment: '' }]);
      setMsg('');
    } catch (err) {
      show(tt('pvc.f6ee2ea3'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={tt('pvc.42a51cb3')} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.lg }}>
        {perm ? (
          <NCard style={{ marginBottom: SP.lg, padding: SP.lg }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: SP.sm }}>
              <Text style={{ color: theme.text, fontWeight: FW.bold, fontSize: FS.md, flex: 1, textAlign: AR ? 'right' : 'left' }}>
                {(AR ? perm.statusAr : perm.statusEn) || (tt('pvc.9b28bdfe'))}
              </Text>
              <NBadge size="xs" variant={perm.status === 'closed' ? 'default' : perm.status === 'upcoming' ? 'warning' : 'success'}
                label={perm.status === 'follow_up' ? remainingHoursLabel(perm.remainingHours, AR) || (tt('pvc.edc5598c')) : perm.status === 'closed' ? (tt('pvc.62a1d1af')) : perm.status === 'upcoming' ? (tt('pvc.3f43d30e')) : (tt('pvc.f9ffe17e'))} />
            </View>
            {!!(AR ? perm.messageAr : perm.messageEn) && (
              <Text style={{ color: theme.textSub, marginTop: SP.xs, textAlign: AR ? 'right' : 'left' }}>{AR ? perm.messageAr : perm.messageEn}</Text>
            )}
            {perm.windowEndsAt && perm.status === 'follow_up' && (
              <Text style={{ color: theme.textSub, fontSize: FS.xs, marginTop: SP.xs, textAlign: AR ? 'right' : 'left' }}>
                {(tt('pvc.c0d29834')) + new Date(perm.windowEndsAt).toLocaleString(AR ? 'ar-SA' : 'en-GB')}
              </Text>
            )}
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.xs, marginTop: SP.sm }}>
              <NBadge size="xs" variant={perm.canChat ? 'primary' : 'default'} label={tt('pvc.e8ea8496')} />
              <NBadge size="xs" variant={perm.canUpload ? 'primary' : 'default'} label={tt('pvc.083f6522')} />
              <NBadge size="xs" variant={perm.canVoice ? 'primary' : 'default'} label={tt('pvc.ace58669')} />
            </View>
            <TouchableOpacity onPress={() => { void Linking.openURL(`tel:${perm.emergencyLine}`); }} style={{ marginTop: SP.sm }}>
              <Text style={{ color: theme.danger, fontWeight: FW.semi, textAlign: AR ? 'right' : 'left' }}>
                {(tt('pvc.27a778da')) + perm.emergencyLine}
              </Text>
            </TouchableOpacity>
            {(actions.canClose || actions.canExtend) && (
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginTop: SP.md }}>
                {actions.canExtend && <View style={{ flex: 1 }}><NBtn label={tt('pvc.1cd87111')} onPress={extendChat} disabled={busy} variant="outline" /></View>}
                {actions.canClose && <View style={{ flex: 1 }}><NBtn label={tt('pvc.ef3a66dc')} onPress={() => setConfirmClose(true)} disabled={busy} variant="danger" /></View>}
              </View>
            )}
          </NCard>
        ) : null}

        {messages.map(m => (
          <NCard key={m.id} style={{ padding: SP.lg, marginBottom: SP.sm, backgroundColor: m.sender === 'doctor' ? theme.primary + '15' : theme.surface2 }}>
            <Text style={{ color: theme.text, textAlign: m.sender === 'doctor' ? (AR ? 'left' : 'right') : (AR ? 'right' : 'left') }}>{m.text}</Text>
            {m.attachment ? <Text style={{ color: theme.primary, marginTop: SP.xs, textAlign: AR ? 'right' : 'left' }}>{tt('pvc.573b1955')}{m.attachment}</Text> : null}
          </NCard>
        ))}
      </ScrollView>
      {canWrite && (
      <View style={{ padding: SP.lg, borderTopWidth: 1, borderColor: theme.border, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, alignItems: 'center' }}>
        <View style={{ flex: 1 }}><NInput value={msg} onChange={setMsg} placeholder={tt('pvc.ae9e7693')} /></View>
        <NBtn label={tt('pvc.ad89df6b')} onPress={handleSend} disabled={loading || !msg.trim()} style={{ width: 100 }} />
      </View>
      )}
      <NConfirm visible={confirmClose} title={tt('pvc.ef3a66dc')}
        msg={tt('pvc.a7cfc6cf')}
        okLabel={tt('pvc.e6d3a19e')} cancelLabel={tt('pvc.210b779f')} onOk={closeChat} onCancel={() => setConfirmClose(false)} />
    </View>
  );
}
