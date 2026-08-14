/**
 * NABDAH PLUS — Design System & All Constants
 * Expo SDK 53 / React Native 0.76
 */
import { Dimensions, Platform, StyleSheet } from 'react-native';

export const { width: SW, height: SH } = Dimensions.get('window');

// ─── Brand Colors ─────────────────────────────────────────────────────────────
export const C = {
 green50: '#F1F8E9', green100: '#DCEDC8', green200: '#C5E1A5',
 green500: '#4CAF50', green600: '#43A047', green700: '#388E3C',
 green800: '#2E7D32', greenNeon:'#69F0AE',
 blue500: '#2196F3', blueLight:'#E3F2FD',
 orange500: '#FF9800', orangeLight:'#FFF3E0',
 red500: '#F44336', redLight: '#FFEBEE',
 yellow500: '#FFC107', yellowLight:'#FFFDE7',
 purple500: '#7C3AED', purpleLight:'#EDE9FE',
 teal500: '#009688', tealLight: '#E0F2F1',
 pink500: '#E91E63', pinkLight: '#FCE4EC',
 white: '#FFFFFF', black: '#0D0D0D',
 g50: '#F8F9FA', g100: '#F1F3F5', g150: '#EAECEF', g200: '#E2E5E9',
 g300: '#CDD2D8', g400: '#A8B0BB', g500: '#7E8898', g600: '#56606E',
 g700: '#3B4452', g800: '#262D38', g900: '#161C24',
 d900: '#0A0A0A', d800: '#111111', d750: '#171717', d700: '#1C1C1C',
 d650: '#222222', d600: '#282828', d500: '#303030', dBdr: '#3A3A3A',
} as const;

// ─── Themes ───────────────────────────────────────────────────────────────────
export const LIGHT = {
 bg: '#F2F5F8', surface: C.white, surface2: '#E8EDF2', surface3: '#DFE5EC',
 card: C.white, inputBg: '#F8F9FA',
 border: '#D0D7DE', borderFocus: '#007AFF', borderErr: C.red500,
 text: '#1A1A1A', textSub: '#5A6370', textHint: '#8A94A3', textInv: C.white, textOff: '#8A94A3',
 primary: '#00BFA5', primaryDark: '#00897B', primaryLight: '#E0F2F1',
 secondary: '#007AFF', secondaryDark: '#005BB5', secondaryLight: '#E5F1FF',
 success: '#34C759', successBg: '#E8F5E9',
 warn: '#FF9500', warnBg: '#FFF3E0',
 danger: '#FF3B30', dangerBg: '#FFEBEE',
 info: '#5AC8FA', infoBg: '#E3F2FD',
 navBg: C.white, navActive: '#00BFA5', navOff: '#8A94A3',
 overlay: 'rgba(0,0,0,0.5)',
 shadow: 'rgba(0,0,0,0.08)', shadowMd: 'rgba(0,0,0,0.12)',
 statusBar: 'dark-content' as const,
} as const;

export const DARK = {
 bg: '#0D1117', surface: '#161B22', surface2: '#21262D', surface3: '#30363D',
 card: '#161B22', inputBg: '#0D1117',
 border: '#30363D', borderFocus: '#58A6FF', borderErr: '#FF7B72',
 text: '#F0F6FC', textSub: '#8B949E', textHint: '#6E7681', textInv: '#0D1117', textOff: '#6E7681',
 primary: '#00BFA5', primaryDark: '#00897B', primaryLight: 'rgba(0, 191, 165, 0.15)',
 secondary: '#58A6FF', secondaryDark: '#1F6FEB', secondaryLight: 'rgba(88, 166, 255, 0.15)',
 success: '#3FB950', successBg: 'rgba(63, 185, 80, 0.15)',
 warn: '#D29922', warnBg: 'rgba(210, 153, 34, 0.15)',
 danger: '#F85149', dangerBg: 'rgba(248, 81, 73, 0.15)',
 info: '#58A6FF', infoBg: 'rgba(88, 166, 255, 0.15)',
 navBg: '#161B22', navActive: '#00BFA5', navOff: '#8B949E',
 overlay: 'rgba(0,0,0,0.75)',
 shadow: 'rgba(0,0,0,0.4)', shadowMd: 'rgba(0,0,0,0.6)',
 statusBar: 'light-content' as const,
} as const;

