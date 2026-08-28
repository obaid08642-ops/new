import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NBtn, NInput, NBadge, NScroll, NEmpty, NSecHeader } from '../../components/ui';
import { I } from '../../components/icons';
import { SP, FS, FW } from '../../constants';
import client from '../../api/client';

// 1. PHARMACY QR MENU SCREEN
export function PharmacyQRMenuScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'كتالوج المنتجات ورمز QR' : 'Pharmacy QR Catalog'} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ width: '100%', alignItems: 'center', padding: SP.xl, marginBottom: SP.md }}>
          <View style={{ marginBottom: SP.md }}><I name="qr" size={64} color={theme.primary} /></View>
          <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, textAlign: 'center' }}>
            {AR ? 'امسح الرمز للتصفح المباشر لكتالوج الصيدلية' : 'Scan to view pharmacy catalog'}
          </Text>
          <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: 'center' }}>
            {AR ? 'رمز المطبوعات والشاشات الخارجية بالفرع' : 'Branch outdoor & printable catalog code'}
          </Text>
        </NCard>
        <NBtn label={AR ? 'تحميل بطاقة الرمز المطبوعة PDF' : 'Download Printable PDF'} onPress={() => show(AR ? 'جاري التحميل...' : 'Downloading...', 'info')} style={{ width: '100%' }} />
      </NScroll>
    </View>
  );
}

// 2. CHRONIC DISEASE PROGRAM SCREEN
export function ChronicDiseaseProgramScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/pharmacy/orders/refills')
      .then(res => {
        setPatients((res.data || []).map((o: any) => ({
          id: o.id || o._id,
          name: o.patient_name || o.contact?.name || '—',
          disease: (o.items || []).map((i: any) => i.name_ar || i.name).filter(Boolean).join('، ') || (AR ? 'أدوية مزمنة' : 'Chronic meds'),
          nextRefill: o.next_refill_at ? new Date(o.next_refill_at).toISOString().split('T')[0] : (o.scheduled_at ? new Date(o.scheduled_at).toISOString().split('T')[0] : '—'),
          status: o.state || 'Active',
        })));
      })
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'برنامج رعاية الأمراض المزمنة' : 'Chronic Disease Care Program'} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ marginBottom: SP.md, backgroundColor: theme.primary, padding: SP.lg }}>
          <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: '#fff', textAlign: AR ? 'right' : 'left' }}>
             {AR?'برنامج صرف الأدوية الشهرية التلقائي':'Monthly Auto-Refill Program'}
          </Text>
          <Text style={{ fontSize: FS.xs, color: '#e0f2fe', marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
            {AR ? `${loading ? '…' : patients.length} مريضاً في برنامج إعادة الصرف` : `${loading ? '…' : patients.length} patients in refill program`}
          </Text>
        </NCard>

        {loading && <ActivityIndicator color={theme.primary} style={{ marginVertical: SP.xl }} />}
        {!loading && patients.length === 0 && (
          <NCard style={{ alignItems: 'center', paddingVertical: SP.xxl }}>
            <Text style={{ color: theme.textSub }}>{AR ? 'لا توجد طلبات إعادة صرف بعد' : 'No refill orders yet'}</Text>
          </NCard>
        )}
        {patients.map(p => (
          <NCard key={p.id} style={{ marginBottom: SP.sm }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{p.name}</Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 2 }}>{p.disease}</Text>
              </View>
              <NBadge label={AR ? 'تجديد مجدول' : 'Scheduled'} variant="success" />
            </View>
            <Text style={{ fontSize: FS.xs, color: theme.primary, marginTop: SP.xs, textAlign: AR ? 'right' : 'left' }}>
               {AR?'موعد الصرف القادم:':'Next Refill:'} {p.nextRefill}
            </Text>
          </NCard>
        ))}
      </NScroll>
    </View>
  );
}

