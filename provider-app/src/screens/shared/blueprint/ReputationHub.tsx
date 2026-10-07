import { buildHeaders } from '../../../security/Security';
import { API_BASE } from '../../../constants';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Dimensions, Switch, Platform, Alert, Vibration,
 ActivityIndicator, TextInput, Linking
} from 'react-native';
import { useTheme, useLang, useToast } from '../../../context';
import client from '../../../api/client';
import { useServicesCatalog } from '../../../api/catalogs';
import {
 NBtn, NCard, NInput, NBadge, NHeader, NScroll, NDivider,
 NPriceInput, NToggle, NSearch, NSecHeader, NStatCard, NAvatar,
 NSheet, NEmpty
} from '../../../components/ui';
import { I, IBg } from '../../../components/icons';
import { SP, R, FS, FW, C } from '../../../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ReputationHub({ onBack, onNavigate }: { onBack: () => void; onNavigate?: (s: string, p?: any) => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [reviews, setReviews] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 useEffect(() => {
   client.get('/provider/reviews').then(r => setReviews(Array.isArray(r.data) ? r.data : [])).catch(() => {
     show(AR ? 'تعذر تحميل التقييمات' : 'Could not load reviews', 'error');
   }).finally(() => setLoading(false));
 }, []);
 const avg = reviews.length ? (reviews.reduce((a: number, r: any) => a + (Number(r.rating) || 0), 0) / reviews.length) : 0;
 const replied = reviews.filter((r: any) => r.reply).length;
 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'لوحة السمعة والتقييمات' : 'Reputation & Ratings'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>
 {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} /> : reviews.length === 0 ? (
 <NEmpty icon="star" title={AR ? 'لا توجد تقييمات بعد' : 'No reviews yet'} sub={AR ? 'ستظهر تقييمات المرضى هنا فور وصولها' : 'Patient reviews will appear here'} />
 ) : (<>
 <NCard style={{ alignItems: 'center', paddingVertical: SP.xxl }}>
 <Text style={{ fontSize: FS['2xl'], fontWeight: FW.bold, color: theme.primary }}>{avg.toFixed(1)}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: SP.xs }}>{reviews.length} {AR ? 'تقييم' : 'reviews'}</Text>
 </NCard>
 <NCard>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.xs }}>
 <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? 'نسبة الرد على التقييمات' : 'Review reply rate'}</Text>
 <Text style={{ fontSize: FS.sm, color: theme.success, fontWeight: FW.bold }}>{Math.round((replied / reviews.length) * 100)}%</Text>
 </View>
  <View style={{ height: 8, backgroundColor: theme.surface3, borderRadius: R.full, overflow: 'hidden' }}>
  <View style={{ width: `${Math.round((replied / reviews.length) * 100)}%` as any, height: '100%', backgroundColor: theme.success }} />
  </View>
  </NCard>
  {/* P22.22.7 — the full reply UI (ReviewsSystem, `reviews` route) handles
      per-review replies; this hub stays read-only. Hidden where the host
      navigator does not pass onNavigate (other provider types). */}
  {onNavigate && (
  <NBtn label={AR ? 'الرد على التقييمات' : 'Reply to reviews'} onPress={() => onNavigate('reviews')} style={{ marginTop: SP.md }} />
  )}
  </>)}
 </View>
 </NScroll>
 </View>
 );
}

// 2.2 LIVE ORDER ALARM MODAL (SLA TIMER SYSTEM)
