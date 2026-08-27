// @ts-nocheck
// family/chat.tsx — Family chat (real backend feed + polling)
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, IconButton } from '../../src/components/ui';

import { apiFetch } from '../../src/utils/api';
import { dateLocale } from '@/utils/dates';

interface Message { id: string; text: string; sender: string; time: string; isMe: boolean }

function fmtTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' });
}

export default function FamilyChatScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const mapRows = useCallback((rows: any[], me: string | null): Message[] =>
    (Array.isArray(rows) ? rows : []).map((r: any) => ({
      id: r.id,
      text: r.text || '',
      sender: r.sender_id === me ? 'أنت' : (r.sender_name || 'فرد العائلة'),
      time: fmtTime(r.created_at),
      isMe: r.sender_id === me,
    })), []);

  const load = useCallback(async (me: string | null, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiFetch('/family/chat/messages');
      const rows = Array.isArray(res) ? res : (res?.data || []);
      setMessages(mapRows(rows, me));
      setLoadError(false);
    } catch (err: any) {
      console.error(err);
      if (!silent) setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [mapRows]);

  useEffect(() => {
    let me: string | null = null;
    (async () => {
      try {
        const profile = await apiFetch('/users/me/profile');
        me = profile?.user_id || null;
        setMyId(me);
      } catch {}
      try {
        const mems = await apiFetch('/family/members');
        if (Array.isArray(mems)) setMemberCount(mems.length);
      } catch {}
      await load(me);
    })();
  }, [load]);

  // Poll for new messages while the screen is open
  useEffect(() => {
    const t = setInterval(() => load(myId, true), 5000);
    return () => clearInterval(t);
  }, [load, myId]);

  const send = async () => {
    const text = msg.trim();
    if (!text || sending) return;
    setSending(true);
    setMsg('');
    try {
      const res = await apiFetch('/family/chat/messages', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      const saved = res?.data || res;
      setMessages(p => [...p, {
        id: saved?.id || String(Date.now()),
        text,
        sender: 'أنت',
        time: fmtTime(saved?.created_at || new Date().toISOString()),
        isMe: true,
      }]);
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 100);
    } catch {
      setMsg(text); // restore on failure
    } finally {
      setSending(false);
    }
  };

  const renderMsg = ({ item }: { item: Message }) => (
    <View style={[st.msgWrap, { alignItems: item.isMe ? 'flex-start' : 'flex-end' } ]}>
      {!item.isMe && (
        <AppText variant="caption" color={colors.textTertiary} style={{ marginBottom: 2, marginRight: 8 }}>{item.sender}</AppText>
      )}
      <View style={[st.msgBubble, {
        backgroundColor: item.isMe ? colors.primary : colors.surfaceSecondary,
        borderBottomLeftRadius: item.isMe ? 4 : 18,
        borderBottomRightRadius: item.isMe ? 18 : 4,
      } ]}>
        <AppText variant="bodySM" color={item.isMe ? '#fff' : colors.textPrimary}>{item.text}</AppText>
        {!!item.time && (
          <AppText variant="caption" color={item.isMe ? 'rgba(255,255,255,0.6)' : colors.textTertiary} style={{ marginTop: 4 }}>{item.time}</AppText>
        )}
      </View>
    </View>
  );

  return (
    <View style={[st.c, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight } ]}>
        <View style={{ width: 44 }} />
        <View style={{ alignItems: 'center' }}>
          <AppText variant="h5">محادثة العائلة</AppText>
          {memberCount != null && (
            <AppText variant="caption" color={colors.textTertiary}>{memberCount} أفراد</AppText>
          )}
        </View>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : loadError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 }}>
          <Icon name="warning" size={44} color={colors.textTertiary} />
          <AppText variant="bodyMD" color={colors.textSecondary}>تعذر تحميل المحادثة</AppText>
          <TouchableOpacity onPress={() => load(myId)} style={{ marginTop: 6 }}>
            <AppText variant="labelMD" color={colors.primary}>إعادة المحاولة</AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderMsg}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
          onContentSizeChange={() => messages.length > 0 && listRef.current?.scrollToEnd?.({ animated: false })}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon name="chat" size={40} color={colors.textTertiary} />
              <AppText variant="bodySM" color={colors.textTertiary}>لا توجد رسائل بعد — ابدأ الحديث مع عائلتك</AppText>
            </View>
          }
        />
      )}

      {/* Input bar */}
      {!loadError && (
        <View style={[st.inputBar, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.borderLight } ]}>
          <TouchableOpacity onPress={send} disabled={sending || !msg.trim()} style={[st.sendBtn, { backgroundColor: colors.primary, opacity: sending || !msg.trim() ? 0.5 : 1 } ]}>
            <Icon name="send" size={20} color="#fff" />
          </TouchableOpacity>
          <TextInput value={msg} onChangeText={setMsg} placeholder="اكتب رسالة..." placeholderTextColor={colors.textTertiary} style={[st.input, { backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]} onSubmitEditing={send} />
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  msgWrap: { width: '100%' },
  msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 18 },
  inputBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, height: 44, fontWeight: '400', fontSize: 14, textAlign: 'right', writingDirection: 'rtl' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