// 3. DELIVERY TRACKING SCREEN
export function DeliveryTrackingScreen({ order, onBack }: { order?: any; onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [delivery, setDelivery] = useState<any>(order || null);
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    if (order) return;
    // No order passed — load the current out-for-delivery allocation
    client.get('/provider/pharmacy/allocations', { params: { status: 'out_for_delivery' } })
      .then((res: any) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        setDelivery(rows[0] || null);
      })
      .catch(() => setDelivery(null))
      .finally(() => setLoading(false));
  }, [order]);

  const courierName = delivery?.delivery?.courier_name || delivery?.driver_name || '';
  const courierPhone = delivery?.delivery?.courier_phone || delivery?.driver_phone || '';
  const ref = String(delivery?.order_id || delivery?.id || '').slice(0, 8);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'تتبع مندوب التوصيل المباشر' : 'Live Delivery Tracking'} onBack={onBack} />
      <NScroll pad>
        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xl }} />
        ) : !delivery ? (
          <NCard style={{ padding: SP.lg, alignItems: 'center' }}>
            <Text style={{ color: theme.textSub, textAlign: 'center' }}>
              {AR ? 'لا توجد شحنة قيد التوصيل حالياً' : 'No delivery currently in progress'}
            </Text>
          </NCard>
        ) : (
          <>
            <NCard style={{ marginBottom: SP.md, height: 180, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.surface }}>
              <I name="map" size={48} color={theme.textSub} />
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.xs }}>
                {AR ? 'خريطة التتبع المباشر GPS' : 'Live GPS Delivery Map'}
              </Text>
              <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
                {courierName
                  ? (AR ? `المندوب: ${courierName} (في الطريق للمريض)` : `Driver: ${courierName} (En route to patient)`)
                  : (AR ? 'لم تُسجل بيانات المندوب بعد' : 'Driver details not recorded yet')}
              </Text>
            </NCard>

            <NCard>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                 {AR?'تفاصيل شحنة الطلب':'Shipment Details'}
              </Text>
              <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
                {(AR ? 'الرقم المرجعي: ' : 'Ref: ') + (ref || '—')}
              </Text>
              {!!courierPhone && (
                <NBtn label={AR?'الاتصال بمندوب التوصيل':'Call Driver'} onPress={() => Linking.openURL(`tel:${courierPhone}`)} style={{ marginTop: SP.md }} />
              )}
            </NCard>
          </>
        )}
      </NScroll>
    </View>
  );
}

// 4. MEDICATION REFILLS SCREEN
export function MedicationRefillsScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    client.get('/pharmacy/orders/refills')
      .then((r: any) => setOrders(r.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'طلبات إعادة صرف الأدوية' : 'Medication Refills'} onBack={onBack} />
      <NScroll pad>
        {loading && <ActivityIndicator color={theme.primary} style={{ marginTop: SP.xl }} />}
        {!loading && orders.length === 0 && (
          <NCard style={{ padding: SP.lg, alignItems: 'center' }}>
            <Text style={{ color: theme.textSub, textAlign: 'center' }}>
              {AR ? 'لا توجد طلبات إعادة صرف حالياً — طلبات المرضى للأدوية المزمنة تظهر هنا فور وصولها' : 'No refill requests — chronic medication reorders appear here'}
            </Text>
          </NCard>
        )}
        {orders.map((o: any) => (
          <NCard key={o.id} style={{ marginBottom: SP.sm }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
              {(o.items || []).map((i: any) => i.name_ar || i.name_en).join(' + ') || (AR ? 'طلب إعادة صرف' : 'Refill order')}
            </Text>
            <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
              {(AR ? 'إعادة صرف تلقائي · ' : 'Auto refill · ') + (o.state || '') + ' · ' + String(o.createdAt || '').slice(0, 10)}
            </Text>
            <NBadge label={o.state === 'COMPLETED' ? (AR ? 'مكتمل' : 'Completed') : (AR ? 'قيد التنفيذ' : 'In progress')} variant={o.state === 'COMPLETED' ? 'success' : 'warning'} size="xs" />
          </NCard>
        ))}
      </NScroll>
    </View>
  );
}