export type Theme = {
 bg: string; surface: string; surface2: string; surface3: string;
 card: string; inputBg: string;
 border: string; borderFocus: string; borderErr: string;
 text: string; textSub: string; textHint: string; textInv: string; textOff: string;
 primary: string; primaryDark: string; primaryLight: string;
 secondary: string; secondaryDark: string; secondaryLight: string;
 success: string; successBg: string;
 warn: string; warnBg: string;
 danger: string; dangerBg: string;
 info: string; infoBg: string;
 navBg: string; navActive: string; navOff: string;
 overlay: string;
 shadow: string; shadowMd: string;
 statusBar: 'dark-content' | 'light-content';
};
export type ThemeMode = 'light' | 'dark';
export const getTheme = (m: ThemeMode): Theme => m === 'dark' ? (DARK as any) : (LIGHT as any);

// ─── Spacing / Radius / Font ──────────────────────────────────────────────────
export const SP = { xs:4, sm:8, md:12, lg:16, xl:20, xxl:24, xxxl:32, huge:48 } as const;
export const R = { xs:4, sm:8, md:12, lg:16, xl:20, xxl:24, xxxl:32, full:9999 } as const;
export const FS = { xs:11, sm:13, md:15, base:16, lg:18, xl:20, '2xl':24, '3xl':28, '4xl':32, '5xl':40 } as const;
export const FW = { reg:'400' as const, med:'500' as const, semi:'600' as const, bold:'700' as const, xbold:'800' as const };

export const SH_SM = Platform.select({ ios:{shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:4}, android:{elevation:2} });
export const SH_MD = Platform.select({ ios:{shadowColor:'#000',shadowOffset:{width:0,height:4},shadowOpacity:0.10,shadowRadius:8}, android:{elevation:4} });
export const SH_LG = Platform.select({ ios:{shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.15,shadowRadius:16}, android:{elevation:8} });

// ─── Provider Types ───────────────────────────────────────────────────────────
export const PROVIDER_TYPES = [
 { key:'doctor', icon:'', color:'#4CAF50', light:'#E8F5E9', arName:'طبيب مستقل', enName:'Independent Doctor', arDesc:'استشارات أونلاين، عيادة، زيارات منزلية', enDesc:'Online consults, clinic, home visits' },
 { key:'facility', icon:'', color:'#2196F3', light:'#E3F2FD', arName:'منشأة طبية', enName:'Medical Facility', arDesc:'مستشفى، مستوصف، مركز طبي', enDesc:'Hospital, clinic, medical center' },
 { key:'pharmacy', icon:'', color:'#FF9800', light:'#FFF3E0', arName:'صيدلية', enName:'Pharmacy', arDesc:'صرف أدوية، توصيل، وصفات طبية', enDesc:'Medications, delivery, prescriptions' },
 { key:'lab', icon:'', color:'#9C27B0', light:'#F3E5F5', arName:'معمل تحاليل', enName:'Laboratory', arDesc:'تحاليل طبية، نتائج، سحب عينات', enDesc:'Lab tests, results, home collection' },
 { key:'radiology', icon:'', color:'#009688', light:'#E0F2F1', arName:'مركز أشعة', enName:'Radiology Center', arDesc:'أشعة سينية، رنين، مقطعية', enDesc:'X-Ray, MRI, CT Scan, Ultrasound' },
 { key:'nursing', icon:'', color:'#E91E63', light:'#FCE4EC', arName:'تمريض منزلي', enName:'Home Nursing', arDesc:'رعاية منزلية، تمريض، إجراءات طبية', enDesc:'Home care, nursing, procedures' },
] as const;
export type ProviderKey = typeof PROVIDER_TYPES[number]['key'];

