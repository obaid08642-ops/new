import { buildHeaders } from '../../security/Security';
import { API_BASE } from '../../constants';
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║ NABDAH PLUS — BLUEPRINT SCREENS (12 MODULES) ║
 * ║ Fully modular interactive dashboard extensions ║
 * ║ ║
 * ║ 01. PromotionsDashboard & CreateCampaignScreen ║
 * ║ 02. ProfileWebConfig (Mini-Websites Settings) ║
 * ║ 03. SubscriptionsAdsScreen & AffiliatePortal ║
 * ║ 04. ReputationHub ║
 * ║ 05. LiveOrderAlarmModal (SLA Alarm Countdown overlay) ║
 * ║ 06. CrmHub & RevenueInsights ║
 * ║ 07. AiMedicalCopilot (Real-time clinical notes suggestion) ║
 * ║ 08. SmartOutboundReferralNetwork ║
 * ║ 09. SosDispatchScreen & GpsRouterScreen ║
 * ║ 10. NurseVisitConsole & NurseChecklistConsole ║
 * ║ 11. PharmacyBroadcastResponse & InventoryExpiryMonitor ║
 * ║ 12. LabSampleScannerScreen & LabResultEntryScreen ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, FlatList, Dimensions, Switch, Platform, Alert, Vibration,
 ActivityIndicator, TextInput
} from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import client from '../../api/client';
import { useServicesCatalog } from '../../api/catalogs';
import {
 NBtn, NCard, NInput, NBadge, NHeader, NScroll, NDivider,
 NPriceInput, NToggle, NSearch, NSecHeader, NStatCard, NAvatar,
 NSheet, NEmpty
} from '../../components/ui';
import { I, IBg } from '../../components/icons';
import { SP, R, FS, FW, SPECIALTIES, C } from '../../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W, height: H } = Dimensions.get('window');

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 1: MARKETING, PORTAL CONFIG & TIERS
// ══════════════════════════════════════════════════════════════════════════════

// 1.1 PROMOTIONS DASHBOARD
export function PromotionsDashboard({ onBack, onNavigate }: { onBack: () => void; onNavigate: (s: string) => void }) {
 const insets = useSafeAreaInsets();
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [promos, setPromos] = useState<any[]>([]);
 const [loading, setLoading] = useState(false);

 const fetchPromos = useCallback(async () => {
 setLoading(true);
 try {
 const res = await client.get('/provider/promotions');
 setPromos(res.data);
 } catch (e) {
 show(AR ? 'فشل تحميل العروض الترويجية' : 'Failed to load promotions', 'error');
 } finally {
 setLoading(false);
 }
 }, [AR, show]);

 useEffect(() => {
 fetchPromos();
 }, [fetchPromos]);

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[_styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: Math.max(insets.top, 16) }]}>
 <TouchableOpacity onPress={onBack}><I name="back" size={20} color={theme.primary} /></TouchableOpacity>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>{AR ? 'مركز العروض الترويجية' : 'Promotions Center'}</Text>
 <TouchableOpacity onPress={() => onNavigate('create_promo')}><I name="plus" size={20} color={theme.primary} /></TouchableOpacity>
 </View>

 <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SP.xl, paddingBottom: 100 }}>
 <NSecHeader title={AR ? 'العروض النشطة والمستمرة' : 'Active Promotions'} />
 {loading && <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.xl }} />}
 {!loading && promos.length === 0 && (
 <Text style={{ textAlign: 'center', color: theme.textSub, marginVertical: SP.xl }}>
 {AR ? 'لا توجد عروض ترويجية حالياً' : 'No promotions available'}
 </Text>
 )}
 {promos.map(item => (
 <NCard key={item._id || item.id} style={{ marginBottom: SP.lg }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
 {AR ? (item.title_ar || item.title_en) : (item.title_en || item.title_ar)}
 </Text>
 <NBadge
 label={AR ? (item.status === 'approved' ? 'مقبول' : item.status === 'pending' ? 'انتظار' : 'مؤرشف') : item.status.toUpperCase()}
 variant={item.status === 'approved' ? 'success' : item.status === 'pending' ? 'warning' : 'primary'}
 size="xs"
 />
 </View>
 <NDivider style={{ marginVertical: SP.sm }} />
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}> {item.discounted_price} {AR?'ريال':'SAR'} <Text style={{ textDecorationLine:'line-through' }}>{item.original_price} {AR?'ريال':'SAR'}</Text></Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}> {new Date(item.end_date).toLocaleDateString()}</Text>
 </View>
 </NCard>
 ))}

 <NBtn label={AR ? ' إنشاء عرض جديد' : ' Create New Promotion'} onPress={() => onNavigate('create_promo')} style={{ marginTop: SP.xl }} />
 </ScrollView>
 </View>
 );
}

