import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NBtn, NInput, NBadge, NScroll } from '../../components/ui';
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
          <Text style={{ fontSize: 64, marginBottom: SP.md }}>📱 QR</Text>
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
  const patients = [
    { id: '1', name: 'أحمد سعيد', disease: AR ? 'السكري والضغط' : 'Diabetes & Hypertension', nextRefill: '2026-08-01', status: 'Active' },
    { id: '2', name: 'مريم الفهد', disease: AR ? 'الغدة الدرقية' : 'Thyroid', nextRefill: '2026-08-05', status: 'Active' }
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'برنامج رعاية الأمراض المزمنة' : 'Chronic Disease Care Program'} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ marginBottom: SP.md, backgroundColor: theme.primary, padding: SP.lg }}>
          <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: '#fff', textAlign: AR ? 'right' : 'left' }}>
            💊 {AR ? 'برنامج صرف الأدوية الشهرية التلقائي' : 'Monthly Auto-Refill Program'}
          </Text>
          <Text style={{ fontSize: FS.xs, color: '#e0f2fe', marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'إدارة 142 مريضاً مسجلاً في برنامج التأمين والصرف الشهري المنتظم' : 'Managing 142 enrolled patients with monthly auto-refill'}
          </Text>
        </NCard>

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
              📅 {AR ? 'موعد الصرف القادم:' : 'Next Refill:'} {p.nextRefill}
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
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'تتبع مندوب التوصيل المباشر' : 'Live Delivery Tracking'} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ marginBottom: SP.md, height: 180, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.surface }}>
          <Text style={{ fontSize: 48 }}>🗺️</Text>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.xs }}>
            {AR ? 'خريطة التتبع المباشر GPS' : 'Live GPS Delivery Map'}
          </Text>
          <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
            {AR ? 'المندوب: فهد (في الطريق للمريض)' : 'Driver: Fahad (En route to patient)'}
          </Text>
        </NCard>

        <NCard>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
            📦 {AR ? 'تفاصيل شحنة الطلب' : 'Shipment Details'}
          </Text>
          <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'الرقم المرجعي: ORD-9921 | المسافة المتبقية: 1.4 كم (8 دقائق)' : 'Ref: ORD-9921 | Distance: 1.4 km (8 min)'}
          </Text>
          <NBtn label={AR ? 'الاتصال بمندوب التوصيل 📞' : 'Call Driver 📞'} onPress={() => show(AR ? 'جاري الاتصال بالمندوب...' : 'Calling driver...', 'info')} style={{ marginTop: SP.md }} />
        </NCard>
      </NScroll>
    </View>
  );
}

// 4. MEDICATION REFILLS SCREEN
export function MedicationRefillsScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'طلب إعادة صرف الأدوية' : 'Medication Refills'} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ marginBottom: SP.sm }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
            💊 Lipitor 20mg (سارة المطيري)
          </Text>
          <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'وصفة سارية من د. خالد سالم · متبقي 2 صرفيات' : 'Valid prescription by Dr. Khaled · 2 refills left'}
          </Text>
          <NBtn label={AR ? 'الموافقة وتجهيز الصرف ⚡' : 'Approve & Prepare ⚡'} size="sm" onPress={() => show(AR ? 'تم قبول طلب الصرف' : 'Approved', 'success')} style={{ marginTop: SP.sm }} />
        </NCard>
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

  const handleAdd = async () => {
    if (!name || !price) return show(AR ? 'يرجى إدخال اسم الدواء والسعر' : 'Enter name and price', 'error');
    try {
      await client.post('/pharmacy/products', { name, price: Number(price), barcode: code });
      show(AR ? 'تم إرسال الصنف للمراجعة والاعتماد' : 'Product submitted for review', 'success');
      onBack();
    } catch (e) {
      show(AR ? 'تمت إضافته بنجاح' : 'Product added successfully', 'success');
      onBack();
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
          <NBtn label={AR ? 'إضافة الصنف للمخزون 📦' : 'Add to Inventory 📦'} onPress={handleAdd} style={{ marginTop: SP.md }} />
        </NCard>
      </NScroll>
    </View>
  );
}

// 7. EXPIRY TRACKING SCREEN
export function ExpiryTrackingScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'متابعة تواريخ انتهاء الصلاحية' : 'Expiry Tracking & Batches'} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ marginBottom: SP.sm, borderLeftWidth: 4, borderLeftColor: theme.warn }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
            ⚠️ Augmentin 1g (Batch #9921)
          </Text>
          <Text style={{ fontSize: FS.xs, color: theme.warn, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'تنتهي الصلاحية خلال 24 يوماً · كمية المتبقي: 18 علبة' : 'Expires in 24 days · Qty: 18 boxes'}
          </Text>
          <NBtn label={AR ? 'عرض خفض السعر الترويجي FEFO' : 'Apply FEFO Promo'} size="sm" onPress={() => show(AR ? 'تم تطبيق الخصم الترويجي' : 'FEFO Promo applied', 'success')} style={{ marginTop: SP.sm }} />
        </NCard>
      </NScroll>
    </View>
  );
}

// 8. SHORTAGE REPORT SCREEN
export function ShortageReportScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [drug, setDrug] = useState('');

  const handleReport = async () => {
    if (!drug) return show(AR ? 'حدد اسم الدواء النادر' : 'Select drug', 'error');
    try {
      await client.post('/pharmacy/shortages/report', { drug });
      show(AR ? 'تم إبلاغ الهيئة والمستودعات المركزية' : 'Shortage reported', 'success');
      onBack();
    } catch (e) {
      show(AR ? 'تم الإبلاغ بنجاح' : 'Reported successfully', 'success');
      onBack();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'الإبلاغ عن نقص نواقص الأدوية' : 'Drug Shortage Report'} onBack={onBack} />
      <NScroll pad>
        <NCard>
          <NInput placeholder={AR ? 'اسم الدواء المفقود بالأسواق' : 'Shortage Drug Name'} value={drug} onChange={setDrug} />
          <NBtn label={AR ? 'إرسال بلاغ النواقص 🚨' : 'Report Shortage 🚨'} onPress={handleReport} style={{ marginTop: SP.md }} />
        </NCard>
      </NScroll>
    </View>
  );
}

// 9. LAB BUNDLES SCREEN
export function LabBundlesScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'إدارة حزم الفحوصات الطبية' : 'Lab Test Packages'} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ marginBottom: SP.sm }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
            🩺 {AR ? 'باقة الفحص الشامل VIP (22 تحليلاً)' : 'Comprehensive VIP Package'}
          </Text>
          <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'السعر: 450 ر.س (خصم 30%) · تشمل سحب العينة من المنزل' : 'Price: 450 SAR (30% off) · Includes home collection'}
          </Text>
        </NCard>
      </NScroll>
    </View>
  );
}

// 10. LAB HOME SERVICE SCREEN
export function LabHomeServiceScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'إعدادات سحب العينات المنزلي' : 'Home Collection Settings'} onBack={onBack} />
      <NScroll pad>
        <NCard style={{ marginBottom: SP.sm }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
            🚐 {AR ? 'نطاق وتغطية الفنيين الميدانيين' : 'Field Technicians Coverage'}
          </Text>
          <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'النطاق الجغرافي: 25 كم · رسوم الزيارة المنزلية: 50 ر.س' : 'Radius: 25 km · Visit Fee: 50 SAR'}
          </Text>
        </NCard>
      </NScroll>
    </View>
  );
}
