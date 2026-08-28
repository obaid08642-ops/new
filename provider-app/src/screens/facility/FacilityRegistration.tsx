import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Switch, Dimensions, Alert, Image, Modal, TextInput
} from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import {
  NBtn, NInput, NPhoneInput, NPassStrength,
  NCheckbox, NHeader, NScroll, NSheet, NCard,
  NSearch, NDropdown
} from '../../components/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Validate } from '../../security/Security';
import { SP, R, FS, FW, INSURANCE, CITIES, SPECIALTIES, DEGREES, LAB_TESTS, RAD_SCANS, NURSING_SVCS , LANGS } from '../../constants';
import { I } from '../../components/icons';
import { RegistrationSuccess } from '../shared/SharedScreens';
import { ContractModal } from '../../components/ContractModal';
import { OtpModal } from '../../components/OtpModal';
import { sendEmailOtp, verifyEmailOtp } from '../../api/otp';
import { SuccessScreen } from '../../components/SuccessScreen';
import { SignatureCanvasModal } from '../../components/SignatureCanvasModal';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { ProviderApi, sanitizeWizardData } from '../../api/provider';
import { useInsuranceCatalog, useServicesCatalog } from '../../api/catalogs';

import SignatureCanvas from 'react-native-signature-canvas';

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
  crNumber: string; mohLicense: string; crDocUri: string; mohDocUri: string; facilityLogoUri: string; facilityImagesUris: string[];
  city: string; fullAddress: string;
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
  languages: [], crNumber: '', mohLicense: '', crDocUri: '', mohDocUri: '', facilityLogoUri: '', facilityImagesUris: [],
  city: '', fullAddress: '', location: {lat: 0, lng: 0}, subProviders: [], cashOnly: false, acceptedInsurance: [], hasInsuranceCoordinator: false, signatureData: '', signerName: '', signerRole: '', termsAgreed: false, loading: false
};

