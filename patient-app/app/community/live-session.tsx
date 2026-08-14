// @ts-nocheck
// app/community/live-session.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Animated} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { Icon } from '../../src/components/Icon';
import { AppText, Card, Badge, Button, IconButton } from '../../src/components/ui';

const LIVE_COMMENTS = [
  { user: 'أحمد م.', text: 'سؤال ممتاز يا دكتور!', time: '0s', emoji: '' },
  { user: 'سارة ع.', text: 'هل هذا ينطبق على مرضى السكري؟', time: '15s', emoji: '‍️' },
  { user: 'محمد ق.', text: 'شكراً على المعلومات القيّمة', time: '22s', emoji: '' },
  { user: 'نورة م.', text: 'هل يمكن حجز موعد بعد الجلسة؟', time: '35s', emoji: '' },
];

export default function LiveSessionScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useApp();
  
  
  const [viewers, setViewers] = useState(234);
  const [comments, setComments] = useState(LIVE_COMMENTS);
  const [input, setInput] = useState('');
  const [reacted, setReacted] = useState(false);
  const heartAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setInterval(() => setViewers(v => v + Math.floor(Math.random() * 3)), 5000);
    return () => clearInterval(t);
  }, []);

  const sendComment = () => {
    if (!input.trim()) return;
    setComments(p => [...p, { user: 'أنت', text: input, time: 'الآن', emoji: '' }]);
    setInput('');
  };

  const sendHeart = () => {
    setReacted(true);
    Animated.sequence([
      Animated.timing(heartAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(heartAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setReacted(false));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.textPrimary } ]}>
      {/* Video Area */}
      <View style={styles.videoArea}>
        <View style={[styles.videoHeader, { paddingTop: insets.top + 8 } ]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.hBtn}>
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <AppText variant="bodySM">مباشر • {viewers} مشاهد</AppText>
          </View>
          <TouchableOpacity style={styles.hBtn}>
            <Icon name="info" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {/* Simulated video */}
        <View style={styles.videoContent}>
          <Icon name="doctor" size={20} color={colors.primary} />
          <AppText variant="bodySM">د. أحمد السيد</AppText>
          <AppText variant="bodySM">صحة القلب والوقاية من الأمراض</AppText>
        </View>
        <View style={styles.videoBottom}>
          <AppText variant="bodySM">⏱️ 24:35 / 45:00</AppText>
        </View>
      </View>

      {/* Chat */}
      <View style={[styles.chatArea, { backgroundColor: isDark ? colors.surface : colors.white } ]}>
        <View style={styles.chatHeader}>
          <AppText variant="bodySM">التعليقات المباشرة</AppText>
        </View>
        <ScrollView style={styles.commentsList} contentContainerStyle={{ padding: 10, gap: 6 }} showsVerticalScrollIndicator={false}>
          {comments.map((c, i) => (
            <View key={i} style={styles.commentRow}>
              <AppText variant="bodySM">{c.emoji}</AppText>
              <AppText variant="bodySM">
                <AppText variant="bodySM">{c.user}: </AppText>
                {c.text}
              </AppText>
            </View>
          ))}
        </ScrollView>
        <View style={[styles.inputRow, { borderTopColor: colors.border } ]}>
          <TouchableOpacity onPress={sendHeart} style={styles.heartBtn}>
            <Animated.Text style={[styles.heartIcon, { transform: [{ scale: heartAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }] }]}><MaterialIcons name="favorite" size={24} color={resolveColor('var(--p)', isDark)} /></Animated.Text>
          </TouchableOpacity>
          <TextInput style={[styles.input, { color: colors.textPrimary, backgroundColor: isDark ? colors.background : colors.backgroundSecondary }]}
            value={input} onChangeText={setInput} placeholder="أضف تعليقاً..." placeholderTextColor={colors.textTertiary}
            textAlign="right" />
          <TouchableOpacity onPress={sendComment} style={[styles.sendBtn, { backgroundColor: colors.primary } ]}>
            <Icon name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/consultations')}
          style={[styles.bookBtn, { backgroundColor: '#23B5CE' } ]}>
          <View style={{flexDirection:'row-reverse',alignItems:'center',gap:6}}><Icon name="calendar" size={16} color={colors.primary} /><AppText variant="bodySM">احجز موعداً مع الدكتور</AppText></View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  videoArea: { height: 280 },
  videoHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  hBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  liveBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: 'rgba(239,68,68,0.9)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: undefined },
  liveText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  videoContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6 },
  videoTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  videoSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '400' },
  videoBottom: { paddingHorizontal: 16, paddingBottom: 10, alignItems: 'flex-end' },
  videoProgress: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '400' },
  chatArea: { flex: 1 },
  chatHeader: { padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  chatTitle: { fontSize: 14, fontWeight: '800', textAlign: 'right' },
  commentsList: { flex: 1 },
  commentRow: { flexDirection: 'row-reverse', gap: 6, alignItems: 'flex-start' },
  commentEmoji: { fontSize: 14 },
  commentText: { flex: 1, fontSize: 12, fontWeight: '400', lineHeight: 18, textAlign: 'right' },
  commentUser: { fontWeight: '800' },
  inputRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, padding: 10, borderTopWidth: 1 },
  heartBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  heartIcon: { fontSize: 20 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 13, fontWeight: '400' },
  sendBtn: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  bookBtn: { margin: 10, marginTop: 6, borderRadius: 14, paddingVertical: 11, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
