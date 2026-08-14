// @ts-nocheck
import React, { useState, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { DSText, DSInput, DSButton, DSTokens, DSAvatar, DSBadge } from '@/design-system';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HttpClient } from '@/services/HttpClient';
import { useAppSelector } from '@/store';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAssistantScreen() {
  const { t } = useTranslation();
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
      const response = await HttpClient.post<{ response: string }>('/ai/triage-chat', {
        messages: messages.concat(userMessage).map(m => ({ role: m.role, content: m.content })),
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data?.response || 'عذراً، حدث خطأ في النظام.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً.',
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
          <DSAvatar 
            source={{ uri: 'https://ui-avatars.com/api/?name=AI&background=0D8ABC&color=fff' }} 
            size="small" 
          />
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <DSText 
            variant="body" 
            color={isUser ? DSTokens.colors.base.white : DSTokens.colors.text.primary}
          >
            {item.content}
          </DSText>
          <DSText 
            variant="caption" 
            color={isUser ? 'rgba(255,255,255,0.7)' : DSTokens.colors.text.secondary}
            style={{ marginTop: 4, alignSelf: isUser ? 'flex-end' : 'flex-start' }}
          >
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </DSText>
        </View>
        {isUser && (
          <DSAvatar 
            source={{ uri: user?.profilePicture || 'https://ui-avatars.com/api/?name=User&background=EEE' }} 
            size="small" 
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen 
        options={{ 
          title: 'المساعد الطبي AI',
          headerTitleStyle: { fontFamily: DSTokens.typography.fonts.primary.bold },
        }} 
      />
      
      <View style={styles.headerChips}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <DSBadge label="تشخيص الأعراض" variant="info" style={styles.chip} />
          <DSBadge label="قراءة روشتة" variant="success" style={styles.chip} />
          <DSBadge label="معلومات دواء" variant="warning" style={styles.chip} />
        </ScrollView>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <DSButton 
            title="" 
            icon={<MaterialCommunityIcons name="camera" size={24} color={DSTokens.colors.text.secondary} />} 
            variant="ghost"
            onPress={() => router.push('/ai/prescription-translator')}
            style={styles.iconButton}
          />
          <DSInput
            placeholder="اكتب استفسارك الطبي..."
            value={input}
            onChangeText={setInput}
            containerStyle={styles.inputField}
            onSubmitEditing={sendMessage}
          />
          <DSButton 
            title="" 
            icon={<MaterialCommunityIcons name="send" size={24} color={DSTokens.colors.base.white} />} 
            variant="primary"
            onPress={sendMessage}
            isLoading={loading}
            style={styles.sendButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DSTokens.colors.background.default,
  },
  headerChips: {
    paddingVertical: DSTokens.spacing.sm,
    paddingHorizontal: DSTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DSTokens.colors.border.subtle,
    backgroundColor: DSTokens.colors.background.paper,
  },
  chip: {
    marginRight: DSTokens.spacing.sm,
  },
  listContent: {
    padding: DSTokens.spacing.md,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: DSTokens.spacing.md,
    alignItems: 'flex-end',
    gap: DSTokens.spacing.sm,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    padding: DSTokens.spacing.md,
    borderRadius: DSTokens.radii.lg,
  },
  bubbleUser: {
    backgroundColor: DSTokens.colors.primary.main,
    borderBottomRightRadius: 0,
  },
  bubbleAssistant: {
    backgroundColor: DSTokens.colors.background.paper,
    borderBottomLeftRadius: 0,
    borderWidth: 1,
    borderColor: DSTokens.colors.border.subtle,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: DSTokens.spacing.sm,
    paddingHorizontal: DSTokens.spacing.md,
    backgroundColor: DSTokens.colors.background.paper,
    borderTopWidth: 1,
    borderTopColor: DSTokens.colors.border.subtle,
    alignItems: 'center',
    gap: DSTokens.spacing.sm,
  },
  inputField: {
    flex: 1,
    marginBottom: 0,
  },
  iconButton: {
    padding: DSTokens.spacing.xs,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  }
});
