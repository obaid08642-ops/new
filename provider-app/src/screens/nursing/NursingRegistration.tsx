import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Switch, Dimensions, Alert, TextInput, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import SignatureCanvas from 'react-native-signature-canvas';
import { ProviderApi, sanitizeWizardData } from '../../api/provider';
import { useInsuranceCatalog, useServicesCatalog } from '../../api/catalogs';
import { useTheme, useLang, useToast } from '../../context';
import {
  NBtn, NCard, NInput, NPhoneInput, NPassStrength,
  NCheckbox, NToggle, NBadge, NDivider,
  NHeader, NScroll, NPriceInput, NSearch, NDropdown, NDatePickerSheet
} from '../../components/ui';
import { I, IBg } from '../../components/icons';
import { Validate } from '../../security/Security';
import { SP, R, FS, FW, NURSING_SVCS, CITIES, INSURANCE, C , LANGS } from '../../constants';
import { RegistrationSuccess } from '../shared/SharedScreens';
import { ContractModal } from '../../components/ContractModal';
import { OtpModal } from '../../components/OtpModal';
import { sendEmailOtp, verifyEmailOtp } from '../../api/otp';
import { SuccessScreen } from '../../components/SuccessScreen';
import { SignatureCanvasModal } from '../../components/SignatureCanvasModal';
import { LocationPickerModal } from '../../components/LocationPickerModal';

const { width: W } = Dimensions.get('window');

const PROVIDER_MODES = [
  { id:'individual', ar:'ممرض/ممرضة مستقل', en:'Independent Nurse', color:'#E91E63' },
  { id:'company', ar:'شركة تمريض منزلي', en:'Nursing Company', color:'#9C27B0' },
] as const;

const PRICING_MODELS = [
  { id:'per_visit', ar:'بالزيارة', en:'Per Visit', hint_ar:'زيارة واحدة', hint_en:'Single visit' },
  { id:'per_hour', ar:'بالساعة', en:'Per Hour', hint_ar:'سعر الساعة الواحدة', hint_en:'Hourly rate' },
  { id:'per_day', ar:'باليوم', en:'Per Day', hint_ar:'إقامة يومية كاملة', hint_en:'Full day (24h) rate' },
  { id:'per_month', ar:'بالشهر', en:'Per Month', hint_ar:'عقد شهري متواصل', hint_en:'Monthly contract rate' },
] as const;

const WORK_DAYS = [
  { k: 'SUN', ar: 'الأحد', en: 'Sun' },
  { k: 'MON', ar: 'الاثنين', en: 'Mon' },
  { k: 'TUE', ar: 'الثلاثاء', en: 'Tue' },
  { k: 'WED', ar: 'الأربعاء', en: 'Wed' },
  { k: 'THU', ar: 'الخميس', en: 'Thu' },
  { k: 'FRI', ar: 'الجمعة', en: 'Fri' },
  { k: 'SAT', ar: 'السبت', en: 'Sat' },
] as const;

interface NurseRegData {
  mode: 'individual' | 'company';
  nameAr: string; nameEn: string;
  gender: string;
  languages: string[];
  managerName: string; managerPhone: string; managerEmail: string;
  password: string; confirmPass: string;
  // KYC
  scfhsNumber: string; scfhsExpiry: string; nationalId: string;
  crNumber: string; mohLicense: string; iban: string; accountHolderName: string;
  scfhsUri: string; crUri: string; mohUri: string; photoUri: string;
  // Services
  enabledServices: string[];
  // Pricing
  pricingModels: string[];
  priceVisit: string; priceHour: string; priceDay: string; priceMonth: string;
  // Coverage & Map
  city: string; location: {lat: number; lng: number}; district: string; address: string;
  coverageRadius: number; coverageAreas: string[];
  // Schedule
  workDays: string[]; shiftType: 'morning' | 'evening' | 'both'; openTime: string; closeTime: string; eveningOpenTime: string; eveningCloseTime: string; is24_7: boolean; vacationDate: string;
  // Insurance
  cashOnly: boolean;
  acceptedInsurance: { companyId: string; plans: string[] }[];
  // Submit
  signatureData: string; signerName: string; signerRole: string;
  termsAgreed: boolean;
}

const INIT: NurseRegData = {
  mode: 'individual', nameAr: '', nameEn: '', gender: '', managerName: '', managerPhone: '', managerEmail: '', password: '', confirmPass: '',
  scfhsNumber: '', scfhsExpiry: '', nationalId: '', crNumber: '', languages: [], mohLicense: '', iban: '', accountHolderName: '',
  scfhsUri: '', crUri: '', mohUri: '', photoUri: '',
  enabledServices: [],
  pricingModels: [], priceVisit: '', priceHour: '', priceDay: '', priceMonth: '',
  city: '', location: { lat: 0, lng: 0 }, district: '', address: '', coverageRadius: 0, coverageAreas: [],
  workDays: [], shiftType: 'morning', openTime: '', closeTime: '', eveningOpenTime: '', eveningCloseTime: '', is24_7: false, vacationDate: '',
  cashOnly: false, acceptedInsurance: [],
  signatureData: '', signerName: '', signerRole: '', termsAgreed: false,
};

