// @ts-nocheck
import { logError } from '../src/utils/logger';
import React, { useState, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { DSText, DSInput, DSChip, DSAvatar, Spacing, BorderRadius } from '@/design-system';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HttpClient } from '@/services/HttpClient';
import { useAppSelector } from '@/store/hooks';
import { IconButton } from '../src/components/ui';
import { useThemeColors } from '../src/context/AppContext';
import { ScreenState } from '../src/components/ScreenStates';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAssistantScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'مرحباً بك في نبض بلس! أنا مساعدك الطبي الذكي. كيف يمكنني مساعدتك اليوم؟ يمكنك سؤالي عن الأعراض، أو الأدوية، أو رفع صورة لوصفة طبية لقراءتها.',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const flatListRef = useRef<FlatList>(null);
  const user = useAppSelector(state => state.auth.user);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // F24: guided-triage contract — free-form chat is intentionally unavailable server-side.
      const response = await HttpClient.post<{ care_level?: string; notice?: string }>('/ai/triage', {
        symptoms: userMessage.content.slice(0, 1000),
      });

      const level = response.data?.care_level;
      const text = level === 'emergency'
        ? 'علامات طارئة — توجه لأقرب طوارئ فوراً (997 عند الحاجة).'
        : response.data?.notice
          ? 'إرشاد عام وليس تشخيصاً — راجع الطبيب إذا استمرت الأعراض.'
          : 'عذراً، حدث خطأ في النظام.';
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: text,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      logError('ai-assistant', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'تعذّر الاتصال الآن. يرجى المحاولة لاحقاً.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAssistant]}>
        {!isUser && (
          <DSAvatar name="AI" size="sm" fallbackColor={colors.primary} />
        )}
        <View style={[styles.bubble, isUser
          ? [styles.bubbleUser, { backgroundColor: colors.primary }]
          : [styles.bubbleAssistant, { backgroundColor: colors.surface, borderColor: colors.border }]]}>
          <DSText variant="bodyMD" color={isUser ? '#FFFFFF' : colors.textPrimary}>
            {item.content}
          </DSText>
          <DSText
            variant="caption"
            color={isUser ? 'rgba(255,255,255,0.7)' : colors.textSecondary}
            style={{ marginTop: 4, alignSelf: isUser ? 'flex-end' : 'flex-start' }}
          >
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </DSText>
        </View>
        {isUser && (
          <DSAvatar source={user?.profilePicture || null} name={user?.name || 'مستخدم'} size="sm" />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'المساعد الطبي AI' }} />

      <View style={[styles.headerChips, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <DSChip label="تشخيص الأعراض" color={colors.primary} style={styles.chip} />
          <DSChip label="قراءة روشتة" color={colors.success} style={styles.chip} />
          <DSChip label="معلومات دواء" color={colors.warning} style={styles.chip} />
        </ScrollView>
      </View>

      <ScreenState error={error} empty={messages.length === 0} emptyTitle="لا توجد رسائل" onRetry={() => setError(null)}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      </ScreenState>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <IconButton
            icon="camera"
            accessibilityLabel="رفع صورة وصفة"
            bg={colors.surfaceSecondary}
            color={colors.textSecondary}
            onPress={() => router.push('/ai/prescription-translator')}
          />
          <DSInput
            placeholder="اكتب استفسارك الطبي..."
            value={input}
            onChangeText={setInput}
            containerStyle={styles.inputField}
            onSubmitEditing={sendMessage}
          />
          <IconButton
            icon="send"
            accessibilityLabel="إرسال"
            bg={colors.primary}
            color="#FFFFFF"
            size={48}
            onPress={sendMessage}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerChips: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  chip: {
    marginRight: Spacing.sm,
  },
  listContent: {
    padding: Spacing.md,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  bubbleUser: {
    borderBottomRightRadius: 0,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: 0,
    borderWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inputField: {
    flex: 1,
    marginBottom: 0,
  },
});
