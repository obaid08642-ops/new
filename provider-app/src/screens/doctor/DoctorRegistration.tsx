import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Switch, Dimensions, Alert, Image, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useTheme, useLang, useToast } from '../../context';
import {
  NBtn, NInput, NPhoneInput, NPassStrength,
  NCheckbox, NHeader, NScroll, NDropdown, NDatePickerSheet, NDivider
} from '../../components/ui';
import { Validate } from '../../security/Security';
import { SP, R, FS, FW, SPECIALTIES, DEGREES, INSURANCE, CITIES } from '../../constants';
import { I, I as NIcon } from '../../components/icons';
import { RegistrationSuccess } from '../shared/SharedScreens';
import { ContractModal } from '../../components/ContractModal';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { OtpModal } from '../../components/OtpModal';
import { sendEmailOtp, verifyEmailOtp } from '../../api/otp';
import { SuccessScreen } from '../../components/SuccessScreen';
import { SignatureCanvasModal } from '../../components/SignatureCanvasModal';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import MapView, { Circle, Marker } from 'react-native-maps';
import SignatureCanvas from 'react-native-signature-canvas';
import { ProviderApi, sanitizeWizardData } from '../../api/provider';
import { useInsuranceCatalog } from '../../api/catalogs';

const { width: W } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
interface DoctorRegData {
  // Step 1
  nameAr: string; nameEn: string; email: string;
  phone: string; password: string; confirmPass: string; gender: string;
  // Step 2
  scfhsNumber: string; nationalId: string; iban: string; accountHolderName: string;
  idFrontUri: string; scfhsDocUri: string; extraDocUri: string;
  // Step 3
  specialty: string; degree: string; yearsExp: string;
  bio: string; profilePhotoUri: string; clinicImagesUris: string[];
  // Step 4 - Services & Map
  offersClinic: boolean; clinicPrice: string; clinicDuration: string;
  offersHome: boolean; homePrice: string; homeRadius: number;
  homeTransportFee: boolean; homeTransportPrice: string;
  offersVideo: boolean; videoPrice: string; videoDuration: string;
  lat: number; lng: number;
  // Step 5 - Schedule
  scheduleType: 'unified' | 'per_service';
  unifiedDays: string[]; unifiedStart: string; unifiedEnd: string; unifiedShift: string;
  clinicDays: string[]; clinicStart: string; clinicEnd: string; clinicShift: string;
  videoDays: string[]; videoStart: string; videoEnd: string; videoShift: string;
  homeDays: string[]; homeStart: string; homeEnd: string; homeShift: string;
  vacationDate: string;
  // Step 6 - Insurance & Location
  cashOnly: boolean;
  acceptedInsurance: { companyId: string; plans: string[] }[];
  city: string; location: {lat: number; lng: number}; address: string; clinicName: string;
  // Step 8 - Signature
  signatureData: string; signerName: string; signerRole: string;
}

const INITIAL: DoctorRegData = {
  nameAr:'', nameEn:'', email:'', phone:'', password:'', confirmPass:'', gender:'',
  scfhsNumber:'', nationalId:'', iban:'', accountHolderName: '', idFrontUri:'', scfhsDocUri:'', extraDocUri:'',
  specialty:'', degree:'', yearsExp:'', bio:'', profilePhotoUri:'', clinicImagesUris: [],
  offersClinic:false, clinicPrice:'', clinicDuration:'',
  offersHome:false, homePrice:'', homeRadius: 0, homeTransportFee: false, homeTransportPrice: '',
  offersVideo:false, videoPrice:'', videoDuration:'',
  lat: 0, lng: 0,
  scheduleType:'per_service',
  unifiedDays:[], unifiedStart:'', unifiedEnd:'', unifiedShift:'both',
  clinicDays:[], clinicStart:'', clinicEnd:'', clinicShift:'both',
  videoDays:[], videoStart:'', videoEnd:'', videoShift:'both',
  homeDays:[], homeStart:'', homeEnd:'', homeShift:'both',
  vacationDate:'',
  cashOnly:false, acceptedInsurance:[], city:'', location: {lat: 0, lng: 0}, address:'', clinicName:'', signatureData:'', signerName:'', signerRole:''
};

const WORK_DAYS = [
  { k: 'SUN', ar: 'الأحد', en: 'Sun' },
  { k: 'MON', ar: 'الاثنين', en: 'Mon' },
  { k: 'TUE', ar: 'الثلاثاء', en: 'Tue' },
  { k: 'WED', ar: 'الأربعاء', en: 'Wed' },
  { k: 'THU', ar: 'الخميس', en: 'Thu' },
  { k: 'FRI', ar: 'الجمعة', en: 'Fri' },
  { k: 'SAT', ar: 'السبت', en: 'Sat' },
];

const SHIFT_OPTIONS = [
  { val: 'morning', ar: 'صباحية', en: 'Morning' },
  { val: 'evening', ar: 'مسائية', en: 'Evening' },
  { val: 'both', ar: 'كلاهما', en: 'Both' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0');
  return { val: `${h}:00`, label: `${h}:00` };
});

