import { API_BASE } from '../../../constants';
import { buildHeaders } from '../../../security/Security';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppointmentStatus } from '../../../types/contracts';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Alert, Dimensions, Switch, TextInput,
 KeyboardAvoidingView, Platform, Linking, ActivityIndicator, Image
} from 'react-native';
import { getMyReviews, replyToReview } from '../../../api/reviews';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useLang, useAuth, useToast } from '../../../context';
import {
 NBtn, NCard, NInput, NStatCard, NAvatar, NBadge,
 NHeader, NScroll, NSheet, NSearch, NToggle, NSettingsRow,
 NSecHeader, NConfirm, NEmpty, NDivider, NPriceInput, NCheckbox
} from '../../../components/ui';
import { I, IBg, RatingStars } from '../../../components/icons';
import { SP, R, FS, FW, C } from '../../../constants';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { resolveImageUri, resolveGallery } from '../../../utils/imageUrl';
import { useInsuranceCatalog } from '../../../api/catalogs';
import { SK, Vault } from '../../../security/Security';
import { tokens, withAlpha } from '../../../theme/tokens';

export function ReviewsSystem({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
 const [reviews, setReviews] = useState<any[]>([]);
 const [loadingReviews, setLoadingReviews] = useState(true);
 const [replyingTo, setReplyingTo] = useState<string | null>(null);
 const [replyText, setReplyText] = useState('');

  useEffect(() => {
  // P22.7 — verified surface: GET /provider/reviews (shared helper, same route/shape).
  getMyReviews()
  .then(rows => setReviews(rows))
  .catch(() => setReviews([]))
  .finally(() => setLoadingReviews(false));
  }, []);

  const handleReply = async (id: string) => {
  const text = replyText.trim();
  if (!text) return;
  try {
  // P22.7 — verified surface: POST /provider/reviews/:id/reply { reply } (shared helper, same route/body).
  await replyToReview(id, text);
  setReviews(rs => rs.map(r => r.id === id ? { ...r, reply: text } : r));
 setReplyingTo(null); setReplyText('');
 show(AR ? 'تم إرسال الرد' : 'Reply sent', 'success');
 } catch {
 show(AR ? 'تعذر إرسال الرد' : 'Failed to send reply', 'error');
 }
 };

 const avg = reviews.length
 ? (reviews.reduce((a, r) => a + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
 : '0.0';

 return (
 <NScroll>
 <NHeader title={AR ? 'التقييمات والمراجعات' : 'Reviews & Ratings'} onBack={onBack} />

 {/* Summary */}
 <NCard style={{ marginBottom: SP.xl, alignItems: 'center', padding: SP.xxl }}>
 <Text style={{ fontSize: 48, fontWeight: FW.xbold, color: theme.primary }}>{avg}</Text>
 <RatingStars rating={parseFloat(avg)} size={22} />
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: SP.sm }}>{reviews.length} {AR ? 'تقييم' : 'reviews'}</Text>
 </NCard>

 {/* Reviews */}
 {loadingReviews ? (
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center', marginVertical: SP.xl }}>{AR ? 'جاري تحميل التقييمات...' : 'Loading reviews...'}</Text>
 ) : reviews.length === 0 ? (
 <NEmpty title={AR ? 'لا توجد تقييمات بعد' : 'No reviews yet'} subtitle={AR ? 'ستظهر تقييمات المرضى هنا فور وصولها' : 'Patient reviews will appear here'} />
 ) : reviews.map(review => (
 <NCard key={review.id} style={{ marginBottom: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.sm }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <NAvatar name={review.author || review.patient || '؟'} size={36} />
 <View>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{review.author || review.patient || (AR ? 'مريض' : 'Patient')}</Text>
 <RatingStars rating={Number(review.rating) || 0} size={14} />
 </View>
 </View>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{review.date || ''}</Text>
 </View>
 <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>{review.comment || ''}</Text>
 {review.reply ? (
 <NCard style={{ backgroundColor: theme.primaryLight, padding: SP.md }}>
 <Text style={{ fontSize: FS.xs, color: theme.primary, textAlign: AR ? 'right' : 'left' }}>
 {(AR ? 'ردك: ' : 'Your reply: ') + review.reply}
 </Text>
 </NCard>
 ) : replyingTo === review.id ? (
 <View style={{ marginTop: SP.xs }}>
 <NInput placeholder={AR ? 'اكتب ردك هنا...' : 'Type your reply...'} value={replyText} onChange={setReplyText} />
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.xs, marginTop: SP.xs }}>
 <NBtn label={AR ? 'إرسال' : 'Send'} size="sm" onPress={() => handleReply(review.id)} />
 <NBtn label={AR ? 'إلغاء' : 'Cancel'} size="sm" variant="outline" onPress={() => { setReplyingTo(null); setReplyText(''); }} />
 </View>
 </View>
 ) : (
 <NBtn label={AR ? 'رد على التقييم' : 'Reply'} size="xs" variant="outline" full={false}
 style={{ alignSelf: AR ? 'flex-end' : 'flex-start', paddingHorizontal: SP.lg }}
 onPress={() => setReplyingTo(review.id)} />
 )}
 </NCard>
 ))}
 </NScroll>
 );
}

// ══════════════════════════════════════════════════════════════════
// 12. WITHDRAWAL WORKFLOW SCREEN — Unified withdrawal screens