export function FacilityRegistration({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FacilityRegData>(INIT);
  const [submitted, setSubmitted] = useState(false);
  const TOTAL = 8;
  const [showSuccess, setShowSuccess] = useState(false);

  const update = useCallback((patch: Partial<FacilityRegData>) => setData(prev => ({ ...prev, ...patch })), []);
  const next = () => { if (step < TOTAL) setStep(s => s + 1); else setStep(8); };
  const back = () => { if (step === 1) onBack(); else setStep(s => s - 1); };

  const screens: Record<number, React.ReactElement> = {
    8: <SuccessScreen onDone={() => { setShowSuccess(false); onDone(); }} />,
    1: <Step1Basic data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    2: <Step2Legal data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    3: <Step3Location data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    4: <Step4SubProviders data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    5: <Step5Insurance data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    6: <Step6AdminWarning data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    7: <Step7Signature data={data} update={update} onDone={onDone} onBack={back} step={step} total={TOTAL} />,
  };
  return (
    <>
      {screens[step] ?? null}
      <Modal visible={data.loading} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ padding: 20, backgroundColor: '#FFF', borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ marginTop: 10, fontSize: 16 }}>جاري معالجة البيانات...</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function Step1Basic({ data, update, onNext, onBack, step, total }: any) {
  const { show } = useToast();
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
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
    if (!data.facilityType) e.type = AR ? 'اختر نوع المنشأة' : 'Choose facility type';
    if (!data.facilityNameAr.trim()) e.nameAr = AR ? 'مطلوب' : 'Required';
    if (!data.facilityNameEn.trim()) e.nameEn = AR ? 'مطلوب' : 'Required';
    if (!data.managerName.trim()) e.mgr = AR ? 'مطلوب' : 'Required';
    if (!Validate.phone(data.managerPhone)) e.phone = AR ? 'جوال غير صحيح' : 'Invalid phone';
    if (!Validate.email(data.managerEmail)) e.email = AR ? 'بريد غير صحيح' : 'Invalid email';
    if (data.facilityType !== 'hospital' && data.facilityType !== 'clinic') e.type = AR ? 'نوع غير مدعوم' : 'Unsupported type';
    const ps = Validate.password(data.password);
    if (!ps.valid) e.pass = AR ? ps.msgAr : ps.msgEn;
    if (data.password !== data.confirmPass) e.conf = AR ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match';
    setErrs(e); return Object.keys(e).length === 0;
  };

  
  const handleNext = async () => {
    if (!validate()) return;

    try {
      update({ loading: true });
      await ProviderApi.start({
        phone: data.managerPhone,
        password: data.password,
        full_name: data.managerName,
        email: data.managerEmail,
        type: data.facilityType,
      });
      try {
        await ProviderApi.login(data.managerPhone, data.password);
      } catch (e) {
        await ProviderApi.login(data.managerPhone, data.password);
      }
      onNext();
    } catch (e: any) {
      show(Array.isArray(e.response?.data?.message) ? e.response?.data?.message[0] : (e.response?.data?.message || e.message || 'Error occurred'), 'error');
    } finally {
      update({ loading: false });
    }
  };

  return (
    <NScroll>
      <NHeader title={AR ? 'بيانات المستشفى/المستوصف' : 'Facility Info'} step={step} total={total} onBack={onBack} />
      
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.lg }}>
        {FACILITY_TYPES.map(t => (
          <TouchableOpacity key={t.id} onPress={() => update({ facilityType: t.id })} style={{ flex: 1, padding: SP.md, borderWidth: 1, borderColor: data.facilityType === t.id ? theme.primary : theme.border, backgroundColor: data.facilityType === t.id ? theme.primaryLight : theme.bg, borderRadius: R.md, alignItems: 'center' }}>
            <Text style={{ color: data.facilityType === t.id ? theme.primary : theme.text }}>{AR ? t.ar : t.en}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {errs.type && <Text style={{ fontSize: FS.xs, color: theme.danger, marginBottom: SP.md }}>{errs.type}</Text>}

      <NInput innerRef={nameArRef} label={AR ? 'اسم المنشأة (بالعربية)' : 'Facility Name (AR)'} value={data.facilityNameAr} onChange={v => update({ facilityNameAr: v })} required error={errs.nameAr} returnKey="next" onSubmit={() => nameEnRef.current?.focus()} />
      <NInput innerRef={nameEnRef} label={AR ? 'اسم المنشأة (بالإنجليزية)' : 'Facility Name (EN)'} value={data.facilityNameEn} onChange={v => update({ facilityNameEn: v })} required error={errs.nameEn} returnKey="next" onSubmit={() => mgrNameRef.current?.focus()} />
      
      <NInput innerRef={mgrNameRef} label={AR ? 'اسم مدير المنشأة' : 'Manager Name'} value={data.managerName} onChange={v => update({ managerName: v })} required error={errs.mgr} returnKey="next" onSubmit={() => phoneRef.current?.focus()} />
      <NPhoneInput innerRef={phoneRef} label={AR ? 'رقم جوال المدير' : 'Manager Phone'} value={data.managerPhone} onChange={v => update({ managerPhone: v })} required error={errs.phone} />
      <NInput innerRef={emailRef} label={AR ? 'البريد الإلكتروني للمدير' : 'Manager Email'} value={data.managerEmail} onChange={v => update({ managerEmail: v })} kbType="email-address" caps="none" required error={errs.email} returnKey="next" onSubmit={() => passwordRef.current?.focus()} />
      
      <NInput innerRef={passwordRef} label={AR ? 'كلمة المرور' : 'Password'} value={data.password} onChange={v => update({ password: v })} secure required error={errs.pass} returnKey="next" onSubmit={() => confirmPassRef.current?.focus()} />
      <NPassStrength password={data.password} />
      <NInput innerRef={confirmPassRef} label={AR ? 'تأكيد كلمة المرور' : 'Confirm Password'} value={data.confirmPass} onChange={v => update({ confirmPass: v })} secure required error={errs.conf} returnKey="done" onSubmit={handleNext} />
      
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
      <NBtn label={AR ? 'متابعة' : 'Next'} onPress={handleNext} style={{ marginTop: SP.xl }} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function Step2Legal({ data, update, onNext, onBack, step, total }: any) {
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

  const DocBtn = ({ label, field }: any) => (
    <TouchableOpacity onPress={() => pickDocument(field)} style={{ padding: SP.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: data[field] ? theme.success : theme.border, backgroundColor: data[field] ? theme.successBg : theme.surface2, borderRadius: R.lg, marginBottom: SP.md, alignItems: 'center' }}>
      <I name={data[field] ? 'checkCircle' : 'upload'} size={24} color={data[field] ? theme.success : theme.primary} />
      <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: data[field] ? theme.success : theme.text, marginTop: SP.sm }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <NScroll>
      <NHeader title={AR ? 'التراخيص' : 'Licenses'} step={step} total={total} onBack={onBack} />
      <NInput label={AR ? 'رقم السجل التجاري' : 'CR Number'} value={data.crNumber} onChange={v=>update({crNumber:v})} kbType="numeric" required />
      <NInput label={AR ? 'رقم ترخيص وزارة الصحة' : 'MOH License'} value={data.mohLicense} onChange={v=>update({mohLicense:v})} kbType="numeric" required />
      
      <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.md, marginBottom: SP.sm, textAlign: AR?'right':'left' }}>{AR ? 'المرفقات' : 'Attachments'}</Text>
      <DocBtn label={AR ? 'شهادة السجل التجاري' : 'CR Document'} field="crDocUri" />
      <DocBtn label={AR ? 'ترخيص وزارة الصحة' : 'MOH Document'} field="mohDocUri" />
      <DocBtn label={AR ? 'شعار المستشفى (Logo)' : 'Facility Logo'} field="facilityLogoUri" />
      
      <View style={{ marginTop: SP.md }}>
        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
          {AR ? 'صور المنشأة (لغاية 5 صور)' : 'Facility Images (up to 5)'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SP.sm, paddingVertical: SP.sm, flexDirection: AR ? 'row-reverse' : 'row' }}>
          <TouchableOpacity onPress={async () => {
            let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, aspect: [4, 3], quality: 0.8, allowsMultipleSelection: true, selectionLimit: 5 });
            if (!result.canceled) {
              const uris = result.assets.map(a => a.uri);
              update({ facilityImagesUris: [...(data.facilityImagesUris||[]), ...uris].slice(0, 5) });
            }
          }} style={{ width: 80, height: 80, borderRadius: R.md, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: theme.primary }}>
            <I name="addPhotoAlternate" size={32} color={theme.primary} />
          </TouchableOpacity>
          {(data.facilityImagesUris||[]).map((uri: string, i: number) => (
            <View key={i} style={{ width: 80, height: 80, borderRadius: R.md, overflow: 'hidden' }}>
              <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
              <TouchableOpacity onPress={() => update({ facilityImagesUris: data.facilityImagesUris.filter((_:any, idx:number) => idx !== i) })} style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 2 }}>
                <I name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
      
      <NBtn label={AR ? 'متابعة' : 'Next'} onPress={onNext} style={{ marginTop: SP.lg }} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function Step3Location({ data, update, onNext, onBack, step, total }: any) {
  const { show } = useToast();
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [showLocModal, setShowLocModal] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!data.city) e.city = AR ? 'اختر المدينة' : 'Choose city';
    if (!data.fullAddress.trim()) e.addr = AR ? 'العنوان مطلوب' : 'Address required';
    if (!data.location || !data.location.lat) e.loc = AR ? 'تحديد الموقع مطلوب' : 'Location required';
    setErrs(e); return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    try {
      update({ loading: true });
      let crUrl = data.crDocUri;
      let mohUrl = data.mohDocUri;
      let logoUrl = data.facilityLogoUri;
      
      if (crUrl && !crUrl.startsWith('http')) crUrl = await ProviderApi.uploadFile(crUrl, 'image/jpeg', 'cr.jpg');
      if (mohUrl && !mohUrl.startsWith('http')) mohUrl = await ProviderApi.uploadFile(mohUrl, 'image/jpeg', 'moh.jpg');
      if (logoUrl && !logoUrl.startsWith('http')) logoUrl = await ProviderApi.uploadFile(logoUrl, 'image/jpeg', 'logo.jpg');

      const docs = [crUrl, mohUrl].filter(Boolean);
      // Logo goes to its OWN field — brand mark, not a gallery photo.
      const images: string[] = [];
      
      if (data.facilityImagesUris && data.facilityImagesUris.length > 0) {
        for (let i = 0; i < data.facilityImagesUris.length; i++) {
          const uri = data.facilityImagesUris[i];
          if (!uri.startsWith('http')) {
            images.push(await ProviderApi.uploadFile(uri, 'image/jpeg', `facility_${i}.jpg`));
          } else {
            images.push(uri);
          }
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
        license_documents: docs,
        clinic_images: images,
        logo: logoUrl || undefined,
        languages: data.languages,
      });
      onNext();
    } catch (e: any) {
      show(Array.isArray(e.response?.data?.message) ? e.response?.data?.message[0] : (e.response?.data?.message || e.message || 'Error occurred'), 'error');
    } finally {
      update({ loading: false });
    }
  };

  return (
    <NScroll>
      <NHeader title={AR ? 'الموقع الجغرافي' : 'Geographic Location'} step={step} total={total} onBack={onBack} />
      
      <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, marginBottom: SP.xs, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{AR ? 'المدينة' : 'City'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SP.lg }}>
        <View style={{ flexDirection: 'row', gap: SP.sm }}>
          {CITIES.map(c => <TouchableOpacity key={c.id} onPress={() => update({ city: c.id })} style={{ paddingHorizontal: SP.lg, paddingVertical: SP.sm, borderRadius: R.full, borderWidth: 1.5, borderColor: data.city === c.id ? theme.primary : theme.border, backgroundColor: data.city === c.id ? theme.primary : theme.surface2 }}><Text style={{ color: data.city === c.id ? '#FFF' : theme.text, fontSize: FS.sm, fontWeight: FW.med }}>{AR ? c.ar : c.en}</Text></TouchableOpacity>)}
        </View>
      </ScrollView>
      {errs.city && <Text style={{ fontSize: FS.xs, color: theme.danger, marginBottom: SP.sm }}>{errs.city}</Text>}

      <NInput label={AR ? 'العنوان الكامل' : 'Full Address'} value={data.fullAddress} onChange={v => update({ fullAddress: v })} required error={errs.addr} multi lines={2} />

      <NCard style={{ marginBottom: SP.xl, marginTop: SP.md }}>
        <Text style={{ fontSize: FS.sm, fontWeight: FW.semi, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>{AR ? 'تحديد الموقع الجغرافي' : 'Geographic Map Location'}</Text>
        <TouchableOpacity onPress={() => setShowLocModal(true)} style={{ borderColor:theme.border, backgroundColor:theme.surface2, borderWidth: 1, borderRadius: R.md, padding: SP.xl, alignItems: 'center', justifyContent: 'center', marginBottom: SP.md }}>
          {data.location && data.location.lat ? (
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
        {errs.loc && <Text style={{ fontSize: FS.xs, color: theme.danger, marginBottom: SP.sm }}>{errs.loc}</Text>}
        <LocationPickerModal visible={showLocModal} onClose={() => setShowLocModal(false)} onSelectLocation={(l) => update({ location: l })} initialLocation={data.location.lat ? data.location : undefined} />
      </NCard>

      <NBtn label={AR ? 'متابعة' : 'Next'} onPress={handleNext} style={{ marginTop: SP.lg }} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function Step4SubProviders({ data, update, onNext, onBack, step, total }: any) {
 const labCatalog = useServicesCatalog('lab');
 const radCatalog = useServicesCatalog('radiology');
 const nursingCatalog = useServicesCatalog('nursing');
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [modalType, setModalType] = useState<'doctor'|'lab'|'pharmacy'|'radiology'|'nursing'|null>(null);
  
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
    doctor: { ar: 'طبيب', en: 'Doctor', color: '#4CAF50' },
    lab: { ar: 'مختبر', en: 'Laboratory', color: '#9C27B0' },
    pharmacy: { ar: 'صيدلية', en: 'Pharmacy', color: '#FF9800' },
    radiology: { ar: 'أشعة', en: 'Radiology', color: '#03A9F4' },
    nursing: { ar: 'تمريض', en: 'Nursing', color: '#E91E63' }
  };

  const saveSub = () => {
    if (!tempSub.nameAr) return show(AR ? 'الاسم مطلوب' : 'Name required', 'error');
    if (!tempSub.nameEn) return show(AR ? 'الاسم الإنجليزي مطلوب' : 'English name required', 'error');
    if (!tempSub.email) return show(AR ? 'البريد الإلكتروني مطلوب' : 'Email required', 'error');
    if (modalType === 'doctor' && !tempSub.specialty) return show(AR ? 'التخصص مطلوب' : 'Specialty required', 'error');
    
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
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: SP.xl, paddingBottom: 0 }}>
        <NHeader title={AR ? 'مزودي الخدمة التابعين' : 'Sub-Providers'} sub={AR ? 'إضافة أقسام وأطباء المستشفى' : 'Add your doctors & departments'} step={step} total={total} onBack={onBack} />
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: SP.xl }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: FS.sm, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.lg, lineHeight: 22 }}>
          {AR ? 'هنا يمكنك إضافة أطباء وصيدليات ومختبرات تابعة لمنشأتك. كل مزود تضيفه سيتم إنشاء حساب فرعي (Sub-account) مستقل له لإدارته.' : 'Add doctors, pharmacies, and labs under your facility. Each will get an independent sub-account.'}
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
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>{AR ? 'المزودين المضافين' : 'Added Providers'}</Text>
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

        <NBtn label={AR ? 'متابعة' : 'Next'} onPress={onNext} style={{ marginTop: SP.xl, marginBottom: 50 }} />
      </ScrollView>

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
            <NInput label={AR ? 'الاسم (بالعربية)' : 'Name (AR)'} value={tempSub.nameAr} onChange={v=>setTempSub({...tempSub, nameAr:v})} required />
            <NInput label={AR ? 'الاسم (بالإنجليزية)' : 'Name (EN)'} value={tempSub.nameEn} onChange={v=>setTempSub({...tempSub, nameEn:v})} required />
            <NInput label={AR ? 'البريد الإلكتروني (لتسجيل الدخول لاحقاً)' : 'Email (for future login)'} value={tempSub.email} onChange={v=>setTempSub({...tempSub, email:v.toLowerCase()})} required kbType="email-address" />
            <NInput label={AR ? 'رقم الترخيص / الهيئة' : 'License Number'} value={tempSub.license} onChange={v=>setTempSub({...tempSub, license:v})} required />
            
            {modalType === 'doctor' && (
              <View style={{ gap: SP.md, marginBottom: SP.md }}>
                <NDropdown
                  label={AR ? 'التخصص الطبي' : 'Specialty'}
                  value={tempSub.specialty}
                  options={SPECIALTIES.map(s => ({ val: s.id, label: AR ? s.ar : s.en }))}
                  onChange={v => setTempSub({ ...tempSub, specialty: v })}
                />
                <NDropdown
                  label={AR ? 'الدرجة العلمية' : 'Degree'}
                  value={tempSub.degree}
                  options={DEGREES.map(d => ({ val: d.id, label: AR ? d.ar : d.en }))}
                  onChange={v => setTempSub({ ...tempSub, degree: v })}
                />
                
                                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.md, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                  {AR ? 'التسعير وأنواع الاستشارات' : 'Consultation Modes & Pricing'}
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
                            <Text style={{ fontSize: FS.sm, color: theme.textSub }}>{AR ? 'السعر:' : 'Price:'}</Text>
                            <TextInput value={tempSub[mode.prc]} onChangeText={v => setTempSub({...tempSub, [mode.prc]: v})} placeholder="0" style={{ backgroundColor: theme.surface, padding: 4, paddingHorizontal: 8, borderRadius: R.xs, width: 60, textAlign: 'center', borderWidth: 1, borderColor: theme.border }} keyboardType="numeric" />
                          </View>
                        )}
                      </View>
                      {tempSub[mode.enb] && (
                        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'flex-start', marginTop: 4 }}>
                           <NCheckbox label={AR ? 'مشمول في التأمين؟' : 'Accepts Insurance?'} value={tempSub[mode.ins]} onChange={v => setTempSub({...tempSub, [mode.ins]: v})} />
                        </View>
                      )}
                    </View>
                  ))}

                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.md, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? 'مواعيد العمل' : 'Working Hours'}
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
                      <NDropdown label={AR ? 'من الساعة' : 'From'} value={tempSub.startHour} options={HOURS} onChange={v => setTempSub({...tempSub, startHour: v})} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <NDropdown label={AR ? 'إلى الساعة' : 'To'} value={tempSub.endHour} options={HOURS} onChange={v => setTempSub({...tempSub, endHour: v})} />
                    </View>
                  </View>

                  <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: SP.md }}>
                    {AR ? 'يتم تطبيق التأمين الخاص بالمستشفى تلقائياً على حساب الطبيب، ويمكن للطبيب تفعيل أو إيقاف التأمين من لوحة تحكمه.' : 'Facility insurance is automatically applied. The doctor can toggle it from their dashboard.'}
                  </Text>
                </View>
              </View>
            )}

            {(modalType === 'lab') && (
              <View style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, marginTop: SP.md }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                  {AR ? 'الفحوصات الطبية' : 'Lab Tests'}
                </Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
                  {AR ? 'حدد الفحوصات المتاحة وأسعارها' : 'Select tests and set prices'}
                </Text>
                <View style={{ gap: SP.sm }}>
                  {labCatalog.map(t => (
                    <View key={t.id} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}><NCheckbox label={AR ? t.ar : t.en} value={!!(tempSub.enabledTests || []).includes(t.id)} onChange={() => toggleTest(t.id)} /></View>
                      {!!(tempSub.enabledTests || []).includes(t.id) && (
                        <TextInput value={tempSub.testPrices?.[t.id] || ''} onChangeText={v => setTempSub({ ...tempSub, testPrices: { ...(tempSub.testPrices || {}), [t.id]: v } })} placeholder={AR ? 'السعر (رس)' : 'Price'} style={{ backgroundColor: theme.bg, padding: 8, borderRadius: 8, width: 100, textAlign: AR ? 'right' : 'left' }} keyboardType="numeric" />
                      )}
                    </View>
                  ))}
                </View>

                <View style={{ marginTop: SP.lg, paddingTop: SP.lg, borderTopWidth: 1, borderTopColor: theme.border }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? 'الخدمات المنزلية والتأمين' : 'Home Services & Insurance'}
                  </Text>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.sm }}>
                    <View style={{ flex: 1 }}><NCheckbox label={AR ? 'توفير سحب العينات من المنزل' : 'Provide Home Sample Collection'} value={!!tempSub.homeEnabled} onChange={v => setTempSub({...tempSub, homeEnabled: v})} /></View>
                    {tempSub.homeEnabled && (
                      <TextInput value={tempSub.priceHome} onChangeText={v => setTempSub({...tempSub, priceHome: v})} placeholder={AR ? 'الرسوم (رس)' : 'Fee'} style={{ backgroundColor: theme.bg, padding: 8, borderRadius: 8, width: 100, textAlign: 'center', borderWidth: 1, borderColor: theme.border }} keyboardType="numeric" />
                    )}
                  </View>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: SP.md }}>
                    <NCheckbox label={AR ? 'مشمول في التأمين الطبي' : 'Accepts Medical Insurance'} value={tempSub.acceptsInsurance} onChange={v => setTempSub({...tempSub, acceptsInsurance: v})} />
                  </View>

                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.sm, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? 'مواعيد العمل' : 'Working Hours'}
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
                      <NDropdown label={AR ? 'من الساعة' : 'From'} value={tempSub.startHour} options={HOURS} onChange={v => setTempSub({...tempSub, startHour: v})} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <NDropdown label={AR ? 'إلى الساعة' : 'To'} value={tempSub.endHour} options={HOURS} onChange={v => setTempSub({...tempSub, endHour: v})} />
                    </View>
                  </View>
                </View>

              </View>
            )}

            {(modalType === 'radiology') && (
              <View style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, marginTop: SP.md }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                  {AR ? 'الأشعة والتصوير' : 'Radiology Scans'}
                </Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
                  {AR ? 'حدد الأشعة المتاحة في هذا المركز' : 'Select scans available'}
                </Text>
                <View style={{ gap: SP.sm }}>
                  {radCatalog.map(s => (
                    <View key={s.id} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}><NCheckbox label={AR ? s.ar : s.en} value={!!(tempSub.enabledScans || []).includes(s.id)} onChange={() => toggleScan(s.id)} /></View>
                      {!!(tempSub.enabledScans || []).includes(s.id) && (
                        <TextInput value={tempSub.scanPrices?.[s.id] || ''} onChangeText={v => setTempSub({ ...tempSub, scanPrices: { ...(tempSub.scanPrices || {}), [s.id]: v } })} placeholder={AR ? 'السعر (رس)' : 'Price'} style={{ backgroundColor: theme.bg, padding: 8, borderRadius: 8, width: 100, textAlign: AR ? 'right' : 'left' }} keyboardType="numeric" />
                      )}
                    </View>
                  ))}
                </View>

                <View style={{ marginTop: SP.lg, paddingTop: SP.lg, borderTopWidth: 1, borderTopColor: theme.border }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? 'الخدمات المنزلية والتأمين' : 'Home Services & Insurance'}
                  </Text>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.sm }}>
                    <View style={{ flex: 1 }}><NCheckbox label={AR ? 'توفير التصوير المنزلي (Home Scan)' : 'Provide Home Scan'} value={!!tempSub.homeEnabled} onChange={v => setTempSub({...tempSub, homeEnabled: v})} /></View>
                    {tempSub.homeEnabled && (
                      <TextInput value={tempSub.priceHome} onChangeText={v => setTempSub({...tempSub, priceHome: v})} placeholder={AR ? 'الرسوم (رس)' : 'Fee'} style={{ backgroundColor: theme.bg, padding: 8, borderRadius: 8, width: 100, textAlign: 'center', borderWidth: 1, borderColor: theme.border }} keyboardType="numeric" />
                    )}
                  </View>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: SP.md }}>
                    <NCheckbox label={AR ? 'مشمول في التأمين الطبي' : 'Accepts Medical Insurance'} value={tempSub.acceptsInsurance} onChange={v => setTempSub({...tempSub, acceptsInsurance: v})} />
                  </View>

                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.sm, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? 'مواعيد العمل' : 'Working Hours'}
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
                      <NDropdown label={AR ? 'من الساعة' : 'From'} value={tempSub.startHour} options={HOURS} onChange={v => setTempSub({...tempSub, startHour: v})} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <NDropdown label={AR ? 'إلى الساعة' : 'To'} value={tempSub.endHour} options={HOURS} onChange={v => setTempSub({...tempSub, endHour: v})} />
                    </View>
                  </View>
                </View>

              </View>
            )}

            {(modalType === 'nursing') && (
              <View style={{ backgroundColor: theme.surface2, padding: SP.md, borderRadius: R.md, marginTop: SP.md }}>
                <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                  {AR ? 'الخدمات التمريضية' : 'Nursing Services'}
                </Text>
                <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
                  {AR ? 'حدد خدمات التمريض المتاحة وأسعارها' : 'Select nursing services available'}
                </Text>
                <View style={{ gap: SP.sm }}>
                  {nursingCatalog.map(s => (
                    <View key={s.id} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}><NCheckbox label={AR ? s.ar : s.en} value={!!(tempSub.enabledNursing || []).includes(s.id)} onChange={() => toggleNursing(s.id)} /></View>
                      {!!(tempSub.enabledNursing || []).includes(s.id) && (
                        <TextInput value={tempSub.nursingPrices?.[s.id] || ''} onChangeText={v => setTempSub({ ...tempSub, nursingPrices: { ...(tempSub.nursingPrices||{}), [s.id]: v } })} placeholder={AR ? 'السعر (رس)' : 'Price'} style={{ backgroundColor: theme.bg, padding: 8, borderRadius: 8, width: 100, textAlign: AR ? 'right' : 'left' }} keyboardType="numeric" />
                      )}
                    </View>
                  ))}
                </View>

                <View style={{ marginTop: SP.lg, paddingTop: SP.lg, borderTopWidth: 1, borderTopColor: theme.border }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? 'نطاق الخدمة والتأمين' : 'Service Scope & Insurance'}
                  </Text>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.sm }}>
                    <View style={{ flex: 1 }}><NCheckbox label={AR ? 'تقديم رعاية منزلية (Home Care)' : 'Provide Home Care'} value={!!tempSub.homeEnabled} onChange={v => setTempSub({...tempSub, homeEnabled: v})} /></View>
                    {tempSub.homeEnabled && (
                      <TextInput value={tempSub.priceHome} onChangeText={v => setTempSub({...tempSub, priceHome: v})} placeholder={AR ? 'الرسوم (رس)' : 'Fee'} style={{ backgroundColor: theme.bg, padding: 8, borderRadius: 8, width: 100, textAlign: 'center', borderWidth: 1, borderColor: theme.border }} keyboardType="numeric" />
                    )}
                  </View>
                  <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: SP.md }}>
                    <NCheckbox label={AR ? 'مشمول في التأمين الطبي' : 'Accepts Medical Insurance'} value={tempSub.acceptsInsurance} onChange={v => setTempSub({...tempSub, acceptsInsurance: v})} />
                  </View>

                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginTop: SP.sm, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? 'مواعيد العمل' : 'Working Hours'}
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
                      <NDropdown label={AR ? 'من الساعة' : 'From'} value={tempSub.startHour} options={HOURS} onChange={v => setTempSub({...tempSub, startHour: v})} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <NDropdown label={AR ? 'إلى الساعة' : 'To'} value={tempSub.endHour} options={HOURS} onChange={v => setTempSub({...tempSub, endHour: v})} />
                    </View>
                  </View>
                </View>

              </View>
            )}

            <View style={{ marginTop: SP.lg, paddingHorizontal: SP.xs }}>
              <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
                {AR ? 'صور العيادة/المكان (لغاية 5 صور)' : 'Clinic/Location Images (up to 5)'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SP.sm, paddingVertical: SP.sm, flexDirection: AR ? 'row-reverse' : 'row' }}>
                <TouchableOpacity onPress={async () => {
                  let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, aspect: [4, 3], quality: 0.8, allowsMultipleSelection: true, selectionLimit: 5 });
                  if (!result.canceled) {
                    const uris = result.assets.map(a => a.uri);
                    setTempSub({ ...tempSub, clinicImagesUris: [...(tempSub.clinicImagesUris||[]), ...uris].slice(0, 5) });
                  }
                }} style={{ width: 80, height: 80, borderRadius: R.md, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: theme.primary }}>
                  <I name="addPhotoAlternate" size={32} color={theme.primary} />
                </TouchableOpacity>
                {(tempSub.clinicImagesUris||[]).map((uri: string, i: number) => (
                  <View key={i} style={{ width: 80, height: 80, borderRadius: R.md, overflow: 'hidden' }}>
                    <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
                    <TouchableOpacity onPress={() => setTempSub({ ...tempSub, clinicImagesUris: tempSub.clinicImagesUris.filter((_:any, idx:number) => idx !== i) })} style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 2 }}>
                      <I name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>

            <NBtn label={AR ? 'إضافة إلى القائمة' : 'Add to List'} onPress={saveSub} style={{ marginTop: SP.xxl, marginBottom: 50 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function Step5Insurance({ data, update, onNext, onBack, step, total }: any) {
 const insuranceCatalog = useInsuranceCatalog();
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const handleNext = async () => {
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
            const uri = sp.clinicImagesUris[i];
            if (!uri.startsWith('http')) {
              uploadedImages.push(await ProviderApi.uploadFile(uri, 'image/jpeg', `${sp.type}_${i}.jpg`));
            } else {
              uploadedImages.push(uri);
            }
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

      await ProviderApi.step3({
        doctors_roster: roster,
        lab_roster: labRoster,
        radiology_roster: radRoster,
        nursing_roster: nursingRoster,
        accepts_cash: data.cashOnly,
        accepted_insurance: data.acceptedInsurance.map((i: any) => i.companyId),
      });
      onNext();
    } catch (e: any) {
      const { show } = require('../../context');
      show?.(e.message, 'error');
    } finally {
      update({ loading: false });
    }
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
      <NHeader title={AR ? 'التأمين الأساسي للمستشفى' : 'Facility Insurance'} step={step} total={total} onBack={onBack} />
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.surface2, padding: SP.lg, borderRadius: R.md, marginBottom: SP.lg }}>
        <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{AR ? 'الدفع نقداً فقط (لا نقبل التأمين)' : 'Cash Only (No Insurance)'}</Text>
        <Switch value={data.cashOnly} onValueChange={v=>update({cashOnly:v})} />
      </View>

      {!data.cashOnly && (
        <View style={{ marginBottom: SP.xl }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.surface2, padding: SP.lg, borderRadius: R.md, marginBottom: SP.lg }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{AR ? 'مدير/مسؤول تأمين عام للمستشفى؟' : 'General Insurance Manager?'}</Text>
            <Switch value={data.hasInsuranceCoordinator} onValueChange={v=>update({hasInsuranceCoordinator:v})} />
          </View>

          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>{AR ? 'شركات التأمين المقبولة بالمنشأة' : 'Accepted Insurance Companies'}</Text>
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
                    <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>{AR ? 'الفئات/الخطط المقبولة للمستشفى:' : 'Accepted Plans/Tiers:'}</Text>
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

      <NBtn label={AR ? 'متابعة' : 'Next'} onPress={handleNext} style={{ marginTop: SP.xl }} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function Step6AdminWarning({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  return (
    <NScroll>
      <NHeader title={AR ? 'نظام الموافقات' : 'Approval System'} step={step} total={total} onBack={onBack} />
      
      <View style={{ backgroundColor: theme.dangerBg, padding: SP.xl, borderRadius: R.lg, borderWidth: 1, borderColor: theme.danger, marginTop: SP.lg }}>
        <View style={{ alignSelf: 'center', marginBottom: SP.md }}><I name="info" size={40} color={theme.danger} /></View>
        <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.danger, textAlign: 'center', marginBottom: SP.md }}>
          {AR ? 'هام جداً' : 'IMPORTANT'}
        </Text>
        <Text style={{ fontSize: FS.md, color: theme.text, textAlign: AR ? 'right' : 'left', lineHeight: 24, marginBottom: SP.md }}>
          {AR ? 'البيانات التي قمت بإدخالها، وأي حسابات فرعية (أطباء، مختبرات) قمت بإضافتها، لن تكون مرئية لجمهور المرضى فور التسجيل.' : 'The data and sub-accounts you entered will NOT be visible to patients immediately.'}
        </Text>
        <Text style={{ fontSize: FS.md, color: theme.text, textAlign: AR ? 'right' : 'left', lineHeight: 24 }}>
          {AR ? 'كذلك في المستقبل، عند تعديل الأسعار، المواعيد، أو إضافة أقسام جديدة من الإعدادات، يجب أن تمر أولاً عبر (الأدمن) للمراجعة والموافقة لضمان الجودة.' : 'In the future, any changes to prices, schedules, or new departments must pass through Admin Approval first.'}
        </Text>
      </View>

      <NBtn label={AR ? 'قرأت وأوافق' : 'I Understand & Agree'} onPress={onNext} style={{ marginTop: SP.xl }} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function Step7Signature({ data, update, onDone, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const sigRef = useRef<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [showSigModal, setShowSigModal] = useState(false);
  const [showContract, setShowContract] = useState(false);

  const handleVerifyOtp = async (code: string) => verifyEmailOtp(data.managerEmail || data.email, code);

  const finishSubmit = async () => {
    try {
      update({ loading: true });
      const sigUrl = await ProviderApi.uploadSignature(data.signatureData);
      
      await ProviderApi.step2({
        iban: data.iban,
        bank_account_name: data.accountHolderName,
      });

      await ProviderApi.submit({
        signer_name: data.signerName,
        signer_role: data.signerRole,
        signature_url: sigUrl,
        lat: data.location?.lat || 0,
        lng: data.location?.lng || 0,
        full_data: sanitizeWizardData(data)
      });

      show(AR ? 'تم إرسال طلب المستشفى وملحقاته بنجاح!' : 'Facility Registration Submitted!', 'success');
      setSubmitted(true);
    } catch (e: any) {
      show(Array.isArray(e.response?.data?.message) ? e.response?.data?.message[0] : (e.response?.data?.message || e.message || 'Error occurred'), 'error');
    } finally {
      update({ loading: false });
    }
  };

  const submit = () => {
    if (!data.signatureData) return show(AR ? 'الرجاء التوقيع أولاً' : 'Please sign first', 'error');
    // Send the REAL email OTP via the backend mailer before opening the modal
    sendEmailOtp(data.managerEmail || data.email)
      .then(() => show(AR ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' : 'Verification code sent to your email', 'success'))
      .catch(() => show(AR ? 'تعذر إرسال الرمز — تحقق من البريد أو أعد المحاولة' : 'Could not send the code — check the email or retry', 'error'));
    setShowOtp(true);
  };

  const clearSig = () => {
    sigRef.current?.clearSignature();

    update({ signatureData: '', signerName: '', signerRole: '', termsAgreed: false });
  };

  if (submitted) {
    return <RegistrationSuccess onDone={onDone} email={data.email} providerType="facility" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: SP.xl, paddingBottom: 0 }}>
        <NHeader title={AR ? 'مراجعة وتوقيع العقد' : 'Review & Sign Contract'} step={step} total={total} onBack={onBack} />
      </View>
      
      <ScrollView style={{ flex: 1, paddingHorizontal: SP.xl }} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={{ backgroundColor: theme.surface, padding: SP.md, borderRadius: 8, borderWidth: 1, borderColor: theme.primary, alignItems: 'center', marginBottom: SP.lg }} onPress={() => setShowContract(true)}>
            <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: FS.md }}>{AR ? 'الاطلاع على العقد' : 'View Contract'}</Text>
          </TouchableOpacity>

<Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm, marginTop: SP.xl }}>{AR ? 'اسم الموقّع' : 'Signatory Name'}</Text>
<NInput value={data.signerName} onChange={v => update({ signerName: v })} placeholder={AR ? 'الاسم الثلاثي' : 'Full Name'} />

<Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm, marginTop: SP.md }}>{AR ? 'صفة الموقّع / المسمى الوظيفي' : 'Signatory Role'}</Text>
<NInput value={data.signerRole} onChange={v => update({ signerRole: v })} placeholder={AR ? 'مثال: المالك، المدير العام' : 'e.g. Owner, General Manager'} />

<Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm, marginTop: SP.xl }}>
  {AR ? 'توقيع الممثل النظامي للمنشأة' : 'Legal Representative Signature'}
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


        <NBtn label={AR ? 'اعتماد وإرسال الطلب' : 'Submit Application'} onPress={submit} style={{ marginTop: SP.sm, marginBottom: 50, backgroundColor: theme.success }} />
      </ScrollView>
      <ContractModal 
        visible={showContract} 
        onClose={() => setShowContract(false)} 
        pricingDetails={data.subProviders.flatMap((sp: any) => {
          const arr = [];
          if (sp.type === 'doctor') {
            if (sp.clinicEnabled) arr.push({ labelAr: `${sp.name} - عيادة`, labelEn: `${sp.name} - Clinic`, price: sp.priceClinic || 0 });
            if (sp.onlineEnabled) arr.push({ labelAr: `${sp.name} - أونلاين`, labelEn: `${sp.name} - Online`, price: sp.priceOnline || 0 });
            if (sp.homeEnabled) arr.push({ labelAr: `${sp.name} - زيارة منزلية`, labelEn: `${sp.name} - Home Visit`, price: sp.priceHome || 0 });
          } else {
            if (sp.homeEnabled) arr.push({ labelAr: `${sp.name} - زيارة منزلية`, labelEn: `${sp.name} - Home Visit`, price: sp.priceHome || 0 });
          }
          return arr;
        })}
      />
      <SignatureCanvasModal visible={showSigModal} onClose={() => setShowSigModal(false)} onOK={(sig) => update({ signatureData: sig })} />
      <OtpModal visible={showOtp} onClose={() => setShowOtp(false)} target={data.managerEmail || data.email} onVerify={async (code) => { const ok = await handleVerifyOtp(code); if(ok) { setShowOtp(false); finishSubmit(); return true; } return false; }} onResend={() => sendEmailOtp(data.managerEmail || data.email).then(() => show(AR ? 'أُعيد إرسال الرمز' : 'Code resent', 'success')).catch(() => show(AR ? 'تعذر الإرسال — انتظر قليلاً' : 'Could not resend — wait a moment', 'error'))} />
    </View>
  );
}