// 1.2 CREATE PROMOTION SCREEN
export function CreateCampaignScreen({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [title, setTitle] = useState('');
 const [origPrice, setOrigPrice] = useState('');
 const [discPrice, setDiscPrice] = useState('');
 const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
 const [endDate, setEndDate] = useState(() => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
 const [loading, setLoading] = useState(false);

 const handleCreate = async () => {
 if (!title.trim() || !origPrice || !discPrice) {
 show(AR ? 'يرجى إكمال جميع الحقول الإلزامية' : 'Please complete all required fields', 'warning');
 return;
 }
 setLoading(true);
 try {
 await client.post('/provider/promotions', {
 title_ar: title,
 title_en: title,
 original_price: parseFloat(origPrice),
 discounted_price: parseFloat(discPrice),
 start_date: startDate,
 end_date: endDate,
 });
 show(AR ? 'تم إرسال العرض للمراجعة بنجاح ' : 'Promotion sent for review successfully ', 'success');
 onBack();
 } catch (err: any) {
 show(AR ? 'فشل إنشاء العرض الترويجي' : 'Failed to create promotion campaign', 'error');
 } finally {
 setLoading(false);
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'إنشاء حملة ترويجية' : 'Create Campaign'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.lg }}>
 <NInput label={AR ? 'عنوان الحملة' : 'Campaign Title'} placeholder={AR ? 'مثال: باقة الفحص السريع' : 'e.g. Rapid Checkup Package'} value={title} onChange={setTitle} required />
 <NPriceInput label={AR ? 'السعر الأصلي' : 'Original Price'} value={origPrice} onChange={setOrigPrice} />
 <NPriceInput label={AR ? 'السعر بعد الخصم' : 'Discounted Price'} value={discPrice} onChange={setDiscPrice} />
 <NInput label={AR ? 'تاريخ البدء' : 'Start Date'} placeholder="YYYY-MM-DD" value={startDate} onChange={setStartDate} />
 <NInput label={AR ? 'تاريخ الانتهاء' : 'End Date'} placeholder="YYYY-MM-DD" value={endDate} onChange={setEndDate} />
 <NBtn label={AR ? ' إرسال للموافقة' : ' Submit for Approval'} onPress={handleCreate} loading={loading} style={{ marginTop: SP.lg }} />
 </View>
 </NScroll>
 </View>
 );
}

// 1.3 PROVIDER MINI-WEBSITE CONFIG
export function ProfileWebConfig({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [active, setActive] = useState(false);
 const [bio, setBio] = useState('');
 const [socials, setSocials] = useState('');
 const [publicUrl, setPublicUrl] = useState<string | null>(null);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 useEffect(() => {
   let alive = true;
   client.get('/provider/profile').then((response) => {
     if (!alive) return;
     const profile = response.data || {};
     setActive(Boolean(profile.public_eligibility));
     setBio(AR ? (profile.description_ar || profile.bio || '') : (profile.description_en || profile.bio || ''));
     setSocials(profile.social?.website || profile.social?.url || '');
     setPublicUrl(profile.slug ? `https://nabdah.plus/provider/${profile.slug}` : null);
   }).catch((error: any) => {
     if (alive) show(error?.response?.data?.message || (AR ? 'تعذر تحميل إعدادات الموقع' : 'Unable to load site settings'), 'error');
   }).finally(() => { if (alive) setLoading(false); });
   return () => { alive = false; };
 }, [AR, show]);
 const handleSave = async () => {
   setSaving(true);
   try {
     const response = await client.patch('/provider/profile', {
       public_eligibility: active,
       description_ar: AR ? bio : undefined,
       description_en: AR ? undefined : bio,
       social: { website: socials.trim() },
     });
     const profile = response.data || {};
     setPublicUrl(profile.slug ? `https://nabdah.plus/provider/${profile.slug}` : null);
     show(AR ? 'تم حفظ إعدادات الموقع في الخادم' : 'Public site settings saved to the server', 'success');
     onBack();
   } catch (error: any) {
     show(error?.response?.data?.message || (AR ? 'تعذر حفظ إعدادات الموقع' : 'Unable to save site settings'), 'error');
   } finally { setSaving(false); }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'موقع مزود الخدمة العام' : 'Public Mini-Website'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>
 {loading ? <ActivityIndicator color={theme.primary} /> : null}
 <NCard>
 <NToggle
 label={AR ? 'تفعيل الصفحة العامة للمريض' : 'Active Public Website'}
 sub={AR ? 'تمكين حجز المواعيد عبر رابط موقعك العام مباشرة' : 'Allow patients to book directly via link'}
 value={active}
 onChange={setActive}
 />
 </NCard>

 <NInput label={AR ? 'النبذة التعريفية' : 'Doctor/Clinic Bio'} value={bio} onChange={setBio} multi lines={4} />
 <NInput label={AR ? 'حسابات التواصل الاجتماعي' : 'Social Media Link'} value={socials} onChange={setSocials} />

 {publicUrl && <NCard style={{ backgroundColor: theme.primaryLight, borderColor: theme.primary }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <Text style={{ flex: 1, fontSize: FS.sm, color: theme.primary, fontWeight: FW.bold }}>{publicUrl}</Text>
 </View>
 </NCard>}
 <NBtn label={AR ? ' حفظ التعديلات' : ' Save Settings'} loading={saving} onPress={handleSave} />
 </View>
 </NScroll>
 </View>
 );
}

// 1.4 SUBSCRIPTION & AD PURCHASES & AFFILIATE
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

export function AffiliatePortal({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';
 const [dash, setDash] = useState<any>(null);
 const [loadingDash, setLoadingDash] = useState(true);

 useEffect(() => {
   // Real referral dashboard — code, stats, and invite list from /referrals/my.
   client.get('/referrals/my')
     .then(r => setDash(r.data || null))
     .catch(() => setDash(null))
     .finally(() => setLoadingDash(false));
 }, []);

 const invites: any[] = Array.isArray(dash?.invites) ? dash.invites : [];

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'بوابة التسويق بالعمولة' : 'Affiliate Portal'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>
 <NCard style={{ backgroundColor: theme.infoBg, borderColor: theme.info }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.info, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
  {AR ? 'ادعُ مقدم خدمة واحصل على مكافآت الإحالة' : 'Invite a provider & earn referral rewards'}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'شارك كود الشراكة أدناه مع العيادات أو الأطباء لتكسب نقاط المكافآت.'
 : 'Share your partnership code below to earn reward points.'}
 </Text>
 </NCard>

 <NCard style={{ alignItems: 'center' }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{AR ? 'كود الإحالة الخاص بك' : 'Your Referral Code'}</Text>
 <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, marginVertical: SP.md }}>
 {loadingDash ? '…' : (dash?.code || '—')}
 </Text>
 {!!dash?.code && (
 <NBtn label={AR ? ' نسخ الكود' : ' Copy Code'} variant="outline" onPress={() => show(AR ? 'تم النسخ' : 'Copied', 'success')} />
 )}
 </NCard>

 {dash?.stats && (
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
 <NStatCard icon="users" label={AR ? 'إجمالي الدعوات' : 'Total Invites'} value={String(dash.stats.total ?? 0)} color={theme.info} style={{ flex: 1 }} />
 <NStatCard icon="check" label={AR ? 'كُوفئت' : 'Rewarded'} value={String(dash.stats.rewarded ?? 0)} color={theme.success} style={{ flex: 1 }} />
 <NStatCard icon="star" label={AR ? 'النقاط' : 'Points'} value={String(dash.stats.earned_points ?? 0)} color={theme.primary} style={{ flex: 1 }} />
 </View>
 )}

 <NSecHeader title={AR ? 'سجل الدعوات والمكافآت' : 'Invites & Rewards Ledger'} />
 {loadingDash ? (
 <ActivityIndicator color={theme.primary} />
 ) : invites.length === 0 ? (
 <NCard>
 <Text style={{ color: theme.textSub, textAlign: 'center' }}>{AR ? 'لا توجد دعوات بعد — شارك كودك لتبدأ الكسب.' : 'No invites yet — share your code to start earning.'}</Text>
 </NCard>
 ) : (
 <NCard style={{ gap: SP.md }}>
 {invites.map((inv: any) => (
 <View key={inv.id} style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
 <Text style={{ fontSize: FS.sm, color: theme.text }}>{inv.name}</Text>
 <Text style={{ fontSize: FS.sm, color: inv.status === 'rewarded' ? theme.success : theme.textSub, fontWeight: FW.bold }}>
 {inv.status === 'rewarded' ? `+${inv.reward_points} ${AR ? 'نقطة' : 'pts'}` : (AR ? 'قيد الانتظار' : 'Pending')}
 </Text>
 </View>
 ))}
 </NCard>
 )}
 </View>
 </NScroll>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 2: OPERATIONS, CRM & ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

// 2.1 RATING & REPUTATION DASHBOARD
export function ReputationHub({ onBack }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const AR = lang === 'ar';

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'لوحة السمعة والتقييمات' : 'Reputation & Ratings'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>
 
 <NCard style={{ alignItems: 'center', backgroundColor: '#EDE9FE', borderColor: '#7C3AED', borderWidth: 2, paddingVertical: SP.xxl }}>
 <I name="lab" size={50} color="#7C3AED" />
 <Text style={{ fontSize: FS['2xl'], fontWeight: FW.bold, color: '#7C3AED', marginTop: SP.md }}>
 {AR ? 'المستوى الذهبي' : 'Gold Tier Level'}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: SP.xs }}>
 {AR ? 'أنت ضمن أفضل 5% من مقدمي الخدمة في منطقتك' : 'Top 5% providers in your active zone'}
 </Text>
 </NCard>

 <NSecHeader title={AR ? 'مؤشرات مستوى الخدمة (SLA)' : 'SLA Performance Indicators'} />
 
 <NCard style={{ gap: SP.lg }}>
 <View>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.xs }}>
 <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? 'معدل الاستجابة السريع' : 'Response Compliance Rate'}</Text>
 <Text style={{ fontSize: FS.sm, color: theme.success, fontWeight: FW.bold }}>98%</Text>
 </View>
 <View style={{ height: 8, backgroundColor: theme.surface3, borderRadius: R.full, overflow: 'hidden' }}>
 <View style={{ width: '98%' as any, height: '100%', backgroundColor: theme.success }} />
 </View>
 </View>

 <View>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.xs }}>
 <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? 'معدل قبول الطلبات' : 'Order Acceptance Rate'}</Text>
 <Text style={{ fontSize: FS.sm, color: theme.success, fontWeight: FW.bold }}>94%</Text>
 </View>
 <View style={{ height: 8, backgroundColor: theme.surface3, borderRadius: R.full, overflow: 'hidden' }}>
 <View style={{ width: '94%' as any, height: '100%', backgroundColor: theme.success }} />
 </View>
 </View>

 <View>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.xs }}>
 <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? 'نسبة استكمال المواعيد' : 'Completion Rate'}</Text>
 <Text style={{ fontSize: FS.sm, color: theme.warn, fontWeight: FW.bold }}>88%</Text>
 </View>
 <View style={{ height: 8, backgroundColor: theme.surface3, borderRadius: R.full, overflow: 'hidden' }}>
 <View style={{ width: '88%' as any, height: '100%', backgroundColor: theme.warn }} />
 </View>
 </View>
 </NCard>

 <NCard style={{ backgroundColor: theme.infoBg, borderColor: theme.info }}>
 <Text style={{ fontSize: FS.xs, color: theme.info, lineHeight: 18, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'تحذير: هبوط نسبة القبول عن 80% قد يؤدي تلقائياً لخفض ترتيبك في محركات بحث المرضى.' 
 : 'Warning: Dropping below 80% acceptance decreases search engine visibility for patients.'}
 </Text>
 </NCard>
 </View>
 </NScroll>
 </View>
 );
}

