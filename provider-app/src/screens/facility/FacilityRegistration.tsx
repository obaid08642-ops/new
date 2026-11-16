import { startOnboardingAccount, apiMessage, useStepSaver } from '../registration/kit';
import type { StepProps } from '../registration/kit';
import { DocBtn, LicenseExpiryField, NoticeSection, licenseExpiryError, useDocumentPicker } from '../registration/WizardParts';
import type { NoticeText } from '../registration/WizardParts';
import { RegistrationWizard } from '../registration/RegistrationWizard';
import type { RegistrationProps, WizardConfig } from '../registration/RegistrationWizard';
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Dimensions, Image, Modal, TextInput } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NBtn, NInput, NPhoneInput, NPassStrength, NCheckbox, NCard, NDropdown } from '../../components/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Validate } from '../../security/Security';
import { SP, R, FS, FW, DEGREES, LANGS } from '../../constants';
import { I } from '../../components/icons';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { GeoPicker } from '../../components/GeoPicker';
import * as ImagePicker from 'expo-image-picker';
import { ProviderApi } from '../../api/provider';
import { useInsuranceCatalog, useServicesCatalog, useSpecialtiesCatalog } from '../../api/catalogs';
import { tokens, withAlpha } from '../../theme/tokens';
import { useUploadsEnabled } from '../../hooks/useUploadsEnabled';
import { UploadsUnavailable } from '../../components/UploadsUnavailable';

const { width: W } = Dimensions.get('window');

const WORK_DAYS = [
  { k: 'SUN', ar: 'الأحد', en: 'Sun' },
  { k: 'MON', ar: 'الاثنين', en: 'Mon' },
  { k: 'TUE', ar: 'الثلاثاء', en: 'Tue' },
  { k: 'WED', ar: 'الأربعاء', en: 'Wed' },
  { k: 'THU', ar: 'الخميس', en: 'Thu' },
  { k: 'FRI', ar: 'الجمعة', en: 'Fri' },
  { k: 'SAT', ar: 'السبت', en: 'Sat' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0');
  return { val: `${h}:00`, label: `${h}:00` };
});

const FACILITY_TYPES = [

  { id: 'hospital', ar: 'مستشفى', en: 'Hospital' },
  { id: 'clinic', ar: 'مستوصف / عيادة متعددة', en: 'Polyclinic' },
];

interface FacilityRegData {
  facilityNameAr: string; facilityNameEn: string; facilityType: string;
  managerName: string; managerPhone: string; managerEmail: string; password: string; confirmPass: string;
  languages: string[];
  crNumber: string; mohLicense: string; licenseExpiry: string; crDocUri: string; mohDocUri: string; facilityLogoUri: string; facilityImagesUris: string[];
  region: string; city: string; district: string; fullAddress: string;
  location: {lat: number; lng: number};
  // Sub-accounts
  subProviders: any[]; // { type: 'doctor'|'lab'|'pharmacy', nameAr: string, nameEn: string, license: string, hasInsuranceEmp: boolean, ... }
  // Insurance
  cashOnly: boolean;
  acceptedInsurance: { companyId: string; plans: string[] }[];
  hasInsuranceCoordinator: boolean;
  signatureData: string; loading?: boolean; signerName: string; signerRole: string; termsAgreed: boolean;
}

const INIT: FacilityRegData = {
  
  facilityNameAr: '', facilityNameEn: '', facilityType: '',
  managerName: '', managerPhone: '', managerEmail: '', password: '', confirmPass: '',
  languages: [], crNumber: '', mohLicense: '', licenseExpiry: '', crDocUri: '', mohDocUri: '', facilityLogoUri: '', facilityImagesUris: [],
  region: '', city: '', district: '', fullAddress: '', location: {lat: 0, lng: 0}, subProviders: [], cashOnly: false, acceptedInsurance: [], hasInsuranceCoordinator: false, signatureData: '', signerName: '', signerRole: '', termsAgreed: false, loading: false
};

const NOTICE: NoticeText = {
  titleAr: 'هام جداً', titleEn: 'IMPORTANT',
  p1Ar: 'البيانات التي قمت بإدخالها، وأي حسابات فرعية (أطباء، مختبرات) قمت بإضافتها، لن تكون مرئية لجمهور المرضى فور التسجيل.',
  p1En: 'The data and sub-accounts you entered will NOT be visible to patients immediately.',
  p2Ar: 'كذلك في المستقبل، عند تعديل الأسعار، المواعيد، أو إضافة أقسام جديدة من الإعدادات، يجب أن تمر أولاً عبر (الأدمن) للمراجعة والموافقة لضمان الجودة.',
  p2En: 'In the future, any changes to prices, schedules, or new departments must pass through Admin Approval first.',
};
const FacilityNotice = (p: StepProps<FacilityRegData>) => <NoticeSection<FacilityRegData> text={NOTICE} submitRef={p.submitRef} />;

function ProcessingOverlay({ visible }: { visible: boolean }) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: withAlpha(theme.text, 0.5), justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ padding: 20, backgroundColor: theme.surface, borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ marginTop: 10, fontSize: 16, color: theme.text }}>جاري معالجة البيانات...</Text>
        </View>
      </View>
    </Modal>
  );
}