// 5. DRUG PRICE COMPARISON SCREEN
export function DrugPriceComparisonScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'مقارنة أسعار الأدوية التنافسية' : 'Drug Price Comparison'} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ marginBottom: SP.sm }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
            Panadol Extra (500mg)
          </Text>
          <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'سعر صيدليتك: 12 ر.س | متوسط السوق: 13.5 ر.س (SFDA Standard)' : 'Your Price: 12 SAR | Market Avg: 13.5 SAR'}
          </Text>
        </NCard>
      </NScroll>
    </View>
  );
}

// 6. ADD PRODUCT SCREEN
export function AddProductScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [name, setName] = useState(''); const [price, setPrice] = useState(''); const [code, setCode] = useState('');

  const [adding, setAdding] = useState(false);
  const handleAdd = async () => {
    if (!name.trim() || !price) return show(AR ? 'يرجى إدخال اسم الدواء والسعر' : 'Enter name and price', 'error');
    const p = Number(price);
    if (!p || p <= 0) return show(AR ? 'السعر يجب أن يكون أكبر من صفر' : 'Price must be greater than zero', 'error');
    setAdding(true);
    try {
      await client.post('/approval-workflow/requests', {
        entity_type: 'medicine',
        change_data: { name: name.trim(), price: p, barcode: code.trim() || null },
      });
      show(AR ? 'تم إرسال الصنف لمراجعة الإدارة واعتماده' : 'Product submitted for admin review and approval', 'success');
      onBack();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      show(typeof msg === 'string' ? msg : (AR ? 'تعذر إرسال الصنف — تحقق من الاتصال وحاول مجدداً' : 'Could not submit product — check connection and retry'), 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'إضافة دواء جديد للمخزون' : 'Add New Product'} onBack={onBack} />
      <NScroll pad>
        <NCard>
          <NInput placeholder={AR ? 'اسم الدواء (العلمي والتجاري)' : 'Drug Name'} value={name} onChange={setName} />
          <View style={{ height: SP.sm }} />
          <NInput placeholder={AR ? 'السعر المحدد (ر.س)' : 'Price (SAR)'} kbType="numeric" value={price} onChange={setPrice} />
          <View style={{ height: SP.sm }} />
          <NInput placeholder={AR ? 'رمز البار كود SFDA' : 'SFDA Barcode'} value={code} onChange={setCode} />
          <NBtn label={AR?'إرسال للمراجعة والاعتماد':'Submit for Review'} onPress={handleAdd} loading={adding} disabled={adding} style={{ marginTop: SP.md }} />
        </NCard>
      </NScroll>
    </View>
  );
}

// 7. EXPIRY TRACKING SCREEN
export function ExpiryTrackingScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setLoadErr(false);
    try {
      const res = await client.get('/pharmacy/inventory/expiry');
      setItems(Array.isArray(res.data?.expiringSoon) ? res.data.expiringSoon : []);
    } catch {
      setLoadErr(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const daysLeft = (d: any) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'متابعة تواريخ انتهاء الصلاحية' : 'Expiry Tracking & Batches'} onBack={onBack} />
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: SP.huge }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : loadErr ? (
        <NEmpty
          icon="⚠️"
          title={AR ? 'تعذر تحميل بيانات الصلاحية' : 'Could not load expiry data'}
          sub={AR ? 'تحقق من اتصالك بالإنترنت ثم أعد المحاولة' : 'Check your connection and try again'}
          actionLabel={AR ? 'إعادة المحاولة' : 'Retry'}
          onAction={load}
        />
      ) : items.length === 0 ? (
        <NEmpty
          icon="✅"
          title={AR ? 'لا توجد أصناف قاربت على الانتهاء' : 'No items nearing expiry'}
          sub={AR ? 'كل الأصناف في مخزونك ضمن فترة صلاحية آمنة (أكثر من 90 يوماً)' : 'All inventory items are within a safe expiry window (90+ days)'}
        />
      ) : (
        <NScroll pad>
          {items.map((it: any, i: number) => {
            const days = daysLeft(it.expiry_date);
            const urgent = days <= 30;
            return (
              <NCard key={it.id || it._id || `exp_${i}`} style={{ marginBottom: SP.sm, borderLeftWidth: 4, borderLeftColor: urgent ? theme.danger : theme.warn }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                  {AR ? (it.name_ar || it.name_en || it.sku) : (it.name_en || it.name_ar || it.sku)}
                </Text>
                <Text style={{ fontSize: FS.xs, color: urgent ? theme.danger : theme.warn, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
                  {days <= 0
                    ? (AR ? 'منتهي الصلاحية — يجب سحبه من الرفوف فوراً' : 'EXPIRED — pull from shelves immediately')
                    : (AR ? `تنتهي الصلاحية خلال ${days} يوم · الكمية: ${it.stock ?? 0}` : `Expires in ${days} days · Qty: ${it.stock ?? 0}`)}
                </Text>
                {!!it.expiry_date && (
                  <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 2, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? 'تاريخ الانتهاء: ' : 'Expiry date: '}{new Date(it.expiry_date).toLocaleDateString(AR ? 'ar-SA-u-ca-gregory' : 'en-GB')}
                  </Text>
                )}
              </NCard>
            );
          })}
        </NScroll>
      )}
    </View>
  );
}