// 2.2 LIVE ORDER ALARM MODAL (SLA TIMER SYSTEM)
export function LiveOrderAlarmModal({
 visible,
 onAccept,
 onDecline,
 timeoutSeconds = 120,
 patientName = '—',
 serviceType = '—'
}: {
 visible: boolean;
 onAccept: () => void;
 onDecline: () => void;
 timeoutSeconds?: number;
 patientName?: string;
 serviceType?: string;
}) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const AR = lang === 'ar';

 const [timeLeft, setTimeLeft] = useState(timeoutSeconds);
 const pulseAnim = useRef(new Animated.Value(1)).current;

 useEffect(() => {
 if (!visible) return;
 setTimeLeft(timeoutSeconds);

 // Vibration alerts loop
 const vInterval = setInterval(() => {
 Vibration.vibrate([100, 300, 100, 300]);
 }, 1500);

 // Ticking countdown
 const tInterval = setInterval(() => {
 setTimeLeft(prev => {
 if (prev <= 1) {
 clearInterval(tInterval);
 clearInterval(vInterval);
 onDecline(); // Auto-decline when timer expires
 return 0;
 }
 return prev - 1;
 });
 }, 1000);

 // Alert pulse animation
 Animated.loop(
 Animated.sequence([
 Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
 Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
 ])
 ).start();

 return () => {
 clearInterval(tInterval);
 clearInterval(vInterval);
 Vibration.cancel();
 };
 }, [visible]);

 if (!visible) return null;

 return (
 <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 99999, justifyContent: 'center', alignItems: 'center' }]}>
 <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center', gap: SP.lg }}>
 
 <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: theme.danger, alignItems: 'center', justifyContent: 'center', shadowColor: theme.danger, shadowRadius: 20, shadowOpacity: 0.8 }}>
 <Text style={{ color: '#FFF', fontSize: FS['4xl'], fontWeight: '800' }}>{timeLeft}s</Text>
 </View>

 <Text style={{ color: '#FFF', fontSize: FS['3xl'], fontWeight: FW.bold, textAlign: 'center' }}>
 {AR ? 'طلب كشف عاجل وارد!' : 'Incoming Urgent Request!'}
 </Text>

 <View style={{ backgroundColor: theme.surface, padding: SP.xl, borderRadius: R.xl, width: W * 0.85, gap: SP.md, alignItems: 'center' }}>
 <NAvatar name={patientName} size={64} />
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}>{patientName}</Text>
 <NBadge label={serviceType} variant="danger" />
 
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center', marginTop: SP.xs }}>
 {AR ? 'الرجاء الاستجابة الفورية قبل انتهاء مهلة مؤشر الاستجابة (SLA)' 
 : 'Please respond immediately before SLA countdown expiration'}
 </Text>

 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, width: '100%', marginTop: SP.lg }}>
 <TouchableOpacity onPress={onDecline} style={{ flex: 1, backgroundColor: theme.surface2, borderColor: theme.border, borderWidth: 1, paddingVertical: SP.md, borderRadius: R.md, alignItems: 'center' }}>
 <Text style={{ color: theme.danger, fontWeight: FW.bold }}>{AR ? 'رفض الطلب' : 'Reject'}</Text>
 </TouchableOpacity>

 <TouchableOpacity onPress={onAccept} style={{ flex: 1, backgroundColor: theme.primary, paddingVertical: SP.md, borderRadius: R.md, alignItems: 'center' }}>
 <Text style={{ color: '#FFF', fontWeight: FW.bold }}>{AR ? 'قبول الطلب' : 'Accept Request'}</Text>
 </TouchableOpacity>
 </View>
 </View>

 </Animated.View>
 </View>
 );
}

// 2.3 CRM HUB & REVENUE INTELLIGENCE
export function CrmHub({ onBack, onNavigate }: { onBack: () => void; onNavigate: (s: string) => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 // Real CRM roster — provider's tagged patients from the backend (no demo names).
 const [PATIENTS, setPatients] = useState<{ id: string; name: string; is_vip?: boolean; is_favorite?: boolean; is_blocked?: boolean }[]>([]);
 const [listLoading, setListLoading] = useState(true);
 useEffect(() => {
   client.get('/provider/crm')
     .then(r => setPatients((Array.isArray(r.data) ? r.data : (r.data?.items || [])).map((p: any) => ({
       id: p.patient_id, name: p.name, is_vip: p.is_vip, is_favorite: p.is_favorite, is_blocked: p.is_blocked,
     }))))
     .catch(() => setPatients([]))
     .finally(() => setListLoading(false));
 }, []);

 const [selectedPat, setSelectedPat] = useState<{ id: string; name: string } | null>(null);
 const [crmLoading, setCrmLoading] = useState(false);
 const [isVip, setIsVip] = useState(false);
 const [isFav, setIsFav] = useState(false);
 const [isBlocked, setIsBlocked] = useState(false);
 const [blockReason, setBlockReason] = useState('');
 const [noteText, setNoteText] = useState('');
 const [notesList, setNotesList] = useState<string[]>([]);
 const [saveLoading, setSaveLoading] = useState(false);

 const openPatientCrm = async (pat: typeof PATIENTS[0]) => {
 setSelectedPat(pat);
 setCrmLoading(true);
 try {
 const res = await client.get(`/provider/crm/${pat.id}`);
 setIsVip(Boolean(res.data.vip));
 setIsFav(Boolean(res.data.favorite));
 setIsBlocked(Boolean(res.data.blocked));
 setBlockReason(res.data.blocked_reason || '');
 setNotesList(Array.isArray(res.data.notes) ? res.data.notes.map((note: any) => typeof note === 'string' ? note : note.text).filter(Boolean) : []);
 setNoteText('');
 } catch (e) {
 show(AR ? 'فشل تحميل بيانات العميل' : 'Failed to fetch CRM data', 'error');
 } finally {
 setCrmLoading(false);
 }
 };

 const handleSaveCrm = async () => {
 if (!selectedPat) return;
 setSaveLoading(true);
 try {
 const updatedNotes = [...notesList];
 if (noteText.trim()) {
 updatedNotes.push(noteText.trim());
 }
 await client.put(`/provider/crm/${selectedPat.id}`, {
 vip: isVip,
 favorite: isFav,
 blocked: isBlocked,
 blocked_reason: isBlocked ? blockReason : '',
 notes: updatedNotes.map((text, index) => ({ id: `${selectedPat.id}-${index}`, date: new Date().toISOString().slice(0, 10), text })),
 });
 show(AR ? 'تم حفظ تفاصيل العميل بنجاح' : 'Patient CRM updated successfully', 'success');
 setSelectedPat(null);
 } catch (e) {
 show(AR ? 'فشل حفظ التحديثات' : 'Failed to update CRM data', 'error');
 } finally {
 setSaveLoading(false);
 }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'ذكاء الأعمال وإدارة العملاء' : 'CRM & Revenue Intelligence'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>
 
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
 <NStatCard icon="" label={AR ? 'مرضى مسجلون' : 'CRM Patients'} value={String(PATIENTS.length)} color={theme.primary} style={{ flex: 1 }} />
 <NStatCard icon="" label={AR ? 'VIP' : 'VIP'} value={String(PATIENTS.filter(p => p.is_vip).length)} color={theme.info} style={{ flex: 1 }} />
 </View>

 <NSecHeader title={AR ? 'روستر المتابعة الفورية للعملاء' : 'Quick Customer Follow-up'} />
 {listLoading ? (
 <ActivityIndicator color={theme.primary} />
 ) : PATIENTS.length === 0 ? (
 <NCard>
 <Text style={{ color: theme.textSub, textAlign: 'center' }}>
 {AR ? 'لا يوجد مرضى في سجل CRM بعد — عند وضع وسوم على مرضاك من الاستشارات سيظهرون هنا.' : 'No CRM patients yet — patients you tag from consultations will appear here.'}
 </Text>
 </NCard>
 ) : PATIENTS.map((pat) => (
 <NCard key={pat.id} style={{ marginBottom: SP.sm }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <TouchableOpacity onPress={() => openPatientCrm(pat)} style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center', flex: 1 }}>
 <NAvatar name={pat.name} size={36} />
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{pat.name}</Text>
 </TouchableOpacity>
 <TouchableOpacity onPress={() => openPatientCrm(pat)} 
 style={{ backgroundColor: theme.primaryLight, paddingHorizontal: SP.md, paddingVertical: SP.sm, borderRadius: R.sm }}>
 <Text style={{ color: theme.primary, fontSize: FS.xs, fontWeight: FW.bold }}>{AR ? 'الملف الطبي' : 'CRM Profile'}</Text>
 </TouchableOpacity>
 </View>
 </NCard>
 ))}

 <NBtn label={AR ? ' تفاصيل الإيرادات والتقارير' : ' Revenue Insights'} onPress={() => onNavigate('revenue_insights')} />
 </View>
 </NScroll>

 <NSheet visible={!!selectedPat} onClose={() => setSelectedPat(null)} title={selectedPat?.name || ''} height={H * 0.75}>
 {crmLoading ? (
 <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xl }} />
 ) : (
 <ScrollView contentContainerStyle={{ padding: SP.xl, gap: SP.lg }}>
 <NToggle label={AR?' عميل مفضل':' Favorite Patient'} value={isFav} onChange={setIsFav} />
 <NToggle label={AR ? ' عميل VIP متميز' : ' VIP Customer'} value={isVip} onChange={setIsVip} />
 <NToggle label={AR ? ' حظر العميل من الحجز' : ' Block Patient'} value={isBlocked} onChange={setIsBlocked} />
 
 {isBlocked && (
 <NInput label={AR ? 'سبب الحظر' : 'Block Reason'} value={blockReason} onChange={setBlockReason} placeholder={AR ? 'مثال: عدم الحضور المتكرر للمواعيد' : 'e.g. Frequent no-show'} />
 )}

 <NDivider />

 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'ملاحظات الطبيب الخاصة' : 'Private Provider Notes'}
 </Text>

 {notesList.map((note, idx) => (
 <View key={idx} style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: theme.border }}>
 <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{note}</Text>
 </View>
 ))}

 <NInput label={AR ? 'إضافة ملاحظة جديدة' : 'Add New Note'} value={noteText} onChange={setNoteText} placeholder={AR ? 'اكتب ملاحظتك الطبية الخاصة هنا...' : 'Type note...'} multi lines={3} />

 <NBtn label={AR ? ' حفظ التعديلات' : ' Save CRM Settings'} onPress={handleSaveCrm} loading={saveLoading} style={{ marginTop: SP.md }} />
 </ScrollView>
 )}
 </NSheet>
 </View>
 );
}