// ══════════════════════════════════════════════════════════════════════════════
export function DoctorRegistration({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<DoctorRegData>(INITIAL);
  const [showMap, setShowMap] = useState(false);
    const TOTAL = 7;
  const [showSuccess, setShowSuccess] = useState(false);

  const update = useCallback((patch: Partial<DoctorRegData>) => setData(p => ({ ...p, ...patch })), []);
  const next = () => { if (step < TOTAL) setStep(s => s + 1); else setStep(8); };
  const back = () => { if (step === 1) onBack(); else setStep(s => s - 1); };

  const screens: Record<number, React.ReactElement> = {
    8: <SuccessScreen onDone={() => { setShowSuccess(false); onDone(); }} />,
    1: <Step1Basic data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    2: <Step2KYC data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    3: <Step3Profile data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    4: <Step4PricingAndLocation data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    5: <Step5Schedule data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    6: <Step6Insurance data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    7: <Step7Signature data={data} update={update} onDone={onDone} onBack={back} step={step} total={TOTAL} />,
  };
  return screens[step] ?? null;
}

// ══════════════════════════════════════════════════════════════════════════════
function Step1Basic({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [errs, setErrs] = useState<any>({});

  const nameArRef = useRef<any>(null);
  const nameEnRef = useRef<any>(null);
  const phoneRef = useRef<any>(null);
  const emailRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);
  const confirmPassRef = useRef<any>(null);

  const validate = () => {
    const e: any = {};
    if (!data.nameAr) e.nameAr = AR ? 'مطلوب' : 'Required';
    if (!data.nameEn) e.nameEn = AR ? 'مطلوب' : 'Required';
    if (!Validate.email(data.email)) e.email = AR ? 'بريد غير صحيح' : 'Invalid email';
    if (!Validate.phone(data.phone)) e.phone = AR ? 'جوال غير صحيح' : 'Invalid phone';
    if (!data.gender) e.gender = AR ? 'مطلوب' : 'Required';
    const ps = Validate.password(data.password);
    if (!ps.valid) e.password = AR ? ps.msgAr : ps.msgEn;
    if (data.password !== data.confirmPass) e.confirmPass = AR ? 'غير متطابق' : 'Mismatch';
    setErrs(e); return Object.keys(e).length === 0;
  };

  const [loading, setLoading] = useState(false);
  
    
  const handleNext = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await ProviderApi.start({
        phone: data.phone,
        password: data.password,
        full_name: data.nameAr,
        email: data.email,
        type: 'doctor',
      });
      await ProviderApi.login(data.phone, data.password);
      onNext();
    } catch (e: any) {
      try {
        await ProviderApi.login(data.phone, data.password);
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
      <NHeader title={AR ? 'المعلومات الأساسية' : 'Basic Info'} sub={AR ? 'الاسم وبيانات الدخول' : 'Name & Login Info'} step={step} total={total} onBack={onBack} />
      
      <NInput innerRef={nameArRef} label={AR ? 'الاسم الكامل (بالعربية)' : 'Full Name (Arabic)'} value={data.nameAr} onChange={v => update({ nameAr: v })} required error={errs.nameAr} returnKey="next" onSubmit={() => nameEnRef.current?.focus()} />
      <NInput innerRef={nameEnRef} label={AR ? 'الاسم الكامل (بالإنجليزية)' : 'Full Name (English)'} value={data.nameEn} onChange={v => update({ nameEn: v })} required error={errs.nameEn} returnKey="next" onSubmit={() => phoneRef.current?.focus()} />
      
      <NPhoneInput innerRef={phoneRef} label={AR ? 'رقم الجوال' : 'Phone'} value={data.phone} onChange={v => update({ phone: v })} error={errs.phone} required />
      <NInput innerRef={emailRef} label={AR ? 'البريد الإلكتروني' : 'Email'} value={data.email} onChange={v => update({ email: v })} kbType="email-address" caps="none" error={errs.email} required returnKey="next" onSubmit={() => passwordRef.current?.focus()} />
      
      <Text style={{ fontSize: FS.sm, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>{AR ? 'الجنس' : 'Gender'} *</Text>
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.lg }}>
        <TouchableOpacity onPress={() => update({ gender: 'M' })} style={{ flex: 1, padding: SP.md, borderWidth: 1, borderColor: data.gender === 'M' ? theme.primary : theme.border, backgroundColor: data.gender === 'M' ? theme.primaryLight : theme.bg, borderRadius: R.md, alignItems: 'center' }}><Text style={{ color: data.gender === 'M' ? theme.primary : theme.text }}>{AR ? 'ذكر' : 'Male'}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => update({ gender: 'F' })} style={{ flex: 1, padding: SP.md, borderWidth: 1, borderColor: data.gender === 'F' ? theme.primary : theme.border, backgroundColor: data.gender === 'F' ? theme.primaryLight : theme.bg, borderRadius: R.md, alignItems: 'center' }}><Text style={{ color: data.gender === 'F' ? theme.primary : theme.text }}>{AR ? 'أنثى' : 'Female'}</Text></TouchableOpacity>
      </View>

      <NInput innerRef={passwordRef} label={AR ? 'كلمة المرور' : 'Password'} value={data.password} onChange={v => update({ password: v })} secure error={errs.password} required returnKey="next" onSubmit={() => confirmPassRef.current?.focus()} />
      <NPassStrength password={data.password} />
      <NInput innerRef={confirmPassRef} label={AR ? 'تأكيد كلمة المرور' : 'Confirm Password'} value={data.confirmPass} onChange={v => update({ confirmPass: v })} secure error={errs.confirmPass} required returnKey="done" onSubmit={handleNext} />
      
      
          
          <NBtn label={AR ? 'متابعة' : 'Next'} onPress={handleNext} loading={loading} style={{ marginTop: SP.xl }} />
          </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function Step2KYC({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  
  const pickDocument = (field: string) => {
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
              update({ [field]: result.assets[0].uri });
              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
            }
          }
        },
        {
          text: AR ? 'معرض الصور' : 'Photo Gallery',
          onPress: async () => {
            let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
            if (!result.canceled) {
              update({ [field]: result.assets[0].uri });
              show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
            }
          }
        },
        {
          text: AR ? 'ملفات / PDF' : 'Files / PDF',
          onPress: async () => {
            let result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              update({ [field]: result.assets[0].uri });
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

  const DocBtn = ({ label, field, desc }: any) => (
    <TouchableOpacity onPress={() => pickDocument(field)} style={{ padding: SP.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: data[field] ? theme.success : theme.border, backgroundColor: data[field] ? theme.successBg : theme.surface2, borderRadius: R.lg, marginBottom: SP.md, alignItems: 'center' }}>
      <I name={data[field] ? 'checkCircle' : 'upload'} size={24} color={data[field] ? theme.success : theme.primary} />
      <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: data[field] ? theme.success : theme.text, marginTop: SP.sm }}>{label}</Text>
      {desc && <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4 }}>{desc}</Text>}
    </TouchableOpacity>
  );

  const [loading, setLoading] = useState(false);
  const handleNext = async () => {
    setLoading(true);
    try {
      const idFrontUrl = await ProviderApi.uploadFile(data.idFrontUri, 'image/jpeg', 'id_front.jpg');
      const scfhsUrl = await ProviderApi.uploadFile(data.scfhsDocUri, 'image/jpeg', 'scfhs.jpg');
      let extraUrl = data.extraDocUri;
      if (extraUrl) extraUrl = await ProviderApi.uploadFile(extraUrl, 'application/pdf', 'extra.pdf');

      await ProviderApi.step2({
        license_number: data.scfhsNumber,
        license_documents: [idFrontUrl, scfhsUrl, extraUrl].filter(Boolean),
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
      <NHeader title={AR ? 'التوثيق والمستندات' : 'KYC & Documents'} step={step} total={total} onBack={onBack} />
      <NInput label={AR ? 'رقم الهوية الوطنية / الإقامة' : 'National ID'} value={data.nationalId} onChange={v=>update({nationalId:v})} kbType="numeric" required />
      <NInput label={AR ? 'رقم تصنيف الهيئة (SCFHS)' : 'SCFHS Number'} value={data.scfhsNumber} onChange={v=>update({scfhsNumber:v})} kbType="numeric" required />
      
      <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.md, marginBottom: SP.sm, textAlign: AR ? 'right':'left' }}>{AR ? 'المرفقات' : 'Attachments'}</Text>
      <DocBtn label={AR ? 'الهوية الوطنية (الوجه الأمامي)' : 'National ID (Front)'} field="idFrontUri" />
      <DocBtn label={AR ? 'بطاقة تصنيف الهيئة' : 'SCFHS License'} field="scfhsDocUri" />
      <DocBtn label={AR ? 'شهادات أو مستندات إضافية (اختياري)' : 'Additional Documents (Optional)'} field="extraDocUri" desc={AR ? 'مثل البورد، شهادات الزمالة...' : 'Fellowships, Board...'} />
      
      <NBtn label={AR ? 'متابعة' : 'Next'} onPress={handleNext} loading={loading} disabled={!data.nationalId || !data.scfhsNumber || !data.idFrontUri || !data.scfhsDocUri} style={{ marginTop: SP.lg }} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function Step3Profile({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [showRemoveBg, setShowRemoveBg] = useState(false);
  
  const pickPhoto = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) update({ profilePhotoUri: result.assets[0].uri });
  };

  return (
    <NScroll>
      <NHeader title={AR ? 'الملف الشخصي' : 'Professional Profile'} step={step} total={total} onBack={onBack} />
      
      <View style={{ alignItems: 'center', marginBottom: SP.md }}>
        <TouchableOpacity onPress={pickPhoto} style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: theme.primary }}>
          {data.profilePhotoUri ? <Image source={{ uri: data.profilePhotoUri }} style={{ width: 100, height: 100 }} /> : <I name="camera" size={32} color={theme.textSub} />}
        </TouchableOpacity>
        <Text style={{ fontSize: FS.sm, color: theme.primary, marginTop: SP.sm, fontWeight: FW.bold }}>{AR ? 'التقاط / اختيار صورة' : 'Take / Choose Photo'}</Text>
      </View>
      <View style={{ alignItems: 'center', marginBottom: SP.xl, paddingHorizontal: SP.md }}>
        <TouchableOpacity onPress={() => setShowRemoveBg(true)} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, backgroundColor: theme.primary, paddingHorizontal: SP.xl, paddingVertical: SP.md, borderRadius: R.full, elevation: 2, shadowColor: theme.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, marginBottom: SP.sm }}>
          <I name="image" size={20} color="#fff" />
          <Text style={{ fontSize: FS.md, color: '#fff', fontWeight: FW.bold }}>{AR ? 'تحسين جودة الصورة (إزالة الخلفية)' : 'Improve Quality (Remove BG)'}</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: 'center', lineHeight: 22, marginTop: SP.xs }}>
          {AR ? 'عند الضغط على هذا الزر ستفتح صفحة.. قم برفع صورتك وانتظر حتى يتم تحليلها وتحسينها وإزالة الخلفية، ثم قم بتحميلها وإعادة رفعها هنا' : 'Clicking this button will open a page.. upload your photo, wait for it to be analyzed and background removed, then download it and re-upload it here.'}
        </Text>
      </View>

      <Modal visible={showRemoveBg} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowRemoveBg(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', padding: SP.md, backgroundColor: '#111' }}>
            <Text style={{ color: '#FFF', fontWeight: FW.bold }}>{AR ? 'أداة إزالة الخلفية' : 'Background Removal Tool'}</Text>
            <TouchableOpacity onPress={() => setShowRemoveBg(false)} style={{ padding: SP.xs }}>
              <Text style={{ color: theme.danger, fontWeight: FW.bold }}>{AR ? 'إغلاق' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
          <WebView source={{ uri: 'https://www.remove.bg/upload' }} style={{ flex: 1 }} />
        </SafeAreaView>
      </Modal>

      <NDropdown
        label={AR ? 'التخصص الطبي' : 'Specialty'}
        value={data.specialty}
        options={SPECIALTIES.map(s => ({ val: s.id, label: AR ? s.ar : s.en }))}
        onChange={v => update({ specialty: v })}
        placeholder={AR ? 'اختر التخصص...' : 'Select Specialty...'}
      />
      <View style={{ height: SP.sm }} />
      <NDropdown
        label={AR ? 'الدرجة العلمية' : 'Degree'}
        value={data.degree}
        options={DEGREES.map(d => ({ val: d.id, label: AR ? d.ar : d.en }))}
        onChange={v => update({ degree: v })}
        placeholder={AR ? 'اختر الدرجة...' : 'Select Degree...'}
      />
      <View style={{ height: SP.sm }} />
      <NInput label={AR ? 'سنوات الخبرة' : 'Years of Experience'} value={data.yearsExp} onChange={v=>update({yearsExp:v})} kbType="numeric" required />
      <NInput label={AR ? 'النبذة التعريفية (Bio)' : 'Bio'} value={data.bio} onChange={v=>update({bio:v})} multi lines={4} placeholder={AR ? 'تحدث عن خبرتك...' : 'Talk about your experience...'} />
      
      <View style={{ marginTop: SP.md }}>
        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
          {AR ? 'صور العيادة (لغاية 5 صور)' : 'Clinic Images (up to 5)'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SP.sm, paddingVertical: SP.sm, flexDirection: AR ? 'row-reverse' : 'row' }}>
          <TouchableOpacity onPress={async () => {
            let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, aspect: [4, 3], quality: 0.8, allowsMultipleSelection: true, selectionLimit: 5 });
            if (!result.canceled) {
              const uris = result.assets.map(a => a.uri);
              update({ clinicImagesUris: [...data.clinicImagesUris, ...uris].slice(0, 5) });
            }
          }} style={{ width: 80, height: 80, borderRadius: R.md, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: theme.primary }}>
            <I name="addPhotoAlternate" size={32} color={theme.primary} />
          </TouchableOpacity>
          {data.clinicImagesUris.map((uri: string, i: number) => (
            <View key={i} style={{ width: 80, height: 80, borderRadius: R.md, overflow: 'hidden' }}>
              <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
              <TouchableOpacity onPress={() => update({ clinicImagesUris: data.clinicImagesUris.filter((_:any, idx:number) => idx !== i) })} style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 2 }}>
                <I name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
      
      <NBtn label={AR ? 'متابعة' : 'Next'} onPress={onNext} disabled={!data.specialty || !data.degree} style={{ marginTop: SP.lg }} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function Step4PricingAndLocation({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [showMap, setShowMap] = useState(false);

  return (
    <NScroll pad={false}>
      <View style={{ padding: SP.xl, paddingBottom: 0 }}>
        <NHeader title={AR ? 'الخدمات والأسعار' : 'Services & Pricing'} step={step} total={total} onBack={onBack} />
      </View>
      
      <View style={{ paddingHorizontal: SP.xl }}>
        {/* Clinic */}
        <View style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, marginBottom: SP.md }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: data.offersClinic ? SP.md : 0 }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{AR ? 'العيادة (حضور المريض)' : 'Clinic Visit'}</Text>
            <Switch value={data.offersClinic} onValueChange={v=>update({offersClinic:v})} />
          </View>
          {data.offersClinic && (
            <View>
              <NInput label={AR ? 'سعر الكشف في العيادة' : 'Clinic Visit Price'} value={data.clinicPrice} onChange={v=>update({clinicPrice:v})} kbType="numeric" />
              <NInput label={AR ? 'مدة الكشف (بالدقائق)' : 'Consultation Duration (min)'} value={data.clinicDuration} onChange={v=>update({clinicDuration:v})} kbType="numeric" />
            </View>
          )}
        </View>

        {/* Video */}
        <View style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, marginBottom: SP.md }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: data.offersVideo ? SP.md : 0 }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{AR ? 'استشارة فيديو' : 'Video Consult'}</Text>
            <Switch value={data.offersVideo} onValueChange={v=>update({offersVideo:v})} />
          </View>
          {data.offersVideo && (
            <View>
              <NInput label={AR ? 'سعر الاستشارة الأونلاين' : 'Online Consult Price'} value={data.videoPrice} onChange={v=>update({videoPrice:v})} kbType="numeric" />
              <NInput label={AR ? 'مدة الاستشارة (بالدقائق)' : 'Consultation Duration (min)'} value={data.videoDuration} onChange={v=>update({videoDuration:v})} kbType="numeric" />
            </View>
          )}
        </View>

        {/* Home Visit & Maps */}
        <View style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, marginBottom: SP.md }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: data.offersHome ? SP.md : 0 }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{AR ? 'الزيارة المنزلية' : 'Home Visit'}</Text>
            <Switch value={data.offersHome} onValueChange={v=>update({offersHome:v})} />
          </View>
          
          {data.offersHome && (
            <View>
              <NInput label={AR ? 'سعر الزيارة المنزلية' : 'Home Visit Price'} value={data.homePrice} onChange={v=>update({homePrice:v})} kbType="numeric" />
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
                <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? 'احتساب رسوم انتقال إضافية؟' : 'Add Transport Fees?'}</Text>
                <Switch value={data.homeTransportFee} onValueChange={v=>update({homeTransportFee:v})} />
              </View>
              {data.homeTransportFee && (
                <NInput label={AR ? 'رسوم الانتقال' : 'Transport Fee'} value={data.homeTransportPrice} onChange={v=>update({homeTransportPrice:v})} kbType="numeric" />
              )}
              
              <Text style={{ fontSize: FS.sm, color: theme.text, marginTop: SP.md, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>{AR ? 'نطاق التغطية الجغرافية' : 'Coverage Radius'}</Text>
              
              {/* +/- controls & text input */}
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

              {/* Fast presets */}
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginBottom: SP.md }}>
                {[1, 5, 10, 20, 50].map(km => (
                  <TouchableOpacity key={km} onPress={() => update({ homeRadius: km })} style={{ flex: 1, padding: SP.sm, borderWidth: 1, borderColor: data.homeRadius === km ? theme.primary : theme.border, backgroundColor: data.homeRadius === km ? theme.primaryLight : theme.bg, borderRadius: R.sm, alignItems: 'center' }}>
                    <Text style={{ color: data.homeRadius === km ? theme.primary : theme.textSub, fontWeight: FW.bold }}>{km} {AR ? 'كم' : 'KM'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ marginTop: SP.md }}>
                <TouchableOpacity onPress={() => setShowMap(true)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface3, padding: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: theme.border }}>
                  <NIcon name="map" size={24} color={theme.primary} />
                  <Text style={{ flex: 1, marginHorizontal: SP.sm, color: theme.text, fontSize: FS.md, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? 'تحديد الموقع على الخريطة' : 'Pick Location on Map'}
                  </Text>
                  <Text style={{ color: theme.primary, fontWeight: 'bold' }}>{AR ? 'تعديل' : 'Edit'}</Text>
                </TouchableOpacity>
              </View>
              
              <LocationPickerModal
                visible={showMap}
                onClose={() => setShowMap(false)}
                initialLocation={{ lat: data.lat, lng: data.lng }}
                onSelectLocation={(loc) => {
                  update({ lat: loc.lat, lng: loc.lng });
                  setShowMap(false);
                }}
              />
            </View>
          )}
        </View>

        <NBtn label={AR ? 'متابعة' : 'Next'} onPress={onNext} style={{ marginTop: SP.lg, marginBottom: 50 }} />
      </View>
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function Step5Schedule({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [showVacationCal, setShowVacationCal] = useState(false);

  const toggleDay = (day: string, service: 'unified' | 'clinic' | 'video' | 'home') => {
    let daysKey = `${service}Days` as keyof DoctorRegData;
    if (service === 'unified') daysKey = 'unifiedDays' as keyof DoctorRegData;
    const current = (data[daysKey] as string[]) || [];
    const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
    update({ [daysKey]: next } as any);
  };

  const renderServiceSchedule = (svcKey: 'clinic' | 'video' | 'home', title: string) => {
    const daysKey = `${svcKey}Days` as keyof DoctorRegData;
    const startKey = `${svcKey}Start` as keyof DoctorRegData;
    const endKey = `${svcKey}End` as keyof DoctorRegData;
    const startEveKey = `${svcKey}StartEve` as keyof DoctorRegData;
    const endEveKey = `${svcKey}EndEve` as keyof DoctorRegData;
    const shiftKey = `${svcKey}Shift` as keyof DoctorRegData;

    return (
      <View style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, marginBottom: SP.md }}>
        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.primary, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>{title}</Text>
        
        {/* Days checklist */}
        <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>{AR ? 'أيام العمل' : 'Work Days'}</Text>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 6, marginBottom: SP.md }}>
          {WORK_DAYS.map(day => {
            const active = ((data[daysKey] as string[]) || []).includes(day.k);
            return (
              <TouchableOpacity key={day.k} onPress={() => toggleDay(day.k, svcKey)} style={{ paddingHorizontal: SP.sm, paddingVertical: 6, borderRadius: R.sm, borderWidth: 1, borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primaryLight : theme.bg }}>
                <Text style={{ fontSize: FS.xs, color: active ? theme.primary : theme.textSub }}>{AR ? day.ar : day.k}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <NDropdown
          label={AR ? 'فترة الدوام' : 'Shift'}
          value={String(data[shiftKey] || '')}
          options={SHIFT_OPTIONS.map(s => ({ val: s.val, label: AR ? s.ar : s.en }))}
          onChange={v => update({ [shiftKey]: v } as any)}
        />

        {/* Times & shifts */}
        <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left', marginTop: SP.sm }}>
          {data[shiftKey] === 'both' ? (AR ? 'الفترة الصباحية' : 'Morning Shift') : (AR ? 'ساعات العمل' : 'Working Hours')}
        </Text>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginBottom: SP.sm }}>
          <View style={{ flex: 1 }}>
            <NDropdown label={AR ? 'من' : 'From'} value={String(data[startKey] || '')} options={HOURS} onChange={v => update({ [startKey]: v } as any)} />
          </View>
          <View style={{ flex: 1 }}>
            <NDropdown label={AR ? 'إلى' : 'To'} value={String(data[endKey] || '')} options={HOURS} onChange={v => update({ [endKey]: v } as any)} />
          </View>
        </View>

        {data[shiftKey] === 'both' && (
          <>
            <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left', marginTop: SP.sm }}>{AR ? 'الفترة المسائية' : 'Evening Shift'}</Text>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginBottom: SP.sm }}>
              <View style={{ flex: 1 }}>
                <NDropdown label={AR ? 'من' : 'From'} value={String(data[startEveKey] || '')} options={HOURS} onChange={v => update({ [startEveKey]: v } as any)} />
              </View>
              <View style={{ flex: 1 }}>
                <NDropdown label={AR ? 'إلى' : 'To'} value={String(data[endEveKey] || '')} options={HOURS} onChange={v => update({ [endEveKey]: v } as any)} />
              </View>
            </View>
          </>
        )}

      </View>
    );
  };

  return (
    <NScroll>
      <NHeader title={AR ? 'مواعيد العمل والجدولة' : 'Working Hours'} step={step} total={total} onBack={onBack} />
      
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.lg }}>
        <TouchableOpacity onPress={() => update({ scheduleType: 'unified' })} style={{ flex: 1, padding: SP.md, borderWidth: 1, borderColor: data.scheduleType === 'unified' ? theme.primary : theme.border, backgroundColor: data.scheduleType === 'unified' ? theme.primaryLight : theme.bg, borderRadius: R.md, alignItems: 'center' }}>
          <Text style={{ color: data.scheduleType === 'unified' ? theme.primary : theme.text, fontWeight: FW.bold }}>{AR ? 'جدول موحد' : 'Unified'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => update({ scheduleType: 'per_service' })} style={{ flex: 1, padding: SP.md, borderWidth: 1, borderColor: data.scheduleType === 'per_service' ? theme.primary : theme.border, backgroundColor: data.scheduleType === 'per_service' ? theme.primaryLight : theme.bg, borderRadius: R.md, alignItems: 'center' }}>
          <Text style={{ color: data.scheduleType === 'per_service' ? theme.primary : theme.text, fontWeight: FW.bold }}>{AR ? 'جدول لكل خدمة' : 'Per Service'}</Text>
        </TouchableOpacity>
      </View>

      {data.scheduleType === 'unified' ? (
        <View style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, marginBottom: SP.lg }}>
          <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>{AR ? 'أيام العمل' : 'Work Days'}</Text>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 6, marginBottom: SP.md }}>
            {WORK_DAYS.map(day => {
              const active = data.unifiedDays.includes(day.k);
              return (
                <TouchableOpacity key={day.k} onPress={() => toggleDay(day.k, 'unified')} style={{ paddingHorizontal: SP.sm, paddingVertical: 6, borderRadius: R.sm, borderWidth: 1, borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primaryLight : theme.bg }}>
                  <Text style={{ fontSize: FS.xs, color: active ? theme.primary : theme.textSub }}>{AR ? day.ar : day.k}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <NDropdown
            label={AR ? 'فترة الدوام' : 'Shift'}
            value={data.unifiedShift}
            options={SHIFT_OPTIONS.map(s => ({ val: s.val, label: AR ? s.ar : s.en }))}
            onChange={v => update({ unifiedShift: v })}
          />

          <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left', marginTop: SP.sm }}>
            {data.unifiedShift === 'both' ? (AR ? 'الفترة الصباحية' : 'Morning Shift') : (AR ? 'ساعات العمل' : 'Working Hours')}
          </Text>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginBottom: SP.sm }}>
            <View style={{ flex: 1 }}>
              <NDropdown label={AR ? 'من' : 'From'} value={data.unifiedStart} options={HOURS} onChange={v => update({ unifiedStart: v })} />
            </View>
            <View style={{ flex: 1 }}>
              <NDropdown label={AR ? 'إلى' : 'To'} value={data.unifiedEnd} options={HOURS} onChange={v => update({ unifiedEnd: v })} />
            </View>
          </View>

          {data.unifiedShift === 'both' && (
            <>
              <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left', marginTop: SP.sm }}>{AR ? 'الفترة المسائية' : 'Evening Shift'}</Text>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, marginBottom: SP.sm }}>
                <View style={{ flex: 1 }}>
                  <NDropdown label={AR ? 'من' : 'From'} value={data.unifiedStartEve} options={HOURS} onChange={v => update({ unifiedStartEve: v })} />
                </View>
                <View style={{ flex: 1 }}>
                  <NDropdown label={AR ? 'إلى' : 'To'} value={data.unifiedEndEve} options={HOURS} onChange={v => update({ unifiedEndEve: v })} />
                </View>
              </View>
            </>
          )}
        </View>
      ) : (
        <View style={{ marginBottom: SP.md }}>
          {data.offersClinic && renderServiceSchedule('clinic', AR ? 'حجز العيادة' : 'Clinic Visit')}
          {data.offersVideo && renderServiceSchedule('video', AR ? 'استشارة الفيديو' : 'Video Consult')}
          {data.offersHome && renderServiceSchedule('home', AR ? 'الزيارة المنزلية' : 'Home Visit')}
        </View>
      )}

      {/* Vacation Date Calendar */}
      <TouchableOpacity onPress={() => setShowVacationCal(true)}>
        <NInput label={AR ? 'إجازة مخطط لها' : 'Planned Vacation'} placeholder={AR ? 'اضغط لاختيار تاريخ إجازتك...' : 'Choose vacation date...'} value={data.vacationDate} onChange={(val) => { update({ vacationDate: val }); setShowVacationCal(false); }} editable={false} icon="calendar" />
      </TouchableOpacity>

      <NDatePickerSheet
        visible={showVacationCal}
        value={data.vacationDate}
        onChange={(val) => { update({ vacationDate: val }); setShowVacationCal(false); }}
        onClose={() => setShowVacationCal(false)}
        title={AR ? 'اختر تاريخ إجازتك' : 'Select Vacation Date'}
      />

      <NBtn label={AR ? 'متابعة' : 'Next'} onPress={onNext} style={{ marginTop: SP.lg }} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function Step6Insurance({ data, update, onNext, onBack, step, total }: any) {
 const insuranceCatalog = useInsuranceCatalog();
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';

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
      <NHeader title={AR ? 'التأمين وموقع تقديم الخدمة' : 'Insurance & Clinic Info'} step={step} total={total} onBack={onBack} />
      
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.surface2, padding: SP.lg, borderRadius: R.md, marginBottom: SP.sm }}>
        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{AR ? 'الدفع نقداً فقط (لا أقبل التأمين)' : 'Cash Only (No Insurance)'}</Text>
        <Switch value={data.cashOnly} onValueChange={v=>update({cashOnly:v})} />
      </View>

      {!data.cashOnly && (
        <View style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, marginBottom: SP.lg }}>
          <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.primary, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>{AR ? 'تطبيق التأمين على الخدمات التالية:' : 'Apply Insurance to:'}</Text>
          {data.offersClinic && (
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
              <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? 'حجز العيادة' : 'Clinic Visit'}</Text>
              <Switch value={data.insuranceClinic} onValueChange={v=>update({insuranceClinic:v})} />
            </View>
          )}
          {data.offersVideo && (
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.sm }}>
              <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? 'استشارة فيديو' : 'Video Consult'}</Text>
              <Switch value={data.insuranceVideo} onValueChange={v=>update({insuranceVideo:v})} />
            </View>
          )}
          {data.offersHome && (
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: FS.sm, color: theme.text }}>{AR ? 'زيارة منزلية' : 'Home Visit'}</Text>
              <Switch value={data.insuranceHome} onValueChange={v=>update({insuranceHome:v})} />
            </View>
          )}
        </View>
      )}

      {!data.cashOnly && (
        <View style={{ marginBottom: SP.xl }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>{AR ? 'شركات التأمين المعتمدة' : 'Accepted Insurance Companies'}</Text>
          {insuranceCatalog.map(co => {
            const acceptedObj = data.acceptedInsurance?.find(c => c.companyId === co.id);
            const isAccepted = !!acceptedObj;

            return (
              <View key={co.id} style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, marginBottom: SP.sm, borderWidth: 1, borderColor: isAccepted ? theme.primary : theme.border }}>
                <TouchableOpacity onPress={() => toggleCompany(co.id)} style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: FS.md, color: theme.text, fontWeight: FW.bold }}>{AR ? co.ar : co.en}</Text>
                  <View style={{ width: 22, height: 22, borderRadius: R.sm, borderWidth: 2, borderColor: isAccepted ? theme.primary : theme.border, backgroundColor: isAccepted ? theme.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {isAccepted && <I name="check" size={12} color="#FFF" />}
                  </View>
                </TouchableOpacity>

                {isAccepted && (
                  <View style={{ marginTop: SP.sm, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.sm }}>
                    <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>{AR ? 'الخطط / الفئات المقبولة:' : 'Accepted Plans/Tiers:'}</Text>
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

      <NDivider label={AR ? 'العنوان والعيادة' : 'Clinic Location'} />
      <View style={{ height: SP.sm }} />
      <NDropdown
        label={AR ? 'المدينة' : 'City'}
        value={data.city}
        options={CITIES.map(c => ({ val: c.id, label: AR ? c.ar : c.en }))}
        onChange={v => update({ city: v })}
      />
      <View style={{ height: SP.sm }} />
      <NInput label={AR ? 'الحي' : 'District'} value={data.district} onChange={v=>update({district:v})} required />
      <NInput label={AR ? 'الشارع / العنوان التفصيلي' : 'Street / Detailed Address'} value={data.address} onChange={v=>update({address:v})} required />
      <NInput label={AR ? 'اسم العيادة (اختياري)' : 'Clinic Name (Optional)'} value={data.clinicName} onChange={v=>update({clinicName:v})} />
      
      <View style={{ height: 200, borderRadius: R.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, marginTop: SP.md }}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={{ latitude: 24.7136, longitude: 46.6753, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
          onPress={(e) => update({ location: e.nativeEvent.coordinate })}
        >
          {data.location && <Marker coordinate={data.location} />}
        </MapView>
        <TouchableOpacity 
          style={{ position: 'absolute', bottom: SP.md, right: SP.md, backgroundColor: theme.card, padding: SP.sm, borderRadius: R.full, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: {width:0, height:2} }}
          onPress={() => update({ location: { latitude: 24.7136, longitude: 46.6753 } })} // Simulating My Location
        >
          <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.primary }}>{AR ? 'موقعي الحالي' : 'My Location'}</Text>
        </TouchableOpacity>
      </View>

      <NBtn 
        label={AR ? 'متابعة' : 'Next'} 
        onPress={() => {
          if (!data.city || !data.district || !data.address) {
            show(AR ? 'يرجى إكمال العنوان الشامل (المدينة، الحي، الشارع)' : 'Please complete the address (City, District, Street)', 'error');
            return;
          }
          if (!data.cashOnly && (!data.acceptedInsurance || data.acceptedInsurance.length === 0)) {
            show(AR ? 'يرجى اختيار شركة تأمين واحدة على الأقل أو تفعيل الدفع النقدي فقط' : 'Please select at least one insurance company or enable Cash Only', 'error');
            return;
          }
          onNext();
        }} 
        style={{ marginTop: SP.lg }} 
      />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function Step7Signature({ data, update, onDone, onBack, step, total }: any) {
  const [showContract, setShowContract] = useState(false);
  const [showSigModal, setShowSigModal] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const handleVerifyOtp = async (code: string) => verifyEmailOtp(data.managerEmail || data.email, code);
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const sigRef = useRef<any>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSignature = async (signature: string) => {
    setLoading(true);
    try {
      let wh: any[] = [];
      if (data.scheduleType === 'unified') {
        wh = data.unifiedDays.map((d: string) => ({
          day: d,
          open: data.unifiedStart || '08:00',
          close: data.unifiedEnd || '14:00',
          open_evening: data.unifiedShift === 'both' ? data.unifiedStartEve : undefined,
          close_evening: data.unifiedShift === 'both' ? data.unifiedEndEve : undefined
        }));
      } else {
        // NOTE: per-service schedule is stored in flat fields (clinicDays/clinicStart/…),
        // there is no `perService` object — reading it crashed with
        // "Cannot read property 'clinic' of undefined" on final submit.
        wh = ((data.clinicDays as string[]) || []).map((d: string) => ({
          day: d,
          open: (data as any).clinicStart || '',
          close: (data as any).clinicEnd || '',
          open_evening: (data as any).clinicShift === 'both' ? (data as any).clinicStartEve : undefined,
          close_evening: (data as any).clinicShift === 'both' ? (data as any).clinicEndEve : undefined
        }));
      }

      // 1. Send all Step 3 data (Services, Schedule, Location, Insurance)
      //    — plus the fields that were collected but never sent (durations,
      //    transport fee, clinic name, vacation, per-mode schedules, IDs).
      await ProviderApi.step3({
        specialty: data.specialty,
        academic_degree: data.degree,
        years_experience: parseInt(data.yearsExp) || 0,
        consultation_modes: [
          ...(data.offersClinic ? ['clinic'] : []),
          ...(data.offersVideo ? ['video'] : []),
          ...(data.offersHome ? ['home'] : [])
        ],
        price_clinic: parseFloat(data.clinicPrice) || 0,
        price_online: parseFloat(data.videoPrice) || 0,
        price_home: parseFloat(data.homePrice) || 0,
        home_visit_radius_km: data.homeRadius,
        clinic_duration: parseInt(data.clinicDuration) || 0,
        video_duration: parseInt(data.videoDuration) || 0,
        home_transport_fee: !!data.homeTransportFee,
        home_transport_price: parseFloat(data.homeTransportPrice) || 0,
        clinic_name: data.clinicName || undefined,
        vacation_date: data.vacationDate || undefined,
        national_id: data.nationalId || undefined,
        gender: data.gender || undefined,
        schedule_video: ((data.videoDays as string[]) || []).map((d: string) => ({
          day: d,
          open: (data as any).videoStart || '',
          close: (data as any).videoEnd || '',
          open_evening: (data as any).videoShift === 'both' ? (data as any).videoStartEve : undefined,
          close_evening: (data as any).videoShift === 'both' ? (data as any).videoEndEve : undefined
        })),
        schedule_home: ((data.homeDays as string[]) || []).map((d: string) => ({
          day: d,
          open: (data as any).homeStart || '',
          close: (data as any).homeEnd || '',
          open_evening: (data as any).homeShift === 'both' ? (data as any).homeStartEve : undefined,
          close_evening: (data as any).homeShift === 'both' ? (data as any).homeEndEve : undefined
        })),
        working_hours: wh,
        accepts_insurance: !data.cashOnly && (data.acceptedInsurance || []).length > 0,
        accepted_insurance: (data.acceptedInsurance || []).map((i: any) => i.companyId),
        insurance_clinic: data.insuranceClinic,
        insurance_online: data.insuranceVideo,
        insurance_home: data.insuranceHome,
      });

      // 2. Step 2 Data that was deferred (City, Address, Cash, Bio, Photo, Clinic Images)
      // The personal photo goes to its OWN field (provider card / booking profile) —
      // never mixed into the clinic gallery.
      let profilePhoto: string | undefined;
      if (data.profilePhotoUri && !data.profilePhotoUri.startsWith('http')) {
        profilePhoto = await ProviderApi.uploadFile(data.profilePhotoUri, 'image/jpeg', 'doctor_profile.jpg');
      } else if (data.profilePhotoUri) {
        profilePhoto = data.profilePhotoUri;
      }
      const images: string[] = [];
      if (data.clinicImagesUris && data.clinicImagesUris.length > 0) {
        for (let i = 0; i < data.clinicImagesUris.length; i++) {
          const uri = data.clinicImagesUris[i];
          if (!uri.startsWith('http')) {
            images.push(await ProviderApi.uploadFile(uri, 'image/jpeg', `clinic_${i}.jpg`));
          } else {
            images.push(uri);
          }
        }
      }

      await ProviderApi.step2({
        name_ar: data.nameAr,
        name_en: data.nameEn,
        city: data.city,
        district: data.district,
        location: data.location,
        address: data.address,
        accepts_cash: data.cashOnly,
        bio: data.bio,
        clinic_images: images,
        profile_photo: profilePhoto,
        languages: data.languages,
      });

      // 3. Upload signature
      const sigUrl = await ProviderApi.uploadSignature(signature);
      update({ signatureData: sigUrl });

      // 4. Submit
      await ProviderApi.step2({
        iban: data.iban,
        bank_account_name: data.accountHolderName
      });
      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.lat, lng: data.lng , signature_url: sigUrl, full_data: sanitizeWizardData(data) });

      show(AR ? 'تم إرسال الطلب بنجاح!' : 'Submitted successfully!', 'success');
      setSubmitted(true);
    } catch (e: any) {
      show(e.message || (AR ? 'حدث خطأ' : 'Error submitting'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const submit = () => {
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

  const clearSig = () => {
    sigRef.current?.clearSignature();
    update({ signatureData: '' });
  };

  if (submitted) {
    return <RegistrationSuccess onDone={onDone} email={data.email} providerType="doctor" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: SP.xl, paddingBottom: 0 }}>
        <NHeader title={AR ? 'مراجعة وتوقيع العقد' : 'Review & Sign Contract'} step={step} total={total} onBack={onBack} />
      </View>
      
      <ScrollView scrollEnabled={scrollEnabled} style={{ flex: 1, paddingHorizontal: SP.xl }} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: theme.surface2, padding: SP.lg, borderRadius: R.lg, marginBottom: SP.lg }}>
          
          {/* Admin Warning Section */}
          <View style={{ backgroundColor: theme.dangerBg, padding: SP.md, borderRadius: 8, borderWidth: 1, borderColor: theme.danger, marginBottom: SP.lg }}>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: SP.sm }}>
              <NIcon name="info" size={24} color={theme.danger} />
              <Text style={{ fontSize: FS.md, fontWeight: 'bold', color: theme.danger, marginHorizontal: SP.sm }}>
                {AR ? 'نظام الموافقات' : 'Approval System'}
              </Text>
            </View>
            <Text style={{ fontSize: FS.sm, color: theme.text, textAlign: AR ? 'right' : 'left', lineHeight: 22 }}>
              {AR ? 'البيانات التي قمت بإدخالها تخضع لمراجعة الإدارة (الأدمن) ولن تنشر لجمهور المرضى حتى تتم الموافقة عليها. كذلك أي تعديلات مستقبلية على الأسعار والخدمات تخضع لنفس النظام.' : 'Data entered is subject to Admin review and will not go live until approved. Future updates to pricing/services also follow this system.'}
            </Text>
          </View>

          {/* Contract Modal & Button */}
          
      
          <TouchableOpacity style={{ backgroundColor: theme.surface, padding: SP.md, borderRadius: 8, borderWidth: 1, borderColor: theme.primary, alignItems: 'center', marginBottom: SP.lg }} onPress={() => setShowContract(true)}>
            <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: FS.md }}>{AR ? 'الاطلاع على العقد' : 'View Contract'}</Text>
          </TouchableOpacity>

          {/* Signer Info */}
          <View style={{ marginBottom: SP.lg }}>
            <Text style={{ fontSize: FS.md, fontWeight: 'bold', color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
              {AR ? 'بيانات الطرف الثاني (مقدم الخدمة)' : 'Second Party Data'}
            </Text>
            <NInput
              label={AR ? 'اسم المُوقّع' : 'Signer Name'}
              value={data.signerName}
              onChange={v => update({ signerName: v })}
              placeholder={AR ? 'الاسم الثلاثي' : 'Full Name'}
            />
            <NInput
              label={AR ? 'صفة المُوقّع' : 'Signer Role'}
              value={data.signerRole}
              onChange={v => update({ signerRole: v })}
              placeholder={AR ? 'مثل: مالك، مدير عام' : 'e.g., Owner, General Manager'}
            />
          </View>

          
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

          <Text style={{ fontSize: FS.md, fontWeight: 'bold', color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>{AR ? 'إقرار وتوقيع' : 'Declaration & Signature'}</Text>
          <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', lineHeight: 22 }}>
            {AR ? 'بالتوقيع أدناه، أقر بأن جميع البيانات المدخلة صحيحة وأتحمل مسؤوليتها القانونية، وأوافق على شروط نبض بلس لاستخدام المنصة.' : 'By signing below, I acknowledge that all provided data is correct, and I agree to Nabdah Plus terms of use.'}
          </Text>
        </View>

        

        
        <View style={{ marginBottom: SP.lg, gap: SP.md }}>
          <TouchableOpacity onPress={() => setShowContract(true)} style={{ padding: SP.md, backgroundColor: theme.surface2, borderRadius: R.md, alignItems: 'center' }}>
            <Text style={{ color: theme.primary, fontWeight: FW.bold }}>{AR ? 'الاطلاع على تفاصيل العقد' : 'View Contract Details'}</Text>
          </TouchableOpacity>

          <View style={{ gap: SP.sm }}>
            <NInput label={AR ? 'اسم المُوقّع' : 'Signatory Name'} value={data.signerName} onChange={(v) => update({signerName: v})} />
            <NInput label={AR ? 'صفة المُوقّع (مثال: طبيب مستقل)' : 'Signatory Role'} value={data.signerRole} onChange={(v) => update({signerRole: v})} />
          </View>

          {data.signatureData ? (
             <View style={{ alignItems: 'center', marginVertical: SP.md }}>
               <Image source={{ uri: data.signatureData }} style={{ width: 200, height: 100, resizeMode: 'contain', backgroundColor: '#fff' }} />
               <TouchableOpacity onPress={() => setShowSigModal(true)} style={{ marginTop: SP.sm }}><Text style={{ color: theme.primary }}>{AR ? 'إعادة التوقيع' : 'Re-sign'}</Text></TouchableOpacity>
             </View>
          ) : (
            <TouchableOpacity onPress={() => setShowSigModal(true)} style={{ padding: SP.md, borderWidth: 1, borderColor: theme.primary, borderRadius: R.md, alignItems: 'center', borderStyle: 'dashed' }}>
              <Text style={{ color: theme.primary, fontWeight: FW.bold }}>{AR ? 'اضغط للتوقيع' : 'Tap to Sign'}</Text>
            </TouchableOpacity>
          )}
        </View>
  
        <NBtn label={AR ? 'تأكيد وإرسال الطلب للإدارة' : 'Submit for Admin Approval'} onPress={submit} loading={loading} style={{ marginTop: SP.sm, marginBottom: 50, backgroundColor: theme.success }} />
      </ScrollView>
      <ContractModal 
        visible={showContract} 
        onClose={() => setShowContract(false)}
        pricingDetails={[
          { labelAr: 'كشف في العيادة', labelEn: 'Clinic Visit', price: data.clinicPrice || '0' },
          { labelAr: 'استشارة أونلاين', labelEn: 'Online Consultation', price: data.videoPrice || '0' },
          { labelAr: 'زيارة منزلية', labelEn: 'Home Visit', price: data.homePrice || '0' }
        ]} 
      />
      <SignatureCanvasModal visible={showSigModal} onClose={() => setShowSigModal(false)} onOK={(sig) => update({ signatureData: sig })} />
      <OtpModal visible={showOtp} onClose={() => setShowOtp(false)} target={data.managerEmail || data.email} onVerify={async (code) => { const ok = await handleVerifyOtp(code); if(ok) { setShowOtp(false); finishSubmit(); return true; } return false; }} onResend={() => sendEmailOtp(data.managerEmail || data.email).then(() => show(AR ? 'أُعيد إرسال الرمز' : 'Code resent', 'success')).catch(() => show(AR ? 'تعذر الإرسال — انتظر قليلاً' : 'Could not resend — wait a moment', 'error'))} />
    </View>
  );
}
