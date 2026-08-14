import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Switch, Dimensions, Alert, TextInput, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import SignatureCanvas from 'react-native-signature-canvas';
import { ProviderApi } from '../../api/provider';
import { useTheme, useLang, useToast } from '../../context';
import {
  NBtn, NCard, NInput, NPhoneInput, NPassStrength,
  NCheckbox, NToggle, NBadge, NDivider,
  NHeader, NScroll, NPriceInput, NSearch, NDropdown, NDatePickerSheet
} from '../../components/ui';
import { I as Icon, IBg as IconBg, ProviderIcon } from '../../components/icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Validate } from '../../security/Security';
import { SP, R, FS, FW, CITIES, INSURANCE, C, LAB_TESTS, RAD_SCANS, LIMITS } from '../../constants';
import { RegistrationSuccess } from '../shared/SharedScreens';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { ContractModal } from '../../components/ContractModal';
import { OtpModal } from '../../components/OtpModal';
import { SuccessScreen } from '../../components/SuccessScreen';
import { SignatureCanvasModal } from '../../components/SignatureCanvasModal';

const { width: W } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
const CENTER_TYPES = [
  { id: 'lab', color: '#9C27B0', label_ar: 'معمل تحاليل', label_en: 'Laboratory' },
  { id: 'radiology',color: '#009688', label_ar: 'مركز أشعة', label_en: 'Radiology Center' },
  { id: 'both', color: '#3F51B5', label_ar: 'معمل تحاليل + أشعة', label_en: 'Lab + Radiology' },
] as const;

