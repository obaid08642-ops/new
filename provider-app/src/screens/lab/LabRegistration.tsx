import { startOnboardingAccount, firstMissingDoc, insurancePlansOf, useStepSaver } from '../registration/kit';
import type { StepProps, Uploader, RequiredDoc } from '../registration/kit';
import { DocCard, NoticeSection, useDocumentPicker } from '../registration/WizardParts';
import type { NoticeText } from '../registration/WizardParts';
import { RegistrationWizard } from '../registration/RegistrationWizard';
import type { RegistrationProps, WizardConfig } from '../registration/RegistrationWizard';
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, TextInput } from 'react-native';
import { ProviderApi } from '../../api/provider';
import { useInsuranceCatalog, useServicesCatalog } from '../../api/catalogs';
import { useTheme, useLang, useToast } from '../../context';
import { NBtn, NCard, NInput, NPhoneInput, NPassStrength, NToggle, NDivider, NPriceInput, NSearch } from '../../components/ui';
import { I as Icon } from '../../components/icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Validate } from '../../security/Security';
import { SP, R, FS, FW, C, LANGS } from '../../constants';
import { GeoPicker } from '../../components/GeoPicker';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { tokens, withAlpha } from '../../theme/tokens';

const { width: W } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
const CENTER_TYPES = [
  { id: 'lab', color: tokens.purple, label_ar: 'معمل تحاليل', label_en: 'Laboratory' },
  { id: 'radiology',color: tokens.mintDeep, label_ar: 'مركز أشعة', label_en: 'Radiology Center' },
  { id: 'both', color: tokens.navy, label_ar: 'معمل تحاليل + أشعة', label_en: 'Lab + Radiology' },
] as const;

interface DiagnosticsRegData {
  // Step 1
  nameAr: string; nameEn: string; centerType: string;
  managerName: string; managerPhone: string; managerEmail: string;
  techOfficerName: string; techOfficerScfhs: string;
  password: string; confirmPass: string;
  // Step 2
  crNumber: string; mohLicense: string; iban: string; accountHolderName: string;
  taxNumber: string;
  languages: string[];
  crUri: string; mohUri: string; logoUri: string;
  // Step 3
  region?: string; city: string; location: {lat: number; lng: number}; district: string; address: string;
  // Lab: MOH category and accreditation. Radiology: radiation-safety licence and equipment.
  labCategory?: string; labAccreditation?: string; radSafetyLicense?: string; radEquipment?: string;
  hasHomeSvc: boolean; homeRadius: number;
  homeCollectorCount: string;
  homeCollectionFee: string;
  targetGenders: string;
  homeCollectorGender: 'male' | 'female' | 'both';
  // Step 4
  enabledTests: string[];
  testPrices: Record<string, string>;
  testHomeAvail: Record<string, boolean>;
  testTurnaround: Record<string, string>;
  testInsuranceCov: Record<string, boolean>;
  scanInsuranceCov: Record<string, boolean>;
  enabledScans: string[];
  scanPrices: Record<string, string>;
  // Step 5
  bundles: { id: string; nameAr: string; nameEn: string; tests: string[]; price: string; discount: string }[];
  // Step 6
  workDays: string[]; 
  shiftType: 'morning' | 'evening' | 'both'; 
  openTime: string; closeTime: string; eveningOpenTime: string; eveningCloseTime: string;
  homeWorkDays: string[]; 
  homeShiftType: 'morning' | 'evening' | 'both'; 
  homeOpenTime: string; homeCloseTime: string; homeEveningOpenTime: string; homeEveningCloseTime: string;
  vacationDate: string;
  cashOnly: boolean;
  acceptedInsurance: { companyId: string; plans: string[] }[];
  // Internal
  signatureData: string; signerName: string; signerRole: string;
  termsAgreed: boolean;
}

const INIT: DiagnosticsRegData = {
  nameAr: '', nameEn: '', centerType: '',
  managerName: '', managerPhone: '', managerEmail: '',
  techOfficerName: '', techOfficerScfhs: '',
  password: '', confirmPass: '',
  crNumber: '', mohLicense: '', iban: '', accountHolderName: '', taxNumber: '', languages: [],
  crUri: '', mohUri: '', logoUri: '',
  city: '', location: { lat: 0, lng: 0 }, district: '', address: '',
  hasHomeSvc: false, homeRadius: 0, homeCollectorCount: '', homeCollectionFee: '', targetGenders: 'both', homeCollectorGender: 'both',
  enabledTests: [], testPrices: {}, testHomeAvail: {}, testTurnaround: {}, testInsuranceCov: {}, scanInsuranceCov: {},
  enabledScans: [], scanPrices: {},
  bundles: [],
  workDays: [],
  shiftType: 'morning', openTime: '', closeTime: '', eveningOpenTime: '', eveningCloseTime: '',
  homeWorkDays: [],
  homeShiftType: 'morning', homeOpenTime: '', homeCloseTime: '', homeEveningOpenTime: '', homeEveningCloseTime: '',
  vacationDate: '',
  cashOnly: false, acceptedInsurance: [],
  signatureData: '', signerName: '', signerRole: '',
  termsAgreed: false,
};

const WORK_DAYS = [
  { k: 'SUN', ar: 'الأحد', en: 'Sun' },
  { k: 'MON', ar: 'الاثنين', en: 'Mon' },
  { k: 'TUE', ar: 'الثلاثاء', en: 'Tue' },
  { k: 'WED', ar: 'الأربعاء', en: 'Wed' },
  { k: 'THU', ar: 'الخميس', en: 'Thu' },
  { k: 'FRI', ar: 'الجمعة', en: 'Fri' },
  { k: 'SAT', ar: 'السبت', en: 'Sat' },
] as const;

// ─── What the lab / radiology centre sends when the application is submitted (same fields as before) ───
// The lab and the radiology centre sent slightly different step3 / step2 bodies; each keeps its own.
async function sendDiagnostics(data: DiagnosticsRegData, uploads: Uploader): Promise<void> {
  const isRadiology = data.centerType === 'radiology';
  const docs: string[] = [];
  if (data.crUri) docs.push(await uploads.file(data.crUri, 'cr'));
  if (data.mohUri) docs.push(await uploads.file(data.mohUri, 'moh'));

  // Logo goes to its OWN field: it is the brand mark, not a gallery photo.
  let logo: string | undefined;
  if (data.logoUri) logo = await uploads.file(data.logoUri, 'logo');

  const modes = ['clinic'];
  if (data.hasHomeSvc) modes.push('home');

  const workingHours = data.workDays.map((d: string) => ({
    day: d,
    open: data.shiftType === 'morning' || data.shiftType === 'both' ? data.openTime : null,
    close: data.shiftType === 'morning' || data.shiftType === 'both' ? data.closeTime : null,
    open_evening: data.shiftType === 'evening' || data.shiftType === 'both' ? data.eveningOpenTime : null,
    close_evening: data.shiftType === 'evening' || data.shiftType === 'both' ? data.eveningCloseTime : null,
    closed: false
  }));

  await ProviderApi.step3({
    test_categories: data.enabledTests,
    test_prices: data.testPrices,
    ...(isRadiology ? {} : {
      test_insurance_map: data.testInsuranceCov || {},
      test_turnaround_map: data.testTurnaround || {},
      test_home_map: data.testHomeAvail || {},
      home_collector_count: parseInt(data.homeCollectorCount) || undefined,
      home_collector_gender: data.homeCollectorGender || undefined,
    }),
    equipment_list: data.enabledScans,
    scan_prices: data.scanPrices,
    consultation_modes: modes,
    home_visit_supported: data.hasHomeSvc,
    home_visit_radius_km: data.homeRadius,
    home_collection_fee: parseFloat(data.homeCollectionFee) || 0,
    target_genders: data.targetGenders,
    working_hours: workingHours,
    schedule_home: data.hasHomeSvc ? (data.homeWorkDays || []).map((d: string) => ({
      day: d,
      open: data.homeShiftType === 'morning' || data.homeShiftType === 'both' ? data.homeOpenTime : null,
      close: data.homeShiftType === 'morning' || data.homeShiftType === 'both' ? data.homeCloseTime : null,
      open_evening: data.homeShiftType === 'evening' || data.homeShiftType === 'both' ? data.homeEveningOpenTime : null,
      close_evening: data.homeShiftType === 'evening' || data.homeShiftType === 'both' ? data.homeEveningCloseTime : null,
      closed: false,
    })) : [],
    radiation_safety_license: data.radSafetyLicense || undefined,
    available_equipment_text: data.radEquipment || undefined,
    ...(isRadiology ? { scan_insurance_map: data.scanInsuranceCov || {} } : {}),
    vacation_date: data.vacationDate || undefined,
  });

  await ProviderApi.step2({
    name_ar: data.nameAr,
    name_en: data.nameEn,
    tech_officer_name: data.techOfficerName || undefined,
    tech_officer_scfhs: data.techOfficerScfhs || undefined,
    ...(isRadiology ? {} : { lab_category: data.labCategory || undefined, lab_accreditation: data.labAccreditation || undefined }),
    city: data.city,
    location: data.location,
    address: data.address,
    district: data.district,
    accepts_insurance: !data.cashOnly && data.acceptedInsurance.length > 0,
    accepted_insurance: data.acceptedInsurance ? data.acceptedInsurance.map((ins) => ins.companyId) : [],
    insurance_plans: insurancePlansOf(data.acceptedInsurance),
    cr_number: data.crNumber,
    moh_license_number: data.mohLicense,
    tax_number: data.taxNumber,
    license_documents: docs,
    logo,
    languages: data.languages,
  });
}