const FACILITY_WIZARD: WizardConfig<FacilityRegData> = {
  init: INIT,
  pages: [
    {
      titleAr: 'الحساب والتراخيص والموقع', titleEn: 'Account, Legal & Location', subAr: 'بيانات الدخول والمعلومات القانونية ثم الموقع الجغرافي', subEn: 'Login details, legal info, then geographic location',
      sections: [
        { comp: Step1Basic, titleAr: 'المعلومات الأساسية', titleEn: 'Basic Info' },
        { comp: Step2Legal, titleAr: 'المعلومات القانونية', titleEn: 'Legal Info' },
        { comp: Step3Location, titleAr: 'الموقع الجغرافي', titleEn: 'Location' },
      ],
    },
    {
      titleAr: 'مزودي الخدمة التابعين', titleEn: 'Sub-Providers', subAr: 'إضافة أقسام وأطباء المستشفى', subEn: 'Add your doctors & departments',
      sections: [{ comp: Step4SubProviders, titleAr: '', titleEn: '' }],
    },
    {
      titleAr: 'التأمين والموافقات', titleEn: 'Insurance & Approvals', subAr: 'شركات التأمين المقبولة ونظام الموافقات', subEn: 'Accepted insurance and approval system',
      sections: [
        { comp: Step5Insurance, titleAr: 'التأمين', titleEn: 'Insurance' },
        { comp: FacilityNotice, titleAr: 'نظام الموافقات', titleEn: 'Approval System' },
      ],
    },
  ],
  review: {
    providerType: 'facility',
    headerAr: 'مراجعة وتوقيع العقد', headerEn: 'Review & Sign Contract',
    signatoryRoleHint: { ar: 'مثال: المالك، المدير العام', en: 'e.g. Owner, General Manager' },
    // owner decision B25 (2026-10-14): all six provider types accept the terms before submitting
    agree: { ar: 'أوافق على شروط وأحكام نبض بلس وسياسة الخصوصية، وأقر بصحة البيانات.', en: 'I agree to Nabd+ Terms & Conditions and Privacy Policy, and confirm all data is accurate.' },
    signatureTitle: { ar: 'توقيع الممثل النظامي للمنشأة', en: 'Legal Representative Signature' },
    submitLabel: { ar: 'اعتماد وإرسال الطلب', en: 'Submit Application' },
    contractPricing: (d) => d.subProviders.flatMap((sp: any) => {
          const arr = [];
          if (sp.type === 'doctor') {
            if (sp.clinicEnabled) arr.push({ labelAr: `${sp.nameAr} - عيادة`, labelEn: `${sp.nameEn || sp.nameAr} - Clinic`, price: sp.priceClinic || 0 });
            if (sp.onlineEnabled) arr.push({ labelAr: `${sp.nameAr} - أونلاين`, labelEn: `${sp.nameEn || sp.nameAr} - Online`, price: sp.priceOnline || 0 });
            if (sp.homeEnabled) arr.push({ labelAr: `${sp.nameAr} - زيارة منزلية`, labelEn: `${sp.nameEn || sp.nameAr} - Home Visit`, price: sp.priceHome || 0 });
          } else {
            if (sp.homeEnabled) arr.push({ labelAr: `${sp.nameAr} - زيارة منزلية`, labelEn: `${sp.nameEn || sp.nameAr} - Home Visit`, price: sp.priceHome || 0 });
          }
          return arr;
        }),
    // Everything the facility sends (sub-provider rosters, documents, location) was already sent by its earlier steps.
    run: async () => {},
    coords: (d) => ({ lat: d.location?.lat || 0, lng: d.location?.lng || 0 }),
  },
  // The facility steps raise `loading` in their data while they save.
  overlay: (d) => <ProcessingOverlay visible={!!d.loading} />,
};

export function FacilityRegistration(props: RegistrationProps<FacilityRegData>) {
  return <RegistrationWizard config={FACILITY_WIZARD} {...props} />;
}

