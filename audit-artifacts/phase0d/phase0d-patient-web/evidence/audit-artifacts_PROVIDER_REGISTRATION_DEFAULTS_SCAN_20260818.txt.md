# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/PROVIDER_REGISTRATION_DEFAULTS_SCAN_20260818.txt`
- **Member SHA-256:** `f5ac42fb81d6db9090295b78fd40d5a40e598d08b6e2fc5ed1c7e41e6a8dec0e`
- **Line count:** 787
- **Read range:** `1-787`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: --- provider-app/src/screens/doctor/DoctorRegistration.tsx`
- `57: 113-  const screens: Record<number, React.ReactElement> = {`
- `58: 114-    8: <SuccessScreen onDone={() => { setShowSuccess(false); onDone(); }} />,`
- `67: 123-  return screens[step] ?? null;`
- `110: 166-      await ProviderApi.login(data.phone, data.password);`
- `114: 170-        await ProviderApi.login(data.phone, data.password);`
- `116: 172-      } catch (loginErr: any) {`
- `126: 182-      <NHeader title={AR ? 'المعلومات الأساسية' : 'Basic Info'} sub={AR ? 'الاسم وبيانات الدخول' : 'Name & Login Info'} step={step} total={total} onBack={onBack} />`
- `128: 184-      <NInput innerRef={nameArRef} label={AR ? 'الاسم الكامل (بالعربية)' : 'Full Name (Arabic)'} value={data.nameAr} onChange={v => update({ nameAr: v })} required error={errs.nameAr} returnKey="next" onSubmit={() => nameEnRef.current?.`
- `129: 185-      <NInput innerRef={nameEnRef} label={AR ? 'الاسم الكامل (بالإنجليزية)' : 'Full Name (English)'} value={data.nameEn} onChange={v => update({ nameEn: v })} required error={errs.nameEn} returnKey="next" onSubmit={() => phoneRef.curren`
- `132: 188-      <NInput innerRef={emailRef} label={AR ? 'البريد الإلكتروني' : 'Email'} value={data.email} onChange={v => update({ email: v })} kbType="email-address" caps="none" error={errs.email} required returnKey="next" onSubmit={() => passwor`
- `136: 192-        <TouchableOpacity onPress={() => update({ gender: 'M' })} style={{ flex: 1, padding: SP.md, borderWidth: 1, borderColor: data.gender === 'M' ? theme.primary : theme.border, backgroundColor: data.gender === 'M' ? theme.primaryLig`
### backend_consumers_or_contracts
- `304: 344-    // Custom validation for Lab/Radiology separation`
- `305: --- provider-app/src/screens/radiology/RadiologyRegistration.tsx`
- `465: 344-    // Custom validation for Radiology/Radiology separation`
- `466: --- provider-app/src/screens/nursing/NursingRegistration.tsx`
### auth_ownership
- `4: 60-  signatureData: string; signerName: string; signerRole: string;`
- `21: 77-  cashOnly:false, acceptedInsurance:[], city:'', location: {lat: 24.7, lng: 46.7}, address:'', clinicName:'', signatureData:'', signerName:'', signerRole:''`
- `110: 166-      await ProviderApi.login(data.phone, data.password);`
- `114: 170-        await ProviderApi.login(data.phone, data.password);`
- `116: 172-      } catch (loginErr: any) {`
- `126: 182-      <NHeader title={AR ? 'المعلومات الأساسية' : 'Basic Info'} sub={AR ? 'الاسم وبيانات الدخول' : 'Name & Login Info'} step={step} total={total} onBack={onBack} />`
- `146: 78-  signatureData: string; signerName: string; signerRole: string;`
- `168: 100-  signatureData: '', signerName: '', signerRole: '',`
- `202: 134-    6: <LStep7AdminWarning data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,`
- `258: 190-      await ProviderApi.login(data.managerPhone, data.password);`
- `262: 194-        await ProviderApi.login(data.managerPhone, data.password);`
- `264: 196-      } catch (loginErr: any) {`
### state_transitions
- `47: 103-  const [step, setStep] = useState(1);`
- `48: 104-  const [data, setData] = useState<DoctorRegData>(INITIAL);`
- `49: 105-  const [showMap, setShowMap] = useState(false);`
- `51: 107-  const [showSuccess, setShowSuccess] = useState(false);`
- `58: 114-    8: <SuccessScreen onDone={() => { setShowSuccess(false); onDone(); }} />,`
- `73: 129:  const [errs, setErrs] = useState<any>({});`
- `95: 151-  const [loading, setLoading] = useState(false);`
- `101: 157-    setLoading(true);`
- `117: 173-        setErrs({ phone: e.message || 'Error' });`
- `120: 176-      setLoading(false);`
- `128: 184-      <NInput innerRef={nameArRef} label={AR ? 'الاسم الكامل (بالعربية)' : 'Full Name (Arabic)'} value={data.nameAr} onChange={v => update({ nameAr: v })} required error={errs.nameAr} returnKey="next" onSubmit={() => nameEnRef.current?.`
- `129: 185-      <NInput innerRef={nameEnRef} label={AR ? 'الاسم الكامل (بالإنجليزية)' : 'Full Name (English)'} value={data.nameEn} onChange={v => update({ nameEn: v })} required error={errs.nameEn} returnKey="next" onSubmit={() => phoneRef.curren`
### payment_insurance_relevance
- `11: 67-  offersClinic:false, clinicPrice:'300', clinicDuration:'15',`
- `12: 68-  offersHome:false, homePrice:'500', homeRadius: 10, homeTransportFee: false, homeTransportPrice: '50',`
- `13: 69-  offersVideo:true, videoPrice:'200', videoDuration:'20',`
- `21: 77-  cashOnly:false, acceptedInsurance:[], city:'', location: {lat: 24.7, lng: 46.7}, address:'', clinicName:'', signatureData:'', signerName:'', signerRole:''`
- `50: 106-    const TOTAL = 7;`
- `54: 110-  const next = () => { if (step < TOTAL) setStep(s => s + 1); else setStep(8); };`
- `59: 115-    1: <Step1Basic data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,`
- `60: 116-    2: <Step2KYC data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,`
- `61: 117-    3: <Step3Profile data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,`
- `62: 118-    4: <Step4PricingAndLocation data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,`
- `63: 119-    5: <Step5Schedule data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,`
- `64: 120-    6: <Step6Insurance data={data} update={update} onNext={next} onBack={back} step={step} total={TOTAL} />,`
### error_empty_loading_retry_cancel
- `95: 151-  const [loading, setLoading] = useState(false);`
- `101: 157-    setLoading(true);`
- `112: 168-    } catch (e: any) {`
- `116: 172-      } catch (loginErr: any) {`
- `117: 173-        setErrs({ phone: e.message || 'Error' });`
- `120: 176-      setLoading(false);`
- `128: 184-      <NInput innerRef={nameArRef} label={AR ? 'الاسم الكامل (بالعربية)' : 'Full Name (Arabic)'} value={data.nameAr} onChange={v => update({ nameAr: v })} required error={errs.nameAr} returnKey="next" onSubmit={() => nameEnRef.current?.`
- `129: 185-      <NInput innerRef={nameEnRef} label={AR ? 'الاسم الكامل (بالإنجليزية)' : 'Full Name (English)'} value={data.nameEn} onChange={v => update({ nameEn: v })} required error={errs.nameEn} returnKey="next" onSubmit={() => phoneRef.curren`
- `131: 187-      <NPhoneInput innerRef={phoneRef} label={AR ? 'رقم الجوال' : 'Phone'} value={data.phone} onChange={v => update({ phone: v })} error={errs.phone} required />`
- `132: 188-      <NInput innerRef={emailRef} label={AR ? 'البريد الإلكتروني' : 'Email'} value={data.email} onChange={v => update({ email: v })} kbType="email-address" caps="none" error={errs.email} required returnKey="next" onSubmit={() => passwor`
- `140: 196-      <NInput innerRef={passwordRef} label={AR ? 'كلمة المرور' : 'Password'} value={data.password} onChange={v => update({ password: v })} secure error={errs.password} required returnKey="next" onSubmit={() => confirmPassRef.current?.fo`
- `142: 198-      <NInput innerRef={confirmPassRef} label={AR ? 'تأكيد كلمة المرور' : 'Confirm Password'} value={data.confirmPass} onChange={v => update({ confirmPass: v })} secure error={errs.confirmPass} required returnKey="done" onSubmit={handle`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