// 8. SHORTAGE REPORT SCREEN
export function ShortageReportScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [drug, setDrug] = useState('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const handleReport = async () => {
    if (!drug.trim()) return show(AR ? 'حدد اسم الدواء الناقص' : 'Enter the shortage drug name', 'error');
    setSending(true);
    try {
      await client.post('/support/tickets', {
        subject: AR ? `بلاغ نقص دواء: ${drug.trim()}` : `Drug shortage report: ${drug.trim()}`,
        message: (AR ? `الدواء: ${drug.trim()}\n` : `Drug: ${drug.trim()}\n`) + (details.trim() || (AR ? 'لا توجد تفاصيل إضافية' : 'No additional details')),
        category: 'DRUG_SHORTAGE',
        priority: 'high',
      });
      show(AR ? 'تم إرسال البلاغ للإدارة — سيصلك الرد عبر الدعم' : 'Report sent to admin — you will be answered via support', 'success');
      onBack();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      show(typeof msg === 'string' ? msg : (AR ? 'تعذر إرسال البلاغ — تحقق من الاتصال وحاول مجدداً' : 'Could not send report — check connection and retry'), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'الإبلاغ عن نقص الأدوية' : 'Drug Shortage Report'} onBack={onBack} />
      <NScroll pad>
        <NCard>
          <NInput placeholder={AR ? 'اسم الدواء المفقود بالأسواق' : 'Shortage Drug Name'} value={drug} onChange={setDrug} required />
          <View style={{ height: SP.sm }} />
          <NInput placeholder={AR ? 'تفاصيل إضافية (الكمية المطلوبة، آخر موعد توفر...)' : 'Additional details (quantity needed, last available date...)'} value={details} onChange={setDetails} multiline />
          <NBtn label={AR ? 'إرسال بلاغ النقص' : 'Send Shortage Report'} onPress={handleReport} loading={sending} disabled={sending} style={{ marginTop: SP.md }} />
        </NCard>
      </NScroll>
    </View>
  );
}

