import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ProviderApi, sanitizeWizardData } from '../../api/provider';
import { useTheme, useLang, useToast } from '../../context';
import {
  NBtn, NCard, NInput, NPhoneInput,
  NHeader, NScroll, NToggle, NDropdown
} from '../../components/ui';
import { I } from '../../components/icons';
import { SP, FS, CITIES , LANGS } from '../../constants';
import { RegistrationSuccess } from '../shared/SharedScreens';

interface AmbRegData {
  managerName: string; managerPhone: string; managerEmail: string;
  password: string; confirmPass: string;
  nameAr: string; nameEn: string; city: string; district: string; address: string;
  languages: string[];
  mohLicense: string; crNumber: string;
  vehiclesCount: string; paramedicCount: string; hasIcu: boolean; is24x7: boolean;
  equipmentText: string; coverageRadius: string;
  acceptsCash: boolean; acceptedInsurance: string[];
  iban: string; accountHolderName: string;
}

const INITIAL: AmbRegData = {
  managerName: '', managerPhone: '', managerEmail: '', password: '', confirmPass: '',
  nameAr: '', nameEn: '', city: '', district: '', address: '', languages: [],
  mohLicense: '', crNumber: '',
  vehiclesCount: '', paramedicCount: '', hasIcu: false, is24x7: true,
  equipmentText: '', coverageRadius: '',
  acceptsCash: true, acceptedInsurance: [],
  iban: '', accountHolderName: '',
};

const TOTAL = 4;