// ─── Insurance Companies ──────────────────────────────────────────────────────
export const INSURANCE = [
 { id:'bupa', ar:'بوبا', en:'Bupa Arabia', plans:['VIP+','VIP','A','B','C'] },
 { id:'tawuniya', ar:'التعاونية', en:'Tawuniya', plans:['VIP+','VIP','A','B','C'] },
 { id:'medgulf', ar:'ميدغلف', en:'MedGulf', plans:['VIP','A','B','C'] },
 { id:'malath', ar:'ملاذ', en:'Malath', plans:['A','B','C'] },
 { id:'axa', ar:'أكسا / GIG', en:'AXA / GIG', plans:['VIP+','VIP','A'] },
 { id:'allianz', ar:'أليانز', en:'Allianz SF', plans:['VIP','A','B'] },
 { id:'saico', ar:'سايكو', en:'SAICO', plans:['A','B','C'] },
 { id:'walaa', ar:'ولاء', en:'Walaa', plans:['A','B','C'] },
 { id:'gulf', ar:'اتحاد الخليج', en:'Gulf Union', plans:['A','B'] },
 { id:'rajhi', ar:'الراجحي التكافل', en:'Al-Rajhi Takaful', plans:['A','B','C'] },
 { id:'wataniya', ar:'الوطنية', en:'Wataniya', plans:['A','B','C'] },
 { id:'sagr', ar:'الصقر', en:'Al-Sagr', plans:['B','C'] },
 { id:'arabia', ar:'العربية للتأمين', en:'Arabia Insurance', plans:['A','B','C'] },
 { id:'buruj', ar:'بروج', en:'Buruj', plans:['B','C'] },
] as const;

// ─── Medical Specialties ──────────────────────────────────────────────────────
export const SPECIALTIES = [
 { id:'gp', ar:'الطب العام', en:'General Practice', icon:'' },
 { id:'internal', ar:'الطب الباطني', en:'Internal Medicine', icon:'' },
 { id:'cardio', ar:'أمراض القلب', en:'Cardiology', icon:'️' },
 { id:'peds', ar:'طب الأطفال', en:'Pediatrics', icon:'' },
 { id:'obgyn', ar:'النساء والولادة', en:'Obstetrics & Gynecology',icon:'' },
 { id:'ortho', ar:'العظام والمفاصل', en:'Orthopedics', icon:'' },
 { id:'derm', ar:'الجلدية', en:'Dermatology', icon:'' },
 { id:'opthal', ar:'العيون', en:'Ophthalmology', icon:'️' },
 { id:'ent', ar:'الأنف والأذن والحنجرة', en:'ENT', icon:'' },
 { id:'neuro', ar:'الجهاز العصبي', en:'Neurology', icon:'' },
 { id:'psych', ar:'الطب النفسي', en:'Psychiatry', icon:'' },
 { id:'dent', ar:'طب الأسنان', en:'Dentistry', icon:'' },
 { id:'urol', ar:'المسالك البولية', en:'Urology', icon:'🫀' },
 { id:'gastro', ar:'الجهاز الهضمي', en:'Gastroenterology', icon:'🫃' },
 { id:'endo', ar:'الغدد والسكري', en:'Endocrinology', icon:'🩸' },
 { id:'onco', ar:'الأورام', en:'Oncology', icon:'' },
 { id:'nephro', ar:'الكلى', en:'Nephrology', icon:'🫘' },
 { id:'pulmo', ar:'الرئة والجهاز التنفسي', en:'Pulmonology', icon:'🫁' },
 { id:'rheum', ar:'الروماتيزم', en:'Rheumatology', icon:'' },
 { id:'surg', ar:'الجراحة العامة', en:'General Surgery', icon:'' },
 { id:'plastic', ar:'الجراحة التجميلية', en:'Plastic Surgery', icon:'' },
 { id:'em', ar:'طب الطوارئ', en:'Emergency Medicine', icon:'' },
 { id:'nutr', ar:'التغذية', en:'Nutrition', icon:'' },
 { id:'physio', ar:'العلاج الطبيعي', en:'Physiotherapy', icon:'' },
 { id:'rad_spec', ar:'الأشعة والتصوير', en:'Diagnostic Radiology', icon:'' },
] as const;

// ─── Academic Degrees ─────────────────────────────────────────────────────────
export const DEGREES = [
 { id:'general_practitioner', ar:'طبيب ممارس عام', en:'General Practitioner', lvl:1 },
 { id:'specialist', ar:'أخصائي', en:'Specialist', lvl:2 },
 { id:'senior_specialist', ar:'أخصائي أول', en:'Senior Specialist', lvl:3 },
 { id:'consultant', ar:'استشاري', en:'Consultant', lvl:4 },
 { id:'professor', ar:'أستاذ دكتور', en:'Professor', lvl:5 },
] as const;

