// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, StatusBar, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, IconButton, Button } from '../../src/components/ui';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'patient' | 'pharmacist';
  time: string;
  type: 'text' | 'price' | 'system';
  priceData?: {
    items: { name: string; qty: number; price: number }[];
    total: number;
    deliveryFee: number;
  };
}

const PHARMACIST = {
  name: 'صيدلي أحمد العتيبي',
  pharmacy: 'صيدلية الدواء',
  status: 'متصل',
};

import { apiFetch } from '../../src/utils/api';
import { useLocalSearchParams } from 'expo-router';

export default function ChatWithPharmacistScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(15 * 60);
  const [sessionExpired, setSessionExpired] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch(`/chat/history?orderId=${orderId || 'default'}`);
        if (data && data.messages) {
          setMessages(data.messages);
        }
      } catch (err) {}
    })();
  }, [orderId]);

  useEffect(() => {
    if (remainingSeconds <= 0) {
      setSessionExpired(true);
      setMessages(prev => [
        ...prev,
        {
          id: 'session-end',
          text: 'انتهت جلسة المحادثة. شكراً لتواصلك مع صيدلية الدواء.',
          sender: 'pharmacist',
          time: 'الآن',
          type: 'system',
        },
      ]);
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds]);

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const sendMessage = () => {
    if (!msg.trim() || sessionExpired) return;
    const newMsg: ChatMessage = {
      id: String(Date.now()),
      text: msg.trim(),
      sender: 'patient',
      time: 'الآن',
      type: 'text',
    };
    setMessages(prev => [...prev, newMsg]);
    setMsg('');
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleConfirmOrder = () => {
    Alert.alert(
      'تأكيد الطلب',
      'هل تريد تأكيد الطلب وإضافة الأدوية إلى سلة المشتريات؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تأكيد',
          onPress: () => {
            router.push('/pharmacy/cart');
          },
        },
      ]
    );
  };

  const renderPriceCard = (priceData: NonNullable<ChatMessage['priceData']>) => (
    <View style={[styles.priceCard, { backgroundColor: isDark ? colors.surface : colors.white, borderColor: colors.borderLight } ]}>
      <View style={styles.priceCardHeader}>
        <Icon name="receipt" size={18} color={colors.success} />
        <AppText variant="labelMD" color={colors.success}>تفاصيل الأسعار</AppText>
      </View>
      <View style={[styles.priceCardDivider, { backgroundColor: colors.borderLight }]} />
      {priceData.items.map((item, i) => (
        <View key={i} style={styles.priceItemRow}>
          <AppText variant="bodySM" color={colors.textPrimary}>
            {item.price} ر.س
          </AppText>
          <View style={styles.priceItemInfo}>
            <AppText variant="bodySM" color={colors.textPrimary}>{item.name}</AppText>
            <AppText variant="caption" color={colors.textTertiary}>الكمية: {item.qty}</AppText>
          </View>
        </View>
      ))}
      <View style={[styles.priceCardDivider, { backgroundColor: colors.borderLight }]} />
      <View style={styles.priceItemRow}>
        <AppText variant="bodySM" color={colors.textSecondary}>{priceData.deliveryFee} ر.س</AppText>
        <AppText variant="bodySM" color={colors.textSecondary}>رسوم التوصيل</AppText>
      </View>
      <View style={[styles.priceTotalRow, { backgroundColor: colors.successSurface } ]}>
        <AppText variant="h5" color={colors.success}>{priceData.total + priceData.deliveryFee} ر.س</AppText>
        <AppText variant="labelMD" color={colors.success}>الإجمالي</AppText>
      </View>
      <TouchableOpacity
        onPress={handleConfirmOrder}
        activeOpacity={0.8}
        style={[styles.confirmBtn, { backgroundColor: colors.success } ]}>
        <Icon name="shopping_cart" size={18} color="#fff" />
        <AppText variant="labelMD" color="#fff">تأكيد وإضافة للسلة</AppText>
      </TouchableOpacity>

      {/* Negotiation Action Buttons */}
      <View style={{ gap: 8, marginHorizontal: 12, marginBottom: 12 }}>
        <TouchableOpacity
          onPress={() => {
            Alert.alert('قبول البدائل', 'تم إرسال طلب قبول الأدوية البديلة المقترحة بنجاح.');
          }}
          style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1, borderColor: colors.primary, borderRadius: 10 }}
        >
          <Icon name="check_circle" size={16} color={colors.primary} />
          <AppText variant="labelSM" color={colors.primary}>قبول البدائل المقترحة</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Alert.alert('حذف الأدوية غير المتوفرة', 'تم تحديث سلة الشراء وحذف الأصناف غير المتوفرة.');
          }}
          style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1, borderColor: colors.error, borderRadius: 10 }}
        >
          <Icon name="remove" size={16} color={colors.error} />
          <AppText variant="labelSM" color={colors.error}>إزالة الأصناف غير المتوفرة</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Alert.alert('إلغاء الطلب', 'تم إلغاء الطلب الحالي.');
            router.back();
          }}
          style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: colors.surfaceSecondary, borderRadius: 10 }}
        >
          <Icon name="close" size={16} color={colors.textSecondary} />
          <AppText variant="labelSM" color={colors.textSecondary}>إلغاء الطلب بالكامل</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isPatient = item.sender === 'patient';

    if (item.type === 'system') {
      return (
        <Animated.View entering={FadeIn.duration(400)} style={styles.systemMsgWrap}>
          <View style={[styles.systemBubble, { backgroundColor: colors.warningSurface } ]}>
            <Icon name="info" size={16} color={colors.warning} />
            <AppText variant="caption" color={colors.warning} align="center">{item.text}</AppText>
          </View>
        </Animated.View>
      );
    }

    return (
      <View style={[styles.msgWrap, { alignItems: isPatient ? 'flex-start' : 'flex-end' } ]}>
        {!isPatient && (
          <View style={[styles.senderBadge, { backgroundColor: colors.successSurface } ]}>
            <Icon name="medication" size={12} color={colors.success} />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: isPatient ? colors.primary : (isDark ? colors.surfaceSecondary : '#ECFDF5'),
              borderBottomLeftRadius: isPatient ? 4 : 18,
              borderBottomRightRadius: isPatient ? 18 : 4,
            },]} >
          {item.type === 'price' && item.priceData ? (
            renderPriceCard(item.priceData)
          ) : (
            <AppText
              variant="bodySM"
              color={isPatient ? '#fff' : colors.textPrimary}
            >
              {item.text}
            </AppText>
          )}
          <AppText
            variant="caption"
            color={isPatient ? 'rgba(255,255,255,0.6)' : colors.textTertiary}
            style={{ marginTop: 4 }}>
            {item.time}
          </AppText>
        </View>
      </View>
    );
  };

  const timerColor = remainingSeconds <= 120 ? colors.error : remainingSeconds <= 300 ? colors.warning : colors.success;

  return (
    <View style={[styles.container, { backgroundColor: colors.background } ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.borderLight } ]}>
        <View style={[styles.timerWrap, { backgroundColor: timerColor + '18' } ]}>
          <Icon name="clock" size={14} color={timerColor} />
          <AppText variant="labelSM" color={timerColor}>{formatTime(remainingSeconds)}</AppText>
        </View>
        <View style={styles.headerCenter}>
          <AppText variant="h5">{PHARMACIST.name}</AppText>
          <View style={styles.pharmacyRow}>
            <View style={[styles.onlineDot, { backgroundColor: sessionExpired ? colors.textTertiary : colors.success }]} />
            <AppText variant="caption" color={sessionExpired ? colors.textTertiary : colors.success}>
              {sessionExpired ? 'غير متصل' : PHARMACIST.pharmacy}
            </AppText>
          </View>
        </View>
        <IconButton icon="back" onPress={() => router.back()} />
      </View>

      {remainingSeconds <= 120 && !sessionExpired && (
        <Animated.View entering={FadeIn.duration(300)} style={[styles.warningBanner, { backgroundColor: colors.warningSurface } ]}>
          <AppText variant="caption" color={colors.warning} align="center">
            ستنتهي الجلسة خلال دقيقتين. أكمل محادثتك الآن.
          </AppText>
        </Animated.View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={m => m.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      <View
        style={[
          styles.inputBar,
          {
            paddingBottom: insets.bottom + 8,
            backgroundColor: colors.surface,
            borderTopColor: colors.borderLight,
          },]} >
        {sessionExpired ? (
          <View style={styles.expiredBar}>
            <Button
              label="العودة للصيدلية"
              icon="pharmacy"
              variant="primary"
              onPress={() => router.back()}
            />
          </View>
        ) : (
          <>
            <TouchableOpacity onPress={sendMessage} style={[styles.sendBtn, { backgroundColor: colors.primary } ]}>
              <Icon name="send" size={20} color="#fff" />
            </TouchableOpacity>
            <TextInput
              value={msg}
              onChangeText={setMsg}
              placeholder="اكتب رسالتك للصيدلي..."
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={sendMessage}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.textPrimary,
                },
              ]} />
            <TouchableOpacity>
              <Icon name="camera" size={22} color={colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity>
              <Icon name="attach" size={22} color={colors.textTertiary} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  pharmacyRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timerWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  warningBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  messagesList: {
    padding: 16,
    gap: 8,
  },
  msgWrap: {
    width: '100%',
  },
  senderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    alignSelf: 'flex-end',
  },
  bubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 18,
  },
  systemMsgWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  systemBubble: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  priceCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  priceCardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  priceCardDivider: {
    height: 1,
  },
  priceItemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  priceItemInfo: {
    alignItems: 'flex-end',
    gap: 2,
  },
  priceTotalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  confirmBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  inputBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 44,
    fontWeight: '400',
    fontSize: 14,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiredBar: {
    flex: 1,
  },
});