export function RevenueInsights({ onBack }: { onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const AR = lang === 'ar';
 const [ledger, setLedger] = useState<any>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
   // Live data only — no fabricated revenue figures.
   client.get('/provider/ops/wallet/ledger')
     .then(r => setLedger(r.data || null))
     .catch(() => setLedger(null))
     .finally(() => setLoading(false));
 }, []);

 const txns: any[] = Array.isArray(ledger?.transactions) ? ledger.transactions : [];
 const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
 const monthEarnings = txns
   .filter((t: any) => t.type === 'provider_earning' && new Date(t.createdAt) >= monthStart)
   .reduce((s: number, t: any) => s + (t.amount || 0), 0);
 // Previous month for an honest comparison.
 const prevStart = new Date(monthStart); prevStart.setMonth(prevStart.getMonth() - 1);
 const prevEarnings = txns
   .filter((t: any) => t.type === 'provider_earning' && new Date(t.createdAt) >= prevStart && new Date(t.createdAt) < monthStart)
   .reduce((s: number, t: any) => s + (t.amount || 0), 0);
 const delta = prevEarnings > 0 ? Math.round(((monthEarnings - prevEarnings) / prevEarnings) * 100) : null;
 // Earnings grouped by real reference (service/booking type if present, else type).
 const byRef: Record<string, number> = {};
 txns.filter((t: any) => t.type === 'provider_earning')
   .forEach((t: any) => { const k = t.service_type || t.reference_type || 'other'; byRef[k] = (byRef[k] || 0) + (t.amount || 0); });
 const topServices = Object.entries(byRef).sort((a, b) => b[1] - a[1]).slice(0, 5);
 const totalAll = topServices.reduce((s, [, v]) => s + v, 0) || 1;

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'تفاصيل الإيرادات والتحليلات' : 'Revenue Insights'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>

 <NCard style={{ backgroundColor: theme.surface2 }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{AR ? 'صافي أرباح الشهر الحالي' : 'Net earnings this month'}</Text>
 <Text style={{ fontSize: FS['3xl'], fontWeight: '800', color: theme.primary, textAlign: AR ? 'right' : 'left', marginVertical: SP.xs }}>
 {loading ? '…' : `${monthEarnings.toLocaleString()} ${AR ? 'ريال' : 'SAR'}`}
 </Text>
 {delta !== null && (
 <Text style={{ fontSize: FS.xs, color: delta >= 0 ? theme.success : theme.danger, textAlign: AR ? 'right' : 'left' }}>
 {delta >= 0 ? '↗' : '↘'} {Math.abs(delta)}% {AR ? 'مقارنة بالشهر الماضي' : 'vs last month'}
 </Text>
 )}
 </NCard>

 <NSecHeader title={AR ? 'الخدمات الأكثر ربحاً' : 'Top Earning Services'} />
 {loading ? (
 <ActivityIndicator color={theme.primary} />
 ) : topServices.length === 0 ? (
 <NCard>
 <Text style={{ color: theme.textSub, textAlign: 'center' }}>{AR ? 'لا توجد إيرادات بعد — ستظهر هنا فور اكتمال أول خدمة مدفوعة.' : 'No earnings yet — they will appear here once your first paid service completes.'}</Text>
 </NCard>
 ) : (
 <NCard style={{ gap: SP.lg }}>
 {topServices.map(([label, val], idx) => {
 const pct = Math.round((val / totalAll) * 100);
 return (
 <View key={idx}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 4 }}>
 <Text style={{ fontSize: FS.sm, color: theme.text }}>{label}</Text>
 <Text style={{ fontSize: FS.sm, color: theme.text, fontWeight: FW.bold }}>{val.toLocaleString()} {AR ? 'ر' : 'SAR'}</Text>
 </View>
 <View style={{ height: 6, backgroundColor: theme.surface3, borderRadius: R.full, overflow: 'hidden' }}>
 <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: theme.primary }} />
 </View>
 </View>
 );
 })}
 </NCard>
 )}
 </View>
 </NScroll>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 3: CLINICAL MODULES & AI COPILOT
// ══════════════════════════════════════════════════════════════════════════════

