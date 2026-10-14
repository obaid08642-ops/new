/**
 * Pharmacy "More" tab (P1) and first-login checklist (P9).
 * Navigation only: every row opens a screen already registered in PharmacyDashboardNavigator.
 * The checklist reads existing endpoints (no new ones):
 *   GET /provider/working-hours, GET /provider/profile, GET /provider-onboarding/progress,
 *   GET /provider/capabilities/pharmacy (stock), GET /provider/bank-account.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme, useLang, useAuth } from '../../context';
import { NCard, NHeader, NSecHeader, NSettingsRow, NBadge } from '../../components/ui';
import { I } from '../../components/icons';
import { SP, FS, FW } from '../../constants';
import client from '../../api/client';

export type PharmacyNavigate = (screen: string, param?: unknown) => void;

type MenuRow = { icon: string; route: string; ar: string; en: string };
type MenuSection = { ar: string; en: string; rows: MenuRow[] };

// Order follows the daily work: stock, orders and insurance, money, store, growth tools.
export const PHARMACY_MENU: MenuSection[] = [
  {
    ar: 'المخزون', en: 'Stock',
    rows: [
      { icon: 'pill', route: 'product_catalog', ar: 'المخزون والكتالوج', en: 'Inventory & catalogue' },
      { icon: 'scan', route: 'scanner', ar: 'ماسح الباركود', en: 'Barcode scanner' },
      { icon: 'clock', route: 'expiry_monitor', ar: 'مراقبة الصلاحية', en: 'Expiry monitor' },
      { icon: 'alert', route: 'shortage', ar: 'الإبلاغ عن نقص دواء', en: 'Report a drug shortage' },
    ],
  },
  {
    ar: 'الطلبات والتأمين', en: 'Orders & insurance',
    rows: [
      { icon: 'receipt', route: 'my_offers', ar: 'عروضي', en: 'My offers' },
      { icon: 'pill', route: 'prescription_review', ar: 'مراجعة الوصفات', en: 'Prescription review' },
      { icon: 'list', route: 'order_history', ar: 'سجل الطلبات المنتهية', en: 'Order history' },
      { icon: 'inbox', route: 'returns_rma', ar: 'المرتجعات', en: 'Returns' },
      { icon: 'shield', route: 'insurance_decisions', ar: 'قرارات التأمين على الطلبات', en: 'Insurance decisions' },
      { icon: 'fileText', route: 'insurance_requests', ar: 'طلبات التأمين الواردة', en: 'Insurance requests' },
      { icon: 'settings', route: 'insurance_config', ar: 'إعداد شركات التأمين', en: 'Insurance setup' },
    ],
  },
  {
    ar: 'المالية', en: 'Finance',
    rows: [
      { icon: 'wallet', route: 'wallet', ar: 'المحفظة', en: 'Wallet' },
      { icon: 'money', route: 'withdrawal_workflow', ar: 'سحب الأرباح', en: 'Withdraw earnings' },
      { icon: 'chart', route: 'revenue_insights', ar: 'تحليل الإيرادات', en: 'Revenue insights' },
    ],
  },
  {
    ar: 'الصيدلية', en: 'Pharmacy',
    rows: [
      { icon: 'settings', route: 'pharmacy_settings', ar: 'إعدادات الصيدلية', en: 'Pharmacy settings' },
      { icon: 'clock', route: 'working_hours', ar: 'ساعات العمل', en: 'Working hours' },
      { icon: 'star', route: 'reviews', ar: 'التقييمات', en: 'Reviews' },
      { icon: 'bell', route: 'notifications', ar: 'الإشعارات', en: 'Notifications' },
      { icon: 'qr', route: 'qr_menu', ar: 'رمز QR ومعلومات الصيدلية', en: 'QR code & pharmacy info' },
      { icon: 'verified', route: 'certificates_config', ar: 'الشهادات والتراخيص', en: 'Certificates' },
      { icon: 'help', route: 'support', ar: 'الدعم الفني', en: 'Support' },
    ],
  },
  {
    ar: 'النمو والأدوات', en: 'Growth & tools',
    rows: [
      { icon: 'receipt', route: 'promotions', ar: 'العروض والحملات', en: 'Promotions' },
      { icon: 'users', route: 'crm', ar: 'العملاء', en: 'Customers' },
      { icon: 'star', route: 'reputation', ar: 'السمعة', en: 'Reputation' },
      { icon: 'link', route: 'affiliate', ar: 'برنامج الإحالة', en: 'Affiliate' },
      { icon: 'payments', route: 'subscriptions_ads', ar: 'الاشتراكات والإعلانات', en: 'Subscriptions & ads' },
      { icon: 'globe', route: 'web_config', ar: 'صفحة الصيدلية على الويب', en: 'Web profile' },
      { icon: 'image', route: 'media_config', ar: 'الصور والوسائط', en: 'Media' },
      { icon: 'bookOpen', route: 'drug_index', ar: 'فهرس الأدوية', en: 'Drug index' },
      { icon: 'briefcase', route: 'medical_jobs', ar: 'الوظائف الطبية', en: 'Medical jobs' },
      { icon: 'heart', route: 'chronic', ar: 'برنامج الأمراض المزمنة', en: 'Chronic care programme' },
    ],
  },
];

// ─── First-login checklist ───────────────────────────────────────────────────

export type SetupKey = 'hours' | 'delivery' | 'stock' | 'bank' | 'online';
export type SetupItem = { key: SetupKey; done: boolean | null; route: string; ar: string; en: string };

type Row = Record<string, unknown>;
const asRow = (v: unknown): Row => (v && typeof v === 'object' ? (v as Row) : {});
const num = (v: unknown): number => (v === null || v === undefined || v === '' ? NaN : Number(v));

/** Pure: turns the raw responses into checklist state. `null` = could not be checked (never shown as done). */
export function buildSetupItems(input: {
  hours: unknown | undefined;
  profile: unknown | undefined;
  progress: unknown | undefined;
  stockCount: number | undefined;
  bank: unknown | undefined;
  isOnline: boolean;
}): SetupItem[] {
  const hoursKnown = input.hours !== undefined;
  const hours = input.hours;
  const hoursDone = hoursKnown ? (Array.isArray(hours) ? hours.length > 0 : !!hours && Object.keys(asRow(hours)).length > 0) : null;

  const profile = asRow(input.profile);
  const progress = asRow(input.progress);
  const deliveryKnown = input.profile !== undefined || input.progress !== undefined;
  const fee = num(profile.delivery_fee ?? progress.delivery_fee);
  const radius = num(profile.max_delivery_radius_km ?? progress.coverage_radius_km ?? progress.delivery_radius_km);
  const deliveryDone = deliveryKnown ? (Number.isFinite(fee) && fee >= 0 && Number.isFinite(radius) && radius > 0) : null;

  const bank = asRow(input.bank);
  const bankKnown = input.bank !== undefined;
  const bankDone = bankKnown ? !!bank.iban : null;

  return [
    { key: 'hours', done: hoursDone, route: 'working_hours', ar: 'حدد ساعات العمل', en: 'Set working hours' },
    { key: 'delivery', done: deliveryDone, route: 'pharmacy_settings', ar: 'حدد نطاق التوصيل والرسوم', en: 'Set delivery area and fee' },
    { key: 'stock', done: input.stockCount === undefined ? null : input.stockCount > 0, route: 'product_catalog', ar: 'أضف أصنافاً إلى المخزون', en: 'Add items to stock' },
    { key: 'bank', done: bankDone, route: 'withdrawal_workflow', ar: 'أضف الحساب البنكي', en: 'Add your bank account' },
    { key: 'online', done: input.isOnline, route: '', ar: 'فعّل الاتصال لاستقبال الطلبات', en: 'Go online to receive requests' },
  ];
}