// ─── Lab Tests ────────────────────────────────────────────────────────────────
export const LAB_TESTS = [
 { id:'cbc', ar:'صورة الدم الكاملة CBC', en:'Complete Blood Count', fasting:false, hours:0.5 },
 { id:'vitd', ar:'فيتامين د', en:'Vitamin D', fasting:false, hours:2 },
 { id:'hba1c', ar:'السكر التراكمي HbA1c', en:'Glycated Hemoglobin HbA1c', fasting:false, hours:1 },
 { id:'lipid', ar:'دهون الدم الكاملة', en:'Full Lipid Profile', fasting:true, hours:2, fastH:12 },
 { id:'liver', ar:'وظائف الكبد', en:'Liver Function Tests', fasting:false, hours:2 },
 { id:'kidney', ar:'وظائف الكلى', en:'Kidney Function Tests', fasting:false, hours:2 },
 { id:'tsh', ar:'الغدة الدرقية TSH / T3 / T4', en:'Thyroid Panel TSH/T3/T4', fasting:false, hours:2 },
 { id:'urine', ar:'تحليل البول الشامل', en:'Complete Urinalysis', fasting:false, hours:1 },
 { id:'crp', ar:'بروتين سي التفاعلي CRP', en:'C-Reactive Protein CRP', fasting:false, hours:1 },
 { id:'ferritin', ar:'الفيريتين / مخازن الحديد', en:'Ferritin & Iron Studies', fasting:false, hours:2 },
 { id:'b12', ar:'فيتامين ب12', en:'Vitamin B12', fasting:false, hours:2 },
 { id:'glucose', ar:'سكر الدم الصيامي', en:'Fasting Blood Glucose', fasting:true, hours:1, fastH:8 },
 { id:'testosterone',ar:'هرمون التستوستيرون', en:'Testosterone', fasting:false, hours:3 },
 { id:'prolactin', ar:'البرولاكتين', en:'Prolactin', fasting:false, hours:2 },
 { id:'cortisol', ar:'الكورتيزول', en:'Cortisol', fasting:false, hours:2 },
 { id:'covid', ar:'كوفيد-19 PCR', en:'COVID-19 PCR', fasting:false, hours:24 },
 { id:'culture', ar:'مزرعة بكتيريا وحساسية', en:'Culture & Sensitivity', fasting:false, hours:48 },
 { id:'psa', ar:'بروستات PSA', en:'PSA Prostate Antigen', fasting:false, hours:2 },
 { id:'folate', ar:'حمض الفوليك', en:'Folic Acid', fasting:false, hours:2 },
 { id:'iron', ar:'الحديد والترانسفيرين', en:'Iron & TIBC', fasting:false, hours:2 },
] as const;

// ─── Radiology Scans ──────────────────────────────────────────────────────────
export const RAD_SCANS = [
 { id:'xray', ar:'أشعة سينية X-Ray', en:'X-Ray', prep:false, hours:0.5 },
 { id:'us', ar:'موجات فوق صوتية Ultrasound', en:'Ultrasound', prep:true, hours:1, noteAr:'اشرب الماء ولا تتبول قبل الفحص' },
 { id:'mri', ar:'رنين مغناطيسي MRI', en:'MRI Scan', prep:true, hours:24, noteAr:'أزل جميع المعادن، صيام 4 ساعات' },
 { id:'ct', ar:'أشعة مقطعية CT Scan', en:'CT Scan', prep:true, hours:4, noteAr:'صيام 4 ساعات، تنبيه حساسية الصبغة' },
 { id:'echo', ar:'إيكو قلب Echocardiography', en:'Echocardiography', prep:false, hours:1 },
 { id:'ecg', ar:'تخطيط قلب ECG / EKG', en:'ECG / EKG', prep:false, hours:0.25},
 { id:'dexa', ar:'كثافة العظام DEXA', en:'DEXA Bone Density', prep:false, hours:1 },
 { id:'mammo', ar:'ماموجرام Mammogram', en:'Mammogram', prep:true, hours:2, noteAr:'لا تستخدمي مزيل التعرق' },
 { id:'doppler', ar:'دوبلر الأوعية Doppler', en:'Doppler Ultrasound', prep:false, hours:1 },
 { id:'pet', ar:'PET Scan', en:'PET Scan', prep:true, hours:4, noteAr:'صيام 6 ساعات' },
 { id:'fluoro', ar:'تنظير فلوري Fluoroscopy', en:'Fluoroscopy', prep:true, hours:2 },
 { id:'angio', ar:'تصوير أوعية Angiography', en:'Angiography', prep:true, hours:4 },
] as const;