const REQUIRED_DOCS: RequiredDoc<DiagnosticsRegData>[] = [
  { field: 'crUri', ar: 'السجل التجاري', en: 'CR document' },
  { field: 'mohUri', ar: 'ترخيص MOH', en: 'MOH licence' },
];

const NOTICE: NoticeText = {
  titleAr: 'تنبيه هام جداً', titleEn: 'IMPORTANT NOTICE',
  p1Ar: 'جميع الفحوصات، الأسعار، الحزم، ومواعيد العمل التي قمت بإدخالها، لن تظهر فوراً للمرضى في التطبيق بعد إتمام التسجيل.',
  p1En: 'All tests, scans, packages, and schedules you entered will NOT be visible immediately.',
  p2Ar: 'عند تحديث قائمة الفحوصات الطبية أو تعديل الأسعار مستقبلاً، سيتطلب الأمر أيضاً موافقة الإدارة (الأدمن) لضمان توافقها مع التراخيص الطبية قبل النشر.',
  p2En: 'Any future updates to your test catalog or pricing must clear Admin Approval first before going live.',
};
const DiagnosticsNotice = (p: StepProps<DiagnosticsRegData>) => <NoticeSection<DiagnosticsRegData> text={NOTICE} submitRef={p.submitRef} />;

/** One wizard for the laboratory and the radiology centre; the centre type picks the labels and the body that is sent. */
const DIAGNOSTICS_WIZARD: WizardConfig<DiagnosticsRegData> = {
  init: INIT,
  pages: [
    {
      titleAr: 'الحساب والتراخيص', titleEn: 'Account & Licenses', subAr: 'بيانات الدخول والسجل والتراخيص', subEn: 'Login, CR & licenses',
      sections: [
        { comp: LStep1, titleAr: 'بيانات المركز الأساسية', titleEn: 'Center Basic Info' },
        { comp: LStep2, titleAr: 'التراخيص والوثائق القانونية', titleEn: 'Licenses & Legal Documents' },
      ],
    },
    {
      titleAr: 'الموقع وقائمة الفحوصات', titleEn: 'Location & Test Menu', subAr: 'موقع المركز والفحوصات وأسعارها', subEn: 'Location, tests & pricing',
      sections: [
        { comp: LStep3, titleAr: 'الموقع والخدمة المنزلية', titleEn: 'Location & Home Service' },
        { comp: LStep4, titleAr: 'قائمة الفحوصات والأسعار', titleEn: 'Test/Scan Menu & Pricing' },
      ],
    },
    {
      titleAr: 'المواعيد والتأمين', titleEn: 'Schedule & Insurance', subAr: 'أوقات العمل وشركات التأمين المعتمدة', subEn: 'Working hours & accepted insurers',
      sections: [
        { comp: LStep6, titleAr: 'المواعيد والتأمين', titleEn: 'Schedule & Insurance' },
        { comp: DiagnosticsNotice, titleAr: 'نظام الموافقات', titleEn: 'Approval System' },
      ],
    },
  ],
  review: {
    providerType: 'lab',
    headerAr: 'مراجعة وإرسال', headerEn: 'Review & Submit',
    summary: {
      titleAr: 'ملخص ملف المركز', titleEn: 'Center Summary',
      rows: (d, AR) => {
        const ct = CENTER_TYPES.find((c) => c.id === d.centerType);
        return [
          { label: AR ? 'اسم المركز' : 'Center Name', value: d.nameAr || '—' },
          { label: AR ? 'النوع' : 'Type', value: AR ? (ct?.label_ar ?? '—') : (ct?.label_en ?? '—') },
          { label: AR ? 'المنطقة / المدينة / الحي' : 'Region / City / District', value: [d.region, d.city, d.district].filter(Boolean).join(' / ') || '—' },
          ...(d.centerType === 'radiology' ? [] : [{ label: AR ? 'التحاليل' : 'Lab Tests', value: `${d.enabledTests.length}` }]),
          ...(d.centerType === 'lab' ? [] : [{ label: AR ? 'الأشعة' : 'Scans', value: `${d.enabledScans.length}` }]),
          { label: AR ? 'خدمة منزلية' : 'Home Svc', value: d.hasHomeSvc ? `${d.homeRadius} km` : (AR ? 'لا' : 'No') },
          { label: AR ? 'التأمين' : 'Insurance', value: d.cashOnly ? (AR ? 'نقدي' : 'Cash') : `${d.acceptedInsurance.length}` },
        ];
      },
    },
    signatoryRoleHint: { ar: 'مثال: المالك، المدير العام', en: 'e.g. Owner, General Manager' },
    signatureTitle: { ar: 'توقيع الممثل النظامي للمركز', en: 'Authorized Representative Signature' },
    agree: {
      ar: 'أوافق على شروط وأحكام نبضة بلس وسياسة الخصوصية، وأؤكد صحة جميع البيانات المدخلة.',
      en: 'I agree to Nabdah Plus Terms & Conditions and Privacy Policy, and confirm all data is accurate.',
    },
    submitLabel: { ar: 'إرسال ملف المركز للمراجعة', en: 'Submit Center Application' },
    precheck: (data, AR) => {
      if (!data.nameAr.trim() || !data.nameEn.trim() || !data.managerEmail.trim() || !data.city.trim() || !data.address.trim()) {
        return AR ? 'أكمل بيانات المركز والموقع والعنوان والبريد' : 'Complete center identity, location, address, and email';
      }
      if (!data.location?.lat || !data.location?.lng) {
        return AR ? 'حدد موقع المركز على الخريطة' : 'Pick the center location on the map';
      }
      if (!data.enabledTests.length && !data.enabledScans.length) {
        return AR ? 'اختر تحليلاً أو فحصاً واحداً على الأقل' : 'Select at least one laboratory test or scan';
      }
      if (!data.workDays.length || !data.openTime || !data.closeTime) {
        return AR ? 'أكمل أيام وساعات عمل المركز' : 'Complete center working days and hours';
      }
      if (data.hasHomeSvc && (!data.homeWorkDays.length || !Number(data.homeRadius) || data.homeRadius <= 0 || !data.homeOpenTime || !data.homeCloseTime)) {
        return AR ? 'أكمل نطاق وأيام وساعات الخدمة المنزلية' : 'Complete home-service radius, days, and hours';
      }
      return null;
    },
    run: sendDiagnostics,
    coords: (d) => ({ lat: d.location?.lat || 0, lng: d.location?.lng || 0 }),
  },
};

export function LabRegistration({ providerType, ...props }: RegistrationProps<DiagnosticsRegData> & { providerType: string }) {
  return <RegistrationWizard config={{ ...DIAGNOSTICS_WIZARD, init: { ...INIT, centerType: providerType } }} {...props} />;
}

