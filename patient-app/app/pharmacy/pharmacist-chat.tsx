// @ts-nocheck
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/context/AppContext";
import { useSocket } from "../../src/context/SocketContext";
import { apiFetch } from "../../src/utils/api";
import { useEffect } from "react";
import { resolveColor, darkColors, lightColors } from "../../src/theme/colors";
import { LocalizedText } from '../../src/components/LocalizedText';

export default function PharmacistChatScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, lang } = useApp() as any;
  const colors = isDark ? darkColors : lightColors;
  const isRTL = lang === "ar" || lang === "ur";

  const [msg, setMsg] = useState("");
  const { socket, isConnected } = useSocket() as any;
  const [messages, setMessages] = useState<any[]>([]);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const threadsRes = await apiFetch<any[]>('/pharmacy/chat/threads');
        if (threadsRes && threadsRes.length > 0) {
          const threadId = threadsRes[0].id;
          setActiveThreadId(threadId);
          setActiveOrderId(threadsRes[0].order_id || null);
          const msgsRes = await apiFetch<any>(`/pharmacy/chat/threads/${threadId}/messages`);
          if (msgsRes && msgsRes.messages) setMessages(msgsRes.messages);
        }
      } catch (e) { console.error(e); }
    };
    fetchHistory();

    if (socket) {
      socket.on('pharmacy:message', (incomingMsg: any) => {
        setMessages(prev => [...prev, incomingMsg]);
      });
      socket.on('pharmacy:typing', (data: any) => {
        setIsTyping(data.typing);
      });
      
      // Flush offline queue when connected
      if (isConnected && offlineQueue.length > 0) {
        offlineQueue.forEach(msg => socket.emit('pharmacy:message:send', msg));
        setOfflineQueue([]);
      }
    }
    return () => {
      if (socket) {
        socket.off('pharmacy:message');
        socket.off('pharmacy:typing');
      }
    };
  }, [socket, isConnected]);

  const send = () => {
    if (!msg.trim()) return;
    const newMsg = { id: Date.now(), sender: "me", text: msg, time: "الآن", status: isConnected ? "sent" : "pending" };
    setMessages(prev => [...prev, newMsg]);
    
    if (socket && isConnected) {
      socket.emit('pharmacy:message:send', newMsg);
    } else {
      setOfflineQueue(prev => [...prev, newMsg]);
    }
    setMsg("");
    if (socket) socket.emit('pharmacy:typing', { typing: false });
  };

  const handleTyping = (text: string) => {
    setMsg(text);
    if (socket && isConnected) {
      socket.emit('pharmacy:typing', { typing: text.length > 0 });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.s,
            paddingTop: insets.top + 10,
            borderBottomColor: colors.bd,
          },
        ]}
      >
        <View
          style={{
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => router.replace("/pharmacy/cart")}
            style={{ width: 40, height: 40, justifyContent: "center" }}
          >
            <LocalizedText
              style={{
                fontFamily: "MaterialSymbolsRounded",
                color: colors.n,
                fontSize: 24,
              }}
            >
              close
            </LocalizedText>
          </TouchableOpacity>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: resolveColor("var(--ps)"),
                marginHorizontal: 10,
              },
            ]}
          >
            <LocalizedText
              style={{
                fontFamily: "MaterialSymbolsRounded",
                color: resolveColor("var(--p)"),
                fontSize: 20,
              }}
            >
              local_pharmacy
            </LocalizedText>
          </View>
          <View
            style={{ flex: 1, alignItems: isRTL ? "flex-end" : "flex-start" }}
          >
            <LocalizedText style={{ fontSize: 13, fontWeight: "800", color: colors.n }}>
              صيدلية الدواء - فرع الملقا
            </LocalizedText>
            <LocalizedText style={{ fontSize: 10, color: resolveColor("var(--gr)") }}>
              متصل الآن
            </LocalizedText>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {messages.map((m: any) =>
          m.sender === "pharm" ? (
            <View
              key={m.id}
              style={{
                flexDirection: isRTL ? "row-reverse" : "row",
                marginBottom: 12,
                alignItems: "flex-start",
              }}
            >
              <View
                style={[
                  styles.chatAvatar,
                  { backgroundColor: resolveColor("var(--ps)") },
                ]}
              >
                <LocalizedText
                  style={{
                    fontFamily: "MaterialSymbolsRounded",
                    color: resolveColor("var(--p)"),
                    fontSize: 18,
                  }}
                >
                  person
                </LocalizedText>
              </View>
              <View
                style={{
                  flex: 1,
                  marginHorizontal: 10,
                  alignItems: isRTL ? "flex-end" : "flex-start",
                }}
              >
                <View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: colors.s,
                      borderColor: colors.bd,
                      borderTopLeftRadius: isRTL ? 4 : 14,
                      borderTopRightRadius: isRTL ? 14 : 4,
                    },
                  ]}
                >
                  {m.type === "invoice" ? (
                    <View style={{ alignItems: "center" }}>
                      <LocalizedText
                        style={{
                          fontFamily: "MaterialSymbolsRounded",
                          color: resolveColor("var(--p)"),
                          fontSize: 30,
                          marginBottom: 8,
                        }}
                      >
                        receipt_long
                      </LocalizedText>
                      <LocalizedText
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: colors.n,
                          textAlign: "center",
                          marginBottom: 12,
                        }}
                      >
                        تم تحديث الفاتورة بنجاح
                      </LocalizedText>
                      <TouchableOpacity
                        style={[
                          styles.payBtn,
                          { backgroundColor: resolveColor("var(--p)") },
                        ]}
                        onPress={() =>
                          activeOrderId
                            ? router.push({ pathname: "/pharmacy/payment", params: { orderId: activeOrderId } })
                            : router.push("/pharmacy/order-history")
                        }
                      >
                        <LocalizedText
                          style={{
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: "800",
                          }}
                        >
                          مراجعة والدفع
                        </LocalizedText>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <LocalizedText
                      style={{
                        fontSize: 13,
                        color: colors.n,
                        lineHeight: 20,
                        textAlign: isRTL ? "right" : "left",
                      }}
                    >
                      {m.text}
                    </LocalizedText>
                  )}
                </View>
                <LocalizedText style={{ fontSize: 9, color: colors.t3, marginTop: 4 }}>
                  {m.time}
                </LocalizedText>
              </View>
            </View>
          ) : (
            <View
              key={m.id}
              style={{
                flexDirection: isRTL ? "row" : "row-reverse",
                marginBottom: 12,
              }}
            >
              <View style={{ maxWidth: "80%" }}>
                <View
                  style={[
                    styles.myBubble,
                    {
                      backgroundColor: resolveColor("var(--p)"),
                      borderTopRightRadius: isRTL ? 4 : 14,
                      borderTopLeftRadius: isRTL ? 14 : 4,
                    },
                  ]}
                >
                  <LocalizedText
                    style={{
                      fontSize: 13,
                      color: "#fff",
                      lineHeight: 20,
                      textAlign: isRTL ? "right" : "left",
                    }}
                  >
                    {m.text}
                  </LocalizedText>
                </View>
                <LocalizedText
                  style={{
                    fontSize: 9,
                    color: colors.t3,
                    marginTop: 4,
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  {m.time}
                </LocalizedText>
              </View>
            </View>
          ),
        )}
        
        {isTyping && (
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", marginBottom: 12, alignItems: "center" }}>
             <View style={[styles.chatAvatar, { backgroundColor: resolveColor("var(--ps)") }]}>
                <LocalizedText style={{ fontFamily: "MaterialSymbolsRounded", color: resolveColor("var(--p)"), fontSize: 18 }}>person</LocalizedText>
             </View>
             <LocalizedText style={{ fontSize: 11, color: colors.t3, marginHorizontal: 8, fontStyle: 'italic' }}>يكتب الآن...</LocalizedText>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.inputArea,
          {
            backgroundColor: colors.s,
            borderTopColor: colors.bd,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.bg,
              color: colors.n,
              textAlign: isRTL ? "right" : "left",
            },
          ]}
          placeholder="اكتب رسالتك للصيدلي..."
          placeholderTextColor={colors.t3}
          value={msg}
          onChangeText={handleTyping}
          onSubmitEditing={send}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: resolveColor("var(--p)") },
          ]}
          onPress={send}
        >
          <LocalizedText
            style={{
              fontFamily: "MaterialSymbolsRounded",
              color: "#fff",
              fontSize: 20,
            }}
          >
            send
          </LocalizedText>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  chatAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: { borderWidth: 1, padding: 12, borderRadius: 14, maxWidth: "90%" },
  myBubble: { padding: 12, borderRadius: 14 },
  payBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  inputArea: {
    borderTopWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 44,
    fontSize: 13,
    marginHorizontal: 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
