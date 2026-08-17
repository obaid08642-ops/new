import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Switch, Dimensions, Alert, Image, TextInput
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import SignatureCanvas from 'react-native-signature-canvas';
import MapView, { Circle, Marker } from 'react-native-maps';
import { ProviderApi, sanitizeWizardData } from '../../api/provider';
import { useInsuranceCatalog } from '../../api/catalogs';
import { useTheme, useLang, useToast } from '../../context';
import {
  NBtn, NCard, NInput, NPhoneInput, NPassStrength,
  NCheckbox, NToggle, NBadge, NDivider,
  NHeader, NScroll, NSuccess, NPriceInput, NSearch, NDropdown, NDatePickerSheet
} from '../../components/ui';
import { Validate } from '../../security/Security';
import { SP, R, FS, FW, PHARMA_CATS, CITIES, LIMITS, C, INSURANCE , LANGS } from '../../constants';
import { RegistrationSuccess } from '../shared/SharedScreens';
import { LocationPickerModal } from '../../components/LocationPickerModal';
import { ContractModal } from '../../components/ContractModal';
import { OtpModal } from '../../components/OtpModal';
import { sendEmailOtp, verifyEmailOtp } from '../../api/otp';
import { SuccessScreen } from '../../components/SuccessScreen';
import { SignatureCanvasModal } from '../../components/SignatureCanvasModal';
import { I } from '../../components/icons';

const { width: W } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
const PHARMACY_TYPES = [
  { id:'community', icon:'', ar:'صيدلية مجتمعية', en:'Community Pharmacy' },
  { id:'hospital', icon:'', ar:'صيدلية مستشفى', en:'Hospital Pharmacy' },
] as const;

const WORK_DAYS = [
  { k:'SUN', ar:'الأحد' }, { k:'MON', ar:'الاثنين' }, { k:'TUE', ar:'الثلاثاء' },
  { k:'WED', ar:'الأربعاء' }, { k:'THU', ar:'الخميس' }, { k:'FRI', ar:'الجمعة' }, { k:'SAT', ar:'السبت' },
] as const;

interface PharmacyRegData {
  // Step 1
  nameAr: string; nameEn: string; type: string; languages: string[];
  managerName: string; managerPhone: string; managerEmail: string;
  password: string; confirmPass: string; pharmacistName: string;
  // Step 2
  crNumber: string; mohLicense: string; sfdaNumber: string;
  iban: string; accountHolderName: string; taxNumber: string;
  crUri: string; mohUri: string; sfdaUri: string; logoUri: string;
  // Step 3
  city: string; location: {lat: number; lng: number}; district: string; address: string;
  deliveryRadius: number; hasDelivery: boolean; hasOwnDrivers: boolean;
  // Step 4
  workDays: string[]; is24_7: boolean; vacationDate: string;
  shiftType: 'morning' | 'evening' | 'both';
  openTime: string; closeTime: string;
  eveningOpenTime: string; eveningCloseTime: string;
  // Step 5
  enabledCategories: string[];
  rxDispensing: boolean; otcSelling: boolean;
  // Step 6
  minOrderSAR: string; deliveryFee: string; freeDeliveryAbove: string;
  expressDelivery: boolean; expressFee: string; expressMinutes: string;
  scheduledDelivery: boolean;
  cashOnly: boolean;
  acceptedInsurance: { companyId: string; plans: string[] }[];
  // Internal
  signatureData: string; signerName: string; signerRole: string;
  termsAgreed: boolean;
}

const INIT: PharmacyRegData = {
  
  nameAr:'', nameEn:'', type:'', languages: [], managerName:'', managerPhone:'',
  managerEmail:'', password:'', confirmPass:'', pharmacistName:'',
  crNumber:'', mohLicense:'', sfdaNumber:'', iban:'', taxNumber:'',
  crUri:'', mohUri:'', sfdaUri:'', logoUri:'',
  city:'', district:'', address:'', deliveryRadius: 0, hasDelivery: false, hasOwnDrivers: false,
  workDays:[], is24_7: false, vacationDate: '',
  shiftType: 'morning', openTime:'', closeTime:'',
  eveningOpenTime:'', eveningCloseTime:'',
  enabledCategories: [], rxDispensing: false, otcSelling: false,
  minOrderSAR:'', deliveryFee:'', freeDeliveryAbove:'',
  expressDelivery: false, expressFee:'', expressMinutes:'',
  scheduledDelivery: false, cashOnly: false, acceptedInsurance: [],
  signatureData: '', signerName: '', signerRole: '',   termsAgreed: false, location: {lat: 0, lng: 0}, accountHolderName: ''
};

// ══════════════════════════════════════════════════════════════════════════════
export function PharmacyRegistration({ onBack, onDone }: { onBack:()=>void; onDone:()=>void }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<PharmacyRegData>(INIT);
  const [showMap, setShowMap] = useState(false);
  const TOTAL = 8;
  const [showSuccess, setShowSuccess] = useState(false);
  const update = useCallback((p: Partial<PharmacyRegData>) => setData(prev => ({ ...prev, ...p })), []);
  const next = () => { if (step < TOTAL) setStep(s => s+1); else setStep(9); };
  const back = () => { if (step === 1) onBack(); else setStep(s => s-1); };

  const screens: Record<number, React.ReactElement> = {
    9: <SuccessScreen onDone={() => { setShowSuccess(false); onDone(); }} />,
    1: <PStep1Basic data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    2: <PStep2Legal data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    3: <PStep3Location data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    4: <PStep4Hours data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    5: <PStep5Catalog data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    6: <PStep6Delivery data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    7: <PStep7AdminWarning data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,
    8: <PStep7Submit data={data} update={update} onDone={onDone} onBack={back} step={step} total={TOTAL} />,
  };
  return screens[step] ?? null;
}