// 3.1 AI MEDICAL COPILOT
export function AiMedicalCopilot({ onBack }: { onBack: () => void }) {
 const insets = useSafeAreaInsets();
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [soap, setSoap] = useState({ s: '', o: '', a: '', p: '' });
 const [loading, setLoading] = useState(false);
 const [aiSuggestion, setAiSuggestion] = useState('');
 const [aiLoading, setAiLoading] = useState(false);
 const [patients, setPatients] = useState<any[]>([]);
 const [selectedPatient, setSelectedPatient] = useState<any>(null);

 useEffect(() => {
   // Real active patients from the doctor's queue — the note must belong to a real patient.
   client.get('/provider/jobs/queue?status=active')
     .then(r => {
       const rows = Array.isArray(r.data) ? r.data : (r.data?.items || []);
       setPatients(rows);
     })
     .catch(() => setPatients([]));
 }, []);

 const askCopilot = async () => {
   const notes = [soap.s, soap.o].filter(Boolean).join('\n');
   if (!notes.trim()) {
     show(AR ? 'اكتب الشكوى والعلامات أولاً ليقترح المساعد' : 'Enter subjective/objective notes first', 'error');
     return;
   }
   setAiLoading(true);
   try {
     const r = await client.post('/ai/copilot/suggest', { notes });
     setAiSuggestion(r.data?.suggestion || r.data?.response || '');
   } catch {
     show(AR ? 'تعذر الحصول على اقتراح AI حالياً' : 'AI suggestion unavailable right now', 'error');
   } finally { setAiLoading(false); }
 };

 const submitSoap = async () => {
   const note = [
     soap.s && `S: ${soap.s}`,
     soap.o && `O: ${soap.o}`,
     soap.a && `A: ${soap.a}`,
     soap.p && `P: ${soap.p}`,
   ].filter(Boolean).join('\n');
   if (!note.trim()) {
     show(AR ? 'اكتب الملاحظة السريرية أولاً' : 'Write the clinical note first', 'error');
     return;
   }
   const patientId = selectedPatient?.patient_id || selectedPatient?.patientId || selectedPatient?.patient?.id;
   if (!patientId) {
     show(AR ? 'اختر المريض الذي تخصه الملاحظة' : 'Select the patient this note belongs to', 'error');
     return;
   }
   setLoading(true);
   try {
     await client.post('/home-care/notes', { patient_id: patientId, note });
     show(AR ? 'تم حفظ التقرير الطبي بنجاح' : 'Clinical SOAP note saved', 'success');
     onBack();
   } catch (err: any) {
     show(err?.response?.data?.message || (AR ? 'فشل الحفظ' : 'Failed to save'), 'error');
   } finally {
     setLoading(false);
   }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={[_styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
 <TouchableOpacity onPress={onBack}><I name="back" size={20} color={theme.primary} /></TouchableOpacity>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}> {AR ? 'السجل الطبي ومساعد AI' : 'EMR & AI Copilot'}</Text>
 <View style={{ width: 20 }} />
 </View>

 <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SP.xl, gap: SP.xl }}>
 {aiSuggestion ? (
 <NCard style={{ backgroundColor: theme.surface2, borderColor: theme.primary, borderWidth: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
  {AR?'تحليل AI مقترح:':'AI Suggested Analysis:'}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', lineHeight: 22 }}>{aiSuggestion}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textHint, marginTop: SP.sm, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'إخلاء مسؤولية: اقتراح AI مساعد فقط — القرار السريري النهائي للطبيب.' : 'Disclaimer: AI suggestion is advisory only — final clinical decision rests with the physician.'}
 </Text>
 </NCard>
 ) : (
 <NBtn label={aiLoading ? (AR ? 'جارٍ تحليل الملاحظات…' : 'Analyzing notes…') : (AR ? ' اقتراح AI بناءً على الملاحظات' : ' Get AI suggestion from notes')} variant="outline" onPress={askCopilot} loading={aiLoading} />
 )}

 {/* Patient selector — the note must attach to a real patient */}
 <View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'المريض (من قائمة العمل النشطة)' : 'Patient (from your active queue)'}
 </Text>
 {patients.length === 0 ? (
 <Text style={{ fontSize: FS.xs, color: theme.textHint, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'لا يوجد مرضى نشطون حالياً في قائمتك.' : 'No active patients in your queue right now.'}
 </Text>
 ) : (
 <ScrollView horizontal showsHorizontalScrollIndicator={false}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
 {patients.map((p: any, i: number) => {
 const pid = p.patient_id || p.patientId || p.patient?.id || i;
 const name = p.patient || p.patient_name || p.patient?.full_name || `#${pid}`;
 const sel = selectedPatient && (selectedPatient.patient_id || selectedPatient.patientId || selectedPatient.patient?.id) === (p.patient_id || p.patientId || p.patient?.id);
 return (
 <TouchableOpacity key={pid} onPress={() => setSelectedPatient(p)}
 style={{ paddingHorizontal: SP.md, paddingVertical: 8, borderRadius: R.full, borderWidth: 1.5,
 backgroundColor: sel ? theme.primary : theme.surface2, borderColor: sel ? theme.primary : theme.border }}>
 <Text style={{ color: sel ? '#FFF' : theme.text, fontSize: FS.sm }}>{name}</Text>
 </TouchableOpacity>
 );
 })}
 </View>
 </ScrollView>
 )}
 </View>

 <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'ملاحظات SOAP السريرية' : 'Clinical SOAP Notes'}
 </Text>

 <View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>S - Subjective</Text>
 <TextInput style={{ backgroundColor: theme.surface, color: theme.text, padding: SP.md, borderRadius: R.md, height: 80, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left' }} multiline placeholder={AR ? "شكوى المريض..." : "Patient complaint..."} placeholderTextColor={theme.textSub} value={soap.s} onChangeText={t => setSoap({...soap, s: t})} />
 </View>

 <View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>O - Objective</Text>
 <TextInput style={{ backgroundColor: theme.surface, color: theme.text, padding: SP.md, borderRadius: R.md, height: 80, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left' }} multiline placeholder={AR ? "العلامات الحيوية..." : "Vitals, observations..."} placeholderTextColor={theme.textSub} value={soap.o} onChangeText={t => setSoap({...soap, o: t})} />
 </View>
 
 <View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>A - Assessment</Text>
 <TextInput style={{ backgroundColor: theme.surface, color: theme.text, padding: SP.md, borderRadius: R.md, height: 80, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left' }} multiline placeholder={AR ? "التشخيص المبدئي..." : "Initial diagnosis..."} placeholderTextColor={theme.textSub} value={soap.a} onChangeText={t => setSoap({...soap, a: t})} />
 </View>

 <View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>P - Plan</Text>
 <TextInput style={{ backgroundColor: theme.surface, color: theme.text, padding: SP.md, borderRadius: R.md, height: 80, textAlignVertical: 'top', textAlign: AR ? 'right' : 'left' }} multiline placeholder={AR ? "الخطة العلاجية..." : "Treatment plan..."} placeholderTextColor={theme.textSub} value={soap.p} onChangeText={t => setSoap({...soap, p: t})} />
 </View>

 <NBtn label={AR ? ' حفظ السجل الطبي' : ' Save EMR Entry'} onPress={submitSoap} loading={loading} />
 </ScrollView>
 </View>
 );
}

// 3.2 SMART OUTBOUND REFERRAL NETWORK
export function SmartOutboundReferralNetwork({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [search, setSearch] = useState('');
  const [patientId, setPatientId] = useState('');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [network, setNetwork] = useState<any[]>([]);
  const labCatalog = useServicesCatalog('lab');
  const radiologyCatalog = useServicesCatalog('radiology');
  const CATALOGUE = [...labCatalog, ...radiologyCatalog].map((service) => ({ id: service.id, label: AR ? service.ar : service.en }));
  useEffect(() => {
    let active = true;
    client.get('/provider/referral-network').then((response) => {
      if (active) setNetwork(Array.isArray(response.data) ? response.data : (response.data?.items || []));
    }).catch(() => { if (active) setNetwork([]); });
    return () => { active = false; };
  }, []);

  const handleToggleTest = (id: string) => {
    setSelectedTests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const attemptGenerate = () => {
    if (!patientId.trim() || !selectedProviderId || selectedTests.length === 0) {
      show(AR ? 'أدخل معرف المريض وحدد الجهة وفحصاً واحداً على الأقل' : 'Enter a patient ID, select a destination, and choose at least one test', 'warning');
      return;
    }
    executeGenerate();
  };

  const executeGenerate = async () => {
    const destination = network.find((item) => item.id === selectedProviderId);
    if (!destination) return;
    setLoading(true);
    try {
      const selectedTestLabels = selectedTests.map(id => CATALOGUE.find(c => c.id === id)?.label || id);
      const res = await client.post('/provider/referrals', {
        patient_id: patientId.trim(),
        target_type: destination.type,
        target_provider_id: destination.id,
        target_name: AR ? (destination.name || destination.name_en) : (destination.name_en || destination.name),
        notes: AR ? 'تحويل تشخيصي خارجي' : 'Outbound diagnostic referral',
        requested_tests: selectedTestLabels,
      });
      setRefCode(res.data.referral_code || null);
      show(AR ? 'تم إنشاء الإحالة وحفظها' : 'Referral created and saved', 'success');
    } catch (e) {
      show(AR ? 'فشل إصدار كود التحويل' : 'Failed to generate referral code', 'error');
    } finally {
      setLoading(false);
    }
  };


  return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'شبكة التحويلات الخارجية' : 'Smart Outbound Referral'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>
 
 <NInput label={AR ? 'اسم أو رقم المريض' : 'Patient Name / ID'} value={patientId} onChange={setPatientId} placeholder={AR ? 'أدخل اسم المريض أو هويته...' : 'Enter patient name/ID...'} />

 <NSearch value={search} onChange={setSearch} placeholder={AR ? 'ابحث عن معمل تحاليل أو مركز أشعة...' : 'Search lab networks / radiologies...'} />

 <NSecHeader title={AR ? 'الشبكة المعتمدة' : 'Accredited Centers'} />
 {network.filter((item) => `${item.name || ''} ${item.name_en || ''}`.toLowerCase().includes(search.toLowerCase())).length === 0 ? <NEmpty title={AR ? 'لا توجد جهات معتمدة' : 'No accredited destinations'} sub={AR ? 'ستظهر الجهات المعتمدة من الخادم هنا.' : 'Approved destinations returned by the server will appear here.'} icon="hospital" /> : network.filter((item) => `${item.name || ''} ${item.name_en || ''}`.toLowerCase().includes(search.toLowerCase())).map(item => (
 <TouchableOpacity key={item.id} onPress={() => setSelectedProviderId(item.id)}>
 <NCard style={{ marginBottom: SP.sm, borderColor: selectedProviderId === item.id ? theme.primary : theme.border }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text }}>{AR ? (item.name || item.name_en) : (item.name_en || item.name)}</Text>
 <NBadge label={item.type} variant={item.type === 'lab' ? 'primary' : 'success'} />
 </View>
 </NCard>
 </TouchableOpacity>
 ))}

 <NSecHeader title={AR ? 'حدد الفحوصات المطلوبة للتحويل' : 'Select Referral Catalog tests'} />
 <NCard style={{ gap: SP.md }}>
 {CATALOGUE.map(test => {
 const sel = selectedTests.includes(test.id);
 return (
 <TouchableOpacity key={test.id} onPress={() => handleToggleTest(test.id)}
 style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center', paddingVertical: SP.sm }}>
 <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: sel ? theme.primary : theme.border, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? theme.primary : 'transparent' }}>
 {sel && <I name="check" size={10} color="#FFF" />}
 </View>
 <Text style={{ fontSize: FS.sm, color: theme.text }}>{test.label}</Text>
 </TouchableOpacity>
 );
 })}
 </NCard>

 <NBtn label={AR ? ' توليد كود التحويل الرقمي' : ' Generate Digital Referral'} onPress={attemptGenerate} loading={loading} />

 {refCode && (
 <NCard style={{ backgroundColor: theme.successBg, borderColor: theme.success, alignItems: 'center', paddingVertical: SP.xl }}>
 <Text style={{ fontSize: FS.xs, color: theme.success }}>{AR ? 'كود التحويل الرقمي النشط' : 'Active Digital Referral Code'}</Text>
 <Text style={{ fontSize: FS['2xl'], fontWeight: '800', color: theme.success, marginVertical: SP.sm }}>{refCode}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: 'center' }}>
 {AR ? 'تم إرسال الكود للمريض برسالة نصية ومشاركته مع المختبر المختار.' 
 : 'Code sent to patient and shared with the selected laboratory network.'}
 </Text>
 </NCard>
 )}

 

 </View>
 </NScroll>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 4: EMERGENCY DISPATCHING
// ══════════════════════════════════════════════════════════════════════════════

// 4.1 EMERGENCY SOS DISPATCH & GPS ROUTER
export function SosDispatchScreen({ onBack, onNavigate }: { onBack: () => void; onNavigate: (s: string, p?: any) => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [activeSos, setActiveSos] = useState<any[]>([]);
 const [loadingSos, setLoadingSos] = useState(true);
 const [claiming, setClaiming] = useState<string | null>(null);

 const fetchActive = async () => {
   // Real active emergencies only — no demo broadcasts.
   try {
     const r = await client.get('/emergency/active');
     setActiveSos(Array.isArray(r.data) ? r.data : (r.data?.items || []));
   } catch { setActiveSos([]); } finally { setLoadingSos(false); }
 };
 useEffect(() => { fetchActive(); }, []);

 const triggerSos = async () => {
   // Real panic alert: provider's own identity (from JWT) + real GPS position.
   try {
     let location: any = undefined;
     try {
       const Location = require('expo-location');
       const { status } = await Location.requestForegroundPermissionsAsync();
       if (status === 'granted') {
         const pos = await Location.getCurrentPositionAsync({});
         location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
       }
     } catch { /* location optional */ }
     await client.post('/emergency/trigger', { location, severity: 'critical' });
     show(AR ? 'تم إرسال نداء الاستغاثة لمركز التحكم' : 'SOS Sent to Command Center', 'success');
   } catch (err) {
     show(AR ? 'حدث خطأ في الإرسال' : 'Error sending SOS', 'error');
   }
 };

 const claimSos = async (sos: any) => {
   const id = sos.id || sos._id;
   if (!id) return;
   setClaiming(id);
   try {
     await client.post(`/emergency/${id}/claim`, {});
     show(AR ? 'تم قبول النداء — الحالة الآن مسندة إليك' : 'SOS claimed — case assigned to you', 'success');
     onNavigate('gps_router', { emergency: sos });
   } catch (e: any) {
     show(e?.response?.data?.message || (AR ? 'تعذر قبول النداء' : 'Could not claim SOS'), 'error');
     fetchActive();
   } finally { setClaiming(null); }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'منصة الاستغاثة والطوارئ' : 'Emergency & SOS'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>

 <NCard style={{ backgroundColor: theme.danger + '22', borderColor: theme.danger, borderWidth: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.danger, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'هل تواجه حالة طوارئ؟' : 'Facing an emergency?'}
 </Text>
 <NBtn label={AR ? 'إرسال نداء استغاثة (SOS)' : 'Send SOS Alert'} style={{ marginTop: SP.md, backgroundColor: theme.danger }} onPress={triggerSos} />
 </NCard>

 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'نداءات الاستغاثة النشطة:' : 'Active SOS Cases:'}
 </Text>
 {loadingSos ? (
 <ActivityIndicator color={theme.primary} />
 ) : activeSos.length === 0 ? (
 <NCard>
 <Text style={{ color: theme.textSub, textAlign: 'center' }}>{AR ? 'لا توجد نداءات استغاثة نشطة حالياً.' : 'No active SOS cases right now.'}</Text>
 </NCard>
 ) : activeSos.map(sos => (
 <NCard key={sos.id || sos._id} style={{ gap: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{sos.patient_name || sos.title || (AR ? 'نداء استغاثة' : 'SOS Case')}</Text>
 <Text style={{ fontSize: FS.sm, color: theme.danger }}>{sos.state || sos.status || ''}</Text>
 </View>
 {!!(sos.symptoms) && (
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{sos.symptoms}</Text>
 )}
 <NBtn label={claiming === (sos.id || sos._id) ? (AR ? 'جارٍ القبول…' : 'Claiming…') : (AR ? 'قبول النداء والتحرك' : 'Accept & Dispatch')} onPress={() => claimSos(sos)} />
 </NCard>
 ))}
 </View>
 </NScroll>
 </View>
 );
}
export function GpsRouterScreen({ patient, onBack }: { patient: any; onBack: () => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 // Real claimed emergency passed from SosDispatchScreen — never demo data.
 const emergency = patient?.emergency;
 const emergencyId = emergency?.id || emergency?._id;

 const [started, setStarted] = useState(false);
 const [watchSub, setWatchSub] = useState<any>(null);

 const startTrip = async () => {
   if (!emergencyId) {
     show(AR ? 'لا توجد حالة طوارئ مسندة — اقبل نداء أولاً' : 'No assigned emergency — claim an SOS first', 'error');
     return;
   }
   try {
     const Location = require('expo-location');
     const { status } = await Location.requestForegroundPermissionsAsync();
     if (status !== 'granted') {
       show(AR ? 'إذن الموقع مطلوب للملاحة الحية' : 'Location permission is required for live routing', 'error');
       return;
     }
     // Push real unit GPS to the emergency record (ownership enforced server-side).
     const sub = await Location.watchPositionAsync(
       { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 50 },
       async (pos: any) => {
         try {
           await client.post(`/emergency/${emergencyId}/track`, {
             lat: pos.coords.latitude, lng: pos.coords.longitude,
           });
         } catch { /* transient network — keep watching */ }
       }
     );
     setWatchSub(sub);
     setStarted(true);
     show(AR ? 'تم بدء الرحلة — موقعك يُبث للمريض والمركز' : 'Trip started — your position is streamed', 'success');
   } catch (err) {
     show(AR ? 'حدث خطأ' : 'Error starting trip', 'error');
   }
 };

 const confirmArrival = async () => {
   try { watchSub?.remove?.(); } catch {}
   show(AR ? 'تم تسجيل الوصول للمريض بنجاح' : 'Arrival logged', 'success');
   onBack();
 };

 useEffect(() => () => { try { watchSub?.remove?.(); } catch {} }, [watchSub]);

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'خرائط الملاحة والطوارئ' : 'Emergency GPS Router'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>
 
 <NCard style={{ height: 280, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center', borderColor: theme.border, borderStyle: 'dashed', borderWidth: 2 }}>
 <I name="map" size={44} color={theme.textSub} />
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.md }}>
 {started ? (AR ? 'الملاحة نشطة — يتم بث موقعك الآن' : 'Navigation active — streaming your position') : (AR ? 'ابدأ الرحلة لتفعيل الملاحة الحية' : 'Start the trip to enable live routing')}
 </Text>
 {!!emergency?.location && (
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: SP.xs }}>
 {AR ? 'موقع الحالة:' : 'Case location:'} {emergency.location.lat?.toFixed?.(5)}, {emergency.location.lng?.toFixed?.(5)}
 </Text>
 )}
 </NCard>

 <NCard style={{ gap: SP.md }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'بيانات المريض وموقع الإسعاف' : 'Dispatch details'}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'المريض:' : 'Patient:'} {emergency?.patient_name || (AR ? '—' : '—')}
 </Text>
 {!!emergency?.patient_phone && (
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'الهاتف:' : 'Phone:'} {emergency.patient_phone}
 </Text>
 )}
 {!!emergency?.symptoms && (
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'الأعراض:' : 'Symptoms:'} {emergency.symptoms}
 </Text>
 )}
 </NCard>

 {!started ? (
   <NBtn label={AR ? 'بدء التحرك (Start Trip)' : 'Start Trip'} onPress={startTrip} />
 ) : (
   <NBtn label={AR ? ' تأكيد الوصول للمريض' : ' Confirm Arrival'} onPress={confirmArrival} />
 )}
 </View>
 </NScroll>
 </View>
 );
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 5: SPECIALIZED PROVIDER WORKFLOWS
// ══════════════════════════════════════════════════════════════════════════════

export function NurseVisitConsole({ onBack, onNavigate }: { onBack: () => void; onNavigate: (s: string, p?: any) => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title="Nurse Visit Console" onBack={onBack} />
      <NBtn label="Start Checklist" onPress={() => onNavigate('nurse_checklist')} style={{ margin: SP.lg }} />
    </View>
  );
}

export function NurseChecklistConsole({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title="Nurse Checklist Console" onBack={onBack} />
    </View>
  );
}

export function PharmacyBroadcastResponse({ onBack, broadcast }: { onBack: () => void; broadcast?: any }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [catalog, setCatalog] = useState<Record<string, any[]>>({});
  const [choices, setChoices] = useState<Record<string, any>>({});
  const [quote, setQuote] = useState<any>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [busy, setBusy] = useState(false);
  const orderId = broadcast?.order_id;
  const items = Array.isArray(broadcast?.items) ? broadcast.items : [];

  const loadCatalog = useCallback(async () => {
    if (!orderId || !items.length) return;
    setLoadingCatalog(true);
    try {
      const rows = await Promise.all(items.map(async (item: any) => {
        const q = item.matched_sku || item.generic_name || item.name_ar || item.name_en || '';
        const response = await client.get('/provider/inventory/search', { params: { q } });
        return [item.order_item_id, Array.isArray(response.data) ? response.data : []] as const;
      }));
      setCatalog(Object.fromEntries(rows));
    } catch {
      show(AR ? 'تعذر تحميل كتالوج الصيدلية. لم يتم إنشاء أي عرض.' : 'Catalog loading failed. No offer was created.', 'error');
    } finally {
      setLoadingCatalog(false);
    }
  }, [orderId, items.length, AR, show]);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const offerItems = () => items.map((item: any) => {
    const choice = choices[item.order_item_id] || { availability: 'unavailable' };
    return {
      order_item_id: item.order_item_id,
      availability: choice.availability,
      qty_offered: choice.qty_offered,
      inventory_item_id: choice.availability === 'available' ? choice.inventory_item_id : undefined,
      substitute_inventory_item_id: choice.availability === 'substitute' ? choice.inventory_item_id : undefined,
    };
  });

  const preview = async () => {
    if (!orderId) return;
    setBusy(true);
    try {
      const response = await client.post(`/provider/pharmacy/broadcasts/${orderId}/offers/preview`, { items: offerItems() });
      setQuote(response.data);
      show(AR ? 'تم احتساب المعاينة من الخادم' : 'Server quote preview calculated', 'success');
    } catch (error: any) {
      setQuote(null);
      show(error?.response?.data?.message || (AR ? 'تعذر احتساب المعاينة' : 'Quote preview failed'), 'error');
    } finally { setBusy(false); }
  };

  const saveDraft = async () => {
    if (!orderId || !quote) {
      show(AR ? 'احسب المعاينة الخادمية أولاً' : 'Calculate a server quote preview first', 'error');
      return;
    }
    setBusy(true);
    try {
      const draft = await client.post(`/provider/pharmacy/broadcasts/${orderId}/offers/draft`, { items: offerItems() });
      setQuote({ ...quote, draft: draft.data });
      show(AR ? 'حُفظت مسودة العرض؛ السعر والمخزون حددهما الخادم' : 'Offer draft saved; price and stock came from the server.', 'success');
    } catch (error: any) {
      show(error?.response?.data?.message || (AR ? 'تعذر حفظ المسودة' : 'Saving draft failed'), 'error');
    } finally { setBusy(false); }
  };

  const submit = async () => {
    if (!orderId || !quote?.draft?.id) {
      show(AR ? 'احفظ المسودة أولاً' : 'Save a draft first', 'error');
      return;
    }
    setBusy(true);
    try {
      await client.post(`/provider/pharmacy/broadcasts/${orderId}/offers/${quote.draft.id}/submit`);
      show(AR ? 'تم إرسال العرض للمريض للاختيار الصريح' : 'Offer submitted for explicit patient selection', 'success');
      onBack();
    } catch (error: any) {
      show(error?.response?.data?.message || (AR ? 'تعذر إرسال العرض' : 'Submitting offer failed'), 'error');
    } finally { setBusy(false); }
  };

  if (!orderId) return <View style={{ flex: 1, backgroundColor: theme.bg }}><NHeader title={AR ? 'عرض الصيدلية' : 'Pharmacy offer'} onBack={onBack} /><NEmpty icon="document" title={AR ? 'لا يوجد بث مخوّل' : 'No authorized broadcast'} sub={AR ? 'ارجع إلى الرادار واختر بثاً مُخَوَّلاً.' : 'Return to the radar and choose an authorized broadcast.'} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'مؤلف عرض صيدلية' : 'Pharmacy offer composer'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: SP.xxl, gap: SP.md }}>
        <NCard><Text style={{ color: theme.text, fontWeight: FW.bold }}>{AR ? `بث #${orderId.slice(-6)}` : `Broadcast #${orderId.slice(-6)}`}</Text><Text style={{ color: theme.textSub, marginTop: SP.xs }}>{AR ? 'اختر فقط عناصر من كتالوج الصيدلية. لا تُدخل الأسعار أو رسوم التوصيل أو وقت الوصول يدوياً.' : 'Bind only pharmacy catalog items. Prices, delivery fees, and ETA are never entered here.'}</Text></NCard>
        {loadingCatalog && <ActivityIndicator color={theme.primary} />}
        {items.map((item: any) => {
          const selected = choices[item.order_item_id] || { availability: 'unavailable' };
          const options = catalog[item.order_item_id] || [];
          return <NCard key={item.order_item_id} style={{ gap: SP.sm }}>
            <Text style={{ color: theme.text, fontWeight: FW.bold }}>{item.qty_requested}× {item.name_ar || item.name_en || item.matched_sku}</Text>
            <View style={{ flexDirection: 'row', gap: SP.xs, flexWrap: 'wrap' }}>
              {(['available', 'substitute', 'unavailable'] as const).map((availability) => <NBtn key={availability} label={availability === 'available' ? (AR ? 'متوفر' : 'Available') : availability === 'substitute' ? (AR ? 'بديل' : 'Substitute') : (AR ? 'غير متوفر' : 'Unavailable')} variant={selected.availability === availability ? 'primary' : 'outline'} onPress={() => { setChoices(prev => ({ ...prev, [item.order_item_id]: { ...prev[item.order_item_id], availability } })); setQuote(null); }} />)}
            </View>
            {selected.availability !== 'unavailable' && <>
              <Text style={{ color: theme.textSub, fontSize: FS.xs }}>{AR ? 'اختر عنصر الكتالوج الذي سيتحقق منه الخادم:' : 'Choose a catalog item for server validation:'}</Text>
              {options.map((stock: any) => <TouchableOpacity key={stock.id} onPress={() => { setChoices(prev => ({ ...prev, [item.order_item_id]: { availability: selected.availability, inventory_item_id: stock.id, qty_offered: Math.min(Number(item.qty_requested || 1), Number(stock.stock || 0)) } })); setQuote(null); }} style={{ padding: SP.sm, borderWidth: 1, borderRadius: R.md, borderColor: selected.inventory_item_id === stock.id ? theme.primary : theme.border }}><Text style={{ color: theme.text }}>{stock.name_ar || stock.name_en || stock.sku} · {AR ? 'المتاح' : 'Stock'}: {stock.stock}</Text></TouchableOpacity>)}
              {selected.inventory_item_id && <NInput label={AR ? 'الكمية المقدمة' : 'Quantity offered'} value={String(selected.qty_offered || '')} kbType="number-pad" onChange={(value: string) => { const max = Number((options.find((stock: any) => stock.id === selected.inventory_item_id) || {}).stock || 0); const qty = Math.max(1, Math.min(Number(item.qty_requested || 1), max, Number(value || 0))); setChoices(prev => ({ ...prev, [item.order_item_id]: { ...prev[item.order_item_id], qty_offered: qty } })); setQuote(null); }} />}
            </>}
          </NCard>;
        })}
        <NCard><Text style={{ color: theme.text, fontWeight: FW.bold }}>{AR ? 'التسليم' : 'Fulfillment'}</Text><Text style={{ color: theme.textSub }}>{AR ? 'لا توجد سياسة تسليم خادمية مفعّلة حالياً؛ لذلك لا يُقبل خيار أو رسوم أو ETA من الواجهة.' : 'No server delivery policy is active; the interface cannot set an option, fee, or ETA.'}</Text></NCard>
        {quote && <NCard><Text style={{ color: theme.text, fontWeight: FW.bold }}>{AR ? 'معاينة خادمية' : 'Server quote preview'}</Text><Text style={{ color: theme.text }}>{AR ? `الإجمالي: ${quote.totals?.total ?? '—'} ${quote.totals?.currency ?? ''}` : `Total: ${quote.totals?.total ?? '—'} ${quote.totals?.currency ?? ''}`}</Text><Text style={{ color: theme.textSub }}>{AR ? `صالحة للمسودة لمدة ${quote.quote_ttl_seconds ?? 600} ثانية` : `Draft quote TTL: ${quote.quote_ttl_seconds ?? 600} seconds`}</Text><Text style={{ color: theme.textSub }}>{quote.fulfillment?.policy_status === 'unavailable_read_only' ? (AR ? 'سياسة التسليم غير متاحة للقراءة فقط.' : 'Delivery policy unavailable (read-only).') : ''}</Text></NCard>}
        <NBtn label={busy ? (AR ? 'جارٍ المعالجة…' : 'Working…') : (AR ? 'معاينة خادمية' : 'Server quote preview')} disabled={busy} onPress={preview} />
        <NBtn label={AR ? 'حفظ المسودة' : 'Save draft'} variant="secondary" disabled={busy || !quote} onPress={saveDraft} />
        <NBtn label={AR ? 'إرسال العرض للاختيار' : 'Submit for patient selection'} disabled={busy || !quote?.draft?.id} onPress={submit} />
      </ScrollView>
    </View>
  );
}