interface LabRegData {
  // Step 1
  nameAr: string; nameEn: string; centerType: string;
  managerName: string; managerPhone: string; managerEmail: string;
  techOfficerName: string; techOfficerScfhs: string;
  password: string; confirmPass: string;
  // Step 2
  crNumber: string; mohLicense: string; iban: string; accountHolderName: string;
  taxNumber: string;
  crUri: string; mohUri: string; logoUri: string;
  // Step 3
  city: string; location: {lat: number; lng: number}; district: string; address: string;
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

const INIT: LabRegData = {
  nameAr: '', nameEn: '', centerType: '',
  managerName: '', managerPhone: '', managerEmail: '',
  techOfficerName: '', techOfficerScfhs: '',
  password: '', confirmPass: '',
  crNumber: '', mohLicense: '', iban: '', accountHolderName: '', taxNumber: '',
  crUri: '', mohUri: '', logoUri: '',
  city: '', location: { lat: 24.7136, lng: 46.6753 }, district: '', address: '',
  hasHomeSvc: false, homeRadius: 8, homeCollectorCount: '2', homeCollectionFee: '', targetGenders: 'both', homeCollectorGender: 'both',
  enabledTests: [], testPrices: {}, testHomeAvail: {}, testTurnaround: {}, testInsuranceCov: {}, scanInsuranceCov: {},
  enabledScans: [], scanPrices: {},
  bundles: [],
  workDays: ['sun', 'mon', 'tue', 'wed', 'thu'],
  shiftType: 'morning', openTime: '08:00', closeTime: '14:00', eveningOpenTime: '16:00', eveningCloseTime: '22:00',
  homeWorkDays: ['sun', 'mon', 'tue', 'wed', 'thu'],
  homeShiftType: 'morning', homeOpenTime: '08:00', homeCloseTime: '14:00', homeEveningOpenTime: '16:00', homeEveningCloseTime: '22:00',
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

// ══════════════════════════════════════════════════════════════════════════════
// LAB REGISTRATION NAVIGATOR
// ══════════════════════════════════════════════════════════════════════════════
export function LabRegistration({ onBack, onDone, providerType }: { onBack: () => void; onDone: () => void; providerType: string }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<LabRegData>({ ...INIT, centerType: providerType });
  const [showMap, setShowMap] = useState(false);
  const TOTAL = 7;
  const [showSuccess, setShowSuccess] = useState(false);
  const update = useCallback((p: Partial<LabRegData>) => setData(prev => ({ ...prev, ...p })), []);
  const next = () => { if (step < TOTAL) setStep(s => s + 1); else setStep(8); };
  const back = () => { if (step === 1) onBack(); else setStep(s => s - 1); };

  const screens: Record<number, React.ReactElement> = {
    8: <SuccessScreen onDone={() => { setShowSuccess(false); onDone(); }} />,
    1: <LStep1 data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    2: <LStep2 data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    3: <LStep3 data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    4: <LStep4 data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    5: <LStep6 data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    6: <LStep7AdminWarning data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    7: <LStep8Signature data={data} update={update} onDone={onDone} onBack={back} step={step} total={TOTAL} />,
  };
  return screens[step] ?? null;
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 1 — BASIC INFO
// ══════════════════════════════════════════════════════════════════════════════
function LStep1({ data, update, onNext, onBack, step, total }: {
  data: LabRegData; update: (p: Partial<LabRegData>) => void;
  onNext: () => void; onBack: () => void; step: number; total: number;
}) {
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
  
    const handleNext = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await ProviderApi.start({
        phone: data.managerPhone,
        password: data.password,
        full_name: data.managerName,
        email: data.managerEmail,
        type: data.centerType === 'lab' ? 'lab' : 'radiology',
      });
      await ProviderApi.login(data.managerEmail, data.password);
      onNext();
    } catch (e: any) {
      try {
        await ProviderApi.login(data.managerEmail, data.password);
        onNext();
      } catch (loginErr: any) {
        setErrs({ phone: e.message || 'Error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <NScroll>
      <NHeader
        title={AR ? 'بيانات المركز الأساسية' : 'Center Basic Info'}
        sub={AR ? 'أدخل بيانات معملك أو مركز الأشعة' : 'Enter your lab or radiology center details'}
        step={step} total={total} onBack={onBack}
      />

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

      <NBtn label={AR ? 'التالي' : 'Next'} onPress={handleNext} loading={loading} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 2 — KYC & LICENSES
// ══════════════════════════════════════════════════════════════════════════════
function LStep2({ data, update, onNext, onBack, step, total }: {
  data: LabRegData; update: (p: Partial<LabRegData>) => void;
  onNext: () => void; onBack: () => void; step: number; total: number;
}) {
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

  const pickDocument = (field: keyof LabRegData) => {
    Alert.alert(
      AR ? 'إرفاق مستند' : 'Attach Document',
      AR ? 'اختر طريقة الرفع' : 'Choose upload method',
      [
        {
          text: AR ? 'الكاميرا' : 'Camera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              show(AR ? 'صلاحية الكاميرا مطلوبة' : 'Camera permission required', 'error');
              return;
            }
            let result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
            if (!result.canceled) {
              update({ [field]: result.assets[0].uri } as any);
              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
            }
          }
        },
        {
          text: AR ? 'معرض الصور' : 'Photo Gallery',
          onPress: async () => {
            let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
            if (!result.canceled) {
              update({ [field]: result.assets[0].uri } as any);
              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
            }
          }
        },
        {
          text: AR ? 'ملفات / PDF' : 'Files / PDF',
          onPress: async () => {
            let result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              update({ [field]: result.assets[0].uri } as any);
              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
            }
          }
        },
        {
          text: AR ? 'إلغاء' : 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const DocCard = ({ label, field, req }: { label: string; field: keyof LabRegData; req?: boolean }) => {
    const done = !!(data[field] as string);
    return (
      <TouchableOpacity onPress={() => pickDocument(field)}
        style={[st.docCard, {
          backgroundColor: done ? theme.successBg : theme.surface2,
          borderColor: done ? theme.success : theme.border,
          borderStyle: done ? 'solid' : 'dashed',
        }]}>
        <IconBg
          name={done ? 'check' : 'upload'}
          size={16}
          color={done ? theme.success : theme.textSub}
          bg={done ? theme.successBg : theme.surface3}
        />
        <Text style={{
          fontSize: FS.sm, color: done ? theme.success : theme.text,
          fontWeight: FW.semi, textAlign: 'center', marginTop: SP.xs,
        }}>
          {label}{req && !done && <Text style={{ color: theme.danger }}> *</Text>}
        </Text>
        <Text style={{ fontSize: FS.xs, color: done ? theme.success : theme.textSub, marginTop: 2 }}>
          {done ? (AR ? 'تم الرفع' : 'Uploaded') : (AR ? 'اضغط للرفع' : 'Tap to upload')}
        </Text>
      </TouchableOpacity>
    );
  };

  const [loading, setLoading] = useState(false);
  const handleNext = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const crUrl = await ProviderApi.uploadFile(data.crUri, 'image/jpeg', 'cr.jpg');
      const mohUrl = await ProviderApi.uploadFile(data.mohUri, 'image/jpeg', 'moh.jpg');
      
      let radUrl: string | undefined = undefined;
      // if (radUrl) radUrl = await ProviderApi.uploadFile(radUrl, 'application/pdf', 'rad.pdf');

      await ProviderApi.step2({
        license_number: data.crNumber,
        license_documents: [crUrl, mohUrl, radUrl].filter(Boolean) as string[],
      });
      onNext();
    } catch (e: any) {
      show(AR ? 'فشل رفع المستندات' : 'Failed to upload documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <NScroll>
      <NHeader
        title={AR ? 'التراخيص والوثائق القانونية' : 'Licenses & Legal Documents'}
        sub={AR ? 'جميع البيانات مشفّرة ومحمية' : 'All data is encrypted & protected'}
        step={step} total={total} onBack={onBack}
      />

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
        <DocCard label={AR ? 'السجل\nالتجاري' : 'CR\nDoc'} field="crUri" req />
        <DocCard label={AR ? 'ترخيص\nMOH' : 'MOH\nLicense'} field="mohUri" req />
        <DocCard label={AR ? 'شعار\nالمركز' : 'Center\nLogo'} field="logoUri" />
      </View>

      <NBtn label={AR ? 'التالي' : 'Next'} onPress={handleNext} loading={loading} style={{ marginTop: SP.lg }} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3 — LOCATION & HOME COLLECTION
// ══════════════════════════════════════════════════════════════════════════════
function LStep3({ data, update, onNext, onBack, step, total }: {
  data: LabRegData; update: (p: Partial<LabRegData>) => void;
  onNext: () => void; onBack: () => void; step: number; total: number;
}) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [showLocModal, setShowLocModal] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!data.city) e.city = AR ? 'اختر المدينة' : 'Choose city';
    if (!data.address.trim()) e.address = AR ? 'العنوان مطلوب' : 'Address required';
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const [loading, setLoading] = useState(false);
  const handleNext = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await ProviderApi.start({
        phone: data.managerPhone,
        password: data.password,
        full_name: data.managerName,
        email: data.managerEmail,
        type: data.centerType === 'lab' ? 'lab' : 'radiology',
      });
      await ProviderApi.login(data.managerEmail, data.password);
      onNext();
    } catch (e: any) {
      try {
        await ProviderApi.login(data.managerEmail, data.password);
        onNext();
      } catch (loginErr: any) {
        setErrs({ phone: e.message || 'Error' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <NScroll>
      <NHeader
        title={AR ? (data.centerType === 'radiology' ? 'الموقع والتصوير المنزلي' : 'الموقع وخدمة السحب المنزلي') : (data.centerType === 'radiology' ? 'Location & Home Scan' : 'Location & Home Collection')}
        sub={AR ? (data.centerType === 'radiology' ? 'حدد موقع المركز ونطاق التصوير المنزلي' : 'حدد موقع المركز ونطاق الخدمة المنزلية') : 'Set center location and home service coverage'}
        step={step} total={total} onBack={onBack}
      />

      {/* City */}
      <View style={{ marginBottom: SP.lg }}>
        <Text style={[st.label, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>
          {AR ? 'المدينة' : 'City'}<Text style={{ color: theme.danger }}> *</Text>
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: SP.sm }}>
            {CITIES.map(c => (
              <TouchableOpacity key={c.id} onPress={() => update({ city: c.id })}
                style={[st.chip, {
                  backgroundColor: data.city === c.id ? theme.primary : theme.surface2,
                  borderColor: data.city === c.id ? theme.primary : theme.border,
                }]}>
                <Text style={{
                  color: data.city === c.id ? '#FFF' : theme.text,
                  fontSize: FS.sm, fontWeight: FW.med,
                }}>
                  {AR ? c.ar : c.en}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      
        {errs.city && <Text style={[st.err, { color: theme.danger }]}>{errs.city}</Text>}
      </View>

      <NInput label={AR ? 'الحي / المنطقة' : 'District / Area'}
        placeholder={AR ? 'حي الورود' : 'Al-Wurud'}
        value={data.district} onChange={v => update({ district: v })} caps="words" />

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
                    color: data.homeRadius === r ? '#FFF' : theme.text,
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
                  style={{ flex: 1, padding: 12, borderWidth: 1, borderColor: data.targetGenders === g ? theme.primary : theme.border, backgroundColor: data.targetGenders === g ? '#9C27B010' : '#FFF', borderRadius: 8, alignItems: 'center' }}>
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

      <NBtn label={AR ? 'التالي' : 'Next'} onPress={() => { if (validate()) onNext(); }} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 4 — TEST/SCAN MENU BUILDER
// ══════════════════════════════════════════════════════════════════════════════
function LStep4({ data, update, onNext, onBack, step, total }: {
  data: LabRegData; update: (p: Partial<LabRegData>) => void;
  onNext: () => void; onBack: () => void; step: number; total: number;
}) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const isLab = data.centerType === 'lab' || data.centerType === 'both';
  const isRad = data.centerType === 'radiology' || data.centerType === 'both';
  const [tab, setTab] = useState<'lab' | 'rad'>(isLab ? 'lab' : 'rad');
  const [search, setSearch] = useState('');
  const [expandedTest, setExpanded] = useState<string | null>(null);

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

  const filteredTests = LAB_TESTS.filter(t =>
    t.ar.includes(search) || t.en.toLowerCase().includes(search.toLowerCase())
  );
  const filteredScans = RAD_SCANS.filter(s =>
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

  return (
    <NScroll>
      <NHeader
        title={AR ? 'قائمة الفحوصات والأسعار' : 'Test/Scan Menu & Pricing'}
        sub={AR ? 'حدد الفحوصات المتاحة وأسعارها' : 'Select available tests/scans and set pricing'}
        step={step} total={total} onBack={onBack}
      />

      {/* Tab selector */}
      {data.centerType === 'both' && (
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.xl }}>
          {isLab && (
            <TouchableOpacity onPress={() => setTab('lab')}
              style={[st.tabBtn, {
                backgroundColor: tab === 'lab' ? '#9C27B0' : theme.surface2,
                borderColor: tab === 'lab' ? '#9C27B0' : theme.border,
                flex: 1,
              }]}>
              <Icon name="test_tube" size={16} color={tab === 'lab' ? '#FFF' : theme.text} />
              <Text style={{ color: tab === 'lab' ? '#FFF' : theme.text, fontWeight: FW.semi }}>
                {AR ? 'التحاليل' : 'Lab Tests'}
              </Text>
            </TouchableOpacity>
          )}
          {isRad && (
            <TouchableOpacity onPress={() => setTab('rad')}
              style={[st.tabBtn, {
                backgroundColor: tab === 'rad' ? '#009688' : theme.surface2,
                borderColor: tab === 'rad' ? '#009688' : theme.border,
                flex: 1,
              }]}>
              <Icon name="scan" size={16} color={tab === 'rad' ? '#FFF' : theme.text} />
              <Text style={{ color: tab === 'rad' ? '#FFF' : theme.text, fontWeight: FW.semi }}>
                {AR ? 'الأشعة' : 'Radiology'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Summary */}
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.lg }}>
        {isLab && (
          <NCard style={{ flex: 1, padding: SP.md, alignItems: 'center', backgroundColor: '#9C27B010' }}>
            <Text style={{ fontSize: FS['2xl'], fontWeight: FW.xbold, color: '#9C27B0' }}>
              {data.enabledTests.length}
            </Text>
            <Text style={{ fontSize: FS.xs, color: theme.textSub }}>
              {AR ? 'تحليل مفعّل' : 'Tests Enabled'}
            </Text>
          </NCard>
        )}
        {isRad && (
          <NCard style={{ flex: 1, padding: SP.md, alignItems: 'center', backgroundColor: '#00968810' }}>
            <Text style={{ fontSize: FS['2xl'], fontWeight: FW.xbold, color: '#009688' }}>
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
              if (tab === 'lab') update({ enabledTests: LAB_TESTS.map(t => t.id) });
              else update({ enabledScans: RAD_SCANS.map(s => s.id) });
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
            accent={enabled ? '#9C27B0' : undefined}>
            <TouchableOpacity
              onPress={() => toggleTest(test.id)}
              style={{
                flexDirection: AR ? 'row-reverse' : 'row',
                alignItems: 'center', gap: SP.md,
              }}>
              <View style={[st.checkBox, {
                backgroundColor: enabled ? '#9C27B0' : 'transparent',
                borderColor: enabled ? '#9C27B0' : theme.border,
              }]}>
                {enabled && <Icon name="check" size={10} color="#FFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: FS.md, fontWeight: enabled ? FW.bold : FW.reg,
                  color: enabled ? '#9C27B0' : theme.text,
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
            accent={enabled ? '#009688' : undefined}>
            <TouchableOpacity
              onPress={() => toggleScan(scan.id)}
              style={{
                flexDirection: AR ? 'row-reverse' : 'row',
                alignItems: 'center', gap: SP.md,
              }}>
              <View style={[st.checkBox, {
                backgroundColor: enabled ? '#009688' : 'transparent',
                borderColor: enabled ? '#009688' : theme.border,
              }]}>
                {enabled && <Icon name="check" size={10} color="#FFF" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: FS.md, fontWeight: enabled ? FW.bold : FW.reg,
                  color: enabled ? '#009688' : theme.text,
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
              </View>
            )}
          </NCard>
        );
      })}

      {/* Add custom test */}
      <NBtn label={AR ? '+ إضافة فحص مخصص (يتطلب موافقة)' : '+ Add Custom Test (Requires Approval)'}
        variant="outline" style={{ marginTop: SP.lg }}
        onPress={() => show(AR ? 'سيُرسل للإدارة للموافقة' : 'Will be sent to admin for approval', 'info')} />

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
      <NBtn label={AR ? 'التالي' : 'Next'} onPress={() => { if (validate()) onNext(); }} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 5 — BUNDLE BUILDER
// ══════════════════════════════════════════════════════════════════════════════
function LStep5({ data, update, onNext, onBack, step, total }: {
  data: LabRegData; update: (p: Partial<LabRegData>) => void;
  onNext: () => void; onBack: () => void; step: number; total: number;
}) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const addBundle = () => {
    const bundles = [...data.bundles, {
      id: Date.now().toString(),
      nameAr: '', nameEn: '', tests: [], price: '', discount: '20',
    }];
    update({ bundles });
  };

  const updateBundle = (id: string, patch: Partial<typeof data.bundles[0]>) => {
    update({ bundles: data.bundles.map(b => b.id === id ? { ...b, ...patch } : b) });
  };

  const removeBundle = (id: string) => {
    update({ bundles: data.bundles.filter(b => b.id !== id) });
  };

  const toggleBundleTest = (bundleId: string, testId: string) => {
    const bundle = data.bundles.find(b => b.id === bundleId);
    if (!bundle) return;
    const tests = bundle.tests.includes(testId)
      ? bundle.tests.filter(t => t !== testId)
      : [...bundle.tests, testId];
    updateBundle(bundleId, { tests });
  };

  // All available tests/scans that are enabled
  const allItems = [
    ...data.enabledTests.map(id => {
      const test = LAB_TESTS.find(t => t.id === id);
      return test ? { id: test.id, nameAr: test.ar, nameEn: test.en, type: 'lab' } : null;
    }),
    ...data.enabledScans.map(id => {
      const scan = RAD_SCANS.find(s => s.id === id);
      return scan ? { id: scan.id, nameAr: scan.ar, nameEn: scan.en, type: 'rad' } : null;
    }),
  ].filter(Boolean) as { id: string; nameAr: string; nameEn: string; type: string }[];

  return (
    <NScroll>
      <NHeader
        title={AR ? 'إنشاء حزم مخفّضة' : 'Bundle Builder'}
        sub={AR ? 'أنشئ حزم فحوصات بسعر مخفّض لزيادة الطلبات' : 'Create discounted test bundles to boost orders'}
        step={step} total={total} onBack={onBack}
      />

      <NCard style={{ backgroundColor: theme.primaryLight, marginBottom: SP.xl }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: SP.md }}>
          <Icon name="trending_up" size={18} color={theme.primary} />
          <Text style={{ flex: 1, fontSize: FS.sm, color: theme.primary, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
            {AR
              ? 'الحزم المخفّضة تزيد متوسط قيمة الطلب بنسبة 35% وتجذب المرضى الباحثين عن الفحوصات الشاملة.'
              : 'Discounted bundles increase average order value by 35% and attract patients seeking comprehensive checkups.'}
          </Text>
        </View>
      </NCard>

      {/* Suggested bundles */}
      {data.bundles.length === 0 && (
        <NCard style={{ alignItems: 'center', padding: SP.xxl, marginBottom: SP.xl }}>
          <IconBg name="add" size={22} color={theme.primary} bg={theme.primaryLight} />
          <Text style={{ fontSize: FS.md, color: theme.text, fontWeight: FW.semi, marginTop: SP.lg, textAlign: 'center' }}>
            {AR ? 'لم تنشئ أي حزمة بعد' : 'No bundles created yet'}
          </Text>
          <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: SP.xs, textAlign: 'center' }}>
            {AR ? 'اضغط "+ إنشاء حزمة" للبدء' : 'Tap "+ Create Bundle" to start'}
          </Text>
        </NCard>
      )}

      {/* Existing bundles */}
      {data.bundles.map(bundle => (
        <NCard key={bundle.id} style={{ marginBottom: SP.lg }} accent={theme.primary}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.md }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
              {AR ? 'حزمة جديدة' : 'New Bundle'}
            </Text>
            <TouchableOpacity onPress={() => removeBundle(bundle.id)}>
              <Icon name="close" size={16} color={theme.danger} />
            </TouchableOpacity>
          </View>

          <NInput
            label={AR ? 'اسم الحزمة بالعربي' : 'Bundle Name (Arabic)'}
            placeholder={AR ? 'باقة الفحص الشامل' : 'Full Checkup Package'}
            value={bundle.nameAr}
            onChange={v => updateBundle(bundle.id, { nameAr: v })}
            caps="words" style={{ marginBottom: SP.sm }}
          />
          <NInput
            label={AR ? 'اسم الحزمة بالإنجليزي' : 'Bundle Name (English)'}
            placeholder="Full Checkup Package"
            value={bundle.nameEn}
            onChange={v => updateBundle(bundle.id, { nameEn: v })}
            caps="words" style={{ marginBottom: SP.sm }}
          />

          {/* Test selection */}
          <Text style={[st.label, { color: theme.text, textAlign: AR ? 'right' : 'left', marginTop: SP.md }]}>
            {AR ? 'الفحوصات المشمولة' : 'Included Tests'}
            <Text style={{ fontSize: FS.xs, color: theme.textSub }}> ({bundle.tests.length})</Text>
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.xs, marginBottom: SP.md }}>
            {allItems.map(item => {
              const active = bundle.tests.includes(item.id);
              return (
                <TouchableOpacity key={item.id} onPress={() => toggleBundleTest(bundle.id, item.id)}
                  style={[st.testChip, {
                    backgroundColor: active ? theme.primary : theme.surface2,
                    borderColor: active ? theme.primary : theme.border,
                  }]}>
                  <Text style={{ fontSize: FS.xs, color: active ? '#FFF' : theme.text }}>
                    {AR ? item.nameAr : item.nameEn}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Price & discount */}
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
            <View style={{ flex: 1 }}>
              <NPriceInput label={AR ? 'سعر الحزمة' : 'Bundle Price'}
                value={bundle.price} onChange={v => updateBundle(bundle.id, { price: v })} required />
            </View>
            <View style={{ flex: 1 }}>
              <NInput label={AR ? 'نسبة الخصم %' : 'Discount %'}
                placeholder="20" value={bundle.discount}
                onChange={v => updateBundle(bundle.id, { discount: v.replace(/\D/g, '') })}
                kbType="numeric" maxLen={2} style={{ marginBottom: 0 }} />
            </View>
          </View>

          {bundle.tests.length > 0 && bundle.price && (
            <NCard style={{ backgroundColor: theme.successBg, padding: SP.md, marginTop: SP.sm }}>
              <Text style={{ fontSize: FS.sm, color: theme.success, textAlign: AR ? 'right' : 'left' }}>
                {AR
                  ? `${bundle.tests.length} فحص بسعر ${bundle.price} ريال (خصم ${bundle.discount}%)`
                  : `${bundle.tests.length} tests for ${bundle.price} SAR (${bundle.discount}% off)`}
              </Text>
            </NCard>
          )}
        </NCard>
      ))}

      <NBtn label={AR ? '+ إنشاء حزمة جديدة' : '+ Create New Bundle'}
        variant="outline" onPress={addBundle} style={{ marginBottom: SP.xl }} />

      <NBtn label={AR ? 'التالي' : 'Next'} onPress={onNext} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 6 — SCHEDULE + INSURANCE
// ══════════════════════════════════════════════════════════════════════════════
function LStep6({ data, update, onNext, onBack, step, total }: {
  data: LabRegData; update: (p: Partial<LabRegData>) => void;
  onNext: () => void; onBack: () => void; step: number; total: number;
}) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const AR = lang === 'ar';
  const [showVacationCal, setShowVacationCal] = useState(false);

  const PLAN_COLORS: Record<string, string> = {
    'VIP+': '#FFD700', 'VIP': '#C0C0C0', 'A': '#4CAF50', 'B': '#2196F3', 'C': '#9C27B0'
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

  return (
    <NScroll>
      <NHeader
        title={AR ? 'المواعيد والتأمين' : 'Schedule & Insurance'}
        sub={AR ? 'حدد أوقات العمل وشركات التأمين المقبولة' : 'Set working hours and accepted insurance companies'}
        step={step} total={total} onBack={onBack}
      />

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
                <Text style={{ color: active ? '#FFF' : theme.text, fontSize: FS.sm, fontWeight: FW.semi }}>
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
                  <Text style={{ color: active ? '#FFF' : theme.text, fontSize: FS.sm, fontWeight: FW.semi }}>
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
          {INSURANCE.map(co => {
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
                      {isAccepted && <Icon name="check" size={10} color="#FFF" />}
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
      <NBtn label={AR ? 'التالي' : 'Next'} onPress={onNext} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 7 — ADMIN APPROVAL WARNING
// ══════════════════════════════════════════════════════════════════════════════
function LStep7AdminWarning({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  return (
    <NScroll>
      <NHeader title={AR ? 'نظام الموافقات' : 'Approval System'} step={step} total={total} onBack={onBack} />
      
      <View style={{ backgroundColor: theme.dangerBg, padding: SP.xl, borderRadius: R.lg, borderWidth: 1, borderColor: theme.danger, marginTop: SP.lg }}>
        <View style={{ alignSelf: 'center', marginBottom: SP.md }}><Icon name="info" size={40} color={theme.danger} /></View>
        <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.danger, textAlign: 'center', marginBottom: SP.md }}>
          {AR ? 'تنبيه هام جداً' : 'IMPORTANT NOTICE'}
        </Text>
        <Text style={{ fontSize: FS.md, color: theme.text, textAlign: AR ? 'right' : 'left', lineHeight: 24, marginBottom: SP.md }}>
          {AR ? 'جميع الفحوصات، الأسعار، الحزم، ومواعيد العمل التي قمت بإدخالها، لن تظهر فوراً للمرضى في التطبيق بعد إتمام التسجيل.' : 'All tests, scans, packages, and schedules you entered will NOT be visible immediately.'}
        </Text>
        <Text style={{ fontSize: FS.md, color: theme.text, textAlign: AR ? 'right' : 'left', lineHeight: 24 }}>
          {AR ? 'عند تحديث قائمة الفحوصات الطبية أو تعديل الأسعار مستقبلاً، سيتطلب الأمر أيضاً موافقة الإدارة (الأدمن) لضمان توافقها مع التراخيص الطبية قبل النشر.' : 'Any future updates to your test catalog or pricing must clear Admin Approval first before going live.'}
        </Text>
      </View>

      <NBtn label={AR ? 'أوافق وأتفهم ذلك' : 'I Understand & Agree'} onPress={onNext} style={{ marginTop: SP.xl }} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 8 — REVIEW & SIGNATURE
// ══════════════════════════════════════════════════════════════════════════════
function LStep8Signature({ data, update, onDone, onBack, step, total }: {
  data: LabRegData; update: (p: Partial<LabRegData>) => void;
  onDone: () => void; onBack: () => void; step: number; total: number;
}) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [showContract, setShowContract] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSigModal, setShowSigModal] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const handleVerifyOtp = async (code: string) => { return code === '1234'; };
  const [submitted, setSub] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const sigRef = useRef<any>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const submit = () => {
    if (!agreed) { show(AR ? 'يجب الموافقة على الشروط' : 'Must agree to terms', 'warning'); return; }
    if (!data.signatureData) {
      show(AR ? 'الرجاء توقيع العقد أولاً' : 'Please sign the contract first', 'error');
      return;
    }
    setShowOtp(true);
  };

  const finishSubmit = () => {
    handleSignature(data.signatureData);
  };

  const handleSignature = async (signature: string) => {
    setLoading(true);
    try {
      const docs: string[] = [];
      if (data.crUri) docs.push(await ProviderApi.uploadFile(data.crUri, 'application/pdf', 'cr_document'));
      if (data.mohUri) docs.push(await ProviderApi.uploadFile(data.mohUri, 'application/pdf', 'moh_license'));
      
      const images: string[] = [];
      if (data.logoUri) images.push(await ProviderApi.uploadFile(data.logoUri, 'image/jpeg', 'lab_logo'));

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
        equipment_list: data.enabledScans,
        scan_prices: data.scanPrices,
        consultation_modes: modes,
        home_visit_supported: data.hasHomeSvc,
        home_visit_radius_km: data.homeRadius,
        home_collection_fee: parseFloat(data.homeCollectionFee) || 0,
        target_genders: data.targetGenders,
        working_hours: workingHours,
        radiation_safety_license: (data as any).radSafetyLicense || undefined,
        available_equipment_text: (data as any).radEquipment || undefined,
      });

      await ProviderApi.step2({
        name_ar: data.nameAr,
        name_en: data.nameEn,
        city: data.city,
        location: data.location,
        address: data.address,
        district: data.district,
        accepts_insurance: !data.cashOnly && data.acceptedInsurance.length > 0,
        accepted_insurance: data.acceptedInsurance ? data.acceptedInsurance.map((ins: any) => ins.companyId) : [],
        cr_number: data.crNumber,
        moh_license_number: data.mohLicense,
        tax_number: data.taxNumber,
        license_documents: docs,
        clinic_images: images
      });

      const sigUrl = await ProviderApi.uploadSignature(signature);
      update({ signatureData: sigUrl });

      await ProviderApi.step2({
        iban: data.iban,
        bank_account_name: data.accountHolderName
      });
      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.location?.lat || 0, lng: data.location?.lng || 0 });

      show(AR ? 'تم إرسال الطلب وملحقاته بنجاح!' : 'Registration Submitted!', 'success');
      setSub(true);
    } catch (e: any) {
      show(e.message || (AR ? 'حدث خطأ' : 'Error submitting'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearSig = () => {
    sigRef.current?.clearSignature();
    update({ signatureData: '' });
  };

  if (submitted) return <RegistrationSuccess onDone={onDone} email={data.managerEmail} providerType={data.centerType === 'radiology' ? 'radiology' : 'lab'} />;

  const ct = CENTER_TYPES.find(c => c.id === data.centerType);
  const rows = [
    { label_ar: 'اسم المركز', label_en: 'Center Name', val: data.nameAr || '—' },
    { label_ar: 'النوع', label_en: 'Type', val: AR ? (ct?.label_ar ?? '—') : (ct?.label_en ?? '—') },
    { label_ar: 'المدينة', label_en: 'City', val: CITIES.find(c => c.id === data.city)?.[AR ? 'ar' : 'en'] ?? '—' },
    { label_ar: 'التحاليل', label_en: 'Lab Tests', val: `${data.enabledTests.length}` },
    { label_ar: 'الأشعة', label_en: 'Scans', val: `${data.enabledScans.length}` },
    { label_ar: 'الحزم', label_en: 'Bundles', val: `${data.bundles.length}` },
    { label_ar: 'خدمة منزلية', label_en: 'Home Svc', val: data.hasHomeSvc ? `${data.homeRadius} km` : (AR ? 'لا' : 'No') },
    { label_ar: 'التأمين', label_en: 'Insurance', val: data.cashOnly ? (AR ? 'نقدي' : 'Cash') : `${data.acceptedInsurance.length}` },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: SP.xl, paddingBottom: 0 }}>
        <NHeader title={AR ? 'مراجعة وإرسال' : 'Review & Submit'} onBack={onBack} step={step} total={total} />
      </View>

      <ScrollView scrollEnabled={scrollEnabled} style={{ flex: 1, paddingHorizontal: SP.xl }} keyboardShouldPersistTaps="handled">
        <NCard style={{ marginBottom: SP.lg }}>
          <Text style={[st.sectionTitle, { color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.lg }]}>
            {AR ? 'ملخص ملف المركز' : 'Center Summary'}
          </Text>
          {rows.map((row, i) => (
            <View key={i} style={[st.sumRow, {
              flexDirection: AR ? 'row-reverse' : 'row',
              borderBottomWidth: i < rows.length - 1 ? StyleSheet.hairlineWidth : 0,
              borderBottomColor: theme.border,
            }]}>
              <Text style={{ flex: 1, color: theme.textSub, fontSize: FS.sm, textAlign: AR ? 'right' : 'left' }}>
                {AR ? row.label_ar : row.label_en}
              </Text>
              <Text style={{ color: theme.text, fontWeight: FW.semi, fontSize: FS.sm }}>
                {row.val}
              </Text>
            </View>
          ))}
        </NCard>

        {/* Signature pad */}
        
          {/* Contract Modal & Button */}
          <ContractModal visible={showContract} onClose={() => setShowContract(false)} />
          <TouchableOpacity style={{ backgroundColor: theme.surface, padding: SP.md, borderRadius: 8, borderWidth: 1, borderColor: theme.primary, alignItems: 'center', marginBottom: SP.lg }} onPress={() => setShowContract(true)}>
            <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: FS.md }}>{AR ? 'الاطلاع على العقد' : 'View Contract'}</Text>
          </TouchableOpacity>

<Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm, marginTop: SP.xl }}>{AR ? 'اسم الموقّع' : 'Signatory Name'}</Text>
<NInput value={data.signerName} onChange={v => update({ signerName: v })} placeholder={AR ? 'الاسم الثلاثي' : 'Full Name'} />

<Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm, marginTop: SP.md }}>{AR ? 'صفة الموقّع / المسمى الوظيفي' : 'Signatory Role'}</Text>
<NInput value={data.signerRole} onChange={v => update({ signerRole: v })} placeholder={AR ? 'مثال: المالك، المدير العام' : 'e.g. Owner, General Manager'} />

<Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm, marginTop: SP.xl }}>
  {AR ? 'توقيع الممثل النظامي للمركز' : 'Authorized Representative Signature'}
</Text>

        
          {/* Bank Info */}
          <View style={{ marginBottom: SP.lg }}>
            <Text style={{ fontSize: FS.md, fontWeight: 'bold', color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
              {AR ? 'الحساب البنكي' : 'Bank Account'}
            </Text>
            <NInput
              label={AR ? 'اسم صاحب الحساب' : 'Account Holder Name'}
              value={data.accountHolderName}
              onChange={v => update({ accountHolderName: v })}
              placeholder={AR ? 'اسم مطابق للهوية/السجل التجاري' : 'Name matching ID/CR'}
            />
            <NInput
              label={AR ? 'رقم الآيبان IBAN' : 'Bank IBAN'}
              value={data.iban}
              onChange={v => update({ iban: v.toUpperCase().replace(/\s/g, '') })}
              placeholder="SA0000000000000000000000"
              maxLen={24}
            />
            <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'ملاحظة: سيتم تحويل مستحقاتك إلى هذا الحساب.' : 'Note: Your earnings will be transferred to this account.'}
            </Text>
          </View>


        <View style={{ marginBottom: 20, gap: 10 }}>
          {data.signatureData ? (
             <View style={{ alignItems: 'center', marginVertical: 10 }}>
               <Image source={{ uri: data.signatureData }} style={{ width: 200, height: 100, resizeMode: 'contain', backgroundColor: '#fff' }} />
               <TouchableOpacity onPress={() => setShowSigModal(true)} style={{ marginTop: 8 }}><Text style={{ color: theme.primary }}>{AR ? 'إعادة التوقيع' : 'Re-sign'}</Text></TouchableOpacity>
             </View>
          ) : (
            <TouchableOpacity onPress={() => setShowSigModal(true)} style={{ padding: 15, borderWidth: 1, borderColor: theme.primary, borderRadius: 8, alignItems: 'center', borderStyle: 'dashed', marginVertical: 10 }}>
              <Text style={{ color: theme.primary, fontWeight: 'bold' }}>{AR ? 'اضغط للتوقيع' : 'Tap to Sign'}</Text>
            </TouchableOpacity>
          )}
        </View>


        <NCard style={{ marginBottom: SP.lg, backgroundColor: theme.surface2 }}>
          <NCheckbox
            label={AR
              ? 'أوافق على شروط وأحكام نبضة بلس وسياسة الخصوصية، وأؤكد صحة جميع البيانات المدخلة.'
              : 'I agree to Nabdah Plus Terms & Conditions and Privacy Policy, and confirm all data is accurate.'}
            value={agreed} onChange={setAgreed}
          />
        </NCard>

        <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.info, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'ما الذي يحدث بعد الإرسال؟' : "What's next?"}
          </Text>
          {[
            { n: '1', ar: 'مراجعة الوثائق والتراخيص خلال 24-48 ساعة', en: 'Document review within 24-48 hours' },
            { n: '2', ar: 'تفعيل الحساب وبدء استقبال الطلبات', en: 'Account activation & start receiving orders' },
            { n: '3', ar: 'يمكنك تحديث قائمة الفحوصات والأسعار فوراً', en: 'Update test menu and pricing immediately' },
          ].map(s => (
            <View key={s.n} style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.xs, alignItems: 'flex-start' }}>
              <View style={{
                width: 20, height: 20, borderRadius: 10, backgroundColor: theme.info,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ color: '#FFF', fontSize: FS.xs, fontWeight: FW.bold }}>{s.n}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: FS.sm, color: theme.info, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
                {AR ? s.ar : s.en}
              </Text>
            </View>
          ))}
        </NCard>

        <NBtn label={AR ? 'إرسال ملف المركز للمراجعة' : 'Submit Center Application'}
          onPress={submit} loading={loading} disabled={!agreed} style={{ marginBottom: 50, backgroundColor: theme.success }} />
      </ScrollView>
      <ContractModal visible={showContract} onClose={() => setShowContract(false)} />
      <SignatureCanvasModal visible={showSigModal} onClose={() => setShowSigModal(false)} onOK={(sig) => update({ signatureData: sig })} />
      <OtpModal visible={showOtp} onClose={() => setShowOtp(false)} target={data.managerEmail} onVerify={async (code) => { const ok = await handleVerifyOtp(code); if(ok) { setShowOtp(false); finishSubmit(); return true; } return false; }} />
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
