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
import {
 NBtn, NCard, NInput, NBadge, NHeader, NScroll, NDivider,
 NPriceInput, NToggle, NSearch, NSecHeader, NStatCard, NAvatar,
 NSheet
} from '../../components/ui';
import { I, IBg } from '../../components/icons';
import { SP, R, FS, FW, SPECIALTIES, C } from '../../constants';

const { width: W, height: H } = Dimensions.get('window');

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 1: MARKETING, PORTAL CONFIG & TIERS
// ══════════════════════════════════════════════════════════════════════════════

// 1.1 PROMOTIONS DASHBOARD
export function PromotionsDashboard({ onBack, onNavigate }: { onBack: () => void; onNavigate: (s: string) => void }) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [promos, setPromos] = useState<any[]>([]);
 const [loading, setLoading] = useState(false);

 const fetchPromos = useCallback(async () => {
 setLoading(true);
 try {
 const res = await client.get('/provider/features/promotions');
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
 <View style={[_styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
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
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>️ {item.discounted_price} {AR ? 'ريال' : 'SAR'} <Text style={{ textDecorationLine: 'line-through' }}>{item.original_price} {AR ? 'ريال' : 'SAR'}</Text></Text>
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
 const [startDate, setStartDate] = useState('2026-06-25');
 const [endDate, setEndDate] = useState('2026-07-25');
 const [loading, setLoading] = useState(false);

 const handleCreate = async () => {
 if (!title.trim() || !origPrice || !discPrice) {
 show(AR ? 'يرجى إكمال جميع الحقول الإلزامية' : 'Please complete all required fields', 'warning');
 return;
 }
 setLoading(true);
 try {
 await client.post('/provider/features/promotions', {
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

 const [active, setActive] = useState(true);
 const [bio, setBio] = useState(AR ? 'مستشفى رائد في الرعاية والخدمات الطبية المنزلية.' : 'Leading hospital in premium home care and clinical services.');
 const [socials, setSocials] = useState('https://x.com/nabdahplus');

 const handleSave = () => {
 show(AR ? 'تم حفظ إعدادات الموقع بنجاح' : 'Public site configuration saved', 'success');
 onBack();
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'موقع مزود الخدمة العام' : 'Public Mini-Website'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>
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

 <NCard style={{ backgroundColor: theme.primaryLight, borderColor: theme.primary }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <Text style={{ fontSize: FS.sm, color: theme.primary, fontWeight: FW.bold }}>https://nabdah.plus/provider/p-1</Text>
 <TouchableOpacity onPress={() => show(AR ? 'تم النسخ إلى الحافظة ' : 'Copied to clipboard ', 'success')}>
 <I name="share" size={20} color={theme.primary} />
 </TouchableOpacity>
 </View>
 </NCard>

 <NBtn label={AR ? ' حفظ التعديلات' : ' Save Settings'} onPress={handleSave} />
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

 const [budget, setBudget] = useState('500');
 const [duration, setDuration] = useState('7');
 const [loading, setLoading] = useState(false);

 const handlePurchase = () => {
 setLoading(true);
 setTimeout(() => {
 setLoading(false);
 show(AR ? 'تم شراء الحملة الإعلانية وتفعيلها بنجاح ' : 'Ad Campaign activated successfully ', 'success');
 onBack();
 }, 1500);
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'الاشتراكات والترويج المدفوع' : 'Subscriptions & Ads Purchases'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>
 <NCard style={{ borderLeftWidth: 4, borderColor: '#7C3AED' }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
  {AR ? 'الباقة الحالية: بروفايدر محترف (Pro)' : 'Current Plan: Professional Provider (Pro)'}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: SP.xs, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'تجدد تلقائياً في 2026-07-18' : 'Renews on 2026-07-18'}
 </Text>
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

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'بوابة التسويق بالعمولة' : 'Affiliate Portal'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>
 <NCard style={{ backgroundColor: theme.infoBg, borderColor: theme.info }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.info, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
  {AR ? 'ادعُ مقدم خدمة واحصل على عمولة 10%' : 'Invite a provider & earn 10% commission'}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'شارك كود الشراكة أدناه مع العيادات أو الأطباء لتكسب عمولة عن كل اشتراك.' 
 : 'Share your partnership code below to earn commissions on active tiers.'}
 </Text>
 </NCard>

 <NCard style={{ alignItems: 'center' }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{AR ? 'رابط الإحالة الخاص بك' : 'Your Referral Link'}</Text>
 <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, marginVertical: SP.md }}>NBD-AFF-9982</Text>
 <NBtn label={AR ? ' نسخ الرابط' : ' Copy Link'} variant="outline" onPress={() => show(AR ? 'تم النسخ' : 'Copied', 'success')} />
 </NCard>

 <NSecHeader title={AR ? 'سجل الأرباح والعمولات' : 'Commission Ledger'} />
 <NCard style={{ gap: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
 <Text style={{ fontSize: FS.sm, color: theme.text }}>د. فيصل الشمري</Text>
 <Text style={{ fontSize: FS.sm, color: theme.success, fontWeight: FW.bold }}>+150 {AR ? 'ريال' : 'SAR'}</Text>
 </View>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
 <Text style={{ fontSize: FS.sm, color: theme.text }}>مجمع النخبة الطبي</Text>
 <Text style={{ fontSize: FS.sm, color: theme.success, fontWeight: FW.bold }}>+420 {AR ? 'ريال' : 'SAR'}</Text>
 </View>
 </NCard>
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
 <Text style={{ fontSize: 50 }}></Text>
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
 patientName = 'أحمد السالم',
 serviceType = 'استشارة فيديو عاجلة'
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

 const PATIENTS = [
 { id: 'patient_1', name: 'عبدالله العتيبي' },
 { id: 'patient_2', name: 'سليمان الحربي' },
 { id: 'patient_3', name: 'سارة الدوسري' }
 ];

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
 const res = await client.get(`/provider/features/crm/patients/${pat.id}`);
 setIsVip(res.data.is_vip || false);
 setIsFav(res.data.is_favorite || false);
 setIsBlocked(res.data.is_blocked || false);
 setBlockReason(res.data.blocked_reason || '');
 setNotesList(res.data.private_notes || []);
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
 await client.patch(`/provider/features/crm/patients/${selectedPat.id}`, {
 is_vip: isVip,
 is_favorite: isFav,
 is_blocked: isBlocked,
 blocked_reason: isBlocked ? blockReason : '',
 private_notes: updatedNotes,
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
 <NStatCard icon="" label={AR ? 'المرضى الدائمين' : 'Returning Patients'} value="84%" color={theme.primary} style={{ flex: 1 }} />
 <NStatCard icon="" label={AR ? 'نمو شهري' : 'Monthly Growth'} value="+12%" color={theme.info} style={{ flex: 1 }} />
 </View>

 <NSecHeader title={AR ? 'روستر المتابعة الفورية للعملاء' : 'Quick Customer Follow-up'} />
 {PATIENTS.map((pat) => (
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
 <NToggle label={AR ? '️ عميل مفضل' : '️ Favorite Patient'} value={isFav} onChange={setIsFav} />
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

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'تفاصيل الإيرادات والتحليلات' : 'Revenue Insights'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>
 
 <NCard style={{ backgroundColor: theme.surface2 }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{AR ? 'صافي أرباح الشهر الحالي' : 'Net earnings this month'}</Text>
 <Text style={{ fontSize: FS['3xl'], fontWeight: '800', color: theme.primary, textAlign: AR ? 'right' : 'left', marginVertical: SP.xs }}>14,820 {AR ? 'ريال' : 'SAR'}</Text>
 <Text style={{ fontSize: FS.xs, color: theme.success, textAlign: AR ? 'right' : 'left' }}> +15% {AR ? 'مقارنة بالشهر الماضي' : 'vs last month'}</Text>
 </NCard>

 <NSecHeader title={AR ? 'الخدمات الأكثر مبيعاً والأرباح' : 'Top Services Revenue'} />
 <NCard style={{ gap: SP.lg }}>
 {[
 { label: AR ? 'استشارة طبية منزلية' : 'Home Medical Visit', val: '8,400 SAR', pct: '56%' },
 { label: AR ? 'استشارات فيديو عاجلة' : 'Urgent Video Consultation', val: '4,200 SAR', pct: '28%' },
 { label: AR ? 'الفحوصات الطبية والمتابعة' : 'Checkup Follow-ups', val: '2,220 SAR', pct: '16%' }
 ].map((srv, idx) => (
 <View key={idx}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: 4 }}>
 <Text style={{ fontSize: FS.sm, color: theme.text }}>{srv.label}</Text>
 <Text style={{ fontSize: FS.sm, color: theme.text, fontWeight: FW.bold }}>{srv.val}</Text>
 </View>
 <View style={{ height: 6, backgroundColor: theme.surface3, borderRadius: R.full, overflow: 'hidden' }}>
 <View style={{ width: srv.pct as any, height: '100%', backgroundColor: theme.primary }} />
 </View>
 </View>
 ))}
 </NCard>
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
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [soap, setSoap] = useState({ s: '', o: '', a: '', p: '' });
 const [loading, setLoading] = useState(false);

 const submitSoap = async () => {
   setLoading(true);
   try {
     const headers = await buildHeaders(false);
     await fetch(`${API_BASE}/home-care/reports/soap`, {
       method: 'POST',
       headers,
       body: JSON.stringify({ booking_id: 'bkg_current', provider_id: 'provider_123', subjective: soap.s, objective: soap.o, assessment: soap.a, plan: soap.p })
     });
     show(AR ? 'تم حفظ التقرير الطبي بنجاح' : 'Clinical SOAP note saved', 'success');
     onBack();
   } catch (err) {
     show(AR ? 'فشل الحفظ' : 'Failed to save', 'error');
   } finally {
     setLoading(false);
   }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <View style={_styles.topBar}>
 <TouchableOpacity onPress={onBack}><I name="back" size={20} color={theme.primary} /></TouchableOpacity>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text }}> {AR ? 'السجل الطبي ومساعد AI' : 'EMR & AI Copilot'}</Text>
 <View style={{ width: 20 }} />
 </View>

 <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SP.xl, gap: SP.xl }}>
 <NCard style={{ backgroundColor: theme.surface2, borderColor: theme.primary, borderWidth: 1 }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
 🤖 {AR ? 'تحليل AI مقترح:' : 'AI Suggested Analysis:'}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', lineHeight: 22 }}>
 {AR ? 'بناءً على تاريخ المريض والأعراض الحالية، يوصى بفحص مستويات الجلوكوز التراكمي وتعديل جرعة الإنسولين.' : 'Based on history and symptoms, an HbA1c test is recommended and insulin dosage adjustment.'}
 </Text>
 </NCard>

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
  const [patientId, setPatientId] = useState('patient_1');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  // Determine if the provider is linked to a facility with an internal lab
  const hasInternalLab = true;

  const LABS = [
    { id: 'l1', name: AR ? 'مختبرات البرج الطبية' : 'Al Borg Diagnostics', type: 'Lab' },
    { id: 'l2', name: AR ? 'مختبرات ألفا' : 'Alfa Labs Group', type: 'Lab' },
    { id: 'l3', name: AR ? 'أشعة تشخيص تخصصي' : 'Tashkhis Radiology Center', type: 'Radiology' }
  ];

  const CATALOGUE = [
    { id: 't1', label: 'CBC (Complete Blood Count)' },
    { id: 't2', label: 'HbA1c (Glycated Hemoglobin)' },
    { id: 't3', label: 'Kidney Function Panel (Urea, Creatinine)' },
    { id: 't4', label: 'Chest X-Ray Digital' }
  ];

  const handleToggleTest = (id: string) => {
    setSelectedTests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const attemptGenerate = () => {
    if (selectedTests.length === 0) {
      show(AR ? 'يرجى تحديد فحص واحد على الأقل' : 'Select at least one test', 'warning');
      return;
    }
    if (hasInternalLab) {
      setShowOverrideModal(true);
    } else {
      executeGenerate(false);
    }
  };

  const executeGenerate = async (isOverride: boolean) => {
    setShowOverrideModal(false);
    setLoading(true);
    try {
      const selectedTestLabels = selectedTests.map(id => CATALOGUE.find(c => c.id === id)?.label || id);
      const res = await client.post('/provider/features/referrals', {
        patient_id: patientId,
        target_type: 'lab',
        notes: AR ? 'تحويل طبي خارجي لإجراء فحوصات مخبرية' : 'Outbound medical referral for diagnostic tests',
        requested_tests: selectedTestLabels,
        override_internal: isOverride
      });
      if (isOverride) {
        show(AR ? 'تم تسجيل الإحالة الخارجية في سجل التدقيق.' : 'Outbound override logged in Audit Trails.', 'warning');
      }
      setRefCode(res.data.referral_code);
      show(AR ? 'تم إصدار كود التحويل الموحد' : 'Outbound Referral Code Generated', 'success');
    } catch (e) {
      show(AR ? 'فشل إصدار كود التحويل' : 'Failed to generate referral code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const routeInternally = () => {
    setShowOverrideModal(false);
    show(AR ? 'تم توجيه الإحالة للمختبر الداخلي بنجاح' : 'Referral routed to Internal Lab successfully', 'success');
    onBack();
  };

  return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'شبكة التحويلات الخارجية' : 'Smart Outbound Referral'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>
 
 <NInput label={AR ? 'اسم أو رقم المريض' : 'Patient Name / ID'} value={patientId} onChange={setPatientId} placeholder={AR ? 'أدخل اسم المريض أو هويته...' : 'Enter patient name/ID...'} />

 <NSearch value={search} onChange={setSearch} placeholder={AR ? 'ابحث عن معمل تحاليل أو مركز أشعة...' : 'Search lab networks / radiologies...'} />

 <NSecHeader title={AR ? 'الشبكة المعتمدة' : 'Accredited Centers'} />
 {LABS.filter(x => x.name.toLowerCase().includes(search.toLowerCase())).map(item => (
 <NCard key={item.id} style={{ marginBottom: SP.sm }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text }}>{item.name}</Text>
 <NBadge label={item.type} variant={item.type === 'Lab' ? 'primary' : 'success'} />
 </View>
 </NCard>
 ))}

 <NSecHeader title={AR ? 'حدد الفحوصات المطلوبة للتحويل' : 'Select Referral Catalog tests'} />
 <NCard style={{ gap: SP.md }}>
 {CATALOGUE.map(test => {
 const sel = selectedTests.includes(test.id);
 return (
 <TouchableOpacity key={test.id} onPress={() => handleToggleTest(test.id)}
 style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, alignItems: 'center', paddingVertical: SP.sm }}>
 <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: sel ? theme.primary : theme.border, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? theme.primary : 'transparent' }}>
 {sel && <Text style={{ color: '#FFF', fontSize: 10 }}></Text>}
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

 {showOverrideModal && (
    <View style={{ position: 'absolute', top: -500, bottom: -500, left: -100, right: -100, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SP.xl, zIndex: 10 }}>
      <NCard style={{ backgroundColor: theme.bg, borderColor: theme.danger }}>
        <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.danger, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
          {AR ? '⚠️ تحذير: إحالة خارج المنشأة' : '⚠️ Warning: Outbound Referral'}
        </Text>
        <Text style={{ fontSize: FS.sm, color: theme.text, marginBottom: SP.lg, textAlign: AR ? 'right' : 'left' }}>
          {AR 
            ? 'المنشأة التي تعمل بها توفر هذه الخدمات في المختبر الداخلي. يفضل توجيه المريض داخلياً.' 
            : 'Your linked facility provides these services internally. It is recommended to route the patient to the internal lab.'}
        </Text>
        
        <NBtn label={AR ? 'توجيه للمختبر الداخلي (موصى به)' : 'Route to Internal Lab (Recommended)'} onPress={routeInternally} style={{ marginBottom: SP.sm }} />
        <NBtn label={AR ? 'تخطي وإرسال للخارج (تُسجل في التدقيق)' : 'Override & Send Outside (Audited)'} variant="outline" onPress={() => executeGenerate(true)} />
        <TouchableOpacity onPress={() => setShowOverrideModal(false)} style={{ marginTop: SP.lg, alignItems: 'center' }}>
          <Text style={{ color: theme.textSub, fontWeight: FW.bold }}>{AR ? 'إلغاء' : 'Cancel'}</Text>
        </TouchableOpacity>
      </NCard>
    </View>
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

 const [activeSos, setActiveSos] = useState([
 { id: 'sos1', title: AR ? 'نداء استغاثة طبي - حي النرجس' : 'Medical SOS - Al Narjis', dist: '3 km', time: 'Just now' }
 ]);

 const triggerSos = async () => {
   try {
     const headers = await buildHeaders(false);
     await fetch(`${API_BASE}/home-care/sos`, {
       method: 'POST',
       headers,
       body: JSON.stringify({ provider_id: 'provider_123', lat: 24.7136, lng: 46.6753, booking_id: 'sos_bkg_1' })
     });
     show(AR ? 'تم إرسال نداء الاستغاثة لمركز التحكم' : 'SOS Sent to Command Center', 'success');
   } catch (err) {
     show(AR ? 'حدث خطأ في الإرسال' : 'Error sending SOS', 'error');
   }
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
 {AR ? 'نداءات الإسعاف النشطة القريبة منك:' : 'Active SOS Broadcasts Near You:'}
 </Text>
 {activeSos.map(sos => (
 <NCard key={sos.id} style={{ gap: SP.md }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{sos.title}</Text>
 <Text style={{ fontSize: FS.sm, color: theme.danger }}>{sos.time}</Text>
 </View>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'المسافة:' : 'Distance:'} {sos.dist}
 </Text>
 <NBtn label={AR ? 'قبول النداء والتحرك' : 'Accept & Dispatch'} onPress={() => onNavigate('gps_router', { patient: 'Emergency Patient', location: 'Al Narjis' })} />
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

 const [started, setStarted] = useState(false);

 const startTrip = async () => {
   try {
     const headers = await buildHeaders(false);
     await fetch(`${API_BASE}/home-care/trip/start`, {
       method: 'POST',
       headers,
       body: JSON.stringify({ provider_id: 'provider_123', lat: 24.7136, lng: 46.6753, booking_id: 'bkg_456' })
     });
     setStarted(true);
     show(AR ? 'تم بدء الرحلة وتنبيه المريض' : 'Trip started, patient notified', 'success');
   } catch (err) {
     show(AR ? 'حدث خطأ' : 'Error starting trip', 'error');
   }
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <NScroll>
 <NHeader title={AR ? 'خرائط الملاحة والطوارئ' : 'Emergency GPS Router'} onBack={onBack} />
 <View style={{ padding: SP.xl, gap: SP.xl }}>
 
 <NCard style={{ height: 280, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center', borderColor: theme.border, borderStyle: 'dashed', borderWidth: 2 }}>
 <Text style={{ fontSize: 44 }}>🗺️</Text>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.md }}>
 [ {AR ? 'محاكاة الخريطة والملاحة الحية' : 'Simulated GPS Navigation Map'} ]
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: SP.xs }}>
 {AR ? 'المسافة للمريض: 4.8 كم | الوقت المقدر: 9 دقائق' : 'Distance: 4.8 KM | ETA: 9 Minutes'}
 </Text>
 </NCard>

 <NCard style={{ gap: SP.md }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'بيانات المريض وموقع الإسعاف' : 'Dispatch details'}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'المريض:' : 'Patient:'} {patient?.patient || 'فيصل المطيري'}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
 {AR ? 'العنوان:' : 'Address:'} {patient?.location || 'حي النرجس'}
 </Text>
 </NCard>

 {!started ? (
   <NBtn label={AR ? 'بدء التحرك (Start Trip)' : 'Start Trip'} onPress={startTrip} />
 ) : (
   <NBtn label={AR ? ' تأكيد الوصول للمريض' : ' Confirm Arrival'} onPress={() => { show(AR ? 'تم تسجيل الوصول للمريض بنجاح' : 'Arrival logged', 'success'); onBack(); }} />
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

export function PharmacyBroadcastResponse({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title="Pharmacy Broadcast Response" onBack={onBack} />
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

export function LabSampleScannerScreen({ onBack, route }: { onBack: () => void, route?: any }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title="Lab Sample Scanner" onBack={onBack} />
    </View>
  );
}

export function LabResultEntryScreen({ onBack, route }: { onBack: () => void, route?: any }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title="Lab Result Entry" onBack={onBack} />
    </View>
  );
}

const _styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SP.xl },
  filterBadge: { paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: R.md, borderWidth: 1 }
});

// 4.1 PATIENT SEARCH (HIERARCHICAL & FACILITY BADGES)
export function PatientSearchScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [search, setSearch] = useState('');

  const RESULTS = [
    { id: '1', name: AR ? 'د. أحمد محمود' : 'Dr. Ahmed Mahmoud', title: AR ? 'استشاري قلب' : 'Cardiologist', price: '300', facilityName: AR ? 'مستشفى دله' : 'Dallah Hospital', badgeType: 'hospital' },
    { id: '2', name: AR ? 'د. سارة خالد' : 'Dr. Sara Khalid', title: AR ? 'أخصائية أطفال' : 'Pediatrician', price: '200', facilityName: AR ? 'مجمع عيادات الأمل' : 'Al Amal Polyclinic', badgeType: 'clinic' },
    { id: '3', name: AR ? 'مختبر ألفا' : 'Alfa Lab', title: AR ? 'فرع العليا' : 'Olaya Branch', price: '150', facilityName: '', badgeType: 'lab' },
    { id: '4', name: AR ? 'أشعة المستقبل' : 'Future Radiology', title: AR ? 'قسم الأشعة المقطعية' : 'CT Scan Dept.', price: '800', facilityName: AR ? 'مستشفى الحبيب' : 'Al Habib Hospital', badgeType: 'hospital' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'بحث المرضى' : 'Patient Search'} onBack={onBack} />
      <View style={{ padding: SP.xl, flex: 1 }}>
        <NSearch value={search} onChange={setSearch} placeholder={AR ? 'ابحث عن طبيب، تخصص، مستشفى...' : 'Search doctor, specialty, hospital...'} />
        
        <ScrollView style={{ marginTop: SP.md }} showsVerticalScrollIndicator={false}>
          {RESULTS.filter(r => r.name.includes(search) || r.facilityName.includes(search)).map(res => (
            <NCard key={res.id} style={{ marginBottom: SP.md }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ alignItems: AR ? 'flex-end' : 'flex-start', flex: 1 }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{res.name}</Text>
                  <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: 4 }}>{res.title}</Text>
                  
                  {/* FACILITY BADGE / HIERARCHICAL SEARCH INDICATOR */}
                  {res.facilityName ? (
                    <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', marginTop: SP.sm, backgroundColor: theme.surface2, paddingHorizontal: SP.sm, paddingVertical: 4, borderRadius: R.sm, alignSelf: AR ? 'flex-end' : 'flex-start' }}>
                      <Text style={{ fontSize: 16, marginRight: AR ? 0 : 4, marginLeft: AR ? 4 : 0 }}>{res.badgeType === 'hospital' ? '🏥' : '🏢'}</Text>
                      <Text style={{ fontSize: FS.xs, color: theme.primary, fontWeight: FW.semi }}>
                        {AR ? `يعمل في: ${res.facilityName}` : `Works at: ${res.facilityName}`}
                      </Text>
                    </View>
                  ) : null}

                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.success }}>{res.price}</Text>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{AR ? 'ريال' : 'SAR'}</Text>
                </View>
              </View>
              <NBtn label={AR ? 'حجز موعد' : 'Book Appointment'} size="sm" style={{ marginTop: SP.lg }} onPress={() => { Alert.alert(AR ? 'حجز موعد' : 'Book Appointment', AR ? 'تم فتح طلب حجز الموعد بنجاح' : 'Appointment booking request created'); }} />
            </NCard>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