export function RadiologyRegistration(props: RegistrationProps<DiagnosticsRegData>) {
  return <RegistrationWizard config={{ ...DIAGNOSTICS_WIZARD, init: { ...INIT, centerType: 'radiology' }, review: { ...DIAGNOSTICS_WIZARD.review, providerType: 'radiology' } }} {...props} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 1 — BASIC INFO
// ══════════════════════════════════════════════════════════════════════════════
function LStep1({ data, update, submitRef }: StepProps<DiagnosticsRegData>) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  const [errs, setErrs] = useState<Record<string, string>>({});

  const nameArRef = useRef<any>(null);
  const nameEnRef = useRef<any>(null);
  const mgrNameRef = useRef<any>(null);
  const emailRef = useRef<any>(null);
  const phoneRef = useRef<any>(null);
  const techOfficerNameRef = useRef<any>(null);
  const techOfficerScfhsRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);
  const confirmPassRef = useRef<any>(null);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!data.nameAr.trim()) e.name = AR ? 'مطلوب' : 'Required';
    if (!data.centerType) e.type = AR ? 'اختر نوع المركز' : 'Choose center type';
    if (!data.managerName.trim()) e.mgr = AR ? 'مطلوب' : 'Required';
    if (!Validate.email(data.managerEmail)) e.email = AR ? 'بريد غير صحيح' : 'Invalid email';
    if (!Validate.phone(data.managerPhone)) e.phone = AR ? 'جوال غير صحيح' : 'Invalid phone';
    if (!data.techOfficerName.trim()) e.tech = AR ? 'اسم المسؤول الفني مطلوب' : 'Tech officer name required';
    const ps = Validate.password(data.password);
    if (!ps.valid) e.pass = AR ? ps.msgAr : ps.msgEn;
    if (data.password !== data.confirmPass) e.conf = AR ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match';
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const [loading, setLoading] = useState(false);
  
    const handleNext = async (): Promise<boolean> => {
    if (!validate()) return false;
    setLoading(true);
    try {
      const type = data.centerType === 'lab' ? 'lab' : 'radiology';
      const r = await startOnboardingAccount({
        phone: data.managerPhone,
        password: data.password,
        full_name: data.managerName,
        email: data.managerEmail,
        type,
      }, type);
      if (!r.ok) setErrs({ phone: r.message || 'Error' });
      return r.ok;
    } finally {
      setLoading(false);
    }
  };
  useStepSaver(submitRef, handleNext);

  return (
    <View>

      {/* Center Type Removed (Auto-detected from Welcome Screen) */}

      <NInput
        innerRef={nameArRef}
        label={AR ? 'اسم المركز بالعربي' : 'Center Name (Arabic)'}
        placeholder={AR ? 'معمل نبضة للتحاليل الطبية' : 'Nabdah Medical Lab'}
        value={data.nameAr} onChange={v => update({ nameAr: v })}
        icon="⊥" required error={errs.name} caps="words"
        returnKey="next" onSubmit={() => nameEnRef.current?.focus()}
      />
      <NInput
        innerRef={nameEnRef}
        label={AR ? 'اسم المركز بالإنجليزي' : 'Center Name (English)'}
        placeholder="Nabdah Medical Lab"
        value={data.nameEn} onChange={v => update({ nameEn: v })}
        caps="words"
        returnKey="next" onSubmit={() => mgrNameRef.current?.focus()}
      />

      <NDivider label={AR ? 'المدير المسؤول' : 'Manager Info'} style={{ marginVertical: SP.lg }} />

      <NInput
        innerRef={mgrNameRef}
        label={AR ? 'اسم المدير المسؤول' : 'Manager Name'}
        placeholder={AR ? 'محمد أحمد' : 'Mohamed Ahmed'}
        value={data.managerName} onChange={v => update({ managerName: v })}
        required error={errs.mgr} caps="words"
        returnKey="next" onSubmit={() => emailRef.current?.focus()}
      />
      <NInput
        innerRef={emailRef}
        label={AR ? 'البريد الإلكتروني' : 'Email'}
        placeholder="lab@email.com"
        value={data.managerEmail} onChange={v => update({ managerEmail: v.toLowerCase() })}
        required error={errs.email} kbType="email-address"
        returnKey="next" onSubmit={() => phoneRef.current?.focus()}
      />
      <NPhoneInput
        innerRef={phoneRef}
        label={AR ? 'الجوال' : 'Phone'}
        value={data.managerPhone} onChange={v => update({ managerPhone: v })}
        required error={errs.phone}
      />

      <NDivider label={AR ? 'المسؤول الفني' : 'Technical Officer'} style={{ marginVertical: SP.lg }} />

      <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.lg }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
          <Icon name="shield" size={18} color={theme.info} />
          <Text style={{ flex: 1, fontSize: FS.sm, color: theme.info, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
            {AR
              ? 'المسؤول الفني يجب أن يكون مرخصاً من الهيئة السعودية للتخصصات الصحية SCFHS.'
              : 'Technical officer must hold a valid SCFHS license.'}
          </Text>
        </View>
      </NCard>

      <NInput
        innerRef={techOfficerNameRef}
        label={AR ? 'اسم المسؤول الفني' : 'Technical Officer Name'}
        placeholder={AR ? 'خالد المالكي' : 'Khalid Al-Malki'}
        value={data.techOfficerName} onChange={v => update({ techOfficerName: v })}
        required error={errs.tech} caps="words"
        returnKey="next" onSubmit={() => techOfficerScfhsRef.current?.focus()}
      />
      <NInput
        innerRef={techOfficerScfhsRef}
        label={AR ? 'رقم ترخيص SCFHS للمسؤول الفني' : 'Tech Officer SCFHS License'}
        placeholder="123456"
        value={data.techOfficerScfhs} onChange={v => update({ techOfficerScfhs: v.replace(/\D/g, '') })}
        kbType="numeric" maxLen={8}
        returnKey="next" onSubmit={() => passwordRef.current?.focus()}
      />

      <NDivider label={AR ? 'كلمة المرور' : 'Password'} style={{ marginVertical: SP.lg }} />

      <NInput
        innerRef={passwordRef}
        label={AR ? 'كلمة المرور' : 'Password'}
        placeholder="••••••••" value={data.password}
        onChange={v => update({ password: v })}
        secure required error={errs.pass}
        hint={AR ? '8 أحرف على الأقل — أرقام وحروف كبيرة وصغيرة ورموز' : '8+ chars — numbers, upper+lower+symbols'}
        returnKey="next" onSubmit={() => confirmPassRef.current?.focus()}
      />
      <NPassStrength password={data.password} />
      <NInput
        innerRef={confirmPassRef}
        label={AR ? 'تأكيد كلمة المرور' : 'Confirm Password'}
        placeholder="••••••••" value={data.confirmPass}
        onChange={v => update({ confirmPass: v })}
        secure required error={errs.conf}
        returnKey="done" onSubmit={handleNext}
      />

      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginTop: 12, marginBottom: 6, textAlign: AR ? 'right' : 'left' }}>{AR ? 'لغات التعامل' : 'Spoken languages'}</Text>
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {LANGS.map(l => {
          const on = (data.languages || []).includes(l.id);
          return (
            <TouchableOpacity key={l.id} onPress={() => update({ languages: on ? data.languages.filter((x: string) => x !== l.id) : [...(data.languages || []), l.id] })}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: on ? theme.primary : theme.border, backgroundColor: on ? theme.primaryLight : theme.bg }}>
              <Text style={{ fontSize: 13, color: on ? theme.primary : theme.text }}>{AR ? l.ar : l.en}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 2 — KYC & LICENSES
// ══════════════════════════════════════════════════════════════════════════════
function LStep2({ data, update, submitRef, uploads }: StepProps<DiagnosticsRegData>) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [showLocModal, setShowLocModal] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!Validate.cr(data.crNumber)) e.cr = AR ? 'السجل التجاري 10 أرقام' : 'CR must be 10 digits';
    if (!data.mohLicense.trim()) e.moh = AR ? 'مطلوب' : 'Required';
    if (!Validate.iban(data.iban)) e.iban = AR ? 'رقم الآيبان غير صحيح' : 'Invalid IBAN';
    
    // Custom validation for Lab/Radiology separation
    const isLab = data.centerType === 'lab' || data.centerType === 'both';
    const isRad = data.centerType === 'radiology' || data.centerType === 'both';
    
    if (isLab && !(data as any).labCategory?.trim()) {
      e.labCategory = AR ? 'فئة المختبر مطلوبة' : 'Lab category required';
    }
    if (isRad && !(data as any).radSafetyLicense?.trim()) {
      e.radSafetyLicense = AR ? 'ترخيص الحماية من الإشعاع مطلوب' : 'Radiation safety license required';
    }
    if (isRad && !(data as any).radEquipment?.trim()) {
      e.radEquipment = AR ? 'الأجهزة المتوفرة مطلوبة' : 'Available equipment required';
    }

    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const pick = useDocumentPicker<DiagnosticsRegData>(update);

  const [loading, setLoading] = useState(false);
  const handleNext = async (): Promise<boolean> => {
    if (!validate()) return false;
    const missing = firstMissingDoc(data, REQUIRED_DOCS);
    if (missing) { show(AR ? `أرفق ${missing.ar}` : `Attach the ${missing.en}`, 'error'); return false; }
    setLoading(true);
    try {
      const crUrl = await uploads.file(data.crUri, 'cr');
      const mohUrl = await uploads.file(data.mohUri, 'moh');

      await ProviderApi.step2({
        license_number: data.crNumber,
        license_documents: [crUrl, mohUrl],
      });
      return true;
    } catch (e: any) {
      show(AR ? 'فشل رفع المستندات' : 'Failed to upload documents', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };
  useStepSaver(submitRef, handleNext);

  return (
    <View>

      <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
          <Icon name="lock" size={16} color={theme.info} />
          <Text style={{ flex: 1, fontSize: FS.sm, color: theme.info, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
            {AR
              ? 'تُسخدم الوثائق للتحقق فقط ولن تُشارك مع أي طرف ثالث.'
              : 'Documents used for verification only, never shared with third parties.'}
          </Text>
        </View>
      </NCard>

      <NInput label={AR ? 'رقم السجل التجاري CR' : 'CR Number'}
        placeholder="1234567890" value={data.crNumber}
        onChange={v => update({ crNumber: v.replace(/\D/g, '') })}
        required error={errs.cr} kbType="numeric" maxLen={10}
        hint={AR ? '10 أرقام — من وزارة التجارة' : '10 digits — from Ministry of Commerce'} />

      <NInput label={AR ? 'رقم ترخيص وزارة الصحة MOH' : 'MOH License Number'}
        placeholder="MOH-LAB-XXXXX" value={data.mohLicense}
        onChange={v => update({ mohLicense: v })}
        required error={errs.moh}
        hint={AR ? 'ترخيص المعمل/مركز الأشعة من MOH' : 'Lab/Radiology license from MOH'} />

      {/* Lab Specific Setup */}
      {(data.centerType === 'lab' || data.centerType === 'both') && (
        <>
          <NInput label={AR ? 'فئة المختبر (MOH Category)' : 'MOH Lab Category'}
            placeholder={AR ? 'فئة أ / فئة ب / فئة ج' : 'Class A / Class B / Class C'}
            value={(data as any).labCategory || ''}
            onChange={v => update({ labCategory: v } as any)}
            required
            error={errs.labCategory}
            hint={AR ? 'فئة ترخيص المختبر من وزارة الصحة' : 'MOH laboratory classification'} />
          <NInput label={AR ? 'الاعتماد الدولي/المحلي (مثل CBAHI, CAP)' : 'Lab Accreditation (e.g. CBAHI, CAP)'}
            placeholder={AR ? 'CBAHI, CAP, ISO 15189' : 'CBAHI, CAP, ISO 15189'}
            value={(data as any).labAccreditation || ''}
            onChange={v => update({ labAccreditation: v } as any)}
            hint={AR ? 'جهات الاعتماد الحاصل عليها المختبر' : 'Accrediting bodies'} />
        </>
      )}

      {/* Radiology Specific Setup */}
      {(data.centerType === 'radiology' || data.centerType === 'both') && (
        <>
          <NInput label={AR ? 'ترخيص الحماية من الإشعاع (RSO License)' : 'Radiation Safety License (RSO)'}
            placeholder="RSO-RAD-XXXXX"
            value={(data as any).radSafetyLicense || ''}
            onChange={v => update({ radSafetyLicense: v } as any)}
            required
            error={errs.radSafetyLicense}
            hint={AR ? 'رقم ترخيص الحماية من الإشعاع للرعاية الصحية' : 'Radiation safety license number'} />
          <NInput label={AR ? 'الأجهزة المتوفرة (رنين مغناطيسي، أشعة مقطعية، إلخ)' : 'Available Equipment (MRI, CT, etc.)'}
            placeholder={AR ? 'رنين مغناطيسي MRI، أشعة مقطعية CT، موجات فوق صوتية US' : 'MRI, CT, Ultrasound, X-Ray'}
            value={(data as any).radEquipment || ''}
            onChange={v => update({ radEquipment: v } as any)}
            required
            error={errs.radEquipment}
            hint={AR ? 'الأجهزة والمعدات المتوفرة بمركز الأشعة' : 'Imaging modalities available'} />
        </>
      )}

      <NInput label={AR ? 'رقم الآيبان IBAN' : 'Bank IBAN'}
        placeholder="SA0000000000000000000000" value={data.iban}
        onChange={v => update({ iban: v.toUpperCase().replace(/\s/g, '') })}
        required error={errs.iban} maxLen={24}
        hint={AR ? 'SA + 22 رقم — لاستلام المدفوعات' : 'SA + 22 digits — to receive payments'} />

      <NInput label={AR ? 'الرقم الضريبي VAT (اختياري)' : 'VAT Number (Optional)'}
        placeholder="300XXXXXXXXX003" value={data.taxNumber}
        onChange={v => update({ taxNumber: v })} maxLen={15} />

      {/* Document upload */}
      <Text style={[st.sectionTitle, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>
        {AR ? 'رفع الوثائق الرسمية' : 'Upload Official Documents'}
      </Text>
      <View style={st.docGrid}>
        <DocCard label={AR ? 'السجل\nالتجاري' : 'CR\nDoc'} done={!!data.crUri} onPress={() => pick('crUri')} required />
        <DocCard label={AR ? 'ترخيص\nMOH' : 'MOH\nLicense'} done={!!data.mohUri} onPress={() => pick('mohUri')} required />
        <DocCard label={AR ? 'شعار\nالمركز' : 'Center\nLogo'} done={!!data.logoUri} onPress={() => pick('logoUri')} />
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3 — LOCATION & HOME COLLECTION
// ══════════════════════════════════════════════════════════════════════════════
function LStep3({ data, update, submitRef }: StepProps<DiagnosticsRegData>) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [showLocModal, setShowLocModal] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!data.region) e.city = AR ? 'اختر المنطقة' : 'Choose region';
    else if (!data.city) e.city = AR ? 'اختر المدينة' : 'Choose city';
    else if (!data.district) e.city = AR ? 'اختر الحي' : 'Choose district';
    if (!data.address.trim()) e.address = AR ? 'العنوان مطلوب' : 'Address required';
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = (): boolean => {
    if (!validate()) return false;
    return true;
  };
  useStepSaver(submitRef, handleNext);

  return (
    <View>

      <View style={{ marginBottom: SP.lg }}>
        <Text style={[st.label, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>
          {AR ? 'المنطقة / المدينة / الحي' : 'Region / City / District'}<Text style={{ color: theme.danger }}> *</Text>
        </Text>
        <GeoPicker value={{ region: data.region, city: data.city, district: data.district }} onChange={v => update({ region: v.region, city: v.city, district: v.district })} locale={lang} />
        {errs.city && <Text style={[st.err, { color: theme.danger }]}>{errs.city}</Text>}
      </View>

      <NInput label={AR ? 'العنوان الكامل' : 'Full Address'}
        placeholder={AR ? 'شارع الأمير سلطان، الرياض' : 'Prince Sultan Road, Riyadh'}
        value={data.address} onChange={v => update({ address: v })}
        required error={errs.address} multi lines={2} />

      {/* Map view implementation with circle */}
      <NCard style={{ marginBottom: SP.xl, marginTop: SP.md }}>
                <Text style={[st.label, { color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }]}>{AR ? 'تحديد الموقع الجغرافي' : 'Geographic Map Location'}</Text>
        <TouchableOpacity onPress={() => setShowLocModal(true)} style={{ borderColor:theme.border, backgroundColor:theme.surface2, borderWidth: 1, borderRadius: R.md, padding: SP.xl, alignItems: 'center', justifyContent: 'center', marginBottom: SP.md }}>
          {data.location.lat ? (
            <View style={{ alignItems: 'center' }}>
              <Icon name="location" size={32} color={theme.success} />
              <Text style={{ color:theme.success, marginTop:SP.xs, fontWeight: FW.bold }}>{AR?'تم تحديد الموقع':'Location Selected'}</Text>
              <Text style={{ color:theme.textSub, fontSize:FS.xs, marginTop: 4 }}>{data.location.lat.toFixed(4)}, {data.location.lng.toFixed(4)}</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Icon name="location" size={32} color={theme.textSub} />
              <Text style={{ color:theme.textSub, marginTop:SP.xs }}>{AR?'اضغط لتحديد الموقع على الخريطة':'Tap to pin location on map'}</Text>
            </View>
          )}
        </TouchableOpacity>
        <LocationPickerModal visible={showLocModal} onClose={() => setShowLocModal(false)} onSelectLocation={(l) => update({ location: l })} initialLocation={data.location.lat ? data.location : undefined} />
      </NCard>

      {/* Home Collection */}
      <NCard style={{ marginBottom: SP.xl }}>
        <NToggle
          label={AR ? 'خدمة سحب العينات المنزلية' : 'Home Sample Collection'}
          sub={AR ? 'أرسل مندوب لسحب العينات من منزل المريض' : 'Send a phlebotomist to collect samples at home'}
          value={data.hasHomeSvc}
          onChange={v => update({ hasHomeSvc: v })}
        />

        {data.hasHomeSvc && (
          <View style={{ marginTop: SP.xl }}>
            {/* Radius */}
            <Text style={[st.label, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>
              {AR ? 'نطاق التغطية للخدمة المنزلية (كم)' : 'Coverage Radius (km)'}
            </Text>
            
            {/* +/- controls & manual input */}
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, marginBottom: SP.md }}>
              <TouchableOpacity 
                onPress={() => update({ homeRadius: Math.max(1, data.homeRadius - 1) })}
                style={{ width: 44, height: 44, borderRadius: R.md, backgroundColor: theme.surface3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}
              >
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>-</Text>
              </TouchableOpacity>
              <TextInput
                value={String(data.homeRadius)}
                onChangeText={v => {
                  const num = parseInt(v.replace(/\D/g, '')) || 0;
                  update({ homeRadius: Math.min(100, Math.max(1, num)) });
                }}
                keyboardType="numeric"
                style={{ flex: 1, height: 44, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.inputBg, borderRadius: R.md, color: theme.text, textAlign: 'center', fontSize: FS.md, fontWeight: 'bold' }}
              />
              <TouchableOpacity 
                onPress={() => update({ homeRadius: Math.min(100, data.homeRadius + 1) })}
                style={{ width: 44, height: 44, borderRadius: R.md, backgroundColor: theme.surface3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}
              >
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>+</Text>
              </TouchableOpacity>
              <Text style={{ color: theme.textSub, fontSize: FS.md }}>{AR ? 'كم' : 'KM'}</Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.lg }}>
              {[2, 4, 6, 8, 10, 15, 20, 30, 50].map(r => (
                <TouchableOpacity key={r} onPress={() => update({ homeRadius: r })}
                  style={[st.chip, {
                    backgroundColor: data.homeRadius === r ? theme.primary : theme.surface2,
                    borderColor: data.homeRadius === r ? theme.primary : theme.border,
                  }]}>
                  <Text style={{
                    color: data.homeRadius === r ? theme.textInv : theme.text,
                    fontWeight: FW.semi, fontSize: FS.sm,
                  }}>
                    {r} {AR ? 'كم' : 'km'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <NInput
              label={AR ? (data.centerType === 'radiology' ? 'رسوم النقل والتصوير (ريال)' : 'رسوم السحب المنزلي (ريال)') : (data.centerType === 'radiology' ? 'Home Scan Fee (SAR)' : 'Home Collection Fee (SAR)')}
              placeholder="0"
              value={data.homeCollectionFee || ''}
              onChange={v => update({ homeCollectionFee: v.replace(/\D/g, '') })}
              kbType="numeric"
            />
            <Text style={{ fontSize: 14, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: 8, marginTop: 16 }}>{AR ? (data.centerType === 'radiology' ? 'الفئة المسموحة للتصوير' : 'الفئة المسموحة للسحب') : 'Target Genders'}</Text>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: 12, marginBottom: 24 }}>
              {['all', 'male', 'female'].map(g => (
                <TouchableOpacity key={g} onPress={() => update({ targetGenders: g })}
                  style={{ flex: 1, padding: 12, borderWidth: 1, borderColor: data.targetGenders === g ? theme.primary : theme.border, backgroundColor: data.targetGenders === g ? withAlpha(tokens.purple, 0.10) : '#FFF', borderRadius: 8, alignItems: 'center' }}>
                  <Text style={{ color: data.targetGenders === g ? theme.primary : theme.text }}>
                    {g === 'all' ? (AR ? 'كلاهما' : 'Both') : g === 'male' ? (AR ? 'رجال' : 'Male') : (AR ? 'نساء' : 'Female')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <NInput
              label={AR ? (data.centerType === 'radiology' ? 'عدد أجهزة/فنيي التصوير المنزلي' : 'عدد مندوبي السحب المتاحين') : (data.centerType === 'radiology' ? 'Available Techs/Machines' : 'Available Phlebotomists')}
              placeholder="2"
              value={data.homeCollectorCount}
              onChange={v => update({ homeCollectorCount: v.replace(/\D/g, '') })}
              kbType="numeric" maxLen={2}
            />

            <NCard style={{ backgroundColor: theme.primaryLight, padding: SP.md }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: SP.md }}>
                <Icon name="info" size={14} color={theme.primary} />
                <Text style={{ flex: 1, fontSize: FS.xs, color: theme.primary, lineHeight: 18, textAlign: AR ? 'right' : 'left' }}>
                  {AR
                    ? 'خدمة السحب المنزلي تزيد الطلبات بنسبة 50%. يمكنك تحديد أوقات مختلفة للخدمة المنزلية في الخطوة التالية.'
                    : 'Home collection increases orders by 50%. You can set different hours for home service in the next step.'}
                </Text>
              </View>
            </NCard>
          </View>
        )}
      </NCard>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 4 — TEST/SCAN MENU BUILDER
// ══════════════════════════════════════════════════════════════════════════════
function LStep4({ data, update, submitRef }: StepProps<DiagnosticsRegData>) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const isLab = data.centerType === 'lab' || data.centerType === 'both';
  const isRad = data.centerType === 'radiology' || data.centerType === 'both';
  const [tab, setTab] = useState<'lab' | 'rad'>(isLab ? 'lab' : 'rad');
  const [search, setSearch] = useState('');
  const [expandedTest, setExpanded] = useState<string | null>(null);
  const labCatalog = useServicesCatalog('lab');
  const radCatalog = useServicesCatalog('radiology');

  const toggleTest = (id: string) => {
    const isChecking = !data.enabledTests.includes(id);
    const tests = isChecking ? [...data.enabledTests, id] : data.enabledTests.filter(t => t !== id);
    update({ enabledTests: tests });
    if (isChecking) setExpanded(id);
  };

  const toggleScan = (id: string) => {
    const isChecking = !data.enabledScans.includes(id);
    const scans = isChecking ? [...data.enabledScans, id] : data.enabledScans.filter(s => s !== id);
    update({ enabledScans: scans });
    if (isChecking) setExpanded(id);
  };

  const setTestPrice = (id: string, price: string) => {
    update({ testPrices: { ...data.testPrices, [id]: price } });
  };

  const setScanPrice = (id: string, price: string) => {
    update({ scanPrices: { ...data.scanPrices, [id]: price } });
  };

  const setTestHome = (id: string, val: boolean) => {
    update({ testHomeAvail: { ...data.testHomeAvail, [id]: val } });
  };

  const setTestTurnaround = (id: string, val: string) => {
    update({ testTurnaround: { ...data.testTurnaround, [id]: val } });
  };
  const setTestInsurance = (id: string, val: boolean) => {
    update({ testInsuranceCov: { ...data.testInsuranceCov, [id]: val } });
  };
  const setScanInsurance = (id: string, val: boolean) => {
    update({ scanInsuranceCov: { ...data.scanInsuranceCov, [id]: val } });
  };

  const filteredTests = labCatalog.filter(t =>
    t.ar.includes(search) || t.en.toLowerCase().includes(search.toLowerCase())
  );
  const filteredScans = radCatalog.filter(s =>
    s.ar.includes(search) || s.en.toLowerCase().includes(search.toLowerCase())
  );

  const validate = () => {
    if (isLab && data.enabledTests.length === 0 && !isRad) {
      Alert.alert(AR ? 'تنبيه' : 'Warning', AR ? 'يجب تفعيل تحليل واحد على الأقل' : 'Enable at least one test');
      return false;
    }
    if (isRad && data.enabledScans.length === 0 && !isLab) {
      Alert.alert(AR ? 'تنبيه' : 'Warning', AR ? 'يجب تفعيل نوع أشعة واحد على الأقل' : 'Enable at least one scan');
      return false;
    }
    return true;
  };

  const handleNext = (): boolean => {
    if (!validate()) return false;
    return true;
  };
  useStepSaver(submitRef, handleNext);

  return (
    <View>

      {/* Tab selector */}
      {data.centerType === 'both' && (
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.xl }}>
          {isLab && (
            <TouchableOpacity onPress={() => setTab('lab')}
              style={[st.tabBtn, {
                backgroundColor: tab === 'lab' ? tokens.purple : theme.surface2,
                borderColor: tab === 'lab' ? tokens.purple : theme.border,
                flex: 1,
              }]}>
              <Icon name="test_tube" size={16} color={tab === 'lab' ? theme.textInv : theme.text} />
              <Text style={{ color: tab === 'lab' ? theme.textInv : theme.text, fontWeight: FW.semi }}>
                {AR ? 'التحاليل' : 'Lab Tests'}
              </Text>
            </TouchableOpacity>
          )}
          {isRad && (
            <TouchableOpacity onPress={() => setTab('rad')}
              style={[st.tabBtn, {
                backgroundColor: tab === 'rad' ? tokens.mintDeep : theme.surface2,
                borderColor: tab === 'rad' ? tokens.mintDeep : theme.border,
                flex: 1,
              }]}>
              <Icon name="scan" size={16} color={tab === 'rad' ? theme.textInv : theme.text} />
              <Text style={{ color: tab === 'rad' ? theme.textInv : theme.text, fontWeight: FW.semi }}>
                {AR ? 'الأشعة' : 'Radiology'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Summary */}
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.lg }}>
        {isLab && (
          <NCard style={{ flex: 1, padding: SP.md, alignItems: 'center', backgroundColor: withAlpha(tokens.purple, 0.10) }}>
            <Text style={{ fontSize: FS['2xl'], fontWeight: FW.xbold, color: tokens.purple }}>
              {data.enabledTests.length}
            </Text>
            <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
              {AR ? 'تحليل مفعّل' : 'Tests Enabled'}
            </Text>
          </NCard>
        )}
        {isRad && (
          <NCard style={{ flex: 1, padding: SP.md, alignItems: 'center', backgroundColor: withAlpha(tokens.mintDeep, 0.10) }}>
            <Text style={{ fontSize: FS['2xl'], fontWeight: FW.xbold, color: tokens.mintDeep }}>
              {data.enabledScans.length}
            </Text>
            <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
              {AR ? 'أشعة مفعّلة' : 'Scans Enabled'}
            </Text>
          </NCard>
        )}
      </View>

      <NSearch value={search} onChange={setSearch}
        placeholder={AR ? 'ابحث عن فحص...' : 'Search test/scan...'}
        style={{ marginBottom: SP.lg }} />

      {/* Select/Clear All */}
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.lg }}>
        <View style={{ flex: 1 }}>
          <NBtn label={AR ? 'تحديد الكل' : 'Select All'} variant="outline" size="sm"
            onPress={() => {
              if (tab === 'lab') update({ enabledTests: labCatalog.map(t => t.id) });
              else update({ enabledScans: radCatalog.map(s => s.id) });
            }} />
        </View>
        <View style={{ flex: 1 }}>
          <NBtn label={AR ? 'إلغاء الكل' : 'Clear All'} variant="secondary" size="sm"
            onPress={() => {
              if (tab === 'lab') update({ enabledTests: [] });
              else update({ enabledScans: [] });
            }} />
        </View>
      </View>

      {/* LAB TESTS */}
      {(tab === 'lab' && isLab) && filteredTests.map(test => {
        const enabled = data.enabledTests.includes(test.id);
        const expanded = expandedTest === test.id;
        return (
          <NCard key={test.id} style={{ marginBottom: SP.sm }}
            accent={enabled ? tokens.purple : undefined}>
            <TouchableOpacity
              onPress={() => toggleTest(test.id)}
              style={{
                flexDirection: AR ? 'row-reverse' : 'row',
                alignItems: 'center', gap: SP.md,
              }}>
              <View style={[st.checkBox, {
                backgroundColor: enabled ? tokens.purple : 'transparent',
                borderColor: enabled ? tokens.purple : theme.border,
              }]}>
                {enabled && <Icon name="check" size={10} color={theme.textInv} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: FS.md, fontWeight: enabled ? FW.bold : FW.reg,
                  color: enabled ? tokens.purple : theme.text,
                  textAlign: AR ? 'right' : 'left',
                }}>
                  {AR ? test.ar : test.en}
                </Text>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: 2 }}>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
                    {test.hours < 1 ? `${test.hours * 60} min` : `${test.hours}h`}
                  </Text>
                  {test.fasting && (
                    <Text style={{ fontSize: FS.xs, color: theme.warn }}>
                      {AR ? `صيام ${(test as any).fastH ?? 8}h` : `Fasting ${(test as any).fastH ?? 8}h`}
                    </Text>
                  )}
                </View>
              </View>
              {enabled && (
                <TouchableOpacity onPress={() => setExpanded(expanded ? null : test.id)}>
                  <Icon name={expanded ? 'close' : 'edit'} size={14} color={theme.textSub} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* Expanded details */}
            {enabled && expanded && (
              <View style={{ marginTop: SP.lg, paddingTop: SP.md, borderTopWidth: 1, borderTopColor: theme.border }}>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
                  <View style={{ flex: 1 }}>
                    <NPriceInput label={AR ? 'السعر (ريال)' : 'Price (SAR)'}
                      value={data.testPrices[test.id] ?? ''}
                      onChange={v => setTestPrice(test.id, v)} required />
                  </View>
                  <View style={{ flex: 1 }}>
                    <NInput label={AR ? 'وقت النتيجة' : 'Turnaround'}
                      placeholder={`${test.hours}h`}
                      value={data.testTurnaround[test.id] ?? ''}
                      onChange={v => setTestTurnaround(test.id, v)}
                      style={{ marginBottom: 0 }} />
                  </View>
                </View>
                {data.hasHomeSvc && (
                  <NToggle
                    label={AR ? 'متاح للسحب المنزلي' : 'Available for home collection'}
                    value={data.testHomeAvail[test.id] ?? false}
                    onChange={v => setTestHome(test.id, v)}
                    style={{ marginTop: SP.sm }}
                  />
                )}
                {!data.cashOnly && (
                  <NToggle
                    label={AR ? 'يُغطى بالتأمين' : 'Covered by insurance'}
                    value={data.testInsuranceCov[test.id] ?? false}
                    onChange={v => update({ testInsuranceCov: { ...data.testInsuranceCov, [test.id]: v } })}
                    style={{ marginTop: SP.sm }}
                  />
                )}
              </View>
            )}
          </NCard>
        );
      })}

      {/* RADIOLOGY SCANS */}
      {(tab === 'rad' && isRad) && filteredScans.map(scan => {
        const enabled = data.enabledScans.includes(scan.id);
        return (
          <NCard key={scan.id} style={{ marginBottom: SP.sm }}
            accent={enabled ? tokens.mintDeep : undefined}>
            <TouchableOpacity
              onPress={() => toggleScan(scan.id)}
              style={{
                flexDirection: AR ? 'row-reverse' : 'row',
                alignItems: 'center', gap: SP.md,
              }}>
              <View style={[st.checkBox, {
                backgroundColor: enabled ? tokens.mintDeep : 'transparent',
                borderColor: enabled ? tokens.mintDeep : theme.border,
              }]}>
                {enabled && <Icon name="check" size={10} color={theme.textInv} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: FS.md, fontWeight: enabled ? FW.bold : FW.reg,
                  color: enabled ? tokens.mintDeep : theme.text,
                  textAlign: AR ? 'right' : 'left',
                }}>
                  {AR ? scan.ar : scan.en}
                </Text>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: 2 }}>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
                    {scan.hours < 1 ? `${scan.hours * 60} min` : `${scan.hours}h`}
                  </Text>
                  {scan.prep && (
                    <Text style={{ fontSize: FS.xs, color: theme.warn }}>
                      {AR ? 'تحضير مطلوب' : 'Prep required'}
                    </Text>
                  )}
                </View>
                {scan.prep && (scan as any).noteAr && (
                  <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 2, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? (scan as any).noteAr : ''}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {enabled && (
              <View style={{ marginTop: SP.md }}>
                <NPriceInput label={AR ? 'السعر (ريال)' : 'Price (SAR)'}
                  value={data.scanPrices[scan.id] ?? ''}
                  onChange={v => setScanPrice(scan.id, v)} required />
                {!data.cashOnly && (
                  <NToggle
                    label={AR ? 'يُغطى بالتأمين' : 'Covered by insurance'}
                    value={data.scanInsuranceCov[scan.id] ?? false}
                    onChange={v => setScanInsurance(scan.id, v)}
                    style={{ marginTop: SP.sm }}
                  />
                )}
              </View>
            )}
          </NCard>
        );
      })}

      <View style={{ height: SP.xl }} />
      
      <NDivider label={AR ? 'إنشاء حزم مخفّضة (اختياري)' : 'Bundle Builder (Optional)'} />
      <NCard style={{ backgroundColor: theme.primaryLight, marginBottom: SP.xl, marginTop: SP.md }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: SP.md }}>
          <Icon name="trending_up" size={18} color={theme.primary} />
          <Text style={{ flex: 1, fontSize: FS.sm, color: theme.primary, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
            {AR
              ? 'الحزم المخفّضة تزيد متوسط قيمة الطلب بنسبة 35% وتجذب المرضى الباحثين عن الفحوصات الشاملة.'
              : 'Discounted bundles increase average order value by 35% and attract patients seeking comprehensive checkups.'}
          </Text>
        </View>
      </NCard>
      
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.lg }}>
        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
          {AR ? 'باقات العروض:' : 'Offers & Bundles:'}
        </Text>
        <TouchableOpacity onPress={() => {
          const bundles = [...data.bundles, {
            id: Date.now().toString(),
            nameAr: '', nameEn: '', tests: [], price: '', discount: '20',
          }];
          update({ bundles });
        }}>
          <Text style={{ color: theme.primary, fontWeight: FW.bold }}>{AR ? '+ إضافة حزمة' : '+ Add Bundle'}</Text>
        </TouchableOpacity>
      </View>
      
      {data.bundles.map(bundle => (
        <NCard key={bundle.id} style={{ marginBottom: SP.lg }} accent={theme.primary}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.md }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
              {bundle.nameAr || (AR ? 'حزمة جديدة' : 'New Bundle')}
            </Text>
            <TouchableOpacity onPress={() => {
              update({ bundles: data.bundles.filter(b => b.id !== bundle.id) });
            }}>
              <Icon name="close" size={16} color={theme.danger} />
            </TouchableOpacity>
          </View>
          
          <NInput label={AR ? 'اسم الحزمة (عربي)' : 'Bundle Name (Ar)'} value={bundle.nameAr} onChange={v => update({ bundles: data.bundles.map(b => b.id === bundle.id ? { ...b, nameAr: v } : b) })} required />
          <NInput label={AR ? 'اسم الحزمة (إنجليزي)' : 'Bundle Name (En)'} value={bundle.nameEn} onChange={v => update({ bundles: data.bundles.map(b => b.id === bundle.id ? { ...b, nameEn: v } : b) })} required />
          
          <NPriceInput label={AR ? 'سعر الحزمة النهائي' : 'Final Bundle Price'} value={bundle.price} onChange={v => update({ bundles: data.bundles.map(b => b.id === bundle.id ? { ...b, price: v } : b) })} required />
        </NCard>
      ))}

      <View style={{ height: SP.xl }} />
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 5 — BUNDLE BUILDER
// ══════════════════════════════════════════════════════════════════════════════
// STEP 6 — SCHEDULE + INSURANCE
// ══════════════════════════════════════════════════════════════════════════════
function LStep6({ data, update, submitRef }: StepProps<DiagnosticsRegData>) {
 const insuranceCatalog = useInsuranceCatalog();
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  const [showVacationCal, setShowVacationCal] = useState(false);

  const PLAN_COLORS: Record<string, string> = {
    'VIP+': tokens.yellow, 'VIP': tokens.textTertiary, 'A': tokens.success, 'B': tokens.info, 'C': tokens.purple
  };

  const toggleDay = (field: 'workDays' | 'homeWorkDays', k: string) => {
    const days = data[field].includes(k)
      ? data[field].filter(d => d !== k)
      : [...data[field], k];
    update({ [field]: days } as any);
  };

  const toggleCompany = (coId: string) => {
    const current = data.acceptedInsurance || [];
    const index = current.findIndex(c => c.companyId === coId);
    if (index >= 0) {
      update({ acceptedInsurance: current.filter(c => c.companyId !== coId) });
    } else {
      update({ acceptedInsurance: [...current, { companyId: coId, plans: [] }] });
    }
  };

  const togglePlan = (coId: string, plan: string) => {
    const current = data.acceptedInsurance || [];
    const updated = current.map(item => {
      if (item.companyId === coId) {
        const nextPlans = item.plans.includes(plan)
          ? item.plans.filter(p => p !== plan)
          : [...item.plans, plan];
        return { ...item, plans: nextPlans };
      }
      return item;
    });
    update({ acceptedInsurance: updated });
  };

  const handleNext = (): boolean => { return true; };
  useStepSaver(submitRef, handleNext);

  return (
    <View>

      {/* Center Working Hours */}
      <NCard style={{ marginBottom: SP.xl }}>
        <Text style={[st.sectionTitle, { color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.lg }]}>
          {AR ? 'مواعيد عمل المركز' : 'Center Working Hours'}
        </Text>

        {/* Work days */}
        <Text style={[st.label, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>
          {AR ? 'أيام العمل' : 'Working Days'}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.lg }}>
          {WORK_DAYS.map(d => {
            const active = data.workDays.includes(d.k);
            return (
              <TouchableOpacity key={d.k} onPress={() => toggleDay('workDays', d.k)}
                style={[st.dayChip, {
                  backgroundColor: active ? theme.primary : theme.surface2,
                  borderColor: active ? theme.primary : theme.border,
                }]}>
                <Text style={{ color: active ? theme.textInv : theme.text, fontSize: FS.sm, fontWeight: FW.semi }}>
                  {AR ? d.ar : d.en}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', marginBottom: SP.md }}>
          {['morning', 'evening', 'both'].map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => update({ shiftType: s as any })}
              style={{
                flex: 1, padding: SP.sm, alignItems: 'center', backgroundColor: data.shiftType === s ? theme.primary : theme.surface,
                borderWidth: 1, borderColor: theme.border, borderRadius: 8, marginHorizontal: 4
              }}
            >
              <Text style={{ color: data.shiftType === s ? 'white' : theme.text, fontWeight: 'bold' }}>
                {s === 'morning' ? (AR ? 'صباحية' : 'Morning') : s === 'evening' ? (AR ? 'مسائية' : 'Evening') : (AR ? 'كلاهما' : 'Both')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {(data.shiftType === 'morning' || data.shiftType === 'both') && (
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
            <NInput label={AR ? 'وقت البدء (صباحاً)' : 'Morning Open'} placeholder="08:00"
              value={data.openTime} onChange={v => update({ openTime: v })}
              style={{ flex: 1, marginBottom: SP.sm }} />
            <NInput label={AR ? 'وقت الإغلاق (صباحاً)' : 'Morning Close'} placeholder="14:00"
              value={data.closeTime} onChange={v => update({ closeTime: v })}
              style={{ flex: 1, marginBottom: SP.sm }} />
          </View>
        )}

        {(data.shiftType === 'evening' || data.shiftType === 'both') && (
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
            <NInput label={AR ? 'وقت البدء (مساءً)' : 'Evening Open'} placeholder="16:00"
              value={data.eveningOpenTime} onChange={v => update({ eveningOpenTime: v })}
              style={{ flex: 1, marginBottom: SP.sm }} />
            <NInput label={AR ? 'وقت الإغلاق (مساءً)' : 'Evening Close'} placeholder="22:00"
              value={data.eveningCloseTime} onChange={v => update({ eveningCloseTime: v })}
              style={{ flex: 1, marginBottom: SP.sm }} />
          </View>
        )}
      </NCard>

      {/* Home collection hours */}
      {data.hasHomeSvc && (
        <NCard style={{ marginBottom: SP.xl }}>
          <Text style={[st.sectionTitle, { color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.lg }]}>
            {AR ? 'مواعيد الخدمة المنزلية' : 'Home Collection Hours'}
          </Text>
          <Text style={[st.label, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>
            {AR ? 'أيام الخدمة المنزلية' : 'Home Service Days'}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.lg }}>
            {WORK_DAYS.map(d => {
              const active = data.homeWorkDays.includes(d.k);
              return (
                <TouchableOpacity key={d.k} onPress={() => toggleDay('homeWorkDays', d.k)}
                  style={[st.dayChip, {
                    backgroundColor: active ? theme.primary : theme.surface2,
                    borderColor: active ? theme.primary : theme.border,
                  }]}>
                  <Text style={{ color: active ? theme.textInv : theme.text, fontSize: FS.sm, fontWeight: FW.semi }}>
                    {AR ? d.ar : d.en}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
            <NInput label={AR ? 'من' : 'From'} placeholder="07:00"
              value={data.homeOpenTime} onChange={v => update({ homeOpenTime: v })}
              style={{ flex: 1, marginBottom: 0 }} />
            <NInput label={AR ? 'إلى' : 'To'} placeholder="14:00"
              value={data.homeCloseTime} onChange={v => update({ homeCloseTime: v })}
              style={{ flex: 1, marginBottom: 0 }} />
          </View>
        </NCard>
      )}

      {/* Planned Vacation date calendar */}
      <TouchableOpacity onPress={() => setShowVacationCal(true)}>
        <NInput label={AR ? 'إجازة مخطط لها' : 'Planned Vacation'} placeholder={AR ? 'اختر التاريخ من التقويم...' : 'Select vacation date...'} value={data.vacationDate} editable={false} onChange={() => {}} />
      </TouchableOpacity>
      {showVacationCal && (
        <DateTimePicker
          value={data.vacationDate ? new Date(data.vacationDate) : new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowVacationCal(false);
            if (selectedDate) update({ vacationDate: selectedDate.toISOString().split('T')[0] });
          }}
        />
      )}

      {/* Insurance accepts */}
      <NCard style={{ marginBottom: SP.xl, marginTop: SP.md }}>
        <NToggle
          label={AR ? 'نقدي فقط (بدون تأمين)' : 'Cash Only (No Insurance)'}
          sub={AR ? 'تعطيل قبول أي تأمين في المركز' : 'Disable all insurance acceptance'}
          value={data.cashOnly}
          onChange={v => update({ cashOnly: v, acceptedInsurance: v ? [] : data.acceptedInsurance })}
        />
      </NCard>

      {!data.cashOnly && (
        <>
          <Text style={[st.sectionTitle, { color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }]}>{AR ? 'شركات التأمين الطبية المعتمدة' : 'Accepted Medical Insurance Tiers'}</Text>
          {insuranceCatalog.map(co => {
            const acceptedObj = data.acceptedInsurance?.find(c => c.companyId === co.id);
            const isAccepted = !!acceptedObj;

            return (
              <NCard key={co.id} style={{ marginBottom: SP.sm }}>
                <TouchableOpacity onPress={() => toggleCompany(co.id)}
                  style={{
                    flexDirection: AR ? 'row-reverse' : 'row',
                    alignItems: 'center', justifyContent: 'space-between',
                  }}>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
                    <View style={[st.checkBox, {
                      backgroundColor: isAccepted ? theme.primary : 'transparent',
                      borderColor: isAccepted ? theme.primary : theme.border,
                    }]}>
                      {isAccepted && <Icon name="check" size={10} color={theme.textInv} />}
                    </View>
                    <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
                      {AR ? co.ar : co.en}
                    </Text>
                  </View>
                </TouchableOpacity>

                {isAccepted && (
                  <View style={{ marginTop: SP.sm, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.sm }}>
                    <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>{AR ? 'الفئات المقبولة للفحوصات والتحاليل:' : 'Accepted Tiers:'}</Text>
                    <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 6 }}>
                      {co.plans.map(p => {
                        const hasPlan = acceptedObj.plans.includes(p);
                        return (
                          <TouchableOpacity key={p} onPress={() => togglePlan(co.id, p)} style={{ paddingHorizontal: SP.sm, paddingVertical: 4, borderRadius: R.sm, borderWidth: 1, borderColor: hasPlan ? theme.primary : theme.border, backgroundColor: hasPlan ? theme.primaryLight : theme.bg }}>
                            <Text style={{ fontSize: FS.xs, color: hasPlan ? theme.primary : theme.textSub }}>{p}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </NCard>
            );
          })}
        </>
      )}

      <View style={{ height: SP.xl }} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  label: { fontSize: FS.sm, fontWeight: FW.semi, marginBottom: SP.xs },
  err: { fontSize: FS.xs, marginTop: SP.xs, marginBottom: SP.sm },
  sectionTitle: { fontSize: FS.md, fontWeight: FW.bold, marginBottom: SP.md },
  typeRow: { borderRadius: R.lg, borderWidth: 1.5, padding: SP.lg, gap: SP.md, alignItems: 'center', marginBottom: SP.sm },
  docCard: { borderRadius: R.xl, borderWidth: 2, padding: SP.lg, alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 90, marginHorizontal: 2 },
  docGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SP.md, marginBottom: SP.xl },
  chip: { paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: R.full, borderWidth: 1.5, marginBottom: 4 },
  dayChip: { paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: R.full, borderWidth: 1.5, marginBottom: 4 },
  mapBox: { borderRadius: R.xl, borderWidth: 2, borderStyle: 'dashed', padding: SP.xxl, alignItems: 'center' },
  tabBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SP.sm, paddingVertical: SP.md, borderRadius: R.lg, borderWidth: 1.5 },
  checkBox: { width: 22, height: 22, borderRadius: R.sm, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  testChip: { paddingHorizontal: SP.sm, paddingVertical: SP.xs, borderRadius: R.full, borderWidth: 1, marginBottom: 4 },
  sumRow: { flexDirection: 'row', alignItems: 'center', gap: SP.md, paddingVertical: SP.sm },
});
