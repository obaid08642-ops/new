// @ts-nocheck
// app/ai/chat-doctor.tsx
// المساعد الطبي الذكي - محادثة مع AI طبيب
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated
} from 'react-native';
import { LocalizedAlert as Alert } from '@/components/LocalizedAlert';
import { LocalizedTextInput as TextInput } from '@/components/LocalizedTextInput';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';
import { apiFetch } from '../../src/utils/api';

type Message = {
  id: string;
  role: 'user' | 'ai';
  text: string;
  time: string;
  suggestions?: string[];
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'ai',
    text: 'مرحباً أحمد!  أنا مساعدك الطبي الذكي نبض AI. كيف يمكنني مساعدتك اليوم؟\n\nيمكنني مساعدتك في:\n• وصف الأعراض والحصول على نصيحة أولية\n• شرح نتائج التحاليل\n• معلومات عن الأدوية\n• حجز موعد مع الطبيب المناسب',
    time: 'الآن',
    suggestions: ['عندي صداع', 'اريد فهم تحاليلي', 'احجز لي موعد', 'معلومات عن دواء'],
  },
];

export default function ChatDoctorScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const typingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(typingAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      time: 'الآن',
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    try {
      const formatted = updatedMessages.map(m => ({
        role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text
      }));

      const res = await apiFetch<any>('/ai/triage/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: formatted }),
      });

      if (res && res.response) {
        let options: string[] | undefined = undefined;
        if (res.specSuggestion) {
          options = ['احجز موعد', 'سأكتفي بهذا'];
        }
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: res.response,
          time: 'الآن',
          suggestions: options
        }]);
      }
    } catch (err) {
      console.log('Error in AI doctor chat', err);
      Alert.alert('خطأ', 'فشل الاتصال بالطبيب الذكي. يرجى المحاولة لاحقاً.');
    } finally {
      setIsTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleSuggestionPress = (s: string) => {
    if (s === 'احجز موعد') {
      router.push('/(tabs)/consultations');
    } else if (s === 'سأكتفي بهذا') {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        text: 'يسعدني دوماً خدمتك! دمتم بصحة وعافية. ',
        time: 'الآن'
      }]);
    } else {
      sendMessage(s);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 } ]}>
        <View style={styles.headerRow}>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.hBtn} onPress={() => router.back()}>
              <Icon name="back" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.aiInfo}>
            <View style={styles.aiNames}>
              <AppText variant="h5" style={styles.aiName}>نبض AI</AppText>
              <AppText variant="caption" style={styles.aiStatus}>متصل الآن للمساعدة</AppText>
            </View>
            <View style={styles.aiAvatarWrap}>
              <View style={styles.aiAvatar}>
                <Icon name="robot" size={24} color="#fff" />
              </View>
              <View style={styles.onlineDot} />
            </View>
          </View>
        </View>
        <View style={styles.headerBadge}>
          <AppText variant="caption" style={styles.headerBadgeText}>استشاري الذكاء الاصطناعي الافتراضي</AppText>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(m => (
            <View key={m.id} style={[styles.messageWrap, m.role === 'user' ? styles.userMessageWrap : styles.aiMessageWrap]} >
              {m.role === 'ai' && (
                <View style={styles.aiAvatarSmall}>
                  <Icon name="robot" size={16} color={colors.primary} />
                </View>
              )}
              <View style={{ flex: 1, alignItems: m.role === 'user' ? 'flex-start' : 'flex-end' }}>
                <View style={[
                  styles.messageBubble,
                  { backgroundColor: m.role === 'user' ? colors.primary : (isDark ? colors.surface : colors.white) } ]}>
                  <AppText variant="bodySM" style={[styles.messageText, { color: m.role === 'user' ? '#fff' : colors.textPrimary } ]}>
                    {m.text}
                  </AppText>
                </View>
                <AppText variant="caption" color={colors.textTertiary} style={styles.messageTime}>
                  {m.time}
                </AppText>

                {m.suggestions && m.suggestions.length > 0 && (
                  <View style={styles.suggestionsRow}>
                    {m.suggestions.map((s, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => handleSuggestionPress(s)}
                        style={[styles.suggestionChip, { borderColor: colors.primary, backgroundColor: isDark ? colors.surfaceSecondary : '#EEF2FF' } ]}>
                        <AppText variant="caption" color={colors.primary} style={styles.suggestionText}>{s}</AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <View style={[styles.messageWrap, styles.aiMessageWrap]} >
              <View style={styles.aiAvatarSmall}>
                <Icon name="robot" size={16} color={colors.primary} />
              </View>
              <View style={[styles.typingBubble, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
                <Animated.View style={[styles.typingDot, { opacity: typingAnim }]} />
                <Animated.View style={[styles.typingDot, { opacity: typingAnim }]} />
                <Animated.View style={[styles.typingDot, { opacity: typingAnim }]} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputArea, { paddingBottom: insets.bottom + 8, backgroundColor: isDark ? colors.surface : colors.white, borderTopColor: colors.borderLight } ]}>
          <TouchableOpacity style={[styles.micBtn, { backgroundColor: isDark ? colors.background : '#EEF2FF' }]} onPress={() => Alert.alert('صوت', 'التسجيل الصوتي غير متاح حالياً')}>
            <Icon name="mic" size={20} color="#6366F1" />
          </TouchableOpacity>
          <View style={[styles.inputWrap, { backgroundColor: isDark ? colors.background : colors.backgroundSecondary, borderColor: colors.borderLight } ]}>
            <TextInput
              style={[styles.textInput, { color: colors.textPrimary }]}
              value={input}
              onChangeText={setInput}
              placeholder="اكتب سؤالك الطبي..."
              placeholderTextColor={colors.textTertiary}
              textAlign="right"
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            onPress={() => sendMessage(input)}
            disabled={!input.trim()}
            style={[styles.sendBtn, { backgroundColor: input.trim() ? '#6366F1' : colors.borderLight } ]}>
            <Icon name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  aiInfo: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  aiAvatarWrap: { position: 'relative' },
  aiAvatar: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#5BA84F', borderWidth: 2, borderColor: '#fff' },
  aiNames: { alignItems: 'flex-end', gap: 1 },
  aiName: { color: '#fff', fontSize: 15, fontWeight: '800' },
  aiStatus: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '400' },
  headerRight: {},
  headerBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-end', marginTop: 4 },
  headerBadgeText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '400', textAlign: 'right' },
  messagesContent: { padding: 16, gap: 12 },
  messageWrap: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8 },
  userMessageWrap: { justifyContent: 'flex-start' },
  aiMessageWrap: { justifyContent: 'flex-end' },
  aiAvatarSmall: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  messageBubble: { borderRadius: 18, padding: 12, maxWidth: '85%' },
  messageText: { fontSize: 14, fontWeight: '400', lineHeight: 22, textAlign: 'right' },
  messageTime: { fontSize: 10, fontWeight: '400', marginTop: 3, paddingHorizontal: 4 },
  suggestionsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  suggestionChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  suggestionText: { fontSize: 11, fontWeight: '700' },
  typingBubble: { borderRadius: 18, borderBottomLeftRadius: 4, padding: 14, flexDirection: 'row', gap: 4 },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1' },
  inputArea: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  micBtn: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  inputWrap: { flex: 1, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, minHeight: 46, maxHeight: 120 },
  textInput: { fontSize: 14, fontWeight: '400' },
  sendBtn: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
});
