import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useApp } from '../../context/AppContext';
import { Button, Card } from '../../components/ui';
import { Spacing } from '../../theme';
import { apiFetch } from '../../utils/api';

interface FAQ {
  id: string;
  question_ar: string;
  question_en: string;
  answer_ar: string;
  answer_en: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: string;
  createdAt: string;
  thread: Array<{ by: string; role: string; message: string; at: string }>;
}

interface CallbackRequest {
  phone: string;
  preferred_time?: string;
  reason?: string;
}

export function HelpCenter() {
  const { colors: theme, lang } = useApp();
  const AR = lang === 'ar';

  const [tab, setTab] = useState<'faqs' | 'tickets' | 'ai' | 'callback'>('faqs');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState('');
  const [callbackReason, setCallbackReason] = useState('');
  const [callbackPreferredTime, setCallbackPreferredTime] = useState('');
  const [callbackSubmitting, setCallbackSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [faqsData, ticketsData] = await Promise.all([
        apiFetch('/support/faqs'),
        apiFetch('/support/tickets/mine'),
      ]);
      setFaqs(faqsData);
      setTickets(ticketsData);
    } catch (error) {
      console.error('Failed to load help center:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleAiQuery = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    try {
      const res = await apiFetch('/support/ai/assist', {
        method: 'POST',
        body: JSON.stringify({ query: aiQuery }),
      });
      setAiResponse(res.answer);
      if (res.handoff && res.ticket_id) {
        Alert.alert('Handoff', 'Creating ticket for human agent...');
        loadData();
      }
    } catch (error) {
      console.error('AI assist failed:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCallback = async () => {
    if (!callbackPhone) {
      Alert.alert('Error', 'Phone number required');
      return;
    }
    setCallbackSubmitting(true);
    try {
      await apiFetch('/support/callback', {
        method: 'POST',
        body: JSON.stringify({
          phone: callbackPhone,
          preferred_time: callbackPreferredTime ? new Date(callbackPreferredTime).toISOString() : undefined,
          reason: callbackReason,
        }),
      });
      Alert.alert('Success', 'Callback requested. We\'ll call you soon.');
      setCallbackPhone(''); setCallbackReason(''); setCallbackPreferredTime('');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setCallbackSubmitting(false);
    }
  };

  const renderFAQ = ({ item }: { item: FAQ }) => (
    <Card style={styles.faqCard}>
      <TouchableOpacity onPress={() => Alert.alert(AR ? item.question_ar : item.question_en, AR ? item.answer_ar : item.answer_en)}>
        <Text style={styles.faqQuestion}>{AR ? item.question_ar : item.question_en}</Text>
      </TouchableOpacity>
    </Card>
  );

  const renderTicket = ({ item }: { item: SupportTicket }) => {
    const lastMsg = item.thread[item.thread.length - 1];
    const statusColors: Record<string, string> = {
      OPEN: theme.warning,
      IN_PROGRESS: theme.info,
      RESOLVED: theme.success,
      CLOSED: theme.textSecondary,
    };
    return (
      <Card style={styles.ticketCard}>
        <View style={styles.ticketHeader}>
          <Text style={[styles.ticketSubject, { color: theme.textPrimary }]}>{item.subject}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] || theme.primary }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <Text style={[styles.ticketMeta, { color: theme.textSecondary }]}>{new Date(item.createdAt).toLocaleDateString(lang)}</Text>
        {lastMsg && <Text style={[styles.lastMsg, { color: theme.textPrimary }]}>{lastMsg.message.substring(0, 100)}...</Text>}
      </Card>
    );
  };

  if (loading) return <ActivityIndicator color={theme.primary} style={styles.center} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{AR ? 'مركز المساعدة' : 'Help Center'}</Text>
      </View>
      
      <View style={styles.tabs}>
        {(['faqs', 'tickets', 'ai', 'callback'] as const).map(t => (
          <TouchableOpacity 
            key={t} 
            style={[styles.tab, tab === t && styles.tabActive]} 
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{AR ? {faqs: 'الأسئلة', tickets: 'التذاكر', ai: 'مساعد ذكي', callback: 'معاودة اتصال'}[t] : {faqs: 'FAQs', tickets: 'Tickets', ai: 'AI Assistant', callback: 'Call Me Back'}[t]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'faqs' && (
        <FlatList
          data={faqs}
          renderItem={renderFAQ}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', padding: Spacing.xl }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textPrimary }}>{AR ? 'لا توجد أسئلة' : 'No FAQs'}</Text>
            </View>
          }
        />
      )}

      {tab === 'tickets' && (
        <>
          <FlatList
            data={tickets}
            renderItem={renderTicket}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', padding: Spacing.xl }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textPrimary }}>{AR ? 'لا توجد تذاكر' : 'No tickets'}</Text>
                <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: Spacing.xs }}>{AR ? 'اضغط + لإنشاء تذكرة' : 'Tap + to create a ticket'}</Text>
              </View>
            }
          />
          <TouchableOpacity style={styles.fab} onPress={() => setTab('callback')}>
            <Text style={styles.fabText}>{AR ? 'إنشاء تذكرة' : 'Create Ticket'}</Text>
          </TouchableOpacity>
        </>
      )}

      {tab === 'ai' && (
        <View style={styles.aiContainer}>
          <Card style={styles.aiCard}>
            <Text style={styles.aiTitle}>{AR ? 'اسأل المساعد الذكي' : 'Ask the AI assistant'}</Text>
            <TextInput
              style={styles.aiInput}
              placeholder={AR ? 'اكتب سؤالك هنا...' : 'Type your question...'}
              value={aiQuery}
              onChangeText={setAiQuery}
              multiline
              numberOfLines={3}
            />
            <Button label={aiLoading ? (AR ? 'جاري...' : 'Thinking...') : (AR ? 'إرسال' : 'Ask')} onPress={handleAiQuery} disabled={aiLoading || !aiQuery.trim()} style={{ marginTop: Spacing.md }} />
            {aiResponse && (
              <View style={styles.aiResponse}>
                <Text style={styles.aiResponseLabel}>{AR ? 'الرد:' : 'Response:'}</Text>
                <Text style={styles.aiResponseText}>{aiResponse}</Text>
              </View>
            )}
          </Card>
        </View>
      )}

      {tab === 'callback' && (
        <View style={styles.callbackContainer}>
          <Card style={styles.callbackCard}>
            <Text style={styles.callbackTitle}>{AR ? 'طلب معاودة اتصال' : 'Request a Call Back'}</Text>
            <Text style={styles.callbackDesc}>{AR ? 'أدخل رقم هاتفك وسنعاود الاتصال بك' : 'Enter your phone and we\'ll call you back'}</Text>
            <TextInput
              style={styles.input}
              placeholder={AR ? 'رقم الهاتف' : 'Phone number'}
              value={callbackPhone}
              onChangeText={setCallbackPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder={AR ? 'الوقت المفضل (اختياري)' : 'Preferred time (optional)'}
              value={callbackPreferredTime}
              onChangeText={setCallbackPreferredTime}
            />
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder={AR ? 'سبب الاتصال (اختياري)' : 'Reason (optional)'}
              value={callbackReason}
              onChangeText={setCallbackReason}
              multiline
              numberOfLines={3}
            />
            <Button label={callbackSubmitting ? (AR ? 'جاري الإرسال...' : 'Submitting...') : (AR ? 'طلب الاتصال' : 'Request Call')} onPress={handleCallback} disabled={callbackSubmitting || !callbackPhone} style={{ marginTop: Spacing.md }} />
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { padding: Spacing.md },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  tab: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, opacity: 0.6 },
  tabActive: { opacity: 1, borderBottomWidth: 2, borderBottomColor: 'currentColor' },
  tabText: { fontSize: 15, fontWeight: '500' },
  tabTextActive: { fontWeight: '700' },
  listContent: { padding: Spacing.md, paddingBottom: Spacing.xl },
  faqCard: { marginBottom: Spacing.sm },
  faqQuestion: { fontSize: 15, fontWeight: '500' },
  ticketCard: { marginBottom: Spacing.sm },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  ticketSubject: { fontSize: 15, fontWeight: '500', flex: 1 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  ticketMeta: { fontSize: 12, marginBottom: Spacing.xs },
  lastMsg: { fontSize: 14, fontStyle: 'italic' },
  fab: { position: 'absolute', bottom: Spacing.xl, right: Spacing.xl, backgroundColor: 'currentColor', borderRadius: 28, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, elevation: 4 },
  fabText: { color: '#fff', fontWeight: '700' },
  aiContainer: { padding: Spacing.md },
  aiCard: {},
  aiTitle: { fontSize: 15, fontWeight: '700', marginBottom: Spacing.md },
  aiInput: { borderWidth: 1, borderRadius: 8, padding: Spacing.md, fontSize: 15, minHeight: 80, textAlignVertical: 'top', marginBottom: Spacing.md },
  aiResponse: { marginTop: Spacing.lg, padding: Spacing.md, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 8 },
  aiResponseLabel: { fontWeight: '700', marginBottom: Spacing.xs },
  aiResponseText: { fontSize: 15 },
  callbackContainer: { padding: Spacing.md },
  callbackCard: {},
  callbackTitle: { fontSize: 18, fontWeight: '700', marginBottom: Spacing.xs },
  callbackDesc: { color: 'rgba(0,0,0,0.6)', marginBottom: Spacing.lg },
  input: { borderWidth: 1, borderRadius: 8, padding: Spacing.md, fontSize: 15, marginBottom: Spacing.md },
});