// ══════════════════════════════════════════════════════════════════════════════
function PStep1Basic({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [errs, setErrs] = useState<Record<string,string>>({});

  const nameArRef = useRef<any>(null);
  const nameEnRef = useRef<any>(null);
  const pharmaRef = useRef<any>(null);
  const mgrNameRef = useRef<any>(null);
  const emailRef = useRef<any>(null);
  const phoneRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);
  const confirmPassRef = useRef<any>(null);

  const validate = () => {
    const e: Record<string,string> = {};
    if (!data.nameAr.trim()) e.nameAr = AR ? 'مطلوب' : 'Required';
    if (!data.type) e.type = AR ? 'اختر نوع الصيدلية' : 'Choose type';
    if (!data.managerName.trim()) e.mgr = AR ? 'مطلوب' : 'Required';
    if (!Validate.email(data.managerEmail)) e.email = AR ? 'بريد غير صحيح' : 'Invalid email';
    if (!Validate.phone(data.managerPhone)) e.phone = AR ? 'جوال غير صحيح' : 'Invalid phone';
    if (!data.pharmacistName.trim()) e.pharma = AR ? 'مطلوب' : 'Required';
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
        type: 'pharmacy',
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
      <NHeader title={AR?'بيانات الصيدلية':'Pharmacy Basic Info'} sub={AR?'أدخل بيانات صيدليتك':'Enter your pharmacy details'} step={step} total={total} onBack={onBack} />

      <Text style={[s.label, { color:theme.text, textAlign:AR?'right':'left' }]}>{AR?'نوع الصيدلية':'Pharmacy Type'} *</Text>
      <View style={{ gap:SP.sm, marginBottom:SP.xl }}>
        {PHARMACY_TYPES.map(pt => {
          const sel = data.type === pt.id;
          return (
            <TouchableOpacity key={pt.id} onPress={() => update({ type:pt.id })} style={[s.typeRow, { backgroundColor: sel ? theme.primaryLight : theme.surface2, borderColor: sel ? theme.primary : theme.border, flexDirection: AR?'row-reverse':'row' }]}>
              <Text style={{ fontSize:22 }}>{pt.icon}</Text>
              <Text style={{ flex:1, fontSize:FS.md, color:sel?theme.primary:theme.text, fontWeight:sel?FW.bold:FW.reg, textAlign:AR?'right':'left' }}>{AR?pt.ar:pt.en}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <NInput innerRef={nameArRef} label={AR?'اسم الصيدلية بالعربي':'Pharmacy Name (Arabic)'} placeholder={AR?'صيدلية نبضة الصحة':'Nabdah Health Pharmacy'} value={data.nameAr} onChange={v=>update({nameAr:v})} required error={errs.nameAr} caps="words" returnKey="next" onSubmit={() => nameEnRef.current?.focus()} />
      <NInput innerRef={nameEnRef} label={AR?'اسم الصيدلية بالإنجليزي':'Pharmacy Name (English)'} placeholder="Nabdah Health Pharmacy" value={data.nameEn} onChange={v=>update({nameEn:v})} caps="words" returnKey="next" onSubmit={() => pharmaRef.current?.focus()} />

      <NDivider label={AR?'الصيدلاني المسؤول':'Head Pharmacist'} style={{ marginVertical:SP.lg }} />
      <NInput innerRef={pharmaRef} label={AR?'اسم الصيدلاني المسؤول':'Head Pharmacist Name'} placeholder={AR?'محمد أحمد السعودي':'Mohamed Ahmed'} value={data.pharmacistName} onChange={v=>update({pharmacistName:v})} required error={errs.pharma} caps="words" hint={AR?'يجب أن يكون مرخصاً من هيئة الصحة SCFHS':'Must hold valid SCFHS pharmacy license'} returnKey="next" onSubmit={() => mgrNameRef.current?.focus()} />
      
      <NDivider label={AR?'المدير المسؤول':'Manager Info'} style={{ marginVertical:SP.lg }} />
      <NInput innerRef={mgrNameRef} label={AR?'اسم المدير التنفيذي':'Manager Name'} placeholder={AR?'خالد عمر المالكي':'Khalid Omar'} value={data.managerName} onChange={v=>update({managerName:v})} required error={errs.mgr} caps="words" returnKey="next" onSubmit={() => emailRef.current?.focus()} />
      <NInput innerRef={emailRef} label={AR?'البريد الإلكتروني':'Email'} placeholder="pharmacy@email.com" value={data.managerEmail} onChange={v=>update({managerEmail:v.toLowerCase()})} required error={errs.email} kbType="email-address" returnKey="next" onSubmit={() => phoneRef.current?.focus()} />
      <NPhoneInput innerRef={phoneRef} label={AR?'رقم الجوال':'Phone'} value={data.managerPhone} onChange={v=>update({managerPhone:v})} required error={errs.phone} />
      <NInput innerRef={passwordRef} label={AR?'كلمة المرور':'Password'} placeholder="••••••••" value={data.password} onChange={v=>update({password:v})} secure required error={errs.pass} hint={AR?'8 أحرف — أرقام وحروف كبيرة وصغيرة ورموز':'8+ chars — numbers, upper+lower+symbols'} returnKey="next" onSubmit={() => confirmPassRef.current?.focus()} />
      <NPassStrength password={data.password} />
      <NInput innerRef={confirmPassRef} label={AR?'تأكيد كلمة المرور':'Confirm Password'} placeholder="••••••••" value={data.confirmPass} onChange={v=>update({confirmPass:v})} secure required error={errs.conf} returnKey="done" onSubmit={handleNext} />

      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text, marginTop: 12, marginBottom: 6, textAlign: AR ? 'right' : 'left' }}>{AR ? 'لغات التعامل داخل الصيدلية' : 'Spoken languages'}</Text>
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
      <NBtn label={AR?'التالي':'Next'} onPress={handleNext} loading={loading} />
          </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function PStep2Legal({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const [errs, setErrs] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string,string> = {};
    if (!Validate.cr(data.crNumber)) e.cr = AR?'السجل التجاري 10 أرقام':'CR must be 10 digits';
    if (!data.mohLicense.trim()) e.moh = AR?'مطلوب':'Required';
    if (!data.sfdaNumber.trim()) e.sfda = AR?'رقم SFDA مطلوب':'SFDA number required';
    if (!Validate.iban(data.iban)) e.iban = AR?'رقم الآيبان غير صحيح':'Invalid IBAN';
    setErrs(e); return Object.keys(e).length === 0;
  };

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

  const DocCard = ({ label, field, req }: any) => {
    const done = !!(data[field] as string);
    return (
      <TouchableOpacity onPress={() => pickDocument(field)} style={[s.docCard, { backgroundColor: done ? theme.successBg : theme.surface2, borderColor: done ? theme.success : theme.border, borderStyle: done ? 'solid' : 'dashed' }]}>
        <I name={done ? 'checkCircle' : 'upload'} size={24} color={done ? theme.success : theme.primary} />
        <Text style={{ fontSize:FS.sm, color:done?theme.success:theme.text, fontWeight:FW.semi, textAlign:'center', marginTop: SP.xs }}>{label}{req&&<Text style={{ color:theme.danger }}> *</Text>}</Text>
        <Text style={{ fontSize:FS.xs, color:done?theme.success:theme.textSub }}>{done?(AR?'تم الرفع':'Uploaded'):(AR?'اضغط للرفع':'Tap to upload')}</Text>
      </TouchableOpacity>
    );
  };

  const handleNext = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const crUrl = await ProviderApi.uploadFile(data.crUri, 'image/jpeg', 'cr.jpg');
      const mohUrl = await ProviderApi.uploadFile(data.mohUri, 'image/jpeg', 'moh.jpg');
      const sfdaUrl = await ProviderApi.uploadFile(data.sfdaUri, 'image/jpeg', 'sfda.jpg');
      
      await ProviderApi.step2({
        license_number: data.crNumber,
        license_documents: [crUrl, mohUrl, sfdaUrl],
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
      <NHeader title={AR?'التراخيص والوثائق':'Licenses & Documents'} sub={AR?'جميع البيانات مشفّرة ومحمية':'All data encrypted & protected'} step={step} total={total} onBack={onBack} />
      <NInput label={AR?'رقم السجل التجاري CR':'CR Number'} placeholder="1234567890" value={data.crNumber} onChange={v=>update({crNumber:v.replace(/\D/g,'')})} required error={errs.cr} kbType="numeric" maxLen={10} />
      <NInput label={AR?'رقم ترخيص وزارة الصحة MOH':'MOH License Number'} placeholder="MOH-PHR-XXXXX" value={data.mohLicense} onChange={v=>update({mohLicense:v})} required error={errs.moh} hint={AR?'ترخيص الصيدلية من وزارة الصحة السعودية':'Saudi Ministry of Health pharmacy license'} />
      <NInput label={AR?'رقم ترخيص SFDA (هيئة الغذاء والدواء)':'SFDA License Number'} placeholder="SFDA-XXXXX" value={data.sfdaNumber} onChange={v=>update({sfdaNumber:v})} required error={errs.sfda} hint={AR?'ترخيص صرف الأدوية من هيئة الغذاء والدواء':'Saudi Food and Drug Authority license'} />
      <NInput label={AR?'رقم الآيبان IBAN':'Bank IBAN'} placeholder="SA0000000000000000000000" value={data.iban} onChange={v=>update({iban:v.toUpperCase().replace(/\s/g,'')})} required error={errs.iban} maxLen={24} hint={AR?'SA + 22 رقم — لاستلام المدفوعات':'SA + 22 digits — to receive payments'} />
      <NInput label={AR?'الرقم الضريبي VAT (اختياري)':'VAT Number (Optional)'} placeholder="300XXXXXXXXX003" value={data.taxNumber} onChange={v=>update({taxNumber:v})} maxLen={15} />

      <Text style={[s.sectionTitle, { color:theme.text, textAlign:AR?'right':'left', marginTop: SP.md }]}>{AR?'رفع الوثائق الرسمية':'Upload Official Documents'}</Text>
      <View style={s.docGrid}>
        <DocCard label={AR?'السجل التجاري':'CR Doc'} field="crUri" req />
        <DocCard label={AR?'ترخيص MOH':'MOH License'} field="mohUri" req />
        <DocCard label={AR?'ترخيص SFDA':'SFDA License'} field="sfdaUri" req />
        <DocCard label={AR?'شعار الصيدلية':'Pharmacy Logo'} field="logoUri" />
      </View>

      <NBtn label={AR?'التالي':'Next'} onPress={handleNext} loading={loading} style={{ marginTop:SP.lg }} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function PStep3Location({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [errs, setErrs] = useState<Record<string,string>>({});

  const validate = () => {
    const e: Record<string,string> = {};
    if (!data.city) e.city = AR?'اختر المدينة':'Choose city';
    if (!data.address.trim()) e.address = AR?'العنوان مطلوب':'Address required';
    setErrs(e); return Object.keys(e).length === 0;
  };

  return (
    <NScroll>
      <NHeader title={AR?'الموقع ونطاق التوصيل':'Location & Delivery Zone'} sub={AR?'حدد موقع الصيدلية ونطاق التوصيل':'Set pharmacy location and delivery coverage'} step={step} total={total} onBack={onBack} />

      <Text style={[s.label, { color:theme.text, textAlign:AR?'right':'left' }]}>{AR?'المدينة':'City'} *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:SP.lg }}>
        <View style={{ flexDirection:'row', gap:SP.sm }}>
          {CITIES.map(c => (
            <TouchableOpacity key={c.id} onPress={() => update({ city:c.id })} style={[s.cityChip, { backgroundColor: data.city===c.id ? theme.primary : theme.surface2, borderColor: data.city===c.id ? theme.primary : theme.border }]}>
              <Text style={{ color:data.city===c.id?'#FFF':theme.text, fontSize:FS.sm, fontWeight:FW.med }}>{AR?c.ar:c.en}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      
      {errs.city && <Text style={s.err}>{errs.city}</Text>}

      <NInput label={AR?'الحي / المنطقة':'District / Area'} placeholder={AR?'حي الورود':'Al-Wurud District'} value={data.district} onChange={v=>update({district:v})} caps="words" />
      <NInput label={AR?'العنوان الكامل':'Full Address'} placeholder={AR?'شارع الأمير سلطان، حي الروضة':'Prince Sultan Road, Al-Rawdah'} value={data.address} onChange={v=>update({address:v})} required error={errs.address} multi lines={2} />

      {/* Delivery Zone with Interactive Map Circle */}
      <NCard style={{ marginBottom:SP.xl, marginTop: SP.md }}>
        <NToggle label={AR?' تفعيل خدمة التوصيل':' Enable Delivery Service'} sub={AR?'تلقّي وتوصيل الطلبات للمرضى':'Receive and deliver orders to patients'} value={data.hasDelivery} onChange={v=>update({hasDelivery:v})} />

        {data.hasDelivery && (
          <View style={{ marginTop:SP.lg }}>
            <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>
              {AR ? 'من سيقوم بتوصيل الطلبات؟' : 'Who will deliver the orders?'}
            </Text>
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.lg }}>
              <TouchableOpacity onPress={() => update({ hasOwnDrivers: true })} style={{ flex: 1, padding: SP.md, borderWidth: 1, borderColor: data.hasOwnDrivers ? theme.primary : theme.border, backgroundColor: data.hasOwnDrivers ? theme.primaryLight : theme.bg, borderRadius: R.md, alignItems: 'center' }}>
                <Text style={{ color: data.hasOwnDrivers ? theme.primary : theme.text, textAlign: 'center' }}>{AR ? 'توصيل خاص\n(مندوبي الصيدلية)' : 'Own Drivers\n(Pharmacy staff)'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => update({ hasOwnDrivers: false })} style={{ flex: 1, padding: SP.md, borderWidth: 1, borderColor: !data.hasOwnDrivers ? theme.primary : theme.border, backgroundColor: !data.hasOwnDrivers ? theme.primaryLight : theme.bg, borderRadius: R.md, alignItems: 'center' }}>
                <Text style={{ color: !data.hasOwnDrivers ? theme.primary : theme.text, textAlign: 'center' }}>{AR ? 'عبر التطبيق\n(مناديب نبض)' : 'Via App\n(Nabd drivers)'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={[s.label, { color:theme.text, textAlign:AR?'right':'left' }]}>{AR?'نطاق التوصيل (كم)':'Delivery Radius (km)'}</Text>
            
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md, marginBottom: SP.md }}>
              <TouchableOpacity 
                onPress={() => update({ deliveryRadius: Math.max(1, data.deliveryRadius - 1) })}
                style={{ width: 44, height: 44, borderRadius: R.md, backgroundColor: theme.surface3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}
              >
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>-</Text>
              </TouchableOpacity>
              <TextInput
                value={String(data.deliveryRadius)}
                onChangeText={v => {
                  const num = parseInt(v.replace(/\D/g, '')) || 0;
                  update({ deliveryRadius: Math.min(100, Math.max(1, num)) });
                }}
                keyboardType="numeric"
                style={{ flex: 1, height: 44, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.inputBg, borderRadius: R.md, color: theme.text, textAlign: 'center', fontSize: FS.md, fontWeight: 'bold' }}
              />
              <TouchableOpacity 
                onPress={() => update({ deliveryRadius: Math.min(100, data.deliveryRadius + 1) })}
                style={{ width: 44, height: 44, borderRadius: R.md, backgroundColor: theme.surface3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}
              >
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>+</Text>
              </TouchableOpacity>
              <Text style={{ color: theme.textSub, fontSize: FS.md }}>{AR ? 'كم' : 'KM'}</Text>
            </View>

            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:SP.sm, marginBottom:SP.md }}>
              {[2, 4, 6, 8, 10, 15, 20, 50].map(r => (
                <TouchableOpacity key={r} onPress={() => update({ deliveryRadius:r })} style={[s.radiusChip, { backgroundColor: data.deliveryRadius===r ? theme.primary : theme.surface2, borderColor: data.deliveryRadius===r ? theme.primary : theme.border }]}>
                  <Text style={{ color:data.deliveryRadius===r?'#FFF':theme.text, fontWeight:FW.semi }}>{r} {AR?'كم':'km'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ height: 200, borderRadius: R.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, marginBottom: SP.md }}>
              <MapView
                style={{ flex: 1 }}
                initialRegion={{ latitude: 24.7136, longitude: 46.6753, latitudeDelta: 0.2, longitudeDelta: 0.2 }}
              >
                <Marker coordinate={{ latitude: 24.7136, longitude: 46.6753 }} />
                <Circle
                  center={{ latitude: 24.7136, longitude: 46.6753 }}
                  radius={data.deliveryRadius * 1000}
                  strokeColor={theme.primary}
                  fillColor="rgba(255, 152, 0, 0.2)"
                />
              </MapView>
            </View>

            <NCard style={{ backgroundColor:theme.infoBg, padding:SP.md }}>
              <Text style={{ fontSize:FS.xs, color:theme.info, lineHeight:18, textAlign:AR?'right':'left' }}>
                {AR
                  ? `نظام البث (Broadcast): يتم إرسال طلبات الأدوية للمرضى داخل نطاق ${data.deliveryRadius} كم لضمان سرعة التوصيل.`
                  : `Broadcast system: Prescription orders sent to pharmacies within ${data.deliveryRadius}km coverage radius.`}
              </Text>
            </NCard>
          </View>
        )}
      </NCard>

      <NBtn label={AR?'التالي':'Next'} onPress={() => { if(validate()) onNext(); }} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function PStep4Hours({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [showVacationCal, setShowVacationCal] = useState(false);

  const HOURS = Array.from({length:24}, (_,i) => {
    const h = i.toString().padStart(2,'0');
    const label = i < 12 ? `${i===0?12:i}:00 AM` : `${i===12?12:i-12}:00 PM`;
    return { val:`${h}:00`, label };
  });

  const toggleDay = (k:string) => {
    const days = data.workDays.includes(k) ? data.workDays.filter(d=>d!==k) : [...data.workDays, k];
    update({ workDays:days });
  };

  return (
    <NScroll>
      <NHeader title={AR?'أوقات العمل والجدولة':'Working Hours'} sub={AR?'حدد أيام وساعات عمل صيدليتك':'Set your pharmacy working days and hours'} step={step} total={total} onBack={onBack} />

      <NCard style={{ marginBottom:SP.xl }}>
        <NToggle label={AR?' مفتوح 24/7':' Open 24/7'} sub={AR?'الصيدلية مفتوحة طوال اليوم والأسبوع':'Open around the clock every day'} value={data.is24_7} onChange={v => update({ is24_7:v, workDays: v? ['SUN','MON','TUE','WED','THU','FRI','SAT']: data.workDays })} />
      </NCard>

      {!data.is24_7 && (
        <>
          <Text style={[s.sectionTitle, { color:theme.text, textAlign:AR?'right':'left' }]}>{AR?'أيام العمل':'Working Days'}</Text>
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:SP.sm, marginBottom:SP.xl }}>
            {WORK_DAYS.map(d => {
              const active = data.workDays.includes(d.k);
              return (
                <TouchableOpacity key={d.k} onPress={() => toggleDay(d.k)} style={[s.dayChip, { backgroundColor: active ? theme.primary : theme.surface2, borderColor: active ? theme.primary : theme.border }]}>
                  <Text style={{ color:active?'#FFF':theme.text, fontSize:FS.sm, fontWeight:FW.semi }}>{AR?d.ar:d.k}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

                    <NCard style={{ marginBottom:SP.xl }}>
            <Text style={[s.sectionTitle, { color:theme.text, textAlign:AR?'right':'left', marginBottom:SP.lg }]}>{AR?'نظام الفترات الساعات':'Shift System'}</Text>
            
            <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginBottom: SP.md }}>
              {['morning', 'evening', 'both'].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => update({ shiftType: type as any })}
                  style={{ flex: 1, padding: SP.sm, borderRadius: R.md, borderWidth: 1.5, borderColor: data.shiftType === type ? theme.primary : theme.border, backgroundColor: data.shiftType === type ? theme.primary + '11' : theme.surface2, alignItems: 'center' }}>
                  <Text style={{ color: data.shiftType === type ? theme.primary : theme.textSub, fontWeight: FW.bold, fontSize: FS.sm }}>
                    {AR ? (type === 'morning' ? 'صباحية' : type === 'evening' ? 'مسائية' : 'كليهما') : (type === 'morning' ? 'Morning' : type === 'evening' ? 'Evening' : 'Both')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {(data.shiftType === 'morning' || data.shiftType === 'both') && (
              <View style={{ marginBottom: SP.md }}>
                <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>{AR ? 'الفترة الصباحية' : 'Morning Shift'}</Text>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
                  <View style={{ flex: 1 }}><NDropdown label={AR?'من':'From'} value={data.openTime} options={HOURS} onChange={v=>update({openTime:v})} /></View>
                  <View style={{ flex: 1 }}><NDropdown label={AR?'إلى':'To'} value={data.closeTime} options={HOURS} onChange={v=>update({closeTime:v})} /></View>
                </View>
              </View>
            )}

            {(data.shiftType === 'evening' || data.shiftType === 'both') && (
              <View>
                <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>{AR ? 'الفترة المسائية' : 'Evening Shift'}</Text>
                <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
                  <View style={{ flex: 1 }}><NDropdown label={AR?'من':'From'} value={data.eveningOpenTime} options={HOURS} onChange={v=>update({eveningOpenTime:v})} /></View>
                  <View style={{ flex: 1 }}><NDropdown label={AR?'إلى':'To'} value={data.eveningCloseTime} options={HOURS} onChange={v=>update({eveningCloseTime:v})} /></View>
                </View>
              </View>
            )}
          </NCard>

          <NCard style={{ marginBottom:SP.xl, display: 'none' }}>
            <NToggle label={AR?' مناوبة ليلية (بعد منتصف الليل)':' Night Shift (After Midnight)'} sub={AR?'الصيدلية تعمل حتى الفجر أو طوال الليل':'Pharmacy stays open late or overnight'} value={data.hasNightShift} onChange={v=>update({hasNightShift:v})} />
          </NCard>
        </>
      )}

      <TouchableOpacity onPress={() => setShowVacationCal(true)}>
        <NInput label={AR ? 'إجازة مخططة (إيقاف الطلبات مؤقتاً)' : 'Planned Vacation'} placeholder={AR ? 'اختر التاريخ من التقويم...' : 'Choose date...'} value={data.vacationDate} onChange={() => {}} editable={false} icon="calendar" />
      </TouchableOpacity>

      <NDatePickerSheet
        visible={showVacationCal}
        value={data.vacationDate}
        onChange={() => {}}
        onClose={() => setShowVacationCal(false)}
        title={AR ? 'اختر تاريخ الإجازة' : 'Select Vacation Date'}
      />

      <NBtn label={AR?'التالي':'Next'} onPress={onNext} style={{ marginTop: SP.md }} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function PStep5Catalog({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';

  const toggleCat = (id:string) => {
    const cats = data.enabledCategories.includes(id) ? data.enabledCategories.filter(c=>c!==id) : [...data.enabledCategories, id];
    update({ enabledCategories:cats });
  };

  return (
    <NScroll>
      <NHeader title={AR?'كتالوج المنتجات الفئات':'Product Catalog'} sub={AR?'حدد فئات المنتجات التي تدعمها صيدليتك':'Select product categories supported'} step={step} total={total} onBack={onBack} />

      <NCard style={{ marginBottom:SP.xl }}>
        <Text style={[s.sectionTitle, { color:theme.text, textAlign:AR?'right':'left', marginBottom:SP.lg }]}>{AR?'الخدمات الأساسية':'Core Services'}</Text>
        <NToggle label={AR?'صرف الأدوية بالوصفة (Rx)':'Prescription Dispensing (Rx)'} sub={AR?'صرف أدوية تستلزم وصفة طبية':'Dispense medications requiring prescription'} value={data.rxDispensing} onChange={v=>update({rxDispensing:v})} />
        <NToggle label={AR?'بيع أدوية بدون وصفة (OTC)':'OTC Medication Sales'} sub={AR?'أدوية لا تستلزم وصفة طبية':'Over-the-counter medications'} value={data.otcSelling} onChange={v=>update({otcSelling:v})} />
      </NCard>

      <Text style={[s.sectionTitle, { color:theme.text, textAlign:AR?'right':'left' }]}>{AR?'فئات المنتجات المتاحة':'Product Categories'}</Text>
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:SP.md, marginBottom:SP.xl }}>
        {PHARMA_CATS.map(cat => {
          const active = data.enabledCategories.includes(cat.id);
          return (
            <TouchableOpacity key={cat.id} onPress={() => toggleCat(cat.id)} style={[s.catCard, { backgroundColor: active ? theme.primaryLight : theme.surface2, borderColor: active ? theme.primary : theme.border, width: (W - SP.xl*2 - SP.md*2) / 3 - 1 }]}>
              <Text style={{ fontSize:22, marginBottom:SP.xs }}>{cat.icon}</Text>
              <Text style={{ fontSize:FS.xs, color:active?theme.primary:theme.text, fontWeight:active?FW.bold:FW.reg, textAlign:'center', lineHeight:16 }}>{AR?cat.ar:cat.en}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flexDirection:AR?'row-reverse':'row', gap:SP.md, marginBottom:SP.xl }}>
        <View style={{ flex:1 }}><NBtn label={AR?'تحديد الكل':'Select All'} variant="outline" size="sm" onPress={() => update({ enabledCategories: PHARMA_CATS.map(c=>c.id) })} /></View>
        <View style={{ flex:1 }}><NBtn label={AR?'إلغاء الكل':'Clear All'} variant="secondary" size="sm" onPress={() => update({ enabledCategories:[] })} /></View>
      </View>

      <NBtn label={AR?'التالي':'Next'} onPress={onNext} disabled={data.enabledCategories.length === 0} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function PStep6Delivery({ data, update, onNext, onBack, step, total }: any) {
 const insuranceCatalog = useInsuranceCatalog();
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';

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
      <NHeader title={AR?'شروط التوصيل والتأمين':'Delivery & Insurance'} sub={AR?'حدد رسوم التوصيل وشركات التأمين المقبولة':'Configure delivery terms & insurance tiers'} step={step} total={total} onBack={onBack} />

      {data.hasDelivery && (
        <NCard style={{ marginBottom:SP.xl }}>
          <Text style={[s.sectionTitle, { color:theme.text, textAlign:AR?'right':'left', marginBottom:SP.lg }]}>{AR?'رسوم وشروط التوصيل':'Delivery Fees & Terms'}</Text>
          <NPriceInput label={AR?'رسوم التوصيل الأساسية':'Base Delivery Fee'} value={data.deliveryFee} onChange={v=>update({deliveryFee:v})} required />
          <NPriceInput label={AR?'توصيل مجاني فوق (ريال)':'Free delivery above (SAR)'} value={data.freeDeliveryAbove} onChange={v=>update({freeDeliveryAbove:v})} />
          <NPriceInput label={AR?'الحد الأدنى للطلب (ريال)':'Minimum Order Amount (SAR)'} value={data.minOrderSAR} onChange={v=>update({minOrderSAR:v})} required />
          
          <NToggle label={AR?' توصيل سريع Express':' Express Delivery'} sub={AR?'توصيل سريع بسعر أعلى لمسافات قصيرة':'Express delivery options'} value={data.expressDelivery} onChange={v=>update({expressDelivery:v})} />
          {data.expressDelivery && (
            <View style={{ marginTop:SP.md, gap:SP.sm }}>
              <NPriceInput label={AR?'رسوم التوصيل السريع':'Express Fee'} value={data.expressFee} onChange={v=>update({expressFee:v})} required />
              <NInput label={AR?'وقت التوصيل السريع (دقيقة)':'Express Delivery Time (min)'} placeholder="30" value={data.expressMinutes} onChange={v=>update({expressMinutes:v.replace(/\D/g,'')})} kbType="numeric" maxLen={3} />
            </View>
          )}
        </NCard>
      )}

      <NCard style={{ marginBottom:SP.xl }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.md }}>
          <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>{AR ? 'أقبل الدفع بالتأمين الصيدلاني؟' : 'Accept Insurance Payments?'}</Text>
          <Switch value={!data.cashOnly} onValueChange={v=>update({cashOnly:!v})} />
        </View>

        {!data.cashOnly && (
          <View style={{ marginTop: SP.md }}>
            <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.sm, textAlign: AR ? 'right' : 'left' }}>{AR ? 'اختر شركات التأمين الصيدلاني المعتمدة وفئاتها:' : 'Select accepted pharmacy insurance plans:'}</Text>
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
                      <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.xs, textAlign: AR ? 'right' : 'left' }}>{AR ? 'الفئات المقبولة لصرف الدواء:' : 'Accepted Plans/Tiers:'}</Text>
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

      <NBtn label={AR?'التالي':'Next'} onPress={onNext} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function PStep7AdminWarning({ data, update, onNext, onBack, step, total }: any) {
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
          {AR ? 'يرجى العلم أن حساب الصيدلية، وفئات المنتجات، وأسعار التوصيل، لن تظهر فوراً للجمهور بعد استكمال التسجيل.' : 'Your pharmacy profile, delivery terms, and product categories will NOT go live immediately.'}
        </Text>
        <Text style={{ fontSize: FS.md, color: theme.text, textAlign: AR ? 'right' : 'left', lineHeight: 24 }}>
          {AR ? 'أي تعديل مستقبلي للمخزون أو الأسعار أو الحدود المالية يخضع لمراجعة الأدمن للموافقة عليه لضمان الجودة ومطابقة لوائح هيئة الغذاء والدواء SFDA.' : 'Any future updates to inventory, delivery parameters, or listings must be approved by the Admin first.'}
        </Text>
      </View>

      <NBtn label={AR ? 'أوافق وأتفهم ذلك' : 'I Understand & Agree'} onPress={onNext} style={{ marginTop: SP.xl }} />
    </NScroll>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
function PStep7Submit({ data, update, onDone, onBack, step, total }: any) {
  const [showContract, setShowContract] = useState(false);
  const { theme } = useTheme(); const { lang } = useLang(); const { show } = useToast(); const AR = lang === 'ar';
  const sigRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [showSigModal, setShowSigModal] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const handleVerifyOtp = async (code: string) => verifyEmailOtp(data.managerEmail || data.email, code);
  const [submitted, setSubmitted] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const handleSignature = async (signature: string) => {
    setLoading(true);
    try {
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
        pharmacy_chain: false,
        has_own_drivers: data.hasDelivery && data.hasOwnDrivers,
        has_own_delivery: data.hasDelivery,
        delivery_radius_km: data.deliveryRadius,
        delivery_fee: parseFloat(data.deliveryFee) || 0,
        free_delivery_above: parseFloat(data.freeDeliveryAbove) || 0,
        min_order_sar: parseFloat(data.minOrderSAR) || 0,
        express_delivery: data.expressDelivery || false,
        express_fee: parseFloat(data.expressFee) || 0,
        express_minutes: parseInt(data.expressMinutes, 10) || 0,
        working_hours: workingHours,
        accepts_insurance: !data.cashOnly,
        accepted_insurance: data.acceptedInsurance ? data.acceptedInsurance.map((ins: any) => ins.companyId) : [],
        accepts_cash: true,
        rx_dispensing: data.rxDispensing || false,
        otc_selling: data.otcSelling || false,
        enabled_categories: data.enabledCategories || []
      });

        const docs: string[] = [];
        if (data.crUri) docs.push(await ProviderApi.uploadFile(data.crUri, 'application/pdf', 'cr_document'));
        if (data.mohUri) docs.push(await ProviderApi.uploadFile(data.mohUri, 'application/pdf', 'moh_license'));
        if (data.sfdaUri) docs.push(await ProviderApi.uploadFile(data.sfdaUri, 'application/pdf', 'sfda_license'));
        
        // The pharmacy logo goes to its OWN field — it is the brand mark, not a gallery photo.
        let logo: string | undefined;
        if (data.logoUri) logo = await ProviderApi.uploadFile(data.logoUri, 'image/jpeg', 'pharmacy_logo');

        await ProviderApi.step2({
          name_ar: data.nameAr,
          name_en: data.nameEn,
          city: data.city,
          location: data.location,
          district: data.district,
          address: data.address,
          pharmacy_type: data.type,
          cr_number: data.crNumber,
          moh_license_number: data.mohLicense,
          sfda_license_number: data.sfdaNumber,
          tax_number: data.taxNumber,
          license_documents: docs,
          logo,
          languages: data.languages,
        });

      const sigUrl = await ProviderApi.uploadSignature(signature);
      update({ signatureData: sigUrl });

      await ProviderApi.step2({
        iban: data.iban,
        bank_account_name: data.accountHolderName
      });
      await ProviderApi.submit({ signer_name: data.signerName, signer_role: data.signerRole, lat: data.location?.lat || 0, lng: data.location?.lng || 0 , signature_url: sigUrl, full_data: sanitizeWizardData(data) });

      show(AR ? 'تم إرسال الطلب وملحقاته بنجاح!' : 'Registration Submitted!', 'success');
      setSubmitted(true);
    } catch (e: any) {
      show(e.message || (AR ? 'حدث خطأ' : 'Error submitting'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const submit = () => {
    if (!agreed) { show(AR ? 'يرجى الموافقة على الشروط' : 'Please agree to terms', 'warning'); return; }
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

  if (submitted) {
    return <RegistrationSuccess onDone={onDone} email={data.email} providerType="pharmacy" />;
  }

  const rows = [
    { ar:'اسم الصيدلية', en:'Pharmacy Name', val:data.nameAr||'—' },
    { ar:'النوع', en:'Type', val:data.type },
    { ar:'المدينة', en:'City', val:data.city },
    { ar:'نطاق التوصيل', en:'Delivery Radius',val:data.hasDelivery?`${data.deliveryRadius} كم`:(AR?'بدون توصيل':'No delivery') },
  ];

  return (
    <View style={{ flex:1, backgroundColor: theme.bg }}>
      <View style={{ padding: SP.xl, paddingBottom: 0 }}>
        <NHeader title={AR?'مراجعة وإرسال':'Review & Submit'} onBack={onBack} step={step} total={total} />
      </View>

      <ScrollView scrollEnabled={scrollEnabled} style={{ flex: 1, paddingHorizontal: SP.xl }} keyboardShouldPersistTaps="handled">
        <NCard style={{ marginBottom:SP.lg }}>
          <Text style={[s.sectionTitle, { color:theme.text, textAlign:AR?'right':'left', marginBottom:SP.lg }]}>{AR?'ملخص ملف الصيدلية':'Pharmacy Summary'}</Text>
          {rows.map((row,i) => (
            <View key={i} style={[s.sumRow, { flexDirection:AR?'row-reverse':'row' }]}>
              <Text style={{ flex:1, color:theme.textSub, fontSize:FS.sm, textAlign:AR?'right':'left' }}>{AR?row.ar:row.en}</Text>
              <Text style={{ color:theme.text, fontWeight:FW.semi, fontSize:FS.sm }}>{row.val}</Text>
            </View>
          ))}
        </NCard>

        
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



          {/* Contract Modal & Button */}
          
          <TouchableOpacity style={{ backgroundColor: theme.surface, padding: SP.md, borderRadius: 8, borderWidth: 1, borderColor: theme.primary, alignItems: 'center', marginBottom: SP.lg }} onPress={() => setShowContract(true)}>
            <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: FS.md }}>{AR ? 'الاطلاع على العقد' : 'View Contract'}</Text>
          </TouchableOpacity>

<Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm, marginTop: SP.xl }}>{AR ? 'اسم الموقّع' : 'Signatory Name'}</Text>

<NInput value={data.signerName} onChange={v => update({ signerName: v })} placeholder={AR ? 'الاسم الثلاثي' : 'Full Name'} />

<Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm, marginTop: SP.md }}>{AR ? 'صفة الموقّع / المسمى الوظيفي' : 'Signatory Role'}</Text>
<NInput value={data.signerRole} onChange={v => update({ signerRole: v })} placeholder={AR ? 'مثال: المالك، المدير التنفيذي' : 'e.g. Owner, CEO'} />

<Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm, marginTop: SP.xl }}>{AR ? 'توقيع الممثل المفوض' : 'Authorized Signature'}</Text>

        
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


        <NCard style={{ marginBottom:SP.lg, backgroundColor:theme.surface2 }}>
          <NCheckbox label={AR?'أوافق على شروط وأحكام نبضة بلس وسياسة الخصوصية، وأقر بصحة البيانات.':'I agree to terms & conditions.'} value={agreed} onChange={setAgreed} />
        </NCard>

        <NBtn label={AR?' إرسال ملف الصيدلية للمراجعة':' Submit Pharmacy Application'} onPress={submit} loading={loading} style={{ marginBottom: 50, backgroundColor: theme.success }} />
      </ScrollView>
      <ContractModal visible={showContract} onClose={() => setShowContract(false)} />
      <SignatureCanvasModal visible={showSigModal} onClose={() => setShowSigModal(false)} onOK={(sig) => update({ signatureData: sig })} />
      <OtpModal visible={showOtp} onClose={() => setShowOtp(false)} target={data.managerEmail || data.email} onVerify={async (code) => { const ok = await handleVerifyOtp(code); if(ok) { setShowOtp(false); finishSubmit(); return true; } return false; }} onResend={() => sendEmailOtp(data.managerEmail || data.email).then(() => show(AR ? 'أُعيد إرسال الرمز' : 'Code resent', 'success')).catch(() => show(AR ? 'تعذر الإرسال — انتظر قليلاً' : 'Could not resend — wait a moment', 'error'))} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  label: { fontSize:FS.sm, fontWeight:FW.semi, marginBottom:SP.xs },
  err: { fontSize:FS.xs, color:C.red500, marginTop:SP.xs, marginBottom:SP.sm },
  sectionTitle:{ fontSize:FS.md, fontWeight:FW.bold, marginBottom:SP.md },
  typeRow: { borderRadius:R.lg, borderWidth:1.5, padding:SP.lg, gap:SP.md, alignItems:'center', marginBottom:SP.sm },
  docCard: { borderRadius:R.xl, borderWidth:2, padding:SP.lg, alignItems:'center', justifyContent:'center', flex:1, minHeight: 90, marginHorizontal: 2 },
  docGrid: { flexDirection:'row', flexWrap:'wrap', gap:SP.sm, marginBottom:SP.xl },
  cityChip: { paddingHorizontal:SP.lg, paddingVertical:SP.sm, borderRadius:R.full, borderWidth:1.5 },
  mapBox: { borderRadius:R.xl, borderWidth:2, borderStyle:'dashed', padding:SP.xxl, alignItems:'center' },
  radiusChip: { paddingHorizontal:SP.lg, paddingVertical:SP.sm, borderRadius:R.full, borderWidth:1.5, marginBottom: 4 },
  dayChip: { paddingHorizontal:SP.lg, paddingVertical:SP.sm, borderRadius:R.full, borderWidth:1.5 },
  catCard: { padding: SP.sm, borderWidth: 1.5, borderRadius: R.lg, alignItems: 'center', justifyContent: 'center', minHeight: 80, position: 'relative' },
  catCheck: { position: 'absolute', top: 6, right: 6, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  sumRow: { flexDirection: 'row', alignItems: 'center', gap: SP.md, paddingVertical: SP.sm },
});