// ─── Nursing Services ─────────────────────────────────────────────────────────
export const NURSING_SVCS = [
 { id:'wound', ar:'تغيير الجروح والتضميد', en:'Wound Dressing', min:30 },
 { id:'iv', ar:'تركيب مغذي ومحاليل IV', en:'IV Therapy & Infusion', min:90 },
 { id:'blood', ar:'سحب عينات دم', en:'Blood Sample Collection', min:20 },
 { id:'vitals', ar:'قياس العلامات الحيوية', en:'Vital Signs Monitoring', min:20 },
 { id:'inject', ar:'إعطاء حقن طبية', en:'Injection Administration',min:15 },
 { id:'cath', ar:'تركيب قسطرة بولية', en:'Catheterization', min:30 },
 { id:'elderly', ar:'رعاية كبار السن', en:'Elderly Care', min:480 },
 { id:'postpart', ar:'رعاية ما بعد الولادة', en:'Postpartum Care', min:240 },
 { id:'diabetes', ar:'رعاية مرضى السكري', en:'Diabetes Management', min:45 },
 { id:'ostomy', ar:'عناية بالفغرة Ostomy', en:'Ostomy Care', min:45 },
 { id:'ng', ar:'أنبوب أنف معدي NG Tube', en:'NG Tube Management', min:30 },
 { id:'suction', ar:'شفط إفرازات تنفسية', en:'Airway Suctioning', min:30 },
 { id:'oxygen', ar:'إعطاء أكسجين', en:'Oxygen Therapy', min:60 },
 { id:'stroke', ar:'رعاية ما بعد الجلطة', en:'Post-Stroke Care', min:360 },
 { id:'custom', ar:'خدمة مخصصة أخرى', en:'Custom Service', min:0 },
] as const;

// ─── Pharmacy Categories ──────────────────────────────────────────────────────
export const PHARMA_CATS = [
 { id:'rx', ar:'أدوية بوصفة Rx', en:'Prescription Medications', icon:'' },
 { id:'otc', ar:'أدوية بدون وصفة OTC', en:'OTC Medications', icon:'' },
 { id:'vitamins', ar:'فيتامينات ومكملات', en:'Vitamins & Supplements', icon:'' },
 { id:'skin', ar:'العناية بالبشرة', en:'Skincare', icon:'' },
 { id:'hair', ar:'العناية بالشعر', en:'Haircare', icon:'' },
 { id:'baby', ar:'رعاية الأطفال والأم', en:'Baby & Mother Care', icon:'' },
 { id:'devices', ar:'أجهزة ومستلزمات طبية', en:'Medical Devices', icon:'' },
 { id:'dental', ar:'العناية بالأسنان', en:'Dental Care', icon:'' },
 { id:'eye', ar:'العناية بالعيون', en:'Eye Care', icon:'️' },
 { id:'ortho', ar:'دعامات ومستلزمات عظام', en:'Orthopedic Supplies', icon:'' },
 { id:'daily', ar:'مستلزمات يومية وصحية', en:'Daily Health Essentials', icon:'' },
 { id:'makeup', ar:'مكياج وتجميل', en:'Makeup & Beauty', icon:'' },
] as const;