export function AmbulanceRegistration({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<AmbRegData>(INITIAL);
  const [submitted, setSub] = useState(false);
  const update = (patch: Partial<AmbRegData>) => setData(d => ({ ...d, ...patch }));
  const next = () => setStep(s => s + 1);
  const back = () => (step > 1 ? setStep(s => s - 1) : onBack());

  if (submitted) return <RegistrationSuccess onDone={onDone} email={data.managerEmail} providerType="ambulance" />;

  return (
    <View style={{ flex: 1 }}>
      {step === 1 && <AS1Account data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />}
      {step === 2 && <AS2Service data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />}
      {step === 3 && <AS3Fleet data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />}
      {step === 4 && <AS4BankSubmit data={data} update={update} onDone={() => setSub(true)} onBack={back} step={step} total={TOTAL} />}
    </View>
  );
}

/* ─── Step 1: account ─── */
function AS1Account({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar'; const { show } = useToast();
  const [errs, setErrs] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: any = {};
    if (!data.managerName.trim()) e.managerName = AR ? 'الاسم مطلوب' : 'Name required';
    if (!/^\+9665\d{8}$/.test(data.managerPhone.replace(/\s/g, ''))) e.managerPhone = AR ? 'رقم جوال سعودي غير صالح' : 'Invalid Saudi mobile';
    if (!data.password || data.password.length < 8) e.password = AR ? 'كلمة المرور 8 أحرف على الأقل' : 'Min 8 characters';
    if (data.password !== data.confirmPass) e.confirmPass = AR ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match';
    setErrs(e); return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await ProviderApi.start({
        phone: data.managerPhone,
        password: data.password,
        full_name: data.managerName,
        email: data.managerEmail,
        type: 'ambulance',
      });
      await ProviderApi.login(data.managerPhone, data.password);
      onNext();
    } catch (e: any) {
      // Account may already exist from a previous attempt — try continuing via login
      try {
        await ProviderApi.login(data.managerPhone, data.password);
        onNext();
      } catch {
        setErrs({ managerPhone: e?.message || (AR ? 'تعذر بدء التسجيل' : 'Could not start registration') });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <NScroll>
      <NHeader title={AR ? 'بيانات الحساب' : 'Account Info'} sub={AR ? 'خدمة إسعاف — الخطوة الأولى' : 'Ambulance service — step 1'} step={step} total={total} onBack={onBack} />
      <NCard>
        <NInput label={AR ? 'اسم المسؤول' : 'Manager name'} value={data.managerName} onChange={(v: string) => update({ managerName: v })} error={errs.managerName} />
        <NPhoneInput label={AR ? 'رقم الجوال' : 'Mobile number'} value={data.managerPhone} onChange={(v: string) => update({ managerPhone: v })} error={errs.managerPhone} />
        <NInput label={AR ? 'البريد الإلكتروني (اختياري)' : 'Email (optional)'} value={data.managerEmail} onChange={(v: string) => update({ managerEmail: v })} kbType="email-address" />
        <NInput label={AR ? 'كلمة المرور' : 'Password'} value={data.password} onChange={(v: string) => update({ password: v })} secure error={errs.password} />
        <NInput label={AR ? 'تأكيد كلمة المرور' : 'Confirm password'} value={data.confirmPass} onChange={(v: string) => update({ confirmPass: v })} secure error={errs.confirmPass} />
      </NCard>
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

/* ─── Step 2: service info ─── */
function AS2Service({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [errs, setErrs] = useState<any>({});

  const handleNext = () => {
    const e: any = {};
    if (!data.nameAr.trim()) e.nameAr = AR ? 'اسم الخدمة بالعربية مطلوب' : 'Arabic name required';
    if (!data.city) e.city = AR ? 'المدينة مطلوبة' : 'City required';
    if (!data.mohLicense.trim()) e.mohLicense = AR ? 'ترخيص وزارة الصحة مطلوب' : 'MOH license required';
    if (!data.crNumber.trim()) e.crNumber = AR ? 'السجل التجاري مطلوب' : 'CR required';
    setErrs(e);
    if (Object.keys(e).length === 0) onNext();
  };

  return (
    <NScroll>
      <NHeader title={AR ? 'بيانات الخدمة' : 'Service Info'} sub={AR ? 'الاسم والتراخيص النظامية' : 'Name and legal licenses'} step={step} total={total} onBack={onBack} />
      <NCard>
        <NInput label={AR ? 'اسم الخدمة (عربي)' : 'Service name (Arabic)'} value={data.nameAr} onChange={(v: string) => update({ nameAr: v })} error={errs.nameAr} />
        <NInput label={AR ? 'اسم الخدمة (إنجليزي)' : 'Service name (English)'} value={data.nameEn} onChange={(v: string) => update({ nameEn: v })} />
        <NDropdown label={AR ? 'المدينة' : 'City'} value={data.city} onChange={(v: string) => update({ city: v })} options={CITIES.map((c: any) => ({ label: AR ? c.ar : c.en, val: c.ar }))} />
        <NInput label={AR ? 'الحي' : 'District'} value={data.district} onChange={(v: string) => update({ district: v })} />
        <NInput label={AR ? 'العنوان' : 'Address'} value={data.address} onChange={(v: string) => update({ address: v })} />
      </NCard>
      <NCard>
        <NInput label={AR ? 'رقم ترخيص وزارة الصحة' : 'MOH license number'} value={data.mohLicense} onChange={(v: string) => update({ mohLicense: v })} error={errs.mohLicense} />
        <NInput label={AR ? 'رقم السجل التجاري' : 'Commercial registration'} value={data.crNumber} onChange={(v: string) => update({ crNumber: v })} error={errs.crNumber} />
      </NCard>
      <NBtn label={AR ? 'التالي' : 'Next'} onPress={handleNext} />
    </NScroll>
  );
}

/* ─── Step 3: fleet & capabilities ─── */
function AS3Fleet({ data, update, onNext, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const [errs, setErrs] = useState<any>({});

  const handleNext = () => {
    const e: any = {};
    if (!data.vehiclesCount || parseInt(data.vehiclesCount, 10) < 1) e.vehiclesCount = AR ? 'أدخل عدد المركبات (1 على الأقل)' : 'Enter vehicle count (min 1)';
    if (!data.coverageRadius || parseFloat(data.coverageRadius) <= 0) e.coverageRadius = AR ? 'أدخل نطاق التغطية بالكيلومتر' : 'Enter coverage radius (km)';
    setErrs(e);
    if (Object.keys(e).length === 0) onNext();
  };

  return (
    <NScroll>
      <NHeader title={AR ? 'الأسطول والقدرات' : 'Fleet & Capabilities'} sub={AR ? 'المركبات والطاقم والتجهيزات' : 'Vehicles, crew and equipment'} step={step} total={total} onBack={onBack} />
      <NCard>
        <NInput label={AR ? 'عدد سيارات الإسعاف' : 'Number of ambulances'} value={data.vehiclesCount} onChange={(v: string) => update({ vehiclesCount: v.replace(/[^0-9]/g, '') })} kbType="numeric" error={errs.vehiclesCount} />
        <NInput label={AR ? 'عدد المسعفين' : 'Paramedics count'} value={data.paramedicCount} onChange={(v: string) => update({ paramedicCount: v.replace(/[^0-9]/g, '') })} kbType="numeric" />
        <NInput label={AR ? 'نطاق التغطية (كم)' : 'Coverage radius (km)'} value={data.coverageRadius} onChange={(v: string) => update({ coverageRadius: v.replace(/[^0-9.]/g, '') })} kbType="numeric" error={errs.coverageRadius} />
        <NInput label={AR ? 'التجهيزات الطبية (اختياري)' : 'Medical equipment (optional)'} value={data.equipmentText} onChange={(v: string) => update({ equipmentText: v })} multiline />
      </NCard>
      <NCard>
        <NToggle label={AR ? 'وحدات عناية مركزة متنقلة (ICU)' : 'Mobile ICU units'} value={data.hasIcu} onChange={(v: boolean) => update({ hasIcu: v })} />
        <NToggle label={AR ? 'خدمة 24/7' : '24/7 service'} value={data.is24x7} onChange={(v: boolean) => update({ is24x7: v })} />
        <NToggle label={AR ? 'يقبل الدفع نقداً' : 'Accepts cash'} value={data.acceptsCash} onChange={(v: boolean) => update({ acceptsCash: v })} />
      </NCard>
      <NBtn label={AR ? 'التالي' : 'Next'} onPress={handleNext} />
    </NScroll>
  );
}

/* ─── Step 4: bank + submit ─── */
function AS4BankSubmit({ data, update, onDone, onBack, step, total }: any) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar'; const { show } = useToast();
  const [errs, setErrs] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const e: any = {};
    if (!/^SA\d{22}$/.test(data.iban.replace(/\s/g, ''))) e.iban = AR ? 'آيبان سعودي غير صالح (SA + 22 رقم)' : 'Invalid Saudi IBAN';
    if (!data.accountHolderName.trim()) e.accountHolderName = AR ? 'اسم صاحب الحساب مطلوب' : 'Account holder required';
    setErrs(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      await ProviderApi.step2({
        name_ar: data.nameAr,
        name_en: data.nameEn,
        city: data.city,
        district: data.district,
        address: data.address,
        cr_number: data.crNumber,
        moh_license_number: data.mohLicense,
        languages: data.languages,
        coverage_radius_km: parseFloat(data.coverageRadius) || 0,
        accepts_cash: data.acceptsCash,
        iban: data.iban.replace(/\s/g, ''),
        bank_account_name: data.accountHolderName,
      });
      await ProviderApi.step3({
        vehicles_count: parseInt(data.vehiclesCount, 10) || 0,
        paramedic_count: parseInt(data.paramedicCount, 10) || 0,
        has_icu_units: data.hasIcu,
        equipment_list: data.equipmentText ? data.equipmentText.split(/[،,\n]/).map((x: string) => x.trim()).filter(Boolean) : [],
        coverage_radius_km: parseFloat(data.coverageRadius) || 0,
        working_hours: data.is24x7 ? [{ day: 'ALL', open: '00:00', close: '23:59', closed: false }] : [],
        accepts_cash: data.acceptsCash,
      });
      await ProviderApi.submit({ lat: data.location?.lat || 0, lng: data.location?.lng || 0, full_data: sanitizeWizardData(data) });
      show(AR ? 'تم إرسال الطلب بنجاح! سيظهر للمرضى بعد اعتماد الإدارة' : 'Submitted! Visible to patients after admin approval', 'success');
      onDone();
    } catch (err: any) {
      show(err?.message || (AR ? 'حدث خطأ أثناء الإرسال' : 'Submit failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <NScroll>
      <NHeader title={AR ? 'الحساب البنكي والإرسال' : 'Bank & Submit'} sub={AR ? 'لاستلام مستحقاتك من المنصة' : 'To receive your payouts'} step={step} total={total} onBack={onBack} />
      <NCard>
        <NInput label={AR ? 'الآيبان (IBAN)' : 'IBAN'} value={data.iban} onChange={(v: string) => update({ iban: v })} caps="characters" error={errs.iban} />
        <NInput label={AR ? 'اسم صاحب الحساب' : 'Account holder name'} value={data.accountHolderName} onChange={(v: string) => update({ accountHolderName: v })} error={errs.accountHolderName} />
      </NCard>
      <NCard style={{ backgroundColor: theme.infoBg }}>
        <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: SP.md }}>
          <I name="info" size={16} color={theme.info} />
          <Text style={{ flex: 1, fontSize: FS.sm, color: theme.info, lineHeight: 20, textAlign: AR ? 'right' : 'left' }}>
            {AR ? 'بعد الإرسال سيراجع فريق نبض طلبك ووثائقك. لن تظهر خدمتك للمرضى إلا بعد الاعتماد.' : 'After submission, Nabd team reviews your request. Your service appears to patients only after approval.'}
          </Text>
        </View>
      </NCard>
      <NBtn label={AR ? 'إرسال طلب التسجيل' : 'Submit registration'} onPress={submit} loading={loading} />
    </NScroll>
  );
}