// 9. LAB BUNDLES SCREEN
export function LabBundlesScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [tests, setTests] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setLoadErr(false);
    try {
      const res = await client.get('/provider/capabilities/lab');
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.items) ? res.data.items : []);
      setTests(list);
    } catch {
      setLoadErr(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'كتالوج الفحوصات والباقات' : 'Lab Tests & Packages Catalog'} onBack={onBack} />
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: SP.huge }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : loadErr ? (
        <NEmpty
          icon="⚠️"
          title={AR ? 'تعذر تحميل الكتالوج' : 'Could not load catalog'}
          sub={AR ? 'تحقق من اتصالك بالإنترنت ثم أعد المحاولة' : 'Check your connection and try again'}
          actionLabel={AR ? 'إعادة المحاولة' : 'Retry'}
          onAction={load}
        />
      ) : tests.length === 0 ? (
        <NEmpty
          icon="🧪"
          title={AR ? 'لا توجد فحوصات في الكتالوج بعد' : 'No tests in your catalog yet'}
          sub={AR ? 'أضف فحوصاتك وباقاتك من إدارة الكتالوج لتظهر للمرضى' : 'Add your tests and packages from catalog management so patients can see them'}
        />
      ) : (
        <NScroll pad>
          {tests.map((t: any, i: number) => (
            <NCard key={t.id || t._id || `lab_${i}`} style={{ marginBottom: SP.sm }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? (t.name_ar || t.name_en || t.code) : (t.name_en || t.name_ar || t.code)}
                  </Text>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
                    {(AR ? `السعر: ${Number(t.price || 0).toFixed(2)} ر.س` : `Price: ${Number(t.price || 0).toFixed(2)} SAR`)
                      + (t.turnaround_hours ? (AR ? ` · النتيجة خلال ${t.turnaround_hours} ساعة` : ` · Result in ${t.turnaround_hours}h`) : '')
                      + (t.home_collection_supported ? (AR ? ' · يدعم السحب المنزلي' : ' · Home collection') : '')}
                  </Text>
                </View>
                <NBadge label={t.available !== false ? (AR ? 'متاح' : 'Available') : (AR ? 'موقوف' : 'Paused')} variant={t.available !== false ? 'success' : 'default'} />
              </View>
            </NCard>
          ))}
        </NScroll>
      )}
    </View>
  );
}

// 10. LAB HOME SERVICE SCREEN
export function LabHomeServiceScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);
  const [zones, setZones] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setLoadErr(false);
    try {
      const res = await client.get('/provider/zones');
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.zones) ? res.data.zones : []);
      setZones(list);
    } catch {
      setLoadErr(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'نطاق خدمة سحب العينات المنزلي' : 'Home Collection Coverage'} onBack={onBack} />
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: SP.huge }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : loadErr ? (
        <NEmpty
          icon="⚠️"
          title={AR ? 'تعذر تحميل مناطق التغطية' : 'Could not load coverage zones'}
          sub={AR ? 'تحقق من اتصالك بالإنترنت ثم أعد المحاولة' : 'Check your connection and try again'}
          actionLabel={AR ? 'إعادة المحاولة' : 'Retry'}
          onAction={load}
        />
      ) : zones.length === 0 ? (
        <NEmpty
          icon="📍"
          title={AR ? 'لم تُحدد مناطق تغطية بعد' : 'No coverage zones defined yet'}
          sub={AR ? 'حدد مناطق تغطيتك من إعدادات المناطق ليتمكن المرضى من طلب السحب المنزلي' : 'Define your coverage zones from zone settings so patients can request home collection'}
        />
      ) : (
        <NScroll pad>
          {zones.map((z: any, i: number) => (
            <NCard key={z.id || z._id || `zone_${i}`} style={{ marginBottom: SP.sm }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                    {z.name || (AR ? 'منطقة تغطية' : 'Coverage zone')}
                  </Text>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
                    {(z.shape === 'circle' && z.radius_km ? (AR ? `النطاق: ${z.radius_km} كم` : `Radius: ${z.radius_km} km`) : (AR ? 'منطقة مخصصة (مضلع)' : 'Custom polygon zone'))
                      + (z.base_fee ? (AR ? ` · رسوم الزيارة: ${Number(z.base_fee).toFixed(2)} ر.س` : ` · Visit fee: ${Number(z.base_fee).toFixed(2)} SAR`) : '')}
                  </Text>
                </View>
                <NBadge label={z.active !== false ? (AR ? 'نشطة' : 'Active') : (AR ? 'موقوفة' : 'Inactive')} variant={z.active !== false ? 'success' : 'default'} />
              </View>
            </NCard>
          ))}
        </NScroll>
      )}
    </View>
  );
}

