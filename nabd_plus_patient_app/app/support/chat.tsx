// @ts-nocheck
// app/support/chat.tsx — دعم العملاء المباشر
import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { Icon } from "../../src/components/Icon";
import {
  AppText,
  Card,
  Badge,
  Button,
  IconButton,
} from "../../src/components/ui";

import { apiFetch } from "../../src/utils/api";
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';

const QUICK_REPLIES = [
  "إلغاء حجز",
  "مشكلة في طلب",
  "استرداد المبلغ",
  "سؤال عن التأمين",
  "شكوى",
];

export default function SupportChatScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    apiFetch<any[]>('/support/chat')
      .then(res => {
        if (res && res.length > 0) {
          setMessages(res);
        } else {
          setMessages([{
            id: "1",
            from: "agent",
            text: "مرحباً! أنا نبض، مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟",
            time: new Date().toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }),
            isBot: true,
          }]);
        }
      })
      .catch(() => {});
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg = {
      id: Date.now().toString(),
      from: "user",
      text,
      time: new Date().toLocaleTimeString("ar", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isBot: false,
    };
    setMessages((p) => [...p, userMsg]);
    setInputText("");
    setIsTyping(true);
    
    try {
      const res = await apiFetch<any>('/support/chat', { method: 'POST', body: JSON.stringify({ message: text }) });
      if (res && res.reply) {
        setMessages((p) => [
          ...p,
          {
            id: (Date.now() + 1).toString(),
            from: "agent",
            text: res.reply,
            time: new Date().toLocaleTimeString("ar", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            isBot: true,
          },
        ]);
      } else {
        throw new Error('No reply');
      }
    } catch {
       setMessages((p) => [
          ...p,
          {
            id: (Date.now() + 1).toString(),
            from: "agent",
            text: "عذراً، حدث خطأ في الاتصال. يرجى المحاولة لاحقاً.",
            time: new Date().toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }),
            isBot: true,
          }
       ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <View style={styles.agentStatus}>
            <View style={styles.onlineDot} />
            <AppText variant="bodySM">متاح الآن • ردّ خلال دقيقة</AppText>
          </View>
          <View style={styles.agentInfo}>
            <AppText variant="bodySM">دعم نبض</AppText>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageWrap,
                msg.isBot ? styles.botWrap : styles.userWrap,
              ]}
            >
              {msg.isBot && (
                <View style={styles.botAvatar}>
                  <Icon name="robot" size={20} color={colors.primary} />
                </View>
              )}
              <View
                style={[
                  styles.bubble,
                  msg.isBot
                    ? {
                        backgroundColor: isDark ? colors.surface : colors.white,
                      }
                    : { backgroundColor: "#23B5CE" },
                ]}
              >
                <AppText variant="bodySM">{msg.text}</AppText>
                <AppText variant="bodySM">{msg.time}</AppText>
              </View>
            </View>
          ))}
          {isTyping && (
            <View style={styles.typingWrap}>
              <View style={styles.botAvatar}>
                <Icon name="robot" size={20} color={colors.primary} />
              </View>
              <View
                style={[
                  styles.typingBubble,
                  { backgroundColor: isDark ? colors.surface : colors.white },
                ]}
              >
                <AppText variant="bodySM">يكتب...</AppText>
              </View>
            </View>
          )}
          {/* Quick replies */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingTop: 8 }}
          >
            {QUICK_REPLIES.map((qr, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => sendMessage(qr)}
                style={[
                  styles.quickReply,
                  {
                    backgroundColor: isDark ? colors.surface : "#EBF3FF",
                    borderColor: "#23B5CE30",
                  },
                ]}
              >
                <AppText variant="bodySM">{qr}</AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ScrollView>

        <View
          style={[
            styles.inputRow,
            {
              paddingBottom: insets.bottom + 8,
              backgroundColor: isDark ? colors.surface : colors.white,
              borderTopColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: "#23B5CE" }]}
            onPress={() => sendMessage(inputText)}
          >
            <Icon name="send" size={18} color="#fff" />
          </TouchableOpacity>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                backgroundColor: isDark
                  ? colors.background
                  : colors.backgroundSecondary,
              },
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="اكتب رسالتك..."
            placeholderTextColor={colors.textTertiary}
            textAlign="right"
            onSubmitEditing={() => sendMessage(inputText)}
          />
          <TouchableOpacity
            style={styles.attachBtn}
            disabled={attaching}
            onPress={async () => {
              try {
                const ImagePicker = await import('expo-image-picker');
                const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!perm.granted) {
                  showLocalizedAlert('الصلاحية مطلوبة', 'نحتاج إذن الوصول للصور لإرفاق ملف');
                  return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
                if (result.canceled || !result.assets?.[0]) return;
                setAttaching(true);
                const asset = result.assets[0];
                const formData = new FormData();
                formData.append('file', {
                  uri: asset.uri,
                  name: asset.fileName || 'attachment.jpg',
                  type: asset.mimeType || 'image/jpeg',
                } as any);
                formData.append('folder', 'support');
                const up = await apiFetch<any>('/media/upload', { method: 'POST', body: formData });
                const url = up?.url || up?.data?.url;
                if (url) sendMessage(`مرفق: ${url}`);
              } catch (err: any) {
                showLocalizedAlert('تعذّر الإرفاق', err?.message || 'فشل رفع المرفق');
              } finally {
                setAttaching(false);
              }
            }}
          >
            {attaching ? (
              <ActivityIndicator size="small" color={colors.textTertiary} />
            ) : (
              <Icon name="attach" size={20} color={colors.textTertiary} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  agentInfo: { alignItems: "center" },
  agentName: { color: "#fff", fontSize: 16, fontWeight: "800" },
  agentStatus: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  agentSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 10,
    fontWeight: "400",
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ADE80",
  },
  hBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  messageWrap: { flexDirection: "row-reverse", gap: 8, maxWidth: "85%" },
  botWrap: { alignSelf: "flex-start" },
  userWrap: { alignSelf: "flex-end" },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EBF3FF",
    justifyContent: "center",
    alignItems: "center",
  },
  bubble: {
    borderRadius: 16,
    padding: 12,
    maxWidth: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleText: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 20,
    textAlign: "right",
  },
  bubbleTime: {
    fontSize: 9,
    fontWeight: "400",
    textAlign: "left",
    marginTop: 4,
  },
  typingWrap: { flexDirection: "row-reverse", gap: 8, alignSelf: "flex-start" },
  typingBubble: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  typingText: { fontSize: 13, fontWeight: "400" },
  quickReply: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quickReplyText: { fontSize: 12, fontWeight: "700" },
  inputRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "400",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
});
