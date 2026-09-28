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

export function SubscriptionsAdsScreen({ onBack, onNavigate }: { onBack: () => void; onNavigate: (s: string) => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [budget, setBudget] = useState('');
 const [duration, setDuration] = useState('');
 const [loading, setLoading] = useState(false);
 const [plan, setPlan] = useState<{ name: string; renews?: string } | null>(null);

 // Current subscription — from the provider profile (never hardcoded).
 useEffect(() => {
 client.get('/provider-onboarding/my-profile')
 .then(res => {
 const p = res.data || {};
 const name = p.subscription_plan || p.plan_name || p.subscription_tier || null;
 const renews = p.subscription_renewal_date || p.subscription_renews_at || null;
 if (name) setPlan({ name, renews: renews ? String(renews).slice(0, 10) : undefined });
 })
 .catch(() => {});
 }, []);

 const handlePurchase = async () => {
 const b = parseInt(budget, 10);
 const d = parseInt(duration, 10);
 if (!b || b <= 0) { show(AR ? 'أدخل ميزانية صحيحة' : 'Enter a valid budget', 'error'); return; }
 if (!d || d <= 0) { show(AR ? 'أدخل مدة صحيحة' : 'Enter a valid duration', 'error'); return; }
 setLoading(true);
 try {
 await client.post('/provider/promotions', {
 title_ar: `حملة إعلانية — ميزانية ${b} ريال`,
 title_en: `Ad Campaign — SAR ${b} budget`,
 original_price: b,
 discounted_price: b,
 start_date: new Date().toISOString(),
 end_date: new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString(),
 target_parameters: { budget_sar: b, duration_days: d },
 });
 show(AR ? 'تم إرسال طلب الحملة الإعلانية — ستُفعّل بعد مراجعة الإدارة' : 'Ad campaign submitted — goes live after admin review', 'success');
 onBack();
 } catch (e: any) {
 const m = e?.response?.data?.message;
 show(typeof m === 'string' ? m : (AR ? 'فشل إرسال الطلب — حاول مجدداً' : 'Failed to submit — retry'), 'error');
 } finally {
 setLoading(false);
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'الاشتراكات والترويج المدفوع' : 'Subscriptions & Ads Purchases'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>
 <NCard style={{ borderLeftWidth: 4, borderColor: '#7C3AED' }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
  {AR ? `الباقة الحالية: ${plan?.name || '—'}` : `Current Plan: ${plan?.name || '—'}`}
 </Text>
 {plan?.renews && (
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: SP.xs, textAlign: AR ? 'right' : 'left' }}>
 {AR ? `تجدد تلقائياً في ${plan.renews}` : `Renews on ${plan.renews}`}
 </Text>
 )}
 </NCard>

 <NSecHeader title={AR ? 'شراء إعلانات ظهور متقدم (Ads)' : 'Purchase Featured Placement (Ads)'} />
 
 <NInput label={AR ? 'الميزانية الإجمالية (ريال)' : 'Ad Budget (SAR)'} value={budget} onChange={setBudget} kbType="numeric" />
 <NInput label={AR ? 'مدة الإعلان (أيام)' : 'Ad Duration (Days)'} value={duration} onChange={setDuration} kbType="numeric" />

 <NBtn label={AR ? ' تأكيد ودفع رسوم الإعلان' : ' Pay & Launch Ad'} onPress={handlePurchase} loading={loading} />

 <NDivider />

 <NBtn label={AR ? ' برنامج المسوقين والشركاء (Affiliate)' : ' B2B Affiliate Portal'} variant="outline" onPress={() => onNavigate('affiliate')} />
 </View>
 </NScroll>
 </View>
 );
}