function Step1Basic({ data, update, submitRef }: StepProps<FacilityRegData>) {
  const { show } = useToast();
  const { theme } = useTheme(); const { lang, t: tt } = useLang(); const AR = lang === 'ar';
  const [errs, setErrs] = useState<Record<string, string>>({});

  const nameArRef = useRef<any>(null);
  const nameEnRef = useRef<any>(null);
  const mgrNameRef = useRef<any>(null);
  const phoneRef = useRef<any>(null);
  const emailRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);
  const confirmPassRef = useRef<any>(null);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!data.facilityType) e.type = tt('facreg.5b9c24bc');
    if (!data.facilityNameAr.trim()) e.nameAr = tt('facreg.b4bde92d');
    if (!data.facilityNameEn.trim()) e.nameEn = tt('facreg.b4bde92d');
    if (!data.managerName.trim()) e.mgr = tt('facreg.b4bde92d');
    if (!Validate.phone(data.managerPhone)) e.phone = tt('facreg.10222dfa');
    if (!Validate.email(data.managerEmail)) e.email = tt('facreg.dcfb041e');
    if (data.facilityType !== 'hospital' && data.facilityType !== 'clinic') e.type = tt('facreg.4e4e4c4d');
    const ps = Validate.password(data.password);
    if (!ps.valid) e.pass = AR ? ps.msgAr : ps.msgEn;
    if (data.password !== data.confirmPass) e.conf = tt('facreg.passwordsMismatch');
    setErrs(e); return Object.keys(e).length === 0;
  };

  
  const handleNext = async (): Promise<boolean> => {
    if (!validate()) return false;

    update({ loading: true });
    try {
      const r = await startOnboardingAccount({
        phone: data.managerPhone,
        password: data.password,
        full_name: data.managerName,
        email: data.managerEmail,
        type: data.facilityType,
      }, data.facilityType);
      if (!r.ok) show(r.message || 'Error occurred', 'error');
      return r.ok;
    } finally {
      update({ loading: false });
    }
  };
  useStepSaver(submitRef, handleNext);

  return (
    <View>
      
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.lg }}>
        {FACILITY_TYPES.map(t => (
          <TouchableOpacity key={t.id} onPress={() => update({ facilityType: t.id })} style={{ flex: 1, padding: SP.md, borderWidth: 1, borderColor: data.facilityType === t.id ? theme.primary : theme.border, backgroundColor: data.facilityType === t.id ? theme.primaryLight : theme.bg, borderRadius: R.md, alignItems: 'center' }}>
            <Text style={{ color: data.facilityType === t.id ? theme.primary : theme.text }}>{AR ? t.ar : t.en}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {errs.type && <Text style={{ fontSize: FS.xs, color: theme.danger, marginBottom: SP.md }}>{errs.type}</Text>}

      <NInput innerRef={nameArRef} label={tt('facreg.ce1851d8')} value={data.facilityNameAr} onChange={v => update({ facilityNameAr: v })} required error={errs.nameAr} returnKey="next" onSubmit={() => nameEnRef.current?.focus()} />
      <NInput innerRef={nameEnRef} label={tt('facreg.7733a526')} value={data.facilityNameEn} onChange={v => update({ facilityNameEn: v })} required error={errs.nameEn} returnKey="next" onSubmit={() => mgrNameRef.current?.focus()} />
      
      <NInput innerRef={mgrNameRef} label={tt('facreg.601810d6')} value={data.managerName} onChange={v => update({ managerName: v })} required error={errs.mgr} returnKey="next" onSubmit={() => phoneRef.current?.focus()} />
      <NPhoneInput innerRef={phoneRef} label={tt('facreg.52d66dfa')} value={data.managerPhone} onChange={v => update({ managerPhone: v })} required error={errs.phone} />
      <NInput innerRef={emailRef} label={tt('facreg.6a0806b6')} value={data.managerEmail} onChange={v => update({ managerEmail: v })} kbType="email-address" caps="none" required error={errs.email} returnKey="next" onSubmit={() => passwordRef.current?.focus()} />
      
      <NInput innerRef={passwordRef} label={tt('facreg.password')} value={data.password} onChange={v => update({ password: v })} secure required error={errs.pass} returnKey="next" onSubmit={() => confirmPassRef.current?.focus()} />
      <NPassStrength password={data.password} />
      <NInput innerRef={confirmPassRef} label={tt('facreg.confirmPassword')} value={data.confirmPass} onChange={v => update({ confirmPass: v })} secure required error={errs.conf} returnKey="done" onSubmit={handleNext} />
      
      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginTop: 12, marginBottom: 6, textAlign: AR ? 'right' : 'left' }}>{tt('facreg.93dfda41')}</Text>
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
function Step2Legal({ data, update, submitRef }: StepProps<FacilityRegData>) {
  const uploadsOn = useUploadsEnabled();
  const { theme } = useTheme(); const { lang, t: tt } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  
  const pick = useDocumentPicker<FacilityRegData>(update);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const handleNext = () => {
    const expiryErr = licenseExpiryError(data.licenseExpiry, AR);
    setErrs(expiryErr ? { expiry: expiryErr } : {});
    return !expiryErr;
  };
  useStepSaver(submitRef, handleNext);

return (
    <View>
      <NInput label={tt('facreg.7e54a94b')} value={data.crNumber} onChange={v=>update({crNumber:v})} kbType="numeric" required />
      <NInput label={tt('facreg.796857a4')} value={data.mohLicense} onChange={v=>update({mohLicense:v})} kbType="numeric" required />
      <LicenseExpiryField value={data.licenseExpiry} onChange={v=>update({licenseExpiry:v})} error={errs.expiry} />
      
      <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.md, marginBottom: SP.sm, textAlign: AR?'right':'left' }}>{tt('facreg.821ad572')}</Text>
      <DocBtn label={tt('facreg.e518d1e8')} done={!!data.crDocUri} onPress={() => pick('crDocUri')} />
      <DocBtn label={tt('facreg.27343b74')} done={!!data.mohDocUri} onPress={() => pick('mohDocUri')} />
      <DocBtn label={tt('facreg.de61fbe4')} done={!!data.facilityLogoUri} onPress={() => pick('facilityLogoUri')} />
      
      <View style={{ marginTop: SP.md }}>
        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
          {tt('facreg.b9f82ef6')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SP.sm, paddingVertical: SP.sm, flexDirection: AR ? 'row-reverse' : 'row' }}>
          {uploadsOn ? (
<TouchableOpacity onPress={async () => {
            let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, aspect: [4, 3], quality: 0.8, allowsMultipleSelection: true, selectionLimit: 5 });
            if (!result.canceled) {
              const uris = result.assets.map(a => a.uri);
              update({ facilityImagesUris: [...(data.facilityImagesUris||[]), ...uris].slice(0, 5) });
            }
          }} style={{ width: 80, height: 80, borderRadius: R.md, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: theme.primary }}>
            <I name="addPhotoAlternate" size={32} color={theme.primary} />
          </TouchableOpacity>
) : <UploadsUnavailable />}
          {(data.facilityImagesUris||[]).map((uri: string, i: number) => (
            <View key={i} style={{ width: 80, height: 80, borderRadius: R.md, overflow: 'hidden' }}>
              <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
              <TouchableOpacity onPress={() => update({ facilityImagesUris: data.facilityImagesUris.filter((_:any, idx:number) => idx !== i) })} style={{ position: 'absolute', top: 4, right: 4, backgroundColor: withAlpha(theme.text, 0.5), borderRadius: 12, padding: 2 }}>
                <I name="close" size={16} color={theme.textInv} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function Step3Location({ data, update, submitRef, uploads }: StepProps<FacilityRegData>) {
  const { show } = useToast();
  const { theme } = useTheme(); const { lang, t: tt } = useLang(); const AR = lang === 'ar';
  const [showLocModal, setShowLocModal] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!data.region) e.city = tt('facreg.a138dac5');
    else if (!data.city) e.city = tt('facreg.99ecd66a');
    else if (!data.district) e.city = tt('facreg.ac994991');
    if (!data.fullAddress.trim()) e.addr = tt('facreg.49a2e744');
    if (!data.location || !data.location.lat) e.loc = tt('facreg.f202eecc');
    setErrs(e); return Object.keys(e).length === 0;
  };

  const handleNext = async (): Promise<boolean> => {
    if (!validate()) return false;
    try {
      update({ loading: true });
      let crUrl = data.crDocUri;
      let mohUrl = data.mohDocUri;
      let logoUrl = data.facilityLogoUri;
      
      // The shared uploader (issue 1169): the file's own type from its name (a PDF stays a PDF), and one upload per file
      // even when the step is sent again after going back.
      if (crUrl && !crUrl.startsWith('http')) crUrl = await uploads.file(crUrl, 'cr');
      if (mohUrl && !mohUrl.startsWith('http')) mohUrl = await uploads.file(mohUrl, 'moh');
      if (logoUrl && !logoUrl.startsWith('http')) logoUrl = await uploads.file(logoUrl, 'logo');

      const docs = [crUrl, mohUrl].filter(Boolean);
      // Logo goes to its OWN field — brand mark, not a gallery photo.
      const images: string[] = [];
      
      if (data.facilityImagesUris && data.facilityImagesUris.length > 0) {
        for (let i = 0; i < data.facilityImagesUris.length; i++) {
          images.push(await uploads.file(data.facilityImagesUris[i], `facility_${i}`));
        }
      }

      await ProviderApi.step2({
        name_ar: data.facilityNameAr,
        name_en: data.facilityNameEn,
        city: data.city,
        address: data.fullAddress,
        location: data.location?.lat ? data.location : undefined,
        license_number: data.crNumber || data.mohLicense,
        cr_number: data.crNumber || undefined,
        moh_license_number: data.mohLicense || undefined,
        license_expiry_date: data.licenseExpiry,
        license_documents: docs,
        clinic_images: images,
        logo: logoUrl || undefined,
        languages: data.languages,
      });
      return true;
    } catch (e: any) {
      show(Array.isArray(e.response?.data?.message) ? e.response?.data?.message[0] : (e.response?.data?.message || e.message || 'Error occurred'), 'error');
      return false;
    } finally {
      update({ loading: false });
    }
  };
  useStepSaver(submitRef, handleNext);

  return (
    <View>
      
      <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, marginBottom: SP.xs, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{tt('facreg.5a85d253')}<Text style={{ color: theme.danger }}> *</Text></Text>
      <GeoPicker value={{ region: (data as any).region, city: data.city, district: (data as any).district }} onChange={v=>update({ region: v.region, city: v.city, district: v.district } as any)} locale={lang} />
      {errs.city && <Text style={{ fontSize: FS.xs, color: theme.danger, marginBottom: SP.sm }}>{errs.city}</Text>}

      <NInput label={tt('facreg.e2bff93c')} value={data.fullAddress} onChange={v => update({ fullAddress: v })} required error={errs.addr} multi lines={2} />

      <NCard style={{ marginBottom: SP.xl, marginTop: SP.md }}>
        <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>{tt('facreg.a99bde52')}</Text>
        <TouchableOpacity onPress={() => setShowLocModal(true)} style={{ borderColor:theme.border, backgroundColor:theme.surface2, borderWidth: 1, borderRadius: R.md, padding: SP.xl, alignItems: 'center', justifyContent: 'center', marginBottom: SP.md }}>
          {data.location && data.location.lat ? (
            <View style={{ alignItems: 'center' }}>
              <I name="location" size={32} color={theme.success} />
              <Text style={{ color:theme.success, marginTop:SP.xs, fontWeight: FW.bold }}>{tt('facreg.e6c44175')}</Text>
              <Text style={{ color:theme.textSub, fontSize:FS.xs, marginTop: 4 }}>{data.location.lat.toFixed(4)}, {data.location.lng.toFixed(4)}</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <I name="location" size={32} color={theme.textSub} />
              <Text style={{ color:theme.textSub, marginTop:SP.xs }}>{tt('facreg.6efa450d')}</Text>
            </View>
          )}
        </TouchableOpacity>
        {errs.loc && <Text style={{ fontSize: FS.xs, color: theme.danger, marginBottom: SP.sm }}>{errs.loc}</Text>}
        <LocationPickerModal visible={showLocModal} onClose={() => setShowLocModal(false)} onSelectLocation={(l) => update({ location: l })} initialLocation={data.location.lat ? data.location : undefined} />
      </NCard>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function Step4SubProviders({ data, update, submitRef }: StepProps<FacilityRegData>) {
  const uploadsOn = useUploadsEnabled();
  useStepSaver(submitRef, () => true);
 const labCatalog = useServicesCatalog('lab');
 const radCatalog = useServicesCatalog('radiology');
 const nursingCatalog = useServicesCatalog('nursing');
  const { theme } = useTheme(); const { lang, t: tt } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [modalType, setModalType] = useState<'doctor'|'lab'|'pharmacy'|'radiology'|'nursing'|null>(null);
  const specialties = useSpecialtiesCatalog();
  
  // Expanded tempSub to hold all required data
  const [tempSub, setTempSub] = useState<any>({ 
    nameAr: '', nameEn: '', email: '', license: '', specialty: '', degree: '', shift: 'both', 
    clinicEnabled: true, onlineEnabled: false, homeEnabled: false,
    priceClinic: '', priceOnline: '', priceHome: '',
    insClinic: false, insOnline: false, insHome: false,
    workDays: ['SUN','MON','TUE','WED','THU'], startHour: '09:00', endHour: '17:00',
    enabledTests: [], testPrices: {}, enabledScans: [], scanPrices: {},
    clinicImagesUris: []
  });

  const TYPES: any = {
    doctor: { ar: 'طبيب', en: 'Doctor', color: tokens.success },
    lab: { ar: 'مختبر', en: 'Laboratory', color: tokens.purple },
    pharmacy: { ar: 'صيدلية', en: 'Pharmacy', color: tokens.warning },
    radiology: { ar: 'أشعة', en: 'Radiology', color: tokens.mintDeep },
    nursing: { ar: 'تمريض', en: 'Nursing', color: tokens.pink }
  };

  const saveSub = () => {
    if (!tempSub.nameAr) return show(tt('facreg.f70f7e30'), 'error');
    if (!tempSub.nameEn) return show(tt('facreg.e185ed15'), 'error');
    if (!tempSub.email) return show(tt('facreg.d663272a'), 'error');
    if (modalType === 'doctor' && !tempSub.specialty) return show(tt('facreg.a5f5ea4e'), 'error');
    
    update({ subProviders: [...data.subProviders, { ...tempSub, type: modalType }] });
    setModalType(null);
  };
  
  const resetTemp = () => {
    setTempSub({ 
      nameAr: '', nameEn: '', email: '', license: '', specialty: '', degree: '', shift: 'both', 
      clinicEnabled: true, onlineEnabled: false, homeEnabled: false,
      priceClinic: '', priceOnline: '', priceHome: '',
      enabledTests: [], enabledScans: [], enabledNursing: [], nursingPrices: {},
      clinicImagesUris: []
    });
  };

  const toggleTest = (id: string) => {
    setTempSub((prev: any) => ({
      ...prev,
      enabledTests: prev.enabledTests.includes(id) ? prev.enabledTests.filter((t:string) => t !== id) : [...prev.enabledTests, id]
    }));
  };

  const toggleScan = (id: string) => {
    setTempSub((prev: any) => ({
      ...prev,
      enabledScans: prev.enabledScans.includes(id) ? prev.enabledScans.filter((s:string) => s !== id) : [...prev.enabledScans, id]
    }));
  };

  const toggleNursing = (id: string) => {
    setTempSub((prev: any) => ({
      ...prev,
      enabledNursing: prev.enabledNursing?.includes(id) ? prev.enabledNursing.filter((s:string) => s !== id) : [...(prev.enabledNursing||[]), id]
    }));
  };

  return (
    <View>
      <View>
        <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.lg, lineHeight: 22 }}>
          {tt('facreg.d2331d8f')}
        </Text>

        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: SP.md, marginBottom: SP.xl }}>
          {(Object.keys(TYPES) as any[]).map(t => (
            <TouchableOpacity key={t} onPress={() => { setModalType(t); resetTemp(); }} style={{ width: '47%', padding: SP.md, backgroundColor: theme.surface2, borderRadius: R.md, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
              <I name="add" size={24} color={TYPES[t].color} />
              <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, marginTop: SP.xs }}>{AR ? `إضافة ${TYPES[t].ar}` : `Add ${TYPES[t].en}`}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {data.subProviders.length > 0 && (
          <View style={{ gap: SP.md }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>{tt('facreg.2881f99d')}</Text>
            {data.subProviders.map((sub: any, idx: number) => (
              <View key={idx} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', padding: SP.md, backgroundColor: theme.surface, borderRadius: R.md, borderWidth: 1, borderColor: theme.border, gap: SP.md }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: TYPES[sub.type].color + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <I name="person" size={20} color={TYPES[sub.type].color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{AR ? sub.nameAr : sub.nameEn}</Text>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left' }}>{AR ? TYPES[sub.type].ar : TYPES[sub.type].en} • {sub.license || sub.specialty || '--'}</Text>
                </View>
                <TouchableOpacity onPress={() => update({ subProviders: data.subProviders.filter((_:any, i:number) => i !== idx) })}>
                  <I name="close" size={20} color={theme.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

      </View>

      {/* Sub-Provider Modal with SafeAreaView */}
      <Modal visible={!!modalType} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', padding: SP.xl, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>
              {AR ? `تسجيل ${TYPES[modalType || 'doctor']?.ar} جديد` : `Register new ${TYPES[modalType || 'doctor']?.en}`}
            </Text>
            <TouchableOpacity onPress={() => setModalType(null)}><I name="close" size={28} color={theme.text} /></TouchableOpacity>
          </View>
          
          <ScrollView style={{ flex: 1, padding: SP.xl }} keyboardShouldPersistTaps="handled">
            <NInput label={tt('facreg.7eb8db66')} value={tempSub.nameAr} onChange={v=>setTempSub({...tempSub, nameAr:v})} required />
            <NInput label={tt('facreg.25d8873f')} value={tempSub.nameEn} onChange={v=>setTempSub({...tempSub, nameEn:v})} required />
            <NInput label={tt('facreg.529e911b')} value={tempSub.email} onChange={v=>setTempSub({...tempSub, email:v.toLowerCase()})} required kbType="email-address" />
            <NInput label={tt('facreg.a2ab6871')} value={tempSub.license} onChange={v=>setTempSub({...tempSub, license:v})} required />
            
            {modalType === 'doctor' && (
              <View style={{ gap: SP.md, marginBottom: SP.md }}>
                <NDropdown
                  label={tt('facreg.de60b396')}
                  value={tempSub.specialty}
                  options={specialties.map(s => ({ val: s.id, label: AR ? s.ar : s.en }))}
                  onChange={v => setTempSub({ ...tempSub, specialty: v })}
                />
                <NDropdown
                  label={tt('facreg.65dc76f9')}
                  value={tempSub.degree}
                  options={DEGREES.map(d => ({ val: d.id, label: AR ? d.ar : d.en }))}
                  onChange={v => setTempSub({ ...tempSub, degree: v })}
                />
                
                                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.md, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                  {tt('facreg.b0cff631')}
                </Text>
                
                <View style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, gap: SP.md }}>
                  {[
                    { key: 'Clinic', ar: 'استشارة بالعيادة', en: 'Clinic Consult', enb: 'clinicEnabled', prc: 'priceClinic', ins: 'insClinic' },
                    { key: 'Online', ar: 'استشارة أونلاين', en: 'Online Consult', enb: 'onlineEnabled', prc: 'priceOnline', ins: 'insOnline' },
                    { key: 'Home', ar: 'زيارة منزلية', en: 'Home Visit', enb: 'homeEnabled', prc: 'priceHome', ins: 'insHome' }
                  ].map(mode => (
                    <View key={mode.key} style={{ backgroundColor: theme.bg, padding: SP.sm, borderRadius: R.sm, borderWidth: 1, borderColor: tempSub[mode.enb] ? theme.primary : theme.border }}>
                      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: tempSub[mode.enb] ? SP.sm : 0 }}>
                        <View style={{ flex: 1 }}><NCheckbox label={AR ? mode.ar : mode.en} value={!!tempSub[mode.enb]} onChange={v => setTempSub({...tempSub, [mode.enb]: v})} /></View>
                        {tempSub[mode.enb] && (
                          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.sm }}>
                            <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{tt('facreg.9c72a7be')}</Text>
                            <TextInput value={tempSub[mode.prc]} onChangeText={v => setTempSub({...tempSub, [mode.prc]: v})} placeholder="0" style={{ backgroundColor: theme.surface, padding: 4, paddingHorizontal: 8, borderRadius: R.xs, width: 60, textAlign: 'center', borderWidth: 1, borderColor: theme.border }} keyboardType="numeric" />
                          </View>
                        )}
                      </View>
                      {tempSub[mode.enb] && (
                        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'flex-start', marginTop: 4 }}>
                           <NCheckbox label={tt('facreg.47c1c1c4')} value={tempSub[mode.ins]} onChange={v => setTempSub({...tempSub, [mode.ins]: v})} />
                        </View>
                      )}
                    </View>
                  ))}

                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.md, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                    {tt('facreg.82f7fda8')}
                  </Text>
                  
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 6 }}>
                    {WORK_DAYS.map(d => {
                      const sel = tempSub.workDays?.includes(d.k);
                      return (
                        <TouchableOpacity key={d.k} onPress={() => setTempSub({...tempSub, workDays: sel ? tempSub.workDays.filter((x:any)=>x!==d.k) : [...(tempSub.workDays||[]), d.k]})} style={{ paddingHorizontal: SP.sm, paddingVertical: 4, borderRadius: R.sm, borderWidth: 1, borderColor: sel ? theme.primary : theme.border, backgroundColor: sel ? theme.primaryLight : theme.bg }}>
                          <Text style={{ fontSize: FS.xs, color: sel ? theme.primary : theme.textSub }}>{AR ? d.ar : d.en}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
                    <View style={{ flex: 1 }}>
                      <NDropdown label={tt('facreg.c375f2a3')} value={tempSub.startHour} options={HOURS} onChange={v => setTempSub({...tempSub, startHour: v})} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <NDropdown label={tt('facreg.91dd9b6d')} value={tempSub.endHour} options={HOURS} onChange={v => setTempSub({...tempSub, endHour: v})} />
                    </View>
                  </View>

                  <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: SP.md }}>
                    {tt('facreg.1f1a484b')}
                  </Text>
                </View>
              </View>
            )}

            {(modalType === 'lab') && (
              <View style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, marginTop: SP.md }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                  {tt('facreg.c4116abb')}
                </Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
                  {tt('facreg.b5117772')}
                </Text>
                <View style={{ gap: SP.sm }}>
                  {labCatalog.map(t => (
                    <View key={t.id} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}><NCheckbox label={AR ? t.ar : t.en} value={!!(tempSub.enabledTests || []).includes(t.id)} onChange={() => toggleTest(t.id)} /></View>
                      {!!(tempSub.enabledTests || []).includes(t.id) && (
                        <TextInput value={tempSub.testPrices?.[t.id] || ''} onChangeText={v => setTempSub({ ...tempSub, testPrices: { ...(tempSub.testPrices || {}), [t.id]: v } })} placeholder={tt('facreg.edbde75d')} style={{ backgroundColor: theme.bg, padding: 8, borderRadius: 8, width: 100, textAlign: AR ? 'right' : 'left' }} keyboardType="numeric" />
                      )}
                    </View>
                  ))}
                </View>

                <View style={{ marginTop: SP.lg, paddingTop: SP.lg, borderTopWidth: 1, borderTopColor: theme.border }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                    {tt('facreg.80329036')}
                  </Text>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.sm }}>
                    <View style={{ flex: 1 }}><NCheckbox label={tt('facreg.715def7a')} value={!!tempSub.homeEnabled} onChange={v => setTempSub({...tempSub, homeEnabled: v})} /></View>
                    {tempSub.homeEnabled && (
                      <TextInput value={tempSub.priceHome} onChangeText={v => setTempSub({...tempSub, priceHome: v})} placeholder={tt('facreg.9ce60f4d')} style={{ backgroundColor: theme.bg, padding: 8, borderRadius: 8, width: 100, textAlign: 'center', borderWidth: 1, borderColor: theme.border }} keyboardType="numeric" />
                    )}
                  </View>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: SP.md }}>
                    <NCheckbox label={tt('facreg.1ac8fc29')} value={tempSub.acceptsInsurance} onChange={v => setTempSub({...tempSub, acceptsInsurance: v})} />
                  </View>

                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.sm, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                    {tt('facreg.82f7fda8')}
                  </Text>
                  
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 6 }}>
                    {WORK_DAYS.map(d => {
                      const sel = tempSub.workDays?.includes(d.k);
                      return (
                        <TouchableOpacity key={d.k} onPress={() => setTempSub({...tempSub, workDays: sel ? tempSub.workDays.filter((x:any)=>x!==d.k) : [...(tempSub.workDays||[]), d.k]})} style={{ paddingHorizontal: SP.sm, paddingVertical: 4, borderRadius: R.sm, borderWidth: 1, borderColor: sel ? theme.primary : theme.border, backgroundColor: sel ? theme.primaryLight : theme.bg }}>
                          <Text style={{ fontSize: FS.xs, color: sel ? theme.primary : theme.textSub }}>{AR ? d.ar : d.en}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.md }}>
                    <View style={{ flex: 1 }}>
                      <NDropdown label={tt('facreg.c375f2a3')} value={tempSub.startHour} options={HOURS} onChange={v => setTempSub({...tempSub, startHour: v})} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <NDropdown label={tt('facreg.91dd9b6d')} value={tempSub.endHour} options={HOURS} onChange={v => setTempSub({...tempSub, endHour: v})} />
                    </View>
                  </View>
                </View>

              </View>
            )}

            {(modalType === 'radiology') && (
              <View style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, marginTop: SP.md }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                  {tt('facreg.31e5e67c')}
                </Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
                  {tt('facreg.b07c7eeb')}
                </Text>
                <View style={{ gap: SP.sm }}>
                  {radCatalog.map(s => (
                    <View key={s.id} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}><NCheckbox label={AR ? s.ar : s.en} value={!!(tempSub.enabledScans || []).includes(s.id)} onChange={() => toggleScan(s.id)} /></View>
                      {!!(tempSub.enabledScans || []).includes(s.id) && (
                        <TextInput value={tempSub.scanPrices?.[s.id] || ''} onChangeText={v => setTempSub({ ...tempSub, scanPrices: { ...(tempSub.scanPrices || {}), [s.id]: v } })} placeholder={tt('facreg.edbde75d')} style={{ backgroundColor: theme.bg, padding: 8, borderRadius: 8, width: 100, textAlign: AR ? 'right' : 'left' }} keyboardType="numeric" />
                      )}
                    </View>
                  ))}
                </View>

                <View style={{ marginTop: SP.lg, paddingTop: SP.lg, borderTopWidth: 1, borderTopColor: theme.border }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                    {tt('facreg.80329036')}
                  </Text>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.sm }}>
                    <View style={{ flex: 1 }}><NCheckbox label={tt('facreg.51910b8d')} value={!!tempSub.homeEnabled} onChange={v => setTempSub({...tempSub, homeEnabled: v})} /></View>
                    {tempSub.homeEnabled && (
                      <TextInput value={tempSub.priceHome} onChangeText={v => setTempSub({...tempSub, priceHome: v})} placeholder={tt('facreg.9ce60f4d')} style={{ backgroundColor: theme.bg, padding: 8, borderRadius: 8, width: 100, textAlign: 'center', borderWidth: 1, borderColor: theme.border }} keyboardType="numeric" />
                    )}
                  </View>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: SP.md }}>
                    <NCheckbox label={tt('facreg.1ac8fc29')} value={tempSub.acceptsInsurance} onChange={v => setTempSub({...tempSub, acceptsInsurance: v})} />
                  </View>

                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.sm, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                    {tt('facreg.82f7fda8')}
                  </Text>
                  
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 6 }}>
                    {WORK_DAYS.map(d => {
                      const sel = tempSub.workDays?.includes(d.k);
                      return (
                        <TouchableOpacity key={d.k} onPress={() => setTempSub({...tempSub, workDays: sel ? tempSub.workDays.filter((x:any)=>x!==d.k) : [...(tempSub.workDays||[]), d.k]})} style={{ paddingHorizontal: SP.sm, paddingVertical: 4, borderRadius: R.sm, borderWidth: 1, borderColor: sel ? theme.primary : theme.border, backgroundColor: sel ? theme.primaryLight : theme.bg }}>
                          <Text style={{ fontSize: FS.xs, color: sel ? theme.primary : theme.textSub }}>{AR ? d.ar : d.en}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.md }}>
                    <View style={{ flex: 1 }}>
                      <NDropdown label={tt('facreg.c375f2a3')} value={tempSub.startHour} options={HOURS} onChange={v => setTempSub({...tempSub, startHour: v})} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <NDropdown label={tt('facreg.91dd9b6d')} value={tempSub.endHour} options={HOURS} onChange={v => setTempSub({...tempSub, endHour: v})} />
                    </View>
                  </View>
                </View>

              </View>
            )}

            {(modalType === 'nursing') && (
              <View style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, marginTop: SP.md }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                  {tt('facreg.378ac39b')}
                </Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
                  {tt('facreg.e5f4a1aa')}
                </Text>
                <View style={{ gap: SP.sm }}>
                  {nursingCatalog.map(s => (
                    <View key={s.id} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}><NCheckbox label={AR ? s.ar : s.en} value={!!(tempSub.enabledNursing || []).includes(s.id)} onChange={() => toggleNursing(s.id)} /></View>
                      {!!(tempSub.enabledNursing || []).includes(s.id) && (
                        <TextInput value={tempSub.nursingPrices?.[s.id] || ''} onChangeText={v => setTempSub({ ...tempSub, nursingPrices: { ...(tempSub.nursingPrices||{}), [s.id]: v } })} placeholder={tt('facreg.edbde75d')} style={{ backgroundColor: theme.bg, padding: 8, borderRadius: 8, width: 100, textAlign: AR ? 'right' : 'left' }} keyboardType="numeric" />
                      )}
                    </View>
                  ))}
                </View>

                <View style={{ marginTop: SP.lg, paddingTop: SP.lg, borderTopWidth: 1, borderTopColor: theme.border }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                    {tt('facreg.8df50de4')}
                  </Text>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.sm }}>
                    <View style={{ flex: 1 }}><NCheckbox label={tt('facreg.6e1f9d74')} value={!!tempSub.homeEnabled} onChange={v => setTempSub({...tempSub, homeEnabled: v})} /></View>
                    {tempSub.homeEnabled && (
                      <TextInput value={tempSub.priceHome} onChangeText={v => setTempSub({...tempSub, priceHome: v})} placeholder={tt('facreg.9ce60f4d')} style={{ backgroundColor: theme.bg, padding: 8, borderRadius: 8, width: 100, textAlign: 'center', borderWidth: 1, borderColor: theme.border }} keyboardType="numeric" />
                    )}
                  </View>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: SP.md }}>
                    <NCheckbox label={tt('facreg.1ac8fc29')} value={tempSub.acceptsInsurance} onChange={v => setTempSub({...tempSub, acceptsInsurance: v})} />
                  </View>

                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.sm, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                    {tt('facreg.82f7fda8')}
                  </Text>
                  
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 6 }}>
                    {WORK_DAYS.map(d => {
                      const sel = tempSub.workDays?.includes(d.k);
                      return (
                        <TouchableOpacity key={d.k} onPress={() => setTempSub({...tempSub, workDays: sel ? tempSub.workDays.filter((x:any)=>x!==d.k) : [...(tempSub.workDays||[]), d.k]})} style={{ paddingHorizontal: SP.sm, paddingVertical: 4, borderRadius: R.sm, borderWidth: 1, borderColor: sel ? theme.primary : theme.border, backgroundColor: sel ? theme.primaryLight : theme.bg }}>
                          <Text style={{ fontSize: FS.xs, color: sel ? theme.primary : theme.textSub }}>{AR ? d.ar : d.en}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.md }}>
                    <View style={{ flex: 1 }}>
                      <NDropdown label={tt('facreg.c375f2a3')} value={tempSub.startHour} options={HOURS} onChange={v => setTempSub({...tempSub, startHour: v})} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <NDropdown label={tt('facreg.91dd9b6d')} value={tempSub.endHour} options={HOURS} onChange={v => setTempSub({...tempSub, endHour: v})} />
                    </View>
                  </View>
                </View>

              </View>
            )}

            {(modalType === 'pharmacy') && (
              <View style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, marginTop: SP.md }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                  {tt('facreg.a70a12f3')}
                </Text>
                <NCheckbox label={tt('facreg.b7822c5b')} value={!!tempSub.pharmDelivery} onChange={v => setTempSub({...tempSub, pharmDelivery: v})} />
                <View style={{ height: SP.sm }} />
                <NCheckbox label={tt('facreg.1ac8fc29')} value={tempSub.acceptsInsurance} onChange={v => setTempSub({...tempSub, acceptsInsurance: v})} />
              </View>
            )}

            <View style={{ marginTop: SP.lg, paddingHorizontal: SP.xs }}>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                {tt('facreg.b0979cf8')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SP.sm, paddingVertical: SP.sm, flexDirection: AR ? 'row-reverse' : 'row' }}>
                {uploadsOn ? (
<TouchableOpacity onPress={async () => {
                  let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, aspect: [4, 3], quality: 0.8, allowsMultipleSelection: true, selectionLimit: 5 });
                  if (!result.canceled) {
                    const uris = result.assets.map(a => a.uri);
                    setTempSub({ ...tempSub, clinicImagesUris: [...(tempSub.clinicImagesUris||[]), ...uris].slice(0, 5) });
                  }
                }} style={{ width: 80, height: 80, borderRadius: R.md, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: theme.primary }}>
                  <I name="addPhotoAlternate" size={32} color={theme.primary} />
                </TouchableOpacity>
) : <UploadsUnavailable />}
                {(tempSub.clinicImagesUris||[]).map((uri: string, i: number) => (
                  <View key={i} style={{ width: 80, height: 80, borderRadius: R.md, overflow: 'hidden' }}>
                    <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
                    <TouchableOpacity onPress={() => setTempSub({ ...tempSub, clinicImagesUris: tempSub.clinicImagesUris.filter((_:any, idx:number) => idx !== i) })} style={{ position: 'absolute', top: 4, right: 4, backgroundColor: withAlpha(theme.text, 0.5), borderRadius: 12, padding: 2 }}>
                      <I name="close" size={16} color={theme.textInv} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>

            <NBtn label={tt('facreg.a8cb327e')} onPress={saveSub} style={{ marginTop: SP.xxl, marginBottom: 50 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function Step5Insurance({ data, update, submitRef, uploads }: StepProps<FacilityRegData>) {
 const insuranceCatalog = useInsuranceCatalog();
  const { theme } = useTheme(); const { lang, t: tt } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const handleNext = async (): Promise<boolean> => {
    try {
      update({ loading: true });
      // Map doctors roster from subProviders
      const processSubProvider = async (sp: any) => {
        let wh: any[] = [];
        if (sp.workDays && sp.workDays.length > 0) {
           wh = sp.workDays.map((d:string) => ({ day: d, open: sp.startHour || '09:00', close: sp.endHour || '17:00' }));
        }
        
        const uploadedImages: string[] = [];
        if (sp.clinicImagesUris && sp.clinicImagesUris.length > 0) {
          for (let i = 0; i < sp.clinicImagesUris.length; i++) {
            uploadedImages.push(await uploads.file(sp.clinicImagesUris[i], `${sp.type}_${i}`));
          }
        }
        return { sp, wh, uploadedImages };
      };

      const doctorSubs = await Promise.all(data.subProviders.filter((s:any)=>s.type==='doctor').map(processSubProvider));
      const roster = doctorSubs.map(({sp, wh, uploadedImages}) => {
        const m = [];
        if (sp.clinicEnabled) m.push('clinic');
        if (sp.onlineEnabled) m.push('online');
        if (sp.homeEnabled) m.push('home');
        return {
          name: sp.nameAr,
          email: sp.email?.toLowerCase(),
          specialty: sp.specialty || sp.license,
          modes: m,
          price_clinic: Number(sp.priceClinic) || 0,
          price_online: Number(sp.priceOnline) || 0,
          price_home: Number(sp.priceHome) || 0,
          insurance_clinic: !!sp.insClinic,
          insurance_online: !!sp.insOnline,
          insurance_home: !!sp.insHome,
          working_hours: wh,
          clinic_images: uploadedImages,
        };
      });

      const labSubs = await Promise.all(data.subProviders.filter((s:any)=>s.type==='lab').map(processSubProvider));
      const labRoster = labSubs.map(({sp, wh, uploadedImages}) => ({
          name: sp.nameAr || 'Lab',
          email: sp.email?.toLowerCase(),
          tests: sp.enabledTests || [],
          prices: sp.testPrices || {},
          home_service: !!sp.homeEnabled,
          home_fee: Number(sp.priceHome) || 0,
          insurance: !!sp.acceptsInsurance,
          working_hours: wh,
          clinic_images: uploadedImages,
      }));

      const radSubs = await Promise.all(data.subProviders.filter((s:any)=>s.type==='radiology').map(processSubProvider));
      const radRoster = radSubs.map(({sp, wh, uploadedImages}) => ({
          name: sp.nameAr || 'Radiology',
          email: sp.email?.toLowerCase(),
          scans: sp.enabledScans || [],
          prices: sp.scanPrices || {},
          home_service: !!sp.homeEnabled,
          home_fee: Number(sp.priceHome) || 0,
          insurance: !!sp.acceptsInsurance,
          working_hours: wh,
          clinic_images: uploadedImages,
      }));

      const nurseSubs = await Promise.all(data.subProviders.filter((s:any)=>s.type==='nursing').map(processSubProvider));
      const nursingRoster = nurseSubs.map(({sp, wh, uploadedImages}) => ({
          name: sp.nameAr || 'Nursing',
          email: sp.email?.toLowerCase(),
          services: sp.enabledNursing || [],
          prices: sp.nursingPrices || {},
          home_service: !!sp.homeEnabled,
          home_fee: Number(sp.priceHome) || 0,
          insurance: !!sp.acceptsInsurance,
          working_hours: wh,
          clinic_images: uploadedImages,
      }));

      const pharmSubs = await Promise.all(data.subProviders.filter((s:any)=>s.type==='pharmacy').map(processSubProvider));
      const pharmacyRoster = pharmSubs.map(({sp, wh, uploadedImages}) => ({
          name: sp.nameAr || 'Pharmacy',
          email: sp.email?.toLowerCase(),
          delivery: !!sp.pharmDelivery,
          insurance: !!sp.acceptsInsurance,
          working_hours: wh,
          clinic_images: uploadedImages,
      }));

      await ProviderApi.step3({
        doctors_roster: roster,
        pharmacy_roster: pharmacyRoster,
        lab_roster: labRoster,
        radiology_roster: radRoster,
        nursing_roster: nursingRoster,
        accepts_cash: data.cashOnly,
        accepted_insurance: data.acceptedInsurance.map((i: any) => i.companyId),
        insurance_plans: Object.fromEntries((data.acceptedInsurance || []).filter((i: any) => Array.isArray(i.plans) && i.plans.length).map((i: any) => [i.companyId, i.plans])),
        has_insurance_coordinator: data.hasInsuranceCoordinator,
      });
      return true;
    } catch (e: any) {
      show(apiMessage(e), 'error');
      return false;
    } finally {
      update({ loading: false });
    }
  };
  useStepSaver(submitRef, handleNext);

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
    <View>
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.surface2, padding: SP.lg, borderRadius: R.md, marginBottom: SP.lg }}>
        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{tt('facreg.de9796af')}</Text>
        <Switch value={data.cashOnly} onValueChange={v=>update({cashOnly:v})} />
      </View>

      {!data.cashOnly && (
        <View style={{ marginBottom: SP.xl }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.surface2, padding: SP.lg, borderRadius: R.md, marginBottom: SP.lg }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{tt('facreg.7dbbcd9f')}</Text>
            <Switch value={data.hasInsuranceCoordinator} onValueChange={v=>update({hasInsuranceCoordinator:v})} />
          </View>

          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>{tt('facreg.b7d7af1c')}</Text>
          {insuranceCatalog.map(co => {
            const acceptedObj = data.acceptedInsurance?.find(c => c.companyId === co.id);
            const isAccepted = !!acceptedObj;

            return (
              <View key={co.id} style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, marginBottom: SP.sm, borderWidth: 1, borderColor: isAccepted ? theme.primary : theme.border }}>
                <TouchableOpacity onPress={() => toggleCompany(co.id)} style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: FS.md, color: theme.text, fontWeight: FW.bold }}>{AR ? co.ar : co.en}</Text>
                  <View style={{ width: 22, height: 22, borderRadius: R.sm, borderWidth: 2, borderColor: isAccepted ? theme.primary : theme.border, backgroundColor: isAccepted ? theme.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {isAccepted && <I name="check" size={12} color={theme.textInv} />}
                  </View>
                </TouchableOpacity>

                {isAccepted && (
                  <View style={{ marginTop: SP.sm, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.sm }}>
                    <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>{tt('facreg.f883c872')}</Text>
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
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function Step6AdminWarning({ data, update, submitRef }: StepProps<FacilityRegData>) {
  const { theme } = useTheme(); const { lang, t: tt } = useLang(); const AR = lang === 'ar';
  const handleNext = () => true;
  useStepSaver(submitRef, handleNext);

return (
    <View>
      
      <View style={{ backgroundColor: theme.dangerBg, padding: SP.xl, borderRadius: R.lg, borderWidth: 1, borderColor: theme.danger, marginTop: SP.lg }}>
        <View style={{ alignSelf: 'center', marginBottom: SP.md }}><I name="info" size={40} color={theme.danger} /></View>
        <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.danger, textAlign: 'center', marginBottom: SP.md }}>
          {tt('facreg.c15fe0e5')}
        </Text>
        <Text style={{ fontSize: FS.md, color: theme.text, textAlign: AR ? 'right' : 'left', lineHeight: 24, marginBottom: SP.md }}>
          {tt('facreg.77a815e5')}
        </Text>
        <Text style={{ fontSize: FS.md, color: theme.text, textAlign: AR ? 'right' : 'left', lineHeight: 24 }}>
          {tt('facreg.af7f4ed5')}
        </Text>
      </View>
    </View>
  );
}