// ─── Saudi Cities ─────────────────────────────────────────────────────────────
export const CITIES = [
  { id: 'riyadh', ar: 'الرياض', en: 'Riyadh' },
  { id: 'jeddah', ar: 'جدة', en: 'Jeddah' },
  { id: 'mecca', ar: 'مكة المكرمة', en: 'Mecca' },
  { id: 'medina', ar: 'المدينة المنورة', en: 'Medina' },
  { id: 'dammam', ar: 'الدمام', en: 'Dammam' },
  { id: 'khobar', ar: 'الخبر', en: 'Al Khobar' },
  { id: 'dhahran', ar: 'الظهران', en: 'Dhahran' },
  { id: 'jubail', ar: 'الجبيل', en: 'Jubail' },
  { id: 'buraidah', ar: 'بريدة', en: 'Buraidah' },
  { id: 'unaizah', ar: 'عنيزة', en: 'Unaizah' },
  { id: 'rass', ar: 'الرس', en: 'Ar Rass' },
  { id: 'hail', ar: 'حائل', en: 'Hail' },
  { id: 'tabuk', ar: 'تبوك', en: 'Tabuk' },
  { id: 'taif', ar: 'الطائف', en: 'Taif' },
  { id: 'abha', ar: 'أبها', en: 'Abha' },
  { id: 'khamis_mushait', ar: 'خميس مشيط', en: 'Khamis Mushait' },
  { id: 'jizan', ar: 'جازان', en: 'Jizan' },
  { id: 'najran', ar: 'نجران', en: 'Najran' },
  { id: 'al_ahsa', ar: 'الأحساء', en: 'Al Ahsa' },
  { id: 'qatif', ar: 'القطيف', en: 'Qatif' },
  { id: 'hofuf', ar: 'الهفوف', en: 'Hofuf' },
  { id: 'mubarraz', ar: 'المبرز', en: 'Al Mubarraz' },
  { id: 'hafar_al_batin', ar: 'حفر الباطن', en: 'Hafar Al Batin' },
  { id: 'yanbu', ar: 'ينبع', en: 'Yanbu' },
  { id: 'al_kharj', ar: 'الخرج', en: 'Al Kharj' },
  { id: 'arar', ar: 'عرعر', en: 'Arar' },
  { id: 'sakaka', ar: 'سكاكا', en: 'Sakaka' },
  { id: 'qurayyat', ar: 'القريات', en: 'Qurayyat' },
  { id: 'baha', ar: 'الباحة', en: 'Al Baha' },
  { id: 'bisha', ar: 'بيشة', en: 'Bisha' },
  { id: 'al_qnfudah', ar: 'القنفذة', en: 'Al Qunfudhah' },
  { id: 'rabigh', ar: 'رابغ', en: 'Rabigh' },
  { id: 'al_majmmah', ar: 'المجمعة', en: 'Al Majmaah' },
  { id: 'zulfi', ar: 'الزلفي', en: 'Zulfi' },
  { id: 'dawadmi', ar: 'الدوادمي', en: 'Dawadmi' },
  { id: 'wadi_ad_dawasir', ar: 'وادي الدواسر', en: 'Wadi Ad Dawasir' },
  { id: 'tariq', ar: 'طريف', en: 'Turaif' },
  { id: 'khafji', ar: 'الخفجي', en: 'Khafji' },
  { id: 'turaif', ar: 'طريف', en: 'Turaif' },
  { id: 'tabarjal', ar: 'طبرجل', en: 'Tabarjal' },
  { id: 'al_ula', ar: 'العلا', en: 'Al Ula' },
  { id: 'mlja', ar: 'مليجة', en: 'Mulayjah' },
  { id: 'afif', ar: 'عفيف', en: 'Afif' },
  { id: 'sabya', ar: 'صبيا', en: 'Sabya' },
  { id: 'abu_arish', ar: 'أبو عريش', en: 'Abu Arish' },
  { id: 'samtha', ar: 'صامطة', en: 'Samtah' },
] as const;

// ─── App Limits ────────────────────────────────────────────────────────────────
export const LIMITS = {
 MAX_PHOTOS: 10, MAX_PHOTO_MB: 10, MAX_FILE_MB: 50,
 MAX_CERTS: 20, MAX_SERVICES: 30,
 OTP_RESEND_SEC: 60, OTP_MAX_TRIES: 5,
 SESSION_MIN: 30, LOGIN_MAX_TRIES: 5, LOGIN_LOCK_MIN: 15,
 MIN_WITHDRAW_SAR: 100,
 MIN_PRICE: 10, MAX_PRICE: 99999,
 MIN_PASS: 8, MIN_RADIUS_KM: 1, MAX_RADIUS_KM: 50,
 BROADCAST_R1_KM: 4, BROADCAST_R2_KM: 6, BROADCAST_R3_KM: 8,
 BROADCAST_WAIT_MIN: 3,
} as const;