export function usePharmacySetup() {
  const { user } = useAuth();
  const [items, setItems] = useState<SetupItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const isOnline = !!user?.isOnline;

  const load = useCallback(async () => {
    setLoading(true);
    const get = async (url: string): Promise<unknown | undefined> => {
      try { return (await client.get(url)).data ?? null; } catch { return undefined; }
    };
    const [hours, profile, progress, stock, bank] = await Promise.all([
      get('/provider/working-hours'),
      get('/provider/profile'),
      get('/provider-onboarding/progress'),
      get('/provider/capabilities/pharmacy'),
      get('/provider/bank-account'),
    ]);
    setItems(buildSetupItems({
      hours, profile, progress,
      stockCount: Array.isArray(stock) ? stock.length : undefined,
      bank, isOnline,
    }));
    setLoading(false);
  }, [isOnline]);

  useEffect(() => { void load(); }, [load]);
  return { items, loading, reload: load };
}

export function SetupChecklist({ onNavigate, onToggleOnline, compact, onOpenMore }: {
  onNavigate: PharmacyNavigate;
  onToggleOnline: () => void;
  compact?: boolean;
  onOpenMore?: () => void;
}) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const { items, loading, reload } = usePharmacySetup();
  if (loading && !items) return <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.md }} />;
  if (!items) return null;
  const remaining = items.filter(i => i.done !== true);
  if (remaining.length === 0) return null;
  const doneCount = items.length - remaining.length;

  if (compact) {
    return (
      <TouchableOpacity onPress={onOpenMore} activeOpacity={0.8}>
        <NCard style={{ margin: SP.lg, marginBottom: 0, borderColor: theme.primary, borderWidth: 1 }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: SP.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: FW.bold, textAlign: AR ? 'right' : 'left' }}>
                {AR ? `أكمل تجهيز الصيدلية (${doneCount}/${items.length})` : `Finish setting up (${doneCount}/${items.length})`}
              </Text>
              <Text style={{ color: theme.textSub, fontSize: FS.xs, textAlign: AR ? 'right' : 'left' }}>{AR ? remaining[0].ar : remaining[0].en}</Text>
            </View>
            <Text style={{ color: theme.textSub, fontSize: FS.lg }}>{AR ? '‹' : '›'}</Text>
          </View>
        </NCard>
      </TouchableOpacity>
    );
  }

  return (
    <NCard style={{ marginBottom: SP.md }}>
      <Text style={{ color: theme.text, fontWeight: FW.bold, fontSize: FS.md, textAlign: AR ? 'right' : 'left' }}>
        {AR ? `أكمل تجهيز الصيدلية (${doneCount}/${items.length})` : `Finish setting up (${doneCount}/${items.length})`}
      </Text>
      {items.map(item => (
        <TouchableOpacity
          key={item.key}
          disabled={item.done === true}
          onPress={() => (item.key === 'online' ? onToggleOnline() : onNavigate(item.route))}
          style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, paddingVertical: SP.sm }}
        >
          <I name={item.done ? 'check' : 'clock'} size={18} color={item.done ? theme.success : theme.textSub} />
          <Text style={{ flex: 1, color: item.done ? theme.textSub : theme.text, textAlign: AR ? 'right' : 'left', textDecorationLine: item.done ? 'line-through' : 'none' }}>
            {AR ? item.ar : item.en}
          </Text>
          {item.done === null && <NBadge size="xs" variant="default" label={AR ? 'تعذر التحقق' : 'Could not check'} />}
        </TouchableOpacity>
      ))}
      <TouchableOpacity onPress={reload} style={{ alignSelf: AR ? 'flex-end' : 'flex-start', paddingVertical: SP.xs }}>
        <Text style={{ color: theme.primary, fontSize: FS.sm }}>{AR ? 'تحديث' : 'Refresh'}</Text>
      </TouchableOpacity>
    </NCard>
  );
}

// ─── More tab ────────────────────────────────────────────────────────────────

export function PharmacyMoreScreen({ onNavigate, onToggleOnline }: { onNavigate: PharmacyNavigate; onToggleOnline: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'المزيد' : 'More'} />
      <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
        <SetupChecklist onNavigate={onNavigate} onToggleOnline={onToggleOnline} />
        {PHARMACY_MENU.map(section => (
          <View key={section.en}>
            <NSecHeader title={AR ? section.ar : section.en} />
            <NCard style={{ paddingVertical: 0 }}>
              {section.rows.map(row => (
                <NSettingsRow
                  key={row.route}
                  icon={row.icon}
                  label={AR ? row.ar : row.en}
                  onPress={() => onNavigate(row.route)}
                />
              ))}
            </NCard>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