// ══════════════════════════════════════════════════════════════════════════════
export function NursingRegistration({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<NurseRegData>(INIT);
  const [showMap, setShowMap] = useState(false);
  const TOTAL = 8;
  const [submitted, setSub] = useState(false);
  const update = useCallback((p: Partial<NurseRegData>) => setData(prev => ({ ...prev, ...p })), []);
  const next = () => { if (step < TOTAL) setStep(s => s + 1); else setStep(8); };
  const back = () => { if (step === 1) onBack(); else setStep(s => s - 1); };

  if (submitted) return <RegistrationSuccess onDone={onDone} email={data.managerEmail} providerType="nursing" />;

  const screens: Record<number, React.ReactElement> = {
    1: <NS1 data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    2: <NS2 data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    3: <NS3 data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    4: <NS4 data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    5: <NS5 data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    6: <NS6 data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    7: <PStep7SubmitAdminWarning data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    8: <NS8Signature data={data} update={update} onDone={() => setSub(true)} onBack={back} step={step} total={TOTAL} />,
  };
  return screens[step] ?? null;
}

// ── STEP 1: BASIC INFO ──────────────────────────────────────────
function NS1({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [showLocModal, setShowLocModal] = useState(false);

  const nameArRef = useRef<any>(null);
  const nameEnRef = useRef<any>(null);
  const mgrNameRef = useRef<any>(null);
  const emailRef = useRef<any>(null);
  const phoneRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);
  const confirmPassRef = useRef<any>(null);
  
  const validate = () => {
    const e: Record<string, string> = {};
    if (!data.mode) e.mode = AR ? 'اختر النوع' : 'Choose type';
    if (!data.nameAr.trim()) e.name = AR ? 'مطلوب' : 'Required';
    if (!data.managerName.trim()) e.mgr = AR ? 'مطلوب' : 'Required';
    if (!Validate.email(data.managerEmail)) e.email = AR ? 'بريد غير صحيح' : 'Invalid email';
    if (!Validate.phone(data.managerPhone)) e.phone = AR ? 'جوال غير صحيح' : 'Invalid phone';
    const ps = Validate.password(data.password);
    if (!ps.valid) e.pass = AR ? ps.msgAr : ps.msgEn;
    if (data.password !== data.confirmPass) e.conf = AR ? 'غير متطابق' : 'Mismatch';
    setErrs(e); return Object.keys(e).length === 0;
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
        type: 'home_care',
      });
      await ProviderApi.login(data.managerPhone, data.password);
      onNext();
    } catch (e: any) {
      try {
        await ProviderApi.login(data.managerPhone, data.password);
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
      <NHeader title={AR ? 'بيانات مقدم الخدمة' : 'Provider Basic Info'} sub={AR ? 'تمريض منزلي — اختر نوع التسجيل' : 'Home Nursing — choose registration type'} step={step} total={total} onBack={onBack} />

      <View style={{ marginBottom: SP.xl }}>
        <Text style={[st.label, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>{AR ? 'نوع مقدم الخدمة' : 'Provider Type'}<Text style={{ color: theme.danger }}> *</Text></Text>
        {PROVIDER_MODES.map(pm => {
          const sel = data.mode === pm.id;
          return (
            <TouchableOpacity key={pm.id} onPress={() => update({ mode: pm.id })}
              style={[st.typeRow, { backgroundColor: sel ? `${pm.color}10` : theme.surface2, borderColor: sel ? pm.color : theme.border, flexDirection: AR ? 'row-reverse' : 'row' }]}>
              <IBg name="nursing" size={18} color={pm.color} bg={`${pm.color}20`} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FS.md, fontWeight: sel ? FW.bold : FW.reg, color: sel ? pm.color : theme.text, textAlign: AR ? 'right' : 'left' }}>{AR ? pm.ar : pm.en}</Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: 4 }}>
                  {pm.id === 'individual' ? (AR ? 'ممرض مرخص يعمل بشكل مستقل' : 'Licensed nurse working independently') : (AR ? 'شركة تقدم خدمات تمريض منزلي' : 'Company providing home nursing services')}
                </Text>
              </View>
              {sel && <I name="check" size={18} color={pm.color} />}
            </TouchableOpacity>
          );
        })}
        {errs.mode && <Text style={{ fontSize: FS.xs, color: theme.danger, marginTop: SP.xs }}>{errs.mode}</Text>}
      </View>

      <NInput innerRef={nameArRef} label={AR ? 'الاسم الكامل بالعربي' : 'Name (Arabic)'} placeholder={AR ? (data.mode === 'company' ? 'شركة نبضة للتمريض' : 'ممرض/ة محمد أحمد') : (data.mode === 'company' ? 'Nabdah Nursing Co.' : 'Nurse Mohamed')} value={data.nameAr} onChange={v => update({ nameAr: v })} required error={errs.name} caps="words" returnKey="next" onSubmit={() => nameEnRef.current?.focus()} />
      <NInput innerRef={nameEnRef} label={AR ? 'الاسم الكامل بالإنجليزي' : 'Name (English)'} placeholder="Nabdah Nursing" value={data.nameEn} onChange={v => update({ nameEn: v })} caps="words" returnKey="next" onSubmit={() => mgrNameRef.current?.focus()} />
      
      {data.mode === 'individual' && (
        <View style={{ marginBottom: SP.lg }}>
          <Text style={[st.label, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>{AR ? 'الجنس' : 'Gender'}</Text>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
            {[
              { id: 'male', ar: 'ذكر', en: 'Male', icon: 'male' },
              { id: 'female', ar: 'أنثى', en: 'Female', icon: 'female' }
            ].map(g => {
              const sel = data.gender === g.id;
              return (
                <TouchableOpacity key={g.id} onPress={() => update({ gender: g.id })} style={{ flex: 1, flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: sel ? theme.primary : theme.border, backgroundColor: sel ? `${theme.primary}10` : theme.surface }}>
                  <Text style={{ fontSize: FS.md, fontWeight: sel ? FW.bold : FW.reg, color: sel ? theme.primary : theme.text }}>{AR ? g.ar : g.en}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <NDivider label={AR ? 'بيانات المسؤول' : 'Manager Info'} style={{ marginVertical: SP.lg }} />
      <NInput innerRef={mgrNameRef} label={AR ? 'اسم المسؤول' : 'Manager Name'} value={data.managerName} onChange={v => update({ managerName: v })} required error={errs.mgr} caps="words" returnKey="next" onSubmit={() => emailRef.current?.focus()} />
      <NInput innerRef={emailRef} label={AR ? 'البريد الإلكتروني' : 'Email'} placeholder="nurse@email.com" value={data.managerEmail} onChange={v => update({ managerEmail: v.toLowerCase() })} required error={errs.email} kbType="email-address" returnKey="next" onSubmit={() => phoneRef.current?.focus()} />
      <NPhoneInput innerRef={phoneRef} label={AR ? 'الجوال' : 'Phone'} value={data.managerPhone} onChange={v => update({ managerPhone: v })} required error={errs.phone} />
      <NInput innerRef={passwordRef} label={AR ? 'كلمة المرور' : 'Password'} placeholder="••••••••" value={data.password} onChange={v => update({ password: v })} secure required error={errs.pass} returnKey="next" onSubmit={() => confirmPassRef.current?.focus()} />
      <NPassStrength password={data.password} />
      <NInput innerRef={confirmPassRef} label={AR ? 'تأكيد كلمة المرور' : 'Confirm Password'} placeholder="••••••••" value={data.confirmPass} onChange={v => update({ confirmPass: v })} secure required error={errs.conf} returnKey="done" onSubmit={handleNext} />
      
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
      <NBtn label={AR ? 'التالي' : 'Next'} onPress={handleNext} loading={loading} />
    </NScroll>
  );
}

// ── STEP 2: KYC ─────────────────────────────────────────────────
function NS2({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const isIndiv = data.mode === 'individual';
  const [errs, setErrs] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (isIndiv && !data.scfhsNumber.trim()) e.scfhs = AR ? 'رقم SCFHS مطلوب' : 'SCFHS required';
    if (!isIndiv && !Validate.cr(data.crNumber)) e.cr = AR ? 'السجل التجاري 10 أرقام' : 'CR 10 digits';
    if (!Validate.iban(data.iban)) e.iban = AR ? 'الآيبان غير صحيح' : 'Invalid IBAN';
    setErrs(e); return Object.keys(e).length === 0;
  };

  const pickDocument = (field: keyof NurseRegData) => {
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

  const [loading, setLoading] = useState(false);
  const handleNext = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const urls: string[] = [];
      if (isIndiv) {
        urls.push(await ProviderApi.uploadFile(data.scfhsUri, 'image/jpeg', 'scfhs.jpg'));
        urls.push(await ProviderApi.uploadFile(data.photoUri, 'image/jpeg', 'photo.jpg'));
      } else {
        urls.push(await ProviderApi.uploadFile(data.crUri, 'image/jpeg', 'cr.jpg'));
        urls.push(await ProviderApi.uploadFile(data.mohUri, 'image/jpeg', 'moh.jpg'));
      }

      await ProviderApi.step2({
        license_number: isIndiv ? data.scfhsNumber : data.crNumber,
        license_documents: urls.filter(Boolean),
        national_id: isIndiv ? data.nationalId : undefined,
        scfhs_license_number: isIndiv ? data.scfhsNumber : undefined,
        cr_number: !isIndiv ? data.crNumber : undefined,
        moh_license_number: !isIndiv ? data.mohLicense : undefined,
        gender: data.gender || undefined,
        languages: data.languages,
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
      <NHeader title={AR ? 'التراخيص والوثائق' : 'Licenses & KYC'} sub={AR ? 'جميع البيانات مشفّرة ومحمية' : 'All data encrypted'} step={step} total={total} onBack={onBack} />

      <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: SP.md }}>
          <I name="lock" size={16} color={theme.info} />
          <Text style={{ flex: 1, fontSize: FS.sm, color: theme.info, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
            {isIndiv ? (AR ? 'يجب أن تكون مرخصاً من الهيئة السعودية للتخصصات الصحية SCFHS.' : 'Must hold valid SCFHS nursing license.')
              : (AR ? 'يجب تقديم السجل التجاري وترخيص وزارة الصحة.' : 'Submit CR and MOH license.')}
          </Text>
        </View>
      </NCard>

      {isIndiv ? (
        <>
          <NInput label={AR ? 'رقم ترخيص SCFHS' : 'SCFHS License Number'} placeholder="123456" value={data.scfhsNumber} onChange={v => update({ scfhsNumber: v.replace(/\D/g, '') })} required error={errs.scfhs} kbType="numeric" maxLen={8} />
          <NInput label={AR ? 'تاريخ انتهاء الترخيص' : 'License Expiry'} placeholder="YYYY-MM-DD" value={data.scfhsExpiry} onChange={v => update({ scfhsExpiry: v })} />
          <NInput label={AR ? 'رقم الهوية الوطنية' : 'National ID'} placeholder="1XXXXXXXXX" value={data.nationalId} onChange={v => update({ nationalId: v.replace(/\D/g, '') })} kbType="numeric" maxLen={10} />
        </>
      ) : (
        <>
          <NInput label={AR ? 'رقم السجل التجاري CR' : 'CR Number'} placeholder="1234567890" value={data.crNumber} onChange={v => update({ crNumber: v.replace(/\D/g, '') })} required error={errs.cr} kbType="numeric" maxLen={10} />
          <NInput label={AR ? 'ترخيص وزارة الصحة MOH' : 'MOH License'} placeholder="MOH-NRS-XXXXX" value={data.mohLicense} onChange={v => update({ mohLicense: v })} required />
        </>
      )}

      <NInput label={AR ? 'رقم الآيبان IBAN' : 'Bank IBAN'} placeholder="SA0000000000000000000000" value={data.iban} onChange={v => update({ iban: v.toUpperCase().replace(/\s/g, '') })} required error={errs.iban} maxLen={24} />

      <Text style={[st.secTitle, { color: theme.text, textAlign: AR ? 'right' : 'left', marginTop: SP.md }]}>{AR ? 'رفع الوثائق الرسمية' : 'Upload Documents'}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.md, marginBottom: SP.xl }}>
        {isIndiv ? (
          <>
            <DocBtn label={AR ? 'ترخيص\nSCFHS' : 'SCFHS\nLicense'} done={!!data.scfhsUri} onPress={() => pickDocument('scfhsUri')} theme={theme} />
            <DocBtn label={AR ? 'صورة\nشخصية' : 'Profile\nPhoto'} done={!!data.photoUri} onPress={() => pickDocument('photoUri')} theme={theme} />
          </>
        ) : (
          <>
            <DocBtn label={AR ? 'السجل\nالتجاري' : 'CR\nDoc'} done={!!data.crUri} onPress={() => pickDocument('crUri')} theme={theme} />
            <DocBtn label={AR ? 'ترخيص\nMOH' : 'MOH\nLicense'} done={!!data.mohUri} onPress={() => pickDocument('mohUri')} theme={theme} />
          </>
        )}
      </View>
      <NBtn label={AR ? 'التالي' : 'Next'} onPress={handleNext} loading={loading} />
    </NScroll>
  );
}

function DocBtn({ label, done, onPress, theme }: { label: string; done: boolean; onPress: () => void; theme: any }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flex: 1, minHeight: 90, borderRadius: R.xl, borderWidth: 2, borderStyle: done ? 'solid' : 'dashed', borderColor: done ? theme.success : theme.border, backgroundColor: done ? theme.successBg : theme.surface2, alignItems: 'center', justifyContent: 'center', padding: SP.lg, marginHorizontal: 2 }}>
      <IBg name={done ? 'check' : 'upload'} size={14} color={done ? theme.success : theme.textSub} bg={done ? theme.successBg : theme.surface3} />
      <Text style={{ fontSize: FS.sm, color: done ? theme.success : theme.text, fontWeight: FW.semi, textAlign: 'center', marginTop: SP.xs }}>{label}</Text>
      <Text style={{ fontSize: FS.xs, color: done ? theme.success : theme.textSub, marginTop: 2 }}>{done ? 'Done' : 'Upload'}</Text>
    </TouchableOpacity>
  );
}

// ── STEP 3: SERVICES SETUP ──────────────────────────────────────
function NS3({ data, update, onNext, onBack, step, total }: any) {
 const nursingCatalog = useServicesCatalog('nursing');
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';

  const toggle = (id: string) => {
    const svcs = data.enabledServices.includes(id) ? data.enabledServices.filter(s => s !== id) : [...data.enabledServices, id];
    update({ enabledServices: svcs });
  };

  const validate = () => {
    if (data.enabledServices.length === 0) { Alert.alert(AR ? 'تنبيه' : 'Warning', AR ? 'اختر خدمة واحدة على الأقل' : 'Select at least one service'); return false; }
    return true;
  };

  return (
    <NScroll>
      <NHeader title={AR ? 'الخدمات التمريضية' : 'Nursing Services'} sub={AR ? 'حدد الخدمات التي تقدمها' : 'Select services you offer'} step={step} total={total} onBack={onBack} />

      <NCard style={{ backgroundColor: '#E91E6310', marginBottom: SP.xl }}>
        <Text style={{ fontSize: FS.sm, color: '#E91E63', lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
          {AR ? 'حدد جميع الخدمات التمريضية المنزلية التي يمكنك تقديمها. لا يشمل العلاج الطبيعي (مزود منفصل).' : 'Select all home nursing services you can provide. Does not include physiotherapy (separate provider).'}
        </Text>
      </NCard>

      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.lg }}>
        <View style={{ flex: 1 }}><NBtn label={AR ? 'تحديد الكل' : 'Select All'} variant="outline" size="sm" onPress={() => update({ enabledServices: nursingCatalog.map(s => s.id) })} /></View>
        <View style={{ flex: 1 }}><NBtn label={AR ? 'إلغاء الكل' : 'Clear'} variant="secondary" size="sm" onPress={() => update({ enabledServices: [] })} /></View>
      </View>

      <NCard style={{ backgroundColor: theme.successBg, marginBottom: SP.lg }}>
        <Text style={{ fontSize: FS.sm, color: theme.success, textAlign: AR ? 'right' : 'left' }}>
          {AR ? `${data.enabledServices.length} خدمة مختارة من ${nursingCatalog.length}` : `${data.enabledServices.length} of ${nursingCatalog.length} selected`}
        </Text>
      </NCard>

      {nursingCatalog.map(svc => {
        const active = data.enabledServices.includes(svc.id);
        return (
          <TouchableOpacity key={svc.id} onPress={() => toggle(svc.id)}
            style={[st.svcRow, { backgroundColor: active ? '#E91E6308' : theme.surface2, borderColor: active ? '#E91E63' : theme.border, flexDirection: AR ? 'row-reverse' : 'row' }]}>
            <View style={{ width: 22, height: 22, borderRadius: R.sm, borderWidth: 2, borderColor: active ? '#E91E63' : theme.border, backgroundColor: active ? '#E91E63' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {active && <I name="check" size={10} color="#FFF" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FS.md, color: active ? '#E91E63' : theme.text, fontWeight: active ? FW.bold : FW.reg, textAlign: AR ? 'right' : 'left' }}>{AR ? svc.ar : svc.en}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
      <View style={{ height: SP.xl }} />
      <NBtn label={AR ? 'التالي' : 'Next'} onPress={() => { if (validate()) onNext(); }} />
    </NScroll>
  );
}

// ── STEP 4: PRICING MODEL ───────────────────────────────────────
function NS4({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  return (
    <NScroll>
      <NHeader title={AR ? 'نموذج التسعير' : 'Pricing Model'} sub={AR ? 'حدد طريقة التسعير لخدماتك' : 'Set your pricing model'} step={step} total={total} onBack={onBack} />

      {PRICING_MODELS.map(pm => {
        const isActive = data.pricingModels.includes(pm.id);
        const togglePricing = () => {
          if (isActive) {
             update({ pricingModels: data.pricingModels.filter((id: string) => id !== pm.id) });
          } else {
             update({ pricingModels: [...data.pricingModels, pm.id] });
          }
        };
        return (
        <NCard key={pm.id} style={{ marginBottom: SP.lg }}>
          <TouchableOpacity onPress={togglePricing} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, marginBottom: isActive ? SP.lg : 0 }}>
            <NCheckbox value={isActive} onChange={togglePricing} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FS.md, fontWeight: isActive ? FW.bold : FW.reg, color: isActive ? '#E91E63' : theme.text, textAlign: AR ? 'right' : 'left' }}>{AR ? pm.ar : pm.en}</Text>
              <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{AR ? pm.hint_ar : pm.hint_en}</Text>
            </View>
          </TouchableOpacity>
          {isActive && (
            <NPriceInput label={AR ? `سعر ${pm.ar} (ريال)` : `${pm.en} Price (SAR)`}
              value={pm.id === 'per_visit' ? data.priceVisit : pm.id === 'per_hour' ? data.priceHour : pm.id === 'per_day' ? data.priceDay : data.priceMonth}
              onChange={v => update(pm.id === 'per_visit' ? { priceVisit: v } : pm.id === 'per_hour' ? { priceHour: v } : pm.id === 'per_day' ? { priceDay: v } : { priceMonth: v })} required />
          )}
        </NCard>
      )})}

      <NCard style={{ backgroundColor: theme.infoBg, marginBottom: SP.xl }}>
        <Text style={{ fontSize: FS.sm, color: theme.info, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
          {AR ? 'يمكنك تفعيل أكثر من نموذج تسعير لاحقاً من الإعدادات. حالياً اختر النموذج الأساسي.' : 'You can enable multiple pricing models later in settings. Choose your primary model now.'}
        </Text>
      </NCard>
      <NBtn label={AR ? 'التالي' : 'Next'} onPress={onNext} />
    </NScroll>
  );
}

// ── STEP 5: COVERAGE ────────────────────────────────────────────
function NS5({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [showLocModal, setShowLocModal] = useState(false);
  
  const validate = () => {
    const e: Record<string, string> = {};
    if (!data.city) e.city = AR ? 'اختر المدينة' : 'Choose city';
    if (!data.address.trim()) e.addr = AR ? 'مطلوب' : 'Required';
    setErrs(e); return Object.keys(e).length === 0;
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
        type: 'home_care',
      });
      await ProviderApi.login(data.managerPhone, data.password);
      onNext();
    } catch (e: any) {
      try {
        await ProviderApi.login(data.managerPhone, data.password);
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
      <NHeader title={AR ? 'نطاق التغطية' : 'Coverage Area'} sub={AR ? 'حدد المناطق التي تغطيها' : 'Define your service area'} step={step} total={total} onBack={onBack} />

      <Text style={[st.label, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>{AR ? 'المدينة' : 'City'}<Text style={{ color: theme.danger }}> *</Text></Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SP.lg }}>
        <View style={{ flexDirection: 'row', gap: SP.sm }}>
          {CITIES.map(c => <TouchableOpacity key={c.id} onPress={() => update({ city: c.id })} style={[st.chip, { backgroundColor: data.city === c.id ? theme.primary : theme.surface2, borderColor: data.city === c.id ? theme.primary : theme.border }]}><Text style={{ color: data.city === c.id ? '#FFF' : theme.text, fontSize: FS.sm, fontWeight: FW.med }}>{AR ? c.ar : c.en}</Text></TouchableOpacity>)}
        </View>
      </ScrollView>
      {errs.city && <Text style={{ fontSize: FS.xs, color: theme.danger, marginBottom: SP.sm }}>{errs.city}</Text>}

      <NInput label={AR ? 'الحي' : 'District'} placeholder={AR ? 'حي الورود' : 'Al-Wurud'} value={data.district} onChange={v => update({ district: v })} caps="words" />
      <NInput label={AR ? 'العنوان' : 'Address'} value={data.address} onChange={v => update({ address: v })} required error={errs.addr} multi lines={2} />

      <NCard style={{ marginBottom: SP.xl }}>
        <Text style={[st.label, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>{AR ? 'نطاق التغطية للزيارة المنزلية (كم)' : 'Coverage Radius (km)'}</Text>
        
        {/* +/- controls & manual text input */}
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, marginBottom: SP.md }}>
          <TouchableOpacity 
            onPress={() => update({ coverageRadius: Math.max(1, data.coverageRadius - 1) })}
            style={{ width: 44, height: 44, borderRadius: R.md, backgroundColor: theme.surface3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}
          >
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>-</Text>
          </TouchableOpacity>
          <TextInput
            value={String(data.coverageRadius)}
            onChangeText={v => {
              const num = parseInt(v.replace(/\D/g, '')) || 0;
              update({ coverageRadius: Math.min(100, Math.max(1, num)) });
            }}
            keyboardType="numeric"
            style={{ flex: 1, height: 44, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.inputBg, borderRadius: R.md, color: theme.text, textAlign: 'center', fontSize: FS.md, fontWeight: 'bold' }}
          />
          <TouchableOpacity 
            onPress={() => update({ coverageRadius: Math.min(100, data.coverageRadius + 1) })}
            style={{ width: 44, height: 44, borderRadius: R.md, backgroundColor: theme.surface3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}
          >
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>+</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.textSub, fontSize: FS.md }}>{AR ? 'كم' : 'KM'}</Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm }}>
          {[5, 10, 15, 20, 30, 50].map(r => (
            <TouchableOpacity key={r} onPress={() => update({ coverageRadius: r })} style={[st.chip, { backgroundColor: data.coverageRadius === r ? '#E91E63' : theme.surface2, borderColor: data.coverageRadius === r ? '#E91E63' : theme.border }]}>
              <Text style={{ color: data.coverageRadius === r ? '#FFF' : theme.text, fontWeight: FW.semi }}>{r} {AR ? 'كم' : 'km'}</Text>
            </TouchableOpacity>
          ))}
        </View>

                <Text style={[st.label, { color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm, marginTop: SP.xl }]}>{AR ? 'تحديد الموقع الجغرافي' : 'Geographic Map Location'}</Text>
        <TouchableOpacity onPress={() => setShowLocModal(true)} style={{ borderColor:theme.border, backgroundColor:theme.surface2, borderWidth: 1, borderRadius: R.md, padding: SP.xl, alignItems: 'center', justifyContent: 'center', marginBottom: SP.md }}>
          {data.location.lat ? (
            <View style={{ alignItems: 'center' }}>
              <I name="location" size={32} color={theme.success} />
              <Text style={{ color:theme.success, marginTop:SP.xs, fontWeight: FW.bold }}>{AR?'تم تحديد الموقع':'Location Selected'}</Text>
              <Text style={{ color:theme.textSub, fontSize:FS.xs, marginTop: 4 }}>{data.location.lat.toFixed(4)}, {data.location.lng.toFixed(4)}</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <I name="location" size={32} color={theme.textSub} />
              <Text style={{ color:theme.textSub, marginTop:SP.xs }}>{AR?'اضغط لتحديد الموقع على الخريطة':'Tap to pin location on map'}</Text>
            </View>
          )}
        </TouchableOpacity>
        <LocationPickerModal visible={showLocModal} onClose={() => setShowLocModal(false)} onSelectLocation={(l) => update({ location: l })} initialLocation={data.location.lat ? data.location : undefined} />
      </NCard>

      <NBtn label={AR ? 'التالي' : 'Next'} onPress={() => { if (validate()) onNext(); }} />
    </NScroll>
  );
}

// ── STEP 6: SCHEDULE & INSURANCE ────────────────────────────────────────────
function NS6({ data, update, onNext, onBack, step, total }: any) {
 const insuranceCatalog = useInsuranceCatalog();
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [showVacationCal, setShowVacationCal] = useState(false);

  const toggleDay = (k: string) => {
    const d = data.workDays.includes(k) ? data.workDays.filter(x => x !== k) : [...data.workDays, k];
    update({ workDays: d });
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
        const nextPlans = item.plans.includes(plan) ? item.plans.filter(p => p !== plan) : [...item.plans, plan];
        return { ...item, plans: nextPlans };
      }
      return item;
    });
    update({ acceptedInsurance: updated });
  };

  return (
    <NScroll>
      <NHeader title={AR ? 'المواعيد والتأمين' : 'Schedule & Insurance'} sub={AR ? 'حدد أوقات العمل وقبول التأمين' : 'Set availability and insurance options'} step={step} total={total} onBack={onBack} />

      <NCard style={{ marginBottom: SP.xl }}>
        <NToggle label={AR ? 'متاح 24/7' : 'Available 24/7'} sub={AR ? 'خدمة متواصلة كل الأيام' : 'Around-the-clock every day'} value={data.is24_7} onChange={v => update({ is24_7: v, workDays: v ? ['SUN','MON','TUE','WED','THU','FRI','SAT'] : data.workDays })} />
      </NCard>

      {!data.is24_7 && (
        <>
          <Text style={[st.label, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>{AR ? 'أيام العمل' : 'Working Days'}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SP.sm, marginBottom: SP.xl }}>
            {WORK_DAYS.map(d => {
              const a = data.workDays.includes(d.k);
              return (
                <TouchableOpacity key={d.k} onPress={() => toggleDay(d.k)} style={[st.chip, { backgroundColor: a ? '#E91E63' : theme.surface2, borderColor: a ? '#E91E63' : theme.border }]}>
                  <Text style={{ color: a ? '#FFF' : theme.text, fontSize: FS.sm, fontWeight: FW.semi }}>{AR ? d.ar : d.k}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
                    <NCard style={{ marginBottom:SP.xl }}>
            <Text style={[st.label, { color:theme.text, textAlign:AR?'right':'left', marginBottom:SP.lg }]}>{AR?'نظام الفترات':'Shift System'}</Text>
            
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.md }}>
              {['morning', 'evening', 'both'].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => update({ shiftType: type as any })}
                  style={{ flex: 1, padding: SP.sm, borderRadius: R.md, borderWidth: 1.5, borderColor: data.shiftType === type ? '#E91E63' : theme.border, backgroundColor: data.shiftType === type ? '#E91E6311' : theme.surface2, alignItems: 'center' }}>
                  <Text style={{ color: data.shiftType === type ? '#E91E63' : theme.textSub, fontWeight: FW.bold, fontSize: FS.sm }}>
                    {AR ? (type === 'morning' ? 'صباحية' : type === 'evening' ? 'مسائية' : 'كليهما') : (type === 'morning' ? 'Morning' : type === 'evening' ? 'Evening' : 'Both')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {(data.shiftType === 'morning' || data.shiftType === 'both') && (
              <View style={{ marginBottom: SP.md }}>
                <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>{AR ? 'الفترة الصباحية' : 'Morning Shift'}</Text>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
                  <View style={{ flex: 1 }}><NInput label={AR?'من':'From'} value={data.openTime} onChange={v=>update({openTime:v})} placeholder="07:00" /></View>
                  <View style={{ flex: 1 }}><NInput label={AR?'إلى':'To'} value={data.closeTime} onChange={v=>update({closeTime:v})} placeholder="15:00" /></View>
                </View>
              </View>
            )}

            {(data.shiftType === 'evening' || data.shiftType === 'both') && (
              <View>
                <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>{AR ? 'الفترة المسائية' : 'Evening Shift'}</Text>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
                  <View style={{ flex: 1 }}><NInput label={AR?'من':'From'} value={data.eveningOpenTime} onChange={v=>update({eveningOpenTime:v})} placeholder="15:00" /></View>
                  <View style={{ flex: 1 }}><NInput label={AR?'إلى':'To'} value={data.eveningCloseTime} onChange={v=>update({eveningCloseTime:v})} placeholder="23:00" /></View>
                </View>
              </View>
            )}
          </NCard>
        </>
      )}

      {/* Planned Vacation Date calendar selection */}
      <TouchableOpacity onPress={() => setShowVacationCal(true)}>
        <NInput label={AR ? 'إجازة مخططة (إيقاف الحجوزات)' : 'Planned Vacation'} placeholder={AR ? 'اختر التاريخ من التقويم...' : 'Choose vacation date...'} value={data.vacationDate} editable={false} onChange={() => {}} icon="calendar" />
      </TouchableOpacity>

      <NDatePickerSheet
        visible={showVacationCal}
        value={data.vacationDate}
        onChange={() => {}}
        onClose={() => setShowVacationCal(false)}
        title={AR ? 'اختر تاريخ إجازتك' : 'Select Vacation Date'}
      />

      <View style={{ height: SP.sm }} />

      {/* Insurance settings for nursing */}
      <NCard style={{ marginBottom: SP.xl }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.md }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{AR ? 'الدفع نقداً فقط (لا أقبل التأمين)' : 'Cash Only (No Insurance)'}</Text>
          <Switch value={data.cashOnly} onValueChange={v => update({ cashOnly: v, acceptedInsurance: v ? [] : data.acceptedInsurance })} />
        </View>

        {!data.cashOnly && (
          <View style={{ marginTop: SP.md }}>
            <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>{AR ? 'اختر شركات التأمين الطبي المعتمدة للتمريض:' : 'Select accepted medical insurance plans:'}</Text>
            {insuranceCatalog.map(co => {
              const acceptedObj = data.acceptedInsurance?.find(c => c.companyId === co.id);
              const isAccepted = !!acceptedObj;

              return (
                <View key={co.id} style={{ backgroundColor: theme.surface, padding: SP.md, borderRadius: R.md, marginBottom: SP.sm, borderWidth: 1, borderColor: isAccepted ? theme.primary : theme.border }}>
                  <TouchableOpacity onPress={() => toggleCompany(co.id)} style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: FS.md, color: theme.text, fontWeight: FW.bold }}>{AR ? co.ar : co.en}</Text>
                    <View style={{ width: 22, height: 22, borderRadius: R.sm, borderWidth: 2, borderColor: isAccepted ? theme.primary : theme.border, backgroundColor: isAccepted ? theme.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {isAccepted && <I name="check" size={12} color="#FFF" />}
                    </View>
                  </TouchableOpacity>

                  {isAccepted && (
                    <View style={{ marginTop: SP.sm, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.sm }}>
                      <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>{AR ? 'الفئات المقبولة لخدمات التمريض:' : 'Accepted Plans/Tiers:'}</Text>
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
                </View>
              );
            })}
          </View>
        )}
      </NCard>

      <NBtn label={AR ? 'التالي' : 'Next'} onPress={onNext} />
    </NScroll>
  );
}

// ── STEP 7: ADMIN WARNING ───────────────────────────────────────────────────
function PStep7SubmitAdminWarning({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  return (
    <NScroll>
      <NHeader title={AR ? 'نظام الموافقات' : 'Approval System'} step={step} total={total} onBack={onBack} />
      
      <View style={{ backgroundColor: theme.dangerBg, padding: SP.xl, borderRadius: R.lg, borderWidth: 1, borderColor: theme.danger, marginTop: SP.lg }}>
        <View style={{ alignSelf: 'center', marginBottom: SP.md }}><I name="info" size={40} color={theme.danger} /></View>
        <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.danger, textAlign: 'center', marginBottom: SP.md }}>
          {AR ? 'تنبيه هام جداً' : 'IMPORTANT NOTICE'}
        </Text>
        <Text style={{ fontSize: FS.md, color: theme.text, textAlign: AR ? 'right' : 'left', lineHeight: 24, marginBottom: SP.md }}>
          {AR ? 'الأسعار والخدمات التمريضية التي حددتها لن تُنشر للجمهور فور اكتمال التسجيل.' : 'Your nursing rates, services, and profile will NOT go live immediately.'}
        </Text>
        <Text style={{ fontSize: FS.md, color: theme.text, textAlign: AR ? 'right' : 'left', lineHeight: 24 }}>
          {AR ? 'مستقبلاً، أي تعديل للأسعار أو تغيير لنطاق التغطية سيتطلب موافقة الأدمن للتأكد من مطابقة تراخيص التمريض المنزلي.' : 'Future changes to nursing fees or coverage radius must be reviewed and approved by the Admin first.'}
        </Text>
      </View>

      <NBtn label={AR ? 'أوافق وأتفهم ذلك' : 'I Understand & Agree'} onPress={onNext} style={{ marginTop: SP.xl }} />
    </NScroll>
  );
}

// ── STEP 8: REVIEW & SUBMIT ─────────────────────────────────────
function NS8Signature({ data, update, onDone, onBack, step, total }: any) {
  const [showContract, setShowContract] = useState(false);
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [loading, setLoading] = useState(false); const [submitted, setSub] = useState(false); const [agreed, setAgreed] = useState(false);
  const sigRef = useRef<any>(null);
  const [hasSigned, setHasSigned] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const validateBeforeSubmit = () => {
    if (!data.nameAr.trim() || !data.nameEn.trim() || !data.managerEmail.trim() || !data.city.trim() || !data.address.trim()) {
      show(AR ? 'أكمل بيانات مقدم الرعاية والموقع والعنوان والبريد' : 'Complete provider identity, location, address, and email', 'error');
      return false;
    }
    if (!data.location?.lat || !data.location?.lng) {
      show(AR ? 'حدد موقع مقدم الرعاية على الخريطة' : 'Pick the provider location on the map', 'error');
      return false;
    }
    if (!data.enabledServices.length || !data.pricingModels.length) {
      show(AR ? 'اختر خدمة ونموذج تسعير واحداً على الأقل' : 'Select at least one nursing service and pricing model', 'error');
      return false;
    }
    const priceByModel: Record<string, string> = { per_visit: data.priceVisit, per_hour: data.priceHour, per_day: data.priceDay, per_month: data.priceMonth };
    const missingPrice = data.pricingModels.find((model: string) => !String(priceByModel[model] || '').trim() || Number(priceByModel[model]) <= 0);
    if (missingPrice) {
      show(AR ? 'أدخل سعراً موجباً لكل نموذج تسعير مختار' : 'Enter a positive price for each selected pricing model', 'error');
      return false;
    }
    if (!Number(data.coverageRadius) || data.coverageRadius <= 0 || (!data.is24_7 && (!data.workDays.length || !data.openTime || !data.closeTime))) {
      show(AR ? 'أكمل نطاق التغطية وأيام وساعات العمل' : 'Complete coverage radius and working days/hours', 'error');
      return false;
    }
    return true;
  };

  const submit = () => {
    if (!validateBeforeSubmit()) return;
    if (!agreed) { show(AR ? 'يجب الموافقة على الشروط' : 'Must agree to terms', 'warning'); return; }
    if (!data.signatureData) {
      show(AR ? 'الرجاء توقيع العقد أولاً' : 'Please sign the contract first', 'error');
      return;
    }
    // Send the REAL email OTP via the backend mailer before opening the modal
    sendEmailOtp(data.managerEmail || data.email)
      .then(() => show(AR ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' : 'Verification code sent to your email', 'success'))
      .catch(() => show(AR ? 'تعذر إرسال الرمز — تحقق من البريد أو أعد المحاولة' : 'Could not send the code — check the email or retry', 'error'));
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
      if (data.scfhsUri) docs.push(await ProviderApi.uploadFile(data.scfhsUri, 'application/pdf', 'scfhs_license'));
      
      const images: string[] = [];
      if (data.photoUri) images.push(await ProviderApi.uploadFile(data.photoUri, 'image/jpeg', 'nursing_logo_photo'));

      const workingHours = data.is24_7 ? [
        { day: 'All', open: '00:00', close: '23:59', open_evening: null, close_evening: null, closed: false }
      ] : data.workDays.map((d: string) => ({
        day: d,
        open: data.shiftType === 'morning' || data.shiftType === 'both' ? data.openTime : null,
        close: data.shiftType === 'morning' || data.shiftType === 'both' ? data.closeTime : null,
        open_evening: data.shiftType === 'evening' || data.shiftType === 'both' ? data.eveningOpenTime : null,
        close_evening: data.shiftType === 'evening' || data.shiftType === 'both' ? data.eveningCloseTime : null,
        closed: false
      }));

      await ProviderApi.step3({
        nursing_services: data.enabledServices.map((id: string) => ({ key: id, name_ar: id, price: 0 })),
        home_visit_radius_km: data.coverageRadius,
        working_hours: workingHours,
        pricingModel: data.pricingModels,
        priceVisit: parseFloat(data.priceVisit) || 0,
        priceHour: parseFloat(data.priceHour) || 0,
        priceDay: parseFloat(data.priceDay) || 0,
        priceMonth: parseFloat(data.priceMonth) || 0,
        gender: data.mode === 'individual' ? data.gender : undefined,
      });

      await ProviderApi.step2({
        name_ar: data.nameAr,
        name_en: data.nameEn,
        city: data.city,
        location: data.location,
        district: data.district,
        address: data.address,
        accepts_cash: data.cashOnly,
        accepts_insurance: !data.cashOnly && data.acceptedInsurance.length > 0,
        accepted_insurance: data.acceptedInsurance ? data.acceptedInsurance.map((ins: any) => ins.companyId) : [],
        bio: data.bio,
        cr_number: data.crNumber,
        moh_license_number: data.mohLicense,
        scfhs_license_number: data.scfhsNumber,
        license_documents: docs,
        clinic_images: images
      });

      const sigUrl = await ProviderApi.uploadSignature(signature);
      update({ signatureData: sigUrl });

      await ProviderApi.step2({
        iban: data.iban,
        bank_account_name: data.accountHolderName
      });
      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.location?.lat || 0, lng: data.location?.lng || 0 , signature_url: sigUrl, full_data: sanitizeWizardData(data) });

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

  if (submitted) return <RegistrationSuccess onDone={onDone} email={data.email} providerType="nursing" />;

  const pm = PROVIDER_MODES.find(m => m.id === data.mode);
  const prc = PRICING_MODELS.find(m => m.id === data.pricingModel);
  const rows = [
    { ar: 'الاسم', en: 'Name', val: data.nameAr || '—' },
    { ar: 'النوع', en: 'Type', val: pm ? (AR ? pm.ar : pm.en) : '—' },
    { ar: 'المدينة', en: 'City', val: CITIES.find(c => c.id === data.city)?.[AR ? 'ar' : 'en'] ?? '—' },
    { ar: 'الخدمات', en: 'Services', val: `${data.enabledServices.length}` },
    { ar: 'نموذج التسعير', en: 'Pricing', val: prc ? (AR ? prc.ar : prc.en) : '—' },
    { ar: 'نطاق التغطية', en: 'Coverage', val: `${data.coverageRadius} km` },
    { ar: 'الدفع', en: 'Payment', val: data.cashOnly ? (AR ? 'نقدي فقط' : 'نقدي + تأمين') : (AR ? 'نقدي + تأمين' : 'Cash + Insurance') },
  ];

    const [showOtp, setShowOtp] = useState(false);
  const handleVerifyOtp = async (code: string) => verifyEmailOtp(data.managerEmail || data.email, code);
  const [showSigModal, setShowSigModal] = useState(false);
return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: SP.xl, paddingBottom: 0 }}>
        <NHeader title={AR ? 'مراجعة وإرسال' : 'Review & Submit'} onBack={onBack} step={step} total={total} />
      </View>

      <ScrollView scrollEnabled={scrollEnabled} style={{ flex: 1, paddingHorizontal: SP.xl }} keyboardShouldPersistTaps="handled">
        {data.cashOnly && (
          <NCard style={{ backgroundColor: theme.warnBg, marginBottom: SP.lg }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: SP.md }}>
              <I name="info" size={16} color={theme.warn} />
              <Text style={{ flex: 1, fontSize: FS.sm, color: theme.warn, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
                {AR ? 'خدمات التمريض المنزلي تعمل بنظام الدفع النقدي فقط — لا يوجد تأمين صحي.'
                  : 'Home nursing services operate on cash-only basis — no health insurance.'}
              </Text>
            </View>
          </NCard>
        )}

        <NCard style={{ marginBottom: SP.lg }}>
          <Text style={[st.secTitle, { color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.lg }]}>{AR ? 'ملخص الطلب' : 'Application Summary'}</Text>
          {rows.map((r, i) => (
            <View key={i} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, paddingVertical: SP.sm, borderBottomWidth: i < rows.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: theme.border }}>
              <Text style={{ flex: 1, color: theme.textSub, fontSize: FS.sm, textAlign: AR ? 'right' : 'left' }}>{AR ? r.ar : r.en}</Text>
              <Text style={{ color: theme.text, fontWeight: FW.semi, fontSize: FS.sm }}>{r.val}</Text>
            </View>
          ))}
        </NCard>

        {/* Signature Canvas */}
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
  {AR ? 'توقيع الممرض / الممثل المفوض' : 'Nurse / Representative Signature'}
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
          <NCheckbox label={AR ? 'أوافق على شروط وأحكام نبضة بلس وسياسة الخصوصية.' : 'I agree to Nabdah Plus Terms & Privacy Policy.'} value={agreed} onChange={setAgreed} />
        </NCard>

        <NBtn label={AR ? 'إرسال الطلب للمراجعة' : 'Submit Application'} onPress={submit} loading={loading} disabled={!agreed} style={{ marginBottom: 50, backgroundColor: theme.success }} />
      </ScrollView>

      <SignatureCanvasModal visible={showSigModal} onClose={() => setShowSigModal(false)} onOK={(sig) => update({ signatureData: sig })} />
      <OtpModal visible={showOtp} onClose={() => setShowOtp(false)} target={data.managerEmail || data.email} onVerify={async (code) => { const ok = await handleVerifyOtp(code); if (ok) { setShowOtp(false); finishSubmit(); return true; } return false; }} onResend={() => sendEmailOtp(data.managerEmail || data.email).then(() => show(AR ? 'أُعيد إرسال الرمز' : 'Code resent', 'success')).catch(() => show(AR ? 'تعذر الإرسال — انتظر قليلاً' : 'Could not resend — wait a moment', 'error'))} />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const st = StyleSheet.create({
  label: { fontSize: FS.sm, fontWeight: FW.semi, marginBottom: SP.xs },
  secTitle: { fontSize: FS.md, fontWeight: FW.bold, marginBottom: SP.md },
  typeRow: { borderRadius: R.lg, borderWidth: 1.5, padding: SP.lg, gap: SP.md, alignItems: 'center', marginBottom: SP.sm },
  chip: { paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: R.full, borderWidth: 1.5, marginBottom: 4 },
  svcRow: { borderRadius: R.lg, borderWidth: 1.5, padding: SP.lg, gap: SP.md, alignItems: 'center', marginBottom: SP.sm },
});