export function InventoryExpiryMonitor({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title="Inventory Expiry Monitor" onBack={onBack} />
    </View>
  );
}

export function LabSampleScannerScreen({ onBack, onNavigate }: { onBack: () => void; onNavigate?: (s: string, p?: any) => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [barcode, setBarcode] = useState('');
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const fetchSamples = useCallback(async () => {
    try {
      const res = await client.get('/labs/samples');
      setSamples(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSamples([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSamples(); }, [fetchSamples]);

  const q = barcode.trim().toLowerCase();
  const matches = q
    ? samples.filter((s: any) =>
        String(s.barcode || '').toLowerCase().includes(q) ||
        String(s.id || '').toLowerCase().includes(q))
    : samples;

  const startAnalysis = async (sam: any) => {
    setBusy(true);
    try {
      await client.patch(`/labs/samples/${sam.id}/stage`, { stage: 'analyzing' });
      show(AR ? 'بدأ تحليل العينة' : 'Sample analysis started', 'success');
      fetchSamples();
    } catch {
      show(AR ? 'تعذر تحديث العينة' : 'Could not update sample', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'ماسح العينات (باركود)' : 'Sample Barcode Scanner'} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: SP.xl, paddingBottom: 60 }}>
        <NInput
          label={AR ? 'أدخل رقم الباركود أو معرف العينة' : 'Enter barcode or sample ID'}
          placeholder="SMP-…"
          value={barcode}
          onChange={setBarcode}
          icon="scan"
        />
        {loading ? (
          <Text style={{ color: theme.textSub, textAlign: 'center', marginTop: SP.xl, fontSize: FS.sm }}>
            {AR ? 'جاري تحميل العينات...' : 'Loading samples...'}
          </Text>
        ) : matches.length === 0 ? (
          <Text style={{ color: theme.textSub, textAlign: 'center', marginTop: SP.xl, fontSize: FS.sm }}>
            {AR ? 'لا توجد عينات مطابقة' : 'No matching samples'}
          </Text>
        ) : matches.map((sam: any) => (
          <NCard key={sam.id} style={{ marginTop: SP.lg }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.sm }}>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{sam.barcode || sam.id}</Text>
              <NBadge label={String(sam.stage || '')} variant="info" size="xs" />
            </View>
            {!!sam.patient_name && (
              <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{sam.patient_name}</Text>
            )}
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginTop: SP.md }}>
              {!['analyzing', 'result_ready', 'result_uploaded'].includes(sam.stage) && (
                <NBtn label={AR ? 'بدء التحليل' : 'Start Analysis'} size="sm" disabled={busy} onPress={() => startAnalysis(sam)} style={{ flex: 1 }} />
              )}
              {sam.stage === 'analyzing' && onNavigate && (
                <NBtn label={AR ? 'إدخال النتائج' : 'Enter Results'} size="sm" disabled={busy} onPress={() => onNavigate('result_entry', sam)} style={{ flex: 1 }} />
              )}
            </View>
          </NCard>
        ))}
      </ScrollView>
    </View>
  );
}

const _styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SP.xl },
  filterBadge: { paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: R.md, borderWidth: 1 }
});