// ─── API Config ────────────────────────────────────────────────────────────────
export const API = {
 BASE: __DEV__ ? 'https://api-dev.nabdahplus.sa/v1' : 'https://api.nabdahplus.sa/v1',
 WS: __DEV__ ? 'wss://ws-dev.nabdahplus.sa' : 'wss://ws.nabdahplus.sa',
 TIMEOUT: 30000,
} as const;

// ─── Translations ──────────────────────────────────────────────────────────────
export type Lang = 'ar' | 'en';

export const TR = {
 ar: {
 // App
 appName:'نبض بلس', appSub:'مزودو الخدمة الطبية',
 // Auth
 welcome:'مرحباً بك في نبض بلس',
 chooseType:'اختر نوع حسابك للبدء',
 haveAccount:'لديك حساب؟ سجّل الدخول',
 login:'تسجيل الدخول', register:'إنشاء حساب', logout:'تسجيل الخروج',
 forgotPass:'نسيت كلمة المرور؟', resetPass:'استعادة كلمة المرور',
 rememberMe:'تذكرني', biometric:'الدخول بالبصمة أو Face ID',
 // Fields
 name:'الاسم الكامل الخماسي', displayName:'الاسم المهني (للمرضى)',
 email:'البريد الإلكتروني', phone:'رقم الجوال',
 pass:'كلمة المرور', confirmPass:'تأكيد كلمة المرور',
 identifier:'البريد / الجوال / رقم الحساب',
 iban:'رقم الآيبان IBAN', crNum:'رقم السجل التجاري',
 scfhs:'رقم ترخيص الهيئة SCFHS', moh:'رقم ترخيص وزارة الصحة',
 // OTP
 otpTitle:'التحقق من الهوية', otpSentTo:'تم إرسال رمز التحقق إلى',
 otpResend:'إعادة الإرسال', otpVerify:'تحقق',
 // Validation
 required:'هذا الحقل مطلوب', invalidEmail:'بريد إلكتروني غير صحيح',
 invalidPhone:'رقم الجوال غير صحيح', invalidIban:'رقم الآيبان غير صحيح',
 invalidCr:'رقم السجل التجاري غير صحيح', passWeak:'كلمة المرور ضعيفة جداً',
 passMismatch:'كلمتا المرور غير متطابقتين', passMin:'كلمة المرور 8 أحرف على الأقل',
 // Actions
 next:'التالي', back:'رجوع', save:'حفظ', cancel:'إلغاء', confirm:'تأكيد',
 delete:'حذف', edit:'تعديل', add:'إضافة', send:'إرسال', submit:'إرسال للمراجعة',
 close:'إغلاق', done:'تم', skip:'تخطي', retry:'إعادة المحاولة', search:'بحث...',
 // Status
 loading:'جاري التحميل...', success:'تم بنجاح!', error:'حدث خطأ', noData:'لا توجد بيانات',
 // Nav
 dashboard:'الرئيسية', appointments:'المواعيد', chat:'الرسائل', wallet:'المحفظة', settings:'الإعدادات',
 // Status labels
 online:'متاح الآن', offline:'غير متاح', busy:'مشغول',
 pending:'قيد المراجعة', active:'نشط', suspended:'موقوف', rejected:'مرفوض',
 // Financial
 sar:'ريال', balance:'الرصيد', earnings:'الأرباح', commission:'عمولة المنصة',
 // Provider names
 doctor:'طبيب مستقل', facility:'منشأة طبية', pharmacy:'صيدلية',
 lab:'معمل تحاليل', radiology:'مركز أشعة', nursing:'تمريض منزلي',
 // Settings
 profile:'الملف الشخصي', notifications:'الإشعارات', security:'الأمان',
 language:'اللغة', darkMode:'الوضع الداكن', support:'الدعم الفني',
 // Confirm dialogs
 confirmLogout:'هل تريد تسجيل الخروج؟',
 confirmDelete:'سيتم حذف حسابك نهائياً. لا يمكن التراجع.',
 deleteAccount:'حذف الحساب',
 // Errors
 networkErr:'خطأ في الاتصال. تحقق من الإنترنت.',
 serverErr:'خطأ في الخادم. حاول لاحقاً.',
 rateLimitErr:'محاولات كثيرة جداً. انتظر قليلاً.',
 sessionExp:'انتهت جلستك. سجّل الدخول مجدداً.',
 // Pending
 pendingTitle:'ملفك قيد المراجعة',
 pendingBody:'تم استلام ملفك وسيتم مراجعته خلال 24 ساعة',
 // Accept/Reject
 accept:'قبول', reject:'رفض', partialAccept:'قبول جزئي',
 optional:'اختياري', minutes:'دقيقة', hours:'ساعة', days:'أيام', km:'كم',
 },
 en: {
 appName:'Nabd Plus', appSub:'Healthcare Provider App',
 welcome:'Welcome to Nabd Plus', chooseType:'Choose your account type to get started',
 haveAccount:"Already have an account? Log In",
 login:'Log In', register:'Create Account', logout:'Log Out',
 forgotPass:'Forgot Password?', resetPass:'Reset Password',
 rememberMe:'Remember Me', biometric:'Login with Face ID / Fingerprint',
 name:'Full Legal Name', displayName:'Professional Display Name',
 email:'Email Address', phone:'Mobile Number',
 pass:'Password', confirmPass:'Confirm Password',
 identifier:'Email / Mobile / Account ID',
 iban:'Bank IBAN Number', crNum:'Commercial Registration (CR)',
 scfhs:'SCFHS License Number', moh:'Ministry of Health License',
 otpTitle:'Verify Identity', otpSentTo:'Verification code sent to',
 otpResend:'Resend Code', otpVerify:'Verify',
 required:'This field is required', invalidEmail:'Invalid email address',
 invalidPhone:'Invalid mobile number', invalidIban:'Invalid IBAN',
 invalidCr:'Invalid CR number', passWeak:'Password is too weak',
 passMismatch:'Passwords do not match', passMin:'Password must be 8+ characters',
 next:'Next', back:'Back', save:'Save', cancel:'Cancel', confirm:'Confirm',
 delete:'Delete', edit:'Edit', add:'Add', send:'Send', submit:'Submit for Review',
 close:'Close', done:'Done', skip:'Skip', retry:'Retry', search:'Search...',
 loading:'Loading...', success:'Success!', error:'Error occurred', noData:'No data found',
 dashboard:'Home', appointments:'Schedule', chat:'Messages', wallet:'Wallet', settings:'Settings',
 online:'Online', offline:'Offline', busy:'Busy',
 pending:'Under Review', active:'Active', suspended:'Suspended', rejected:'Rejected',
 sar:'SAR', balance:'Balance', earnings:'Earnings', commission:'Platform Commission',
 doctor:'Independent Doctor', facility:'Medical Facility', pharmacy:'Pharmacy',
 lab:'Laboratory', radiology:'Radiology Center', nursing:'Home Nursing',
 profile:'Profile', notifications:'Notifications', security:'Security',
 language:'Language', darkMode:'Dark Mode', support:'Support',
 confirmLogout:'Are you sure you want to log out?',
 confirmDelete:'Your account will be permanently deleted. This cannot be undone.',
 deleteAccount:'Delete Account',
 networkErr:'Connection error. Check your internet.',
 serverErr:'Server error. Please try again later.',
 rateLimitErr:'Too many attempts. Please wait.',
 sessionExp:'Session expired. Please log in again.',
 pendingTitle:'Your File is Under Review',
 pendingBody:'Your file was received and will be reviewed within 24 hours.',
 accept:'Accept', reject:'Reject', partialAccept:'Partial Accept',
 optional:'Optional', minutes:'min', hours:'hr', days:'days', km:'km',
 },
} as const;
export type TKey = keyof typeof TR.ar;
import Constants from 'expo-constants';
const debuggerHost = Constants.expoConfig?.hostUri;
let localIp = debuggerHost?.split(':')[0];
if (!localIp || localIp === 'localhost') {
  localIp = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
} else if (localIp === '127.0.0.1' && Platform.OS === 'android') {
  localIp = '10.0.2.2';
}
export const API_BASE = `http://${localIp}:8002/api/v1`;
