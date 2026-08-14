// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { LocalizedTextInput as TextInput } from '@/components/LocalizedTextInput';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, IconButton, Button } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
}

export default function TriageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'bot', text: 'مرحباً بك في المساعد الطبي الذكي لتصنيف الأعراض. صف لي ما تشعر به باختصار؟' }
  ]);
  const [inputText, setInputText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, analyzing]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: String(Date.now()), sender: 'user', text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setAnalyzing(true);

    try {
      const formatted = updatedMessages.map(m => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text
      }));

      const res = await apiFetch<any>('/ai/triage/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: formatted }),
      });

      if (res && res.response) {
        setMessages(prev => [...prev, { id: String(Date.now() + 1), sender: 'bot', text: res.response }]);
        
        if (res.specSuggestion || res.urgency) {
          const u = res.urgency || 'routine';
          const recObj = {
            urgency: u === 'emergency' ? 'حرجة (طوارئ فورية )' : u === 'urgent' ? 'متوسطة (استشارة قريبة)' : 'منخفضة (متابعة منزلية )',
            urgencyColor: u === 'emergency' ? '#F0695C' : u === 'urgent' ? '#F0A526' : '#10B981',
            specialty: Array.isArray(res.specSuggestion) ? res.specSuggestion.join(' أو ') : (res.specSuggestion || 'باطنة عامة'),
            tests: u === 'emergency' ? ['رسم قلب ECG', 'تحليل إنزيمات القلب'] : ['قياس المؤشرات الحيوية والضغط'],
            actionLabel: u === 'emergency' ? 'طلب طوارئ SOS فوراً' : u === 'urgent' ? 'احجز استشارة طبية' : 'استشارة طبيب عام هاتفياً',
            actionRoute: u === 'emergency' ? '/emergency' : '/(tabs)/consultations',
            actionType: u === 'emergency' ? 'emergency' : u === 'urgent' ? 'book' : 'consult'
          };
          setRecommendation(recObj);
        }
      }
    } catch (err) {
      console.log('Error in triage chat', err);
      Alert.alert('خطأ', 'فشل الاتصال بمساعد التشخيص الذكي. يرجى المحاولة لاحقاً.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[st.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[st.hdr, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight, borderBottomWidth: 1 } ]}>
        <IconButton icon="back" onPress={() => router.back()} />
        <View style={{ alignItems: 'center' }}>
          <AppText variant="h4">مساعد التشخيص الذكي</AppText>
          <AppText variant="caption" color={colors.textTertiary}>تصنيف فوري وتوجيه للتخصص المناسب</AppText>
        </View>
        <IconButton icon="refresh" onPress={() => {
          setMessages([{ id: '1', sender: 'bot', text: 'مرحباً بك في المساعد الطبي الذكي لتصنيف الأعراض. صف لي ما تشعر به باختصار؟' }]);
          setRecommendation(null);
        }} />
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
        {messages.map(m => {
          const isBot = m.sender === 'bot';
          return (
            <View key={m.id} style={[st.msgRow, { alignSelf: isBot ? 'flex-end' : 'flex-start', flexDirection: isBot ? 'row-reverse' : 'row' } ]}>
              <View style={[st.avatar, { backgroundColor: isBot ? colors.primarySurface : colors.surfaceSecondary } ]}>
                <Icon name={isBot ? 'robot' : 'user'} size={18} color={isBot ? colors.primary : colors.textSecondary} />
              </View>
              <View style={[st.bubble, { backgroundColor: isBot ? colors.primarySurface : colors.surface, borderTopLeftRadius: isBot ? 16 : 0, borderTopRightRadius: isBot ? 0 : 16 } ]}>
                <AppText variant="bodySM" style={{ textAlign: 'right' }}>{m.text}</AppText>
              </View>
            </View>
          );
        })}

        {analyzing && (
          <View style={[st.msgRow, { alignSelf: 'flex-end', flexDirection: 'row-reverse' } ]}>
            <View style={[st.avatar, { backgroundColor: colors.primarySurface } ]}>
              <Icon name="robot" size={18} color={colors.primary} />
            </View>
            <View style={[st.bubble, { backgroundColor: colors.primarySurface, paddingHorizontal: 20 } ]}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          </View>
        )}

        {/* AI Recommendations output Card */}
        {recommendation && (
          <Card style={[st.recCard, { borderColor: recommendation.urgencyColor, borderWidth: 1.5 } ]}>
            <View style={{ flexDirection: 'row-reverse', gap: 8, alignItems: 'center' }}>
              <Icon name="sparkles" size={22} color={colors.primary} />
              <AppText variant="h5">توصيات المساعد الطبي الذكي</AppText>
            </View>

            <View style={[st.recInfo, { borderBottomColor: colors.borderLight } ]}>
              <AppText variant="caption" color={colors.textTertiary}>درجة الخطورة المحسوبة</AppText>
              <AppText variant="h5" color={recommendation.urgencyColor} style={{ marginTop: 2 }}>{recommendation.urgency}</AppText>
            </View>

            <View style={[st.recInfo, { borderBottomColor: colors.borderLight } ]}>
              <AppText variant="caption" color={colors.textTertiary}>التخصص الطبي المقترح</AppText>
              <AppText variant="h6" style={{ marginTop: 2 }}>{recommendation.specialty}</AppText>
            </View>

            <View style={st.recInfo}>
              <AppText variant="caption" color={colors.textTertiary}>الفحوصات المقترحة</AppText>
              {recommendation.tests.map((test: string, i: number) => (
                <AppText key={i} variant="bodyXS" color={colors.textSecondary} style={{ marginTop: 2, textAlign: 'right' }}>
                  • {test}
                </AppText>
              ))}
            </View>

            <Button
              label={recommendation.actionLabel}
              variant={recommendation.actionType === 'emergency' ? 'danger' : 'primary'}
              onPress={() => {
                if (recommendation.actionType === 'emergency') {
                  router.push('/emergency');
                } else {
                }
              }}
              style={{ marginTop: 12 }}
            />
          </Card>
        )}

        {/* Quick Suggestion Chips */}
        {!recommendation && !analyzing && (
          <View style={{ gap: 8, marginTop: 12 }}>
            <AppText variant="caption" color={colors.textTertiary} style={{ textAlign: 'right' }}>اختصارات شائعة لمساعدتك:</AppText>
            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
              {['أشعر بألم شديد وثقل في صدري وضيق تنفس', 'أشعر بدوخة شديدة وعطش مستمر ومستوى السكر غير مستقر', 'صداع مستمر وحرارة مرتفعة منذ يومين'].map((s, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleSend(s)}
                  style={[st.suggestChip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border } ]}>
                  <AppText variant="bodyXS" color={colors.textSecondary}>{s}</AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input row */}
      <View style={[st.inputRow, { paddingBottom: insets.bottom + 8, backgroundColor: colors.surface, borderTopColor: colors.borderLight } ]}>
        <TouchableOpacity
          onPress={() => handleSend(inputText)}
          style={[st.sendBtn, { backgroundColor: colors.primary } ]}>
          <Icon name="send" size={18} color="#fff" />
        </TouchableOpacity>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSend(inputText)}
          placeholder="اكتب أعراضك هنا (مثال: أشعر بصداع كلي...)"
          placeholderTextColor={colors.textTertiary}
          style={[st.inputField, { backgroundColor: colors.surfaceSecondary, color: colors.textPrimary }]}
          textAlign="right"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  msgRow: { gap: 10, maxWidth: '80%', marginBottom: 12 },
  avatar: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bubble: { padding: 12, borderRadius: 16, borderBottomLeftRadius: 16 },
  inputRow: { flexDirection: 'row', padding: 12, alignItems: 'center', gap: 10, borderTopWidth: 1 },
  inputField: { flex: 1, height: 44, borderRadius: 22, paddingHorizontal: 16, fontWeight: '400', fontSize: 14 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  suggestChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  recCard: { padding: 16, gap: 12, marginTop: 16 },
  recInfo: { paddingBottom: 10, borderBottomWidth: 1, alignItems: 'flex-end' }
});
