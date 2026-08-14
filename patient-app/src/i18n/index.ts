import { LangCode } from '../context/AppContext';
import { generatedStaticTranslations } from './generatedStaticTranslations';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const generatedTemplateEntries = Object.entries(generatedStaticTranslations)
  .filter(([source]) => source.includes('${') && !/[<>]|\b(?:const|return|function)\b/.test(source))
  .map(([source, translations]) => {
    const fragments = source.split(/\$\{[^}]+\}/g);
    const pattern = `^${fragments.map(escapeRegExp).join('(.*?)')}$`;
    return { regex: new RegExp(pattern), translations };
  });

function translateGeneratedTemplate(text: string, lang: LangCode): string | null {
  if (lang === 'ar') return null;
  for (const entry of generatedTemplateEntries) {
    const match = text.match(entry.regex);
    const translated = entry.translations[lang];
    if (!match || !translated) continue;
    let captureIndex = 1;
    return translated.replace(/\$\{[^}]+\}/g, () => match[captureIndex++] ?? '');
  }
  return null;
}

type TranslationKeys = {
  home: string; consultations: string; pharmacy: string; diagnostics: string; health: string;
  settings: string; profile: string; search: string; save: string; cancel: string; back: string;
  loading: string; error: string; success: string; retry: string; logout: string;
  login: string; register: string; forgotPassword: string; otp: string; guestMode: string;
  phone: string; password: string; createAccount: string; welcomeBack: string;
  myHealth: string; vitals: string; medications: string; reports: string; reminders: string;
  family: string; conditions: string; allergies: string;
  cart: string; addToCart: string; prescription: string; reorder: string; orderHistory: string;
  doctor: string; appointment: string; booking: string; price: string; rating: string;
  available: string; online: string; clinic: string; homeVisit: string;
  nutrition: string; calories: string; exercise: string; dailyTracker: string; mealPlan: string;
  mentalHealth: string; breathing: string; meditation: string; moodJournal: string;
  nursing: string; delivery: string; emergency: string; wallet: string; insurance: string; map: string; community: string;
  notifications: string; support: string; terms: string; about: string; privacy: string; security: string; data: string;
  checkout: string; track: string; confirm: string; reject: string; accept: string; decline: string;
  chatWithDoctor: string; chatWithPharmacist: string; videoCall: string; audioCall: string;
  myCards: string; addCard: string; myOrders: string; orderTracking: string;
  darkMode: string; lightMode: string; systemMode: string; language: string; fontSize: string;
  secondOpinion: string; referral: string; drugScanner: string; skinAnalysis: string; symptomChecker: string;
};

const translations: Record<LangCode, TranslationKeys> = {
  ar: {
    home: 'الرئيسية', consultations: 'استشارات', pharmacy: 'صيدلية', diagnostics: 'تحاليل', health: 'صحتي',
    settings: 'الإعدادات', profile: 'حسابي', search: 'بحث', save: 'حفظ', cancel: 'إلغاء', back: 'رجوع',
    loading: 'جاري التحميل...', error: 'خطأ', success: 'تم بنجاح', retry: 'إعادة المحاولة', logout: 'تسجيل الخروج',
    login: 'تسجيل الدخول', register: 'إنشاء حساب', forgotPassword: 'نسيت كلمة المرور', otp: 'رمز التحقق', guestMode: 'تصفّح كزائر',
    phone: 'رقم الهاتف', password: 'كلمة المرور', createAccount: 'حساب جديد', welcomeBack: 'مرحباً بعودتك',
    myHealth: 'صحتي', vitals: 'المؤشرات الحيوية', medications: 'أدويتي', reports: 'تقاريري', reminders: 'تذكيرات',
    family: 'العائلة', conditions: 'الأمراض', allergies: 'الحساسية',
    cart: 'السلة', addToCart: 'أضف للسلة', prescription: 'وصفة طبية', reorder: 'إعادة الطلب', orderHistory: 'طلباتي',
    doctor: 'طبيب', appointment: 'موعد', booking: 'حجز', price: 'السعر', rating: 'التقييم',
    available: 'متاح', online: 'أونلاين', clinic: 'عيادة', homeVisit: 'زيارة منزلية',
    nutrition: 'التغذية', calories: 'السعرات', exercise: 'التمارين', dailyTracker: 'التتبع اليومي', mealPlan: 'خطة الوجبات',
    mentalHealth: 'الصحة النفسية', breathing: 'تمارين التنفس', meditation: 'تأمل', moodJournal: 'سجل المزاج',
    nursing: 'تمريض منزلي', delivery: 'توصيل', emergency: 'طوارئ', wallet: 'المحفظة', insurance: 'التأمين', map: 'الخريطة', community: 'المجتمع',
    notifications: 'الإشعارات', support: 'الدعم الفني', terms: 'الشروط والأحكام', about: 'عن التطبيق', privacy: 'الخصوصية', security: 'الأمان', data: 'بياناتي',
    checkout: 'إتمام الشراء', track: 'تتبع', confirm: 'تأكيد', reject: 'رفض', accept: 'قبول', decline: 'رفض',
    chatWithDoctor: 'محادثة مع الطبيب', chatWithPharmacist: 'محادثة مع الصيدلي', videoCall: 'مكالمة فيديو', audioCall: 'مكالمة صوتية',
    myCards: 'بطاقاتي', addCard: 'إضافة بطاقة', myOrders: 'طلباتي', orderTracking: 'تتبع الطلب',
    darkMode: 'الوضع الداكن', lightMode: 'الوضع الفاتح', systemMode: 'وضع النظام', language: 'اللغة', fontSize: 'حجم الخط',
    secondOpinion: 'رأي طبي ثاني', referral: 'إحالة طبية', drugScanner: 'ماسح الأدوية', skinAnalysis: 'تحليل البشرة', symptomChecker: 'فحص الأعراض',
  },
  en: {
    home: 'Home', consultations: 'Consult', pharmacy: 'Pharmacy', diagnostics: 'Labs', health: 'My Health',
    settings: 'Settings', profile: 'Profile', search: 'Search', save: 'Save', cancel: 'Cancel', back: 'Back',
    loading: 'Loading...', error: 'Error', success: 'Success', retry: 'Retry', logout: 'Logout',
    login: 'Login', register: 'Register', forgotPassword: 'Forgot Password', otp: 'Verification', guestMode: 'Browse as Guest',
    phone: 'Phone Number', password: 'Password', createAccount: 'New Account', welcomeBack: 'Welcome Back',
    myHealth: 'My Health', vitals: 'Vitals', medications: 'Medications', reports: 'Reports', reminders: 'Reminders',
    family: 'Family', conditions: 'Conditions', allergies: 'Allergies',
    cart: 'Cart', addToCart: 'Add to Cart', prescription: 'Prescription', reorder: 'Reorder', orderHistory: 'My Orders',
    doctor: 'Doctor', appointment: 'Appointment', booking: 'Booking', price: 'Price', rating: 'Rating',
    available: 'Available', online: 'Online', clinic: 'Clinic', homeVisit: 'Home Visit',
    nutrition: 'Nutrition', calories: 'Calories', exercise: 'Exercise', dailyTracker: 'Daily Tracker', mealPlan: 'Meal Plan',
    mentalHealth: 'Mental Health', breathing: 'Breathing', meditation: 'Meditation', moodJournal: 'Mood Journal',
    nursing: 'Home Nursing', delivery: 'Delivery', emergency: 'Emergency', wallet: 'Wallet', insurance: 'Insurance', map: 'Map', community: 'Community',
    notifications: 'Notifications', support: 'Support', terms: 'Terms & Conditions', about: 'About', privacy: 'Privacy', security: 'Security', data: 'My Data',
    checkout: 'Checkout', track: 'Track', confirm: 'Confirm', reject: 'Reject', accept: 'Accept', decline: 'Decline',
    chatWithDoctor: 'Chat with Doctor', chatWithPharmacist: 'Chat with Pharmacist', videoCall: 'Video Call', audioCall: 'Audio Call',
    myCards: 'My Cards', addCard: 'Add Card', myOrders: 'My Orders', orderTracking: 'Order Tracking',
    darkMode: 'Dark Mode', lightMode: 'Light Mode', systemMode: 'System Mode', language: 'Language', fontSize: 'Font Size',
    secondOpinion: 'Second Opinion', referral: 'Referral', drugScanner: 'Drug Scanner', skinAnalysis: 'Skin Analysis', symptomChecker: 'Symptom Checker',
  },
  ur: {
    home: 'ہوم', consultations: 'مشاورت', pharmacy: 'فارمیسی', diagnostics: 'ٹیسٹ', health: 'میری صحت',
    settings: 'ترتیبات', profile: 'پروفائل', search: 'تلاش', save: 'محفوظ', cancel: 'منسوخ', back: 'واپس',
    loading: 'لوڈ ہو رہا ہے...', error: 'خرابی', success: 'کامیاب', retry: 'دوبارہ', logout: 'لاگ آؤٹ',
    login: 'لاگ ان', register: 'اکاؤنٹ بنائیں', forgotPassword: 'پاسورڈ بھول گئے', otp: 'تصدیقی کوڈ', guestMode: 'مہمان کے طور پر',
    phone: 'فون نمبر', password: 'پاسورڈ', createAccount: 'نیا اکاؤنٹ', welcomeBack: 'خوش آمدید',
    myHealth: 'میری صحت', vitals: 'اہم علامات', medications: 'دوائیں', reports: 'رپورٹس', reminders: 'یاد دہانی',
    family: 'خاندان', conditions: 'بیماریاں', allergies: 'الرجی',
    cart: 'ٹوکری', addToCart: 'ٹوکری میں ڈالیں', prescription: 'نسخہ', reorder: 'دوبارہ آرڈر', orderHistory: 'آرڈرز',
    doctor: 'ڈاکٹر', appointment: 'ملاقات', booking: 'بکنگ', price: 'قیمت', rating: 'درجہ بندی',
    available: 'دستیاب', online: 'آن لائن', clinic: 'کلینک', homeVisit: 'گھر کا دورہ',
    nutrition: 'غذائیت', calories: 'کیلوریز', exercise: 'ورزش', dailyTracker: 'روزانہ ٹریکر', mealPlan: 'کھانے کا منصوبہ',
    mentalHealth: 'ذہنی صحت', breathing: 'سانس کی مشقیں', meditation: 'مراقبہ', moodJournal: 'موڈ جرنل',
    nursing: 'گھریلو نرسنگ', delivery: 'ڈیلیوری', emergency: 'ایمرجنسی', wallet: 'والیٹ', insurance: 'انشورنس', map: 'نقشہ', community: 'کمیونٹی',
    notifications: 'اطلاعات', support: 'تعاون', terms: 'شرائط و ضوابط', about: 'ایپ کے بارے میں', privacy: 'رازداری', security: 'سلامتی', data: 'میرا ڈیٹا',
    checkout: 'چیک آؤٹ', track: 'ٹریک', confirm: 'تصدیق', reject: 'مسترد', accept: 'قبول', decline: 'انکار',
    chatWithDoctor: 'ڈاکٹر سے چیٹ', chatWithPharmacist: 'فارماسسٹ سے چیٹ', videoCall: 'ویڈیو کال', audioCall: 'آڈیو کال',
    myCards: 'میرے کارڈز', addCard: 'کارڈ شامل کریں', myOrders: 'میرے آرڈرز', orderTracking: 'آرڈر ٹریکنگ',
    darkMode: 'ڈارک موڈ', lightMode: 'لائٹ موڈ', systemMode: 'سسٹم موڈ', language: 'زبان', fontSize: 'فونٹ سائز',
    secondOpinion: 'دوسری رائے', referral: 'ریفرل', drugScanner: 'دوا سکینر', skinAnalysis: 'جلد کا تجزیہ', symptomChecker: 'علامات کی جانچ',
  },
  hi: {
    home: 'होम', consultations: 'परामर्श', pharmacy: 'फार्मेसी', diagnostics: 'जांच', health: 'मेरा स्वास्थ्य',
    settings: 'सेटिंग्स', profile: 'प्रोफ़ाइल', search: 'खोज', save: 'सेव', cancel: 'रद्द', back: 'वापस',
    loading: 'लोड हो रहा है...', error: 'त्रुटि', success: 'सफल', retry: 'पुनः प्रयास', logout: 'लॉगआउट',
    login: 'लॉगइन', register: 'रजिस्टर', forgotPassword: 'पासवर्ड भूल गए', otp: 'सत्यापन', guestMode: 'अतिथि मोड',
    phone: 'फ़ोन नंबर', password: 'पासवर्ड', createAccount: 'नया खाता', welcomeBack: 'वापसी पर स्वागत',
    myHealth: 'मेरा स्वास्थ्य', vitals: 'महत्वपूर्ण संकेत', medications: 'दवाइयाँ', reports: 'रिपोर्ट', reminders: 'रिमाइंडर',
    family: 'परिवार', conditions: 'रोग', allergies: 'एलर्जी',
    cart: 'कार्ट', addToCart: 'कार्ट में डालें', prescription: 'प्रिस्क्रिप्शन', reorder: 'फिर ऑर्डर', orderHistory: 'ऑर्डर',
    doctor: 'डॉक्टर', appointment: 'अपॉइंटमेंट', booking: 'बुकिंग', price: 'कीमत', rating: 'रेटिंग',
    available: 'उपलब्ध', online: 'ऑनलाइन', clinic: 'क्लिनिक', homeVisit: 'घर पर विज़िट',
    nutrition: 'पोषण', calories: 'कैलोरी', exercise: 'व्यायाम', dailyTracker: 'दैनिक ट्रैकर', mealPlan: 'मील प्लान',
    mentalHealth: 'मानसिक स्वास्थ्य', breathing: 'साँस व्यायाम', meditation: 'ध्यान', moodJournal: 'मूड जर्नल',
    nursing: 'होम नर्सिंग', delivery: 'डिलीवरी', emergency: 'आपातकाल', wallet: 'वॉलेट', insurance: 'बीमा', map: 'नक्शा', community: 'समुदाय',
    notifications: 'सूचनाएँ', support: 'सहायता', terms: 'नियम और शर्तें', about: 'ऐप के बारे में', privacy: 'गोपनीयता', security: 'सुरक्षा', data: 'मेरा डेटा',
    checkout: 'चेकआउट', track: 'ट्रैक', confirm: 'पुष्टि', reject: 'अस्वीकार', accept: 'स्वीकार', decline: 'अस्वीकार',
    chatWithDoctor: 'डॉक्टर से चैट', chatWithPharmacist: 'फार्मासिस्ट से चैट', videoCall: 'वीडियो कॉल', audioCall: 'ऑडियो कॉल',
    myCards: 'मेरे कार्ड', addCard: 'कार्ड जोड़ें', myOrders: 'मेरे ऑर्डर', orderTracking: 'ऑर्डर ट्रैकिंग',
    darkMode: 'डार्क मोड', lightMode: 'लाइट मोड', systemMode: 'सिस्टम मोड', language: 'भाषा', fontSize: 'फ़ॉन्ट आकार',
    secondOpinion: 'दूसरी राय', referral: 'रेफरल', drugScanner: 'दवा स्कैनर', skinAnalysis: 'त्वचा विश्लेषण', symptomChecker: 'लक्षण जांच',
  },
  bn: {
    home: 'হোম', consultations: 'পরামর্শ', pharmacy: 'ফার্মেসি', diagnostics: 'পরীক্ষা', health: 'আমার স্বাস্থ্য',
    settings: 'সেটিংস', profile: 'প্রোফাইল', search: 'খুঁজুন', save: 'সেভ', cancel: 'বাতিল', back: 'পেছনে',
    loading: 'লোড হচ্ছে...', error: 'ত্রুটি', success: 'সফল', retry: 'আবার চেষ্টা', logout: 'লগআউট',
    login: 'লগইন', register: 'নিবন্ধন', forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন', otp: 'যাচাইকরণ', guestMode: 'অতিথি হিসেবে',
    phone: 'ফোন নম্বর', password: 'পাসওয়ার্ড', createAccount: 'নতুন অ্যাকাউন্ট', welcomeBack: 'স্বাগতম',
    myHealth: 'আমার স্বাস্থ্য', vitals: 'গুরুত্বপূর্ণ সংকেত', medications: 'ওষুধ', reports: 'রিপোর্ট', reminders: 'রিমাইন্ডার',
    family: 'পরিবার', conditions: 'রোগ', allergies: 'অ্যালার্জি',
    cart: 'কার্ট', addToCart: 'কার্টে যোগ', prescription: 'প্রেসক্রিপশন', reorder: 'পুনরায় অর্ডার', orderHistory: 'অর্ডার',
    doctor: 'ডাক্তার', appointment: 'অ্যাপয়েন্টমেন্ট', booking: 'বুকিং', price: 'মূল্য', rating: 'রেটিং',
    available: 'উপলব্ধ', online: 'অনলাইন', clinic: 'ক্লিনিক', homeVisit: 'হোম ভিজিট',
    nutrition: 'পুষ্টি', calories: 'ক্যালোরি', exercise: 'ব্যায়াম', dailyTracker: 'দৈনিক ট্র্যাকার', mealPlan: 'খাবার পরিকল্পনা',
    mentalHealth: 'মানসিক স্বাস্থ্য', breathing: 'শ্বাস ব্যায়াম', meditation: 'ধ্যান', moodJournal: 'মেজাজ জার্নাল',
    nursing: 'হোম নার্সিং', delivery: 'ডেলিভারি', emergency: 'জরুরি', wallet: 'ওয়ালেট', insurance: 'বীমা', map: 'মানচিত্র', community: 'কমিউনিটি',
    notifications: 'বিজ্ঞপ্তি', support: 'সহায়তা', terms: 'শর্তাবলী', about: 'অ্যাপ সম্পর্কে', privacy: 'গোপনীয়তা', security: 'নিরাপত্তা', data: 'আমার ডেটা',
    checkout: 'চেকআউট', track: 'ট্র্যাক', confirm: 'নিশ্চিত', reject: 'প্রত্যাখ্যান', accept: 'গ্রহণ', decline: 'প্রত্যাখ্যান',
    chatWithDoctor: 'ডাক্তারের সাথে চ্যাট', chatWithPharmacist: 'ফার্মাসিস্টের সাথে চ্যাট', videoCall: 'ভিডিও কল', audioCall: 'অডিও কল',
    myCards: 'আমার কার্ড', addCard: 'কার্ড যোগ', myOrders: 'আমার অর্ডার', orderTracking: 'অর্ডার ট্র্যাকিং',
    darkMode: 'ডার্ক মোড', lightMode: 'লাইট মোড', systemMode: 'সিস্টেম মোড', language: 'ভাষা', fontSize: 'ফন্ট সাইজ',
    secondOpinion: 'দ্বিতীয় মতামত', referral: 'রেফারেল', drugScanner: 'ওষুধ স্ক্যানার', skinAnalysis: 'ত্বক বিশ্লেষণ', symptomChecker: 'লক্ষণ পরীক্ষক',
  },
  fil: {
    home: 'Home', consultations: 'Konsulta', pharmacy: 'Parmasya', diagnostics: 'Lab Tests', health: 'Kalusugan',
    settings: 'Settings', profile: 'Profile', search: 'Hanapin', save: 'I-save', cancel: 'Kanselahin', back: 'Bumalik',
    loading: 'Naglo-load...', error: 'Error', success: 'Tagumpay', retry: 'Ulitin', logout: 'Mag-logout',
    login: 'Mag-login', register: 'Mag-register', forgotPassword: 'Nakalimutan password', otp: 'Verification', guestMode: 'Bisita lang',
    phone: 'Phone Number', password: 'Password', createAccount: 'Bagong Account', welcomeBack: 'Welcome Back',
    myHealth: 'Kalusugan Ko', vitals: 'Vital Signs', medications: 'Gamot', reports: 'Ulat', reminders: 'Paalala',
    family: 'Pamilya', conditions: 'Sakit', allergies: 'Allergy',
    cart: 'Cart', addToCart: 'Idagdag sa Cart', prescription: 'Reseta', reorder: 'Ulitin Order', orderHistory: 'Mga Order',
    doctor: 'Doktor', appointment: 'Appointment', booking: 'Booking', price: 'Presyo', rating: 'Rating',
    available: 'Available', online: 'Online', clinic: 'Clinic', homeVisit: 'Home Visit',
    nutrition: 'Nutrisyon', calories: 'Calories', exercise: 'Exercise', dailyTracker: 'Daily Tracker', mealPlan: 'Meal Plan',
    mentalHealth: 'Mental Health', breathing: 'Breathing', meditation: 'Meditation', moodJournal: 'Mood Journal',
    nursing: 'Home Nursing', delivery: 'Delivery', emergency: 'Emergency', wallet: 'Wallet', insurance: 'Insurance', map: 'Mapa', community: 'Komunidad',
    notifications: 'Mga Abiso', support: 'Suporta', terms: 'Mga Tuntunin', about: 'Tungkol sa App', privacy: 'Privacy', security: 'Seguridad', data: 'Aking Data',
    checkout: 'Checkout', track: 'I-track', confirm: 'Kumpirmahin', reject: 'Tanggihan', accept: 'Tanggapin', decline: 'Tumanggi',
    chatWithDoctor: 'Chat sa Doktor', chatWithPharmacist: 'Chat sa Pharmacist', videoCall: 'Video Call', audioCall: 'Audio Call',
    myCards: 'Mga Card Ko', addCard: 'Magdagdag ng Card', myOrders: 'Mga Order Ko', orderTracking: 'Order Tracking',
    darkMode: 'Dark Mode', lightMode: 'Light Mode', systemMode: 'System Mode', language: 'Wika', fontSize: 'Laki ng Font',
    secondOpinion: 'Pangalawang Opinyon', referral: 'Referral', drugScanner: 'Drug Scanner', skinAnalysis: 'Skin Analysis', symptomChecker: 'Symptom Checker',
  },
};

// ---------------------------------------------------------------------------
// The autoTranslations dictionary maps exact Arabic phrases/words to 6 languages.
// This enables dynamic automatic translation for any text node rendered inside AppText
// or UI label properties without modifying individual screens.
// ---------------------------------------------------------------------------
export const autoTranslations: Record<string, Record<LangCode, string>> = {
  // General & Common UI
  "طبيعي": { ar: "طبيعي", en: "Normal", ur: "نارمل", hi: "सामान्य", bn: "স্বাভাবিক", fil: "Normal" },
  "متوسط": { ar: "متوسط", en: "Moderate", ur: "اعتدال", hi: "मध्यम", bn: "মাঝারি", fil: "Moderate" },
  "الكل": { ar: "الكل", en: "All", ur: "سب", hi: "सभी", bn: "সব", fil: "All" },
  "الآن": { ar: "الآن", en: "Now", ur: "اب", hi: "अभी", bn: "এখন", fil: "Now" },
  "ر.س": { ar: "ر.س", en: "SAR", ur: "ریال", hi: "SAR", bn: "SAR", fil: "SAR" },
  "اليوم": { ar: "اليوم", en: "Today", ur: "آج", hi: "आज", bn: "আজ", fil: "Today" },
  "أمس": { ar: "أمس", en: "Yesterday", ur: "کل", hi: "कल", bn: "গতকাল", fil: "Yesterday" },
  "أدوية": { ar: "أدوية", en: "Medicines", ur: "ادویات", hi: "दवाइयाँ", bn: "ওষুধ", fil: "Medicines" },
  "مكتمل": { ar: "مكتمل", en: "Completed", ur: "مکمل", hi: "पूरा", bn: "সম্পূর্ণ", fil: "Completed" },
  "جيد": { ar: "جيد", en: "Good", ur: "اچھا", hi: "अच्छा", bn: "ভালো", fil: "Good" },
  "الإجمالي": { ar: "الإجمالي", en: "Total", ur: "کل رقم", hi: "कुल", bn: "মোট", fil: "Total" },
  "الوزن": { ar: "الوزن", en: "Weight", ur: "وزن", hi: "वजन", bn: "ওजन", fil: "Weight" },
  "عرض الكل": { ar: "عرض الكل", en: "View All", ur: "سب دیکھیں", hi: "सभी देखें", bn: "সব দেখুন", fil: "View All" },
  "أطفال": { ar: "أطفال", en: "Pediatrics", ur: "بچے", hi: "बाल रोग", bn: "শিশুরোগ", fil: "Pediatrics" },
  "العربية": { ar: "العربية", en: "Arabic", ur: "عربی", hi: "अरबी", bn: "আরবি", fil: "Arabic" },
  "طريقة الدفع": { ar: "طريقة الدفع", en: "Payment Method", ur: "طریقہ ادائیگی", hi: "भुगतान प्रकार", bn: "পেমেন্ট পদ্ধতি", fil: "Payment Method" },
  "تأمين": { ar: "تأمين", en: "Insurance", ur: "انشورنس", hi: "बीमा", bn: "বীমা", fil: "Insurance" },
  "ضغط الدم": { ar: "ضغط الدم", en: "Blood Pressure", ur: "بلڈ پریشر", hi: "रक्तचाप", bn: "रक्तचाप", fil: "Blood Pressure" },
  "ممتاز": { ar: "ممتاز", en: "Excellent", ur: "بہترین", hi: "उत्कृष्ट", bn: "চমৎকার", fil: "Excellent" },
  "يونيو": { ar: "يونيو", en: "June", ur: "جون", hi: "جون", bn: "জুন", fil: "June" },
  "أنت": { ar: "أنت", en: "You", ur: "آپ", hi: "आप", bn: "আপনি", fil: "You" },
  "استشارة طبية": { ar: "استشارة طبية", en: "Medical Consult", ur: "طبی مشاورت", hi: "चिकित्सा परामर्श", bn: "মেডিকেল পরামর্শ", fil: "Medical Consult" },
  "تغيير": { ar: "تغيير", en: "Change", ur: "تبدیل", hi: "بدلیں", bn: "পরিবর্তন", fil: "Change" },
  "تمريض": { ar: "تمريض", en: "Nursing", ur: "نرسنگ", hi: "नर्सिंग", bn: "নার্সিং", fil: "Nursing" },
  "قلب": { ar: "قلب", en: "Cardiology", ur: "دل", hi: "हृदय रोग", bn: "হৃদরোগ", fil: "Cardiology" },
  "احجز الآن": { ar: "احجز الآن", en: "Book Now", ur: "ابھی بک کریں", hi: "अभी बुक करें", bn: "বুক করুন", fil: "Book Now" },
  "الخيارات": { ar: "الخيارات", en: "Options", ur: "اختیارات", hi: "विकल्प", bn: "विकल्प", fil: "Options" },
  "سبب آخر": { ar: "سبب آخر", en: "Other Reason", ur: "دوسری وجہ", hi: "अन्य कारण", bn: "अन्य कारण", fil: "Other Reason" },
  "إلغاء الموعد": { ar: "إلغاء الموعد", en: "Cancel Appointment", ur: "ملاقات منسوخ کریں", hi: "अपॉइंटमेंट रद्द करें", bn: "অ্যাপয়েন্টমেন্ট বাতিল", fil: "Cancel Appointment" },
  "خفيف": { ar: "خفيف", en: "Mild", ur: "ہلکا", hi: "हल्का", bn: "হালকা", fil: "Mild" },
  "توصيل": { ar: "توصيل", en: "Delivery", ur: "ڈیلیوری", hi: "डिलीवरी", bn: "ডেলিভারি", fil: "Delivery" },
  "بطاقة": { ar: "بطاقة", en: "Card", ur: "کارڈ", hi: "कार्ड", bn: "कार्ड", fil: "Card" },
  "المنزل": { ar: "المنزل", en: "Home", ur: "گھر", hi: "घर", bn: "বাড়ি", fil: "Home" },
  "ضريبة (15%)": { ar: "ضريبة (15%)", en: "Tax (15%)", ur: "ٹیکس (15%)", hi: "कर (15%)", bn: "কর (15%)", fil: "Tax (15%)" },
  "قرص": { ar: "قرص", en: "Tablet", ur: "گولی", hi: "गोली", bn: "ট্যাবলেট", fil: "Tablet" },
  "بعد الأكل": { ar: "بعد الأكل", en: "After Meal", ur: "کھانے کے بعد", hi: "खाने के बाद", bn: "খাওয়ার পর", fil: "After Meal" },
  "كغ": { ar: "كغ", en: "kg", ur: "کلو", hi: "किग्रा", bn: "কেজি", fil: "kg" },
  "ذكر": { ar: "ذكر", en: "Male", ur: "مرد", hi: "पुरुष", bn: "পুরুষ", fil: "Male" },
  "الثلاثاء": { ar: "الثلاثاء", en: "Tuesday", ur: "منگل", hi: "मंगलवार", bn: "मंगलवार", fil: "Tuesday" },
  "الأربعاء": { ar: "الأربعاء", en: "Wednesday", ur: "بدھ", hi: "बुधवार", bn: "बुधवार", fil: "Wednesday" },
  "السبت": { ar: "السبت", en: "Saturday", ur: "ہفتہ", hi: "शनिवार", bn: "শনিবার", fil: "Saturday" },
  "الأحد": { ar: "الأحد", en: "Sunday", ur: "اتوار", hi: "रविवार", bn: "रविवार", fil: "Sunday" },
  "نفسية": { ar: "نفسية", en: "Psychiatry", ur: "ذہنی صحت", hi: "मानसिक रोग", bn: "মনোবিজ্ঞান", "fil": "Psychiatry" },
  "جلدية": { ar: "جلدية", en: "Dermatology", ur: "جلد", hi: "त्वचा रोग", bn: "চর্মরোগ", fil: "Dermatology" },
  "أسنان": { ar: "أسنان", en: "Dental", ur: "دانت", hi: "दंत रोग", bn: "দন্তচিকিৎসা", fil: "Dental" },
  "استشاري": { ar: "استشاري", en: "Consultant", ur: "مشیر", hi: "सलाहकार", bn: "পরামর্শদাতা", fil: "Consultant" },
  "مرفوض": { ar: "مرفوض", en: "Rejected", ur: "مسترد", hi: "अस्वीकृत", bn: "প্রত্যাখ্যাত", fil: "Rejected" },
  "أكسا": { ar: "أكسا", en: "AXA", ur: "اکسا", hi: "एक्सा", bn: "আকসা", fil: "AXA" },
  "منخفض": { ar: "منخفض", en: "Low", ur: "کم", hi: "कम", bn: "কম", fil: "Low" },
  "قيد المراجعة": { ar: "قيد المراجعة", en: "Under Review", ur: "زیر غور", hi: "समीक्षाधीन", bn: "পর্যালোচনার অধীনে", fil: "Under Review" },
  "دهون": { ar: "دهون", en: "Fats", ur: "چربی", hi: "वसा", bn: "চর্বি", fil: "Fats" },
  "بروتين": { ar: "بروتين", en: "Protein", ur: "پروٹین", hi: "प्रोटीन", bn: "প্রোটিন", fil: "Protein" },
  "محفظة نبض": { ar: "محفظة نبض", en: "Nabdah Wallet", ur: "نبض والیٹ", hi: "नब्ज वॉलेट", bn: "নাবদাহ ওয়ালেট", fil: "Nabdah Wallet" },
  "تأكيد الحجز": { ar: "تأكيد الحجز", en: "Confirm Booking", ur: "بکنگ की تصدیق", hi: "बुकिंग की पुष्टि", bn: "বুকিং নিশ্চিত করুন", fil: "Confirm Booking" },
  "العودة للصيدلية": { ar: "العودة للصيدلية", en: "Back to Pharmacy", ur: "فارمیسی پر واپس", hi: "फार्मेसी पर वापस", bn: "ফার্মেসিতে ফিরে যান", fil: "Back to Pharmacy" },
  "الكمية": { ar: "الكمية", en: "Quantity", ur: "مقدار", hi: "मात्रा", bn: "পরিমাণ", fil: "Quantity" },
  "ملخص التكلفة": { ar: "ملخص التكلفة", en: "Cost Summary", ur: "لاگت کا خلاصہ", hi: "लागत का सारांश", bn: "খরচের বিবরণী", fil: "Cost Summary" },
  "يتطلب وصفة": { ar: "يتطلب وصفة", en: "Requires Rx", ur: "نسخہ درکار ہے", hi: "प्रिस्क्रिप्शन आवश्यक", bn: "প্রেসক্রিপশন প্রয়োজন", fil: "Requires Rx" },
  "المحفظة": { ar: "المحفظة", en: "Wallet", ur: "والیٹ", hi: "वॉलेट", bn: "ওয়ালেট", fil: "Wallet" },
  "تأكيد": { ar: "تأكيد", en: "Confirm", ur: "تصدیق", hi: "पुष्टि", bn: "নিশ্চित", fil: "Confirm" },
  "غير متصل": { ar: "غير متصل", en: "Offline", ur: "آف لائن", hi: "ऑफ़लाइन", bn: "অফলাইন", fil: "Offline" },
  "تفاصيل الطلب": { ar: "تفاصيل الطلب", en: "Order Details", ur: "آرڈر کی تفصیلات", hi: "ऑर्डर का विवरण", bn: "অর্ডারের বিবরণ", fil: "Order Details" },
  "الخدمة": { ar: "الخدمة", en: "Service", ur: "سروس", hi: "सेवा", bn: "সেবা", fil: "Service" },
  "زوجة": { ar: "زوجة", en: "Wife", ur: "بیوی", hi: "पत्नी", bn: "স্ত্রী", fil: "Wife" },
  "الأمراض والحساسية": { ar: "الأمراض والحساسية", en: "Diseases & Allergies", ur: "بیماریاں اور الرجی", hi: "रोग और एलर्जी", bn: "রোগ ও আলার্জি", fil: "Diseases & Allergies" },
  "الطول": { ar: "الطول", en: "Height", ur: "قد", hi: "ऊंचाई", bn: "উচ্চতা", fil: "Height" },
  "يناير": { ar: "يناير", en: "January", ur: "جنوری", hi: "जनवरी", bn: "জানুয়ারি", fil: "January" },
  "فبراير": { ar: "فبراير", en: "February", ur: "فروری", hi: "फरवरी", bn: "ফেব্রুয়ারি", fil: "February" },
  "مارس": { ar: "مارس", en: "March", ur: "مارچ", hi: "मार्च", bn: "মার্চ", fil: "March" },
  "طوارئ": { ar: "طوارئ", en: "Emergency", ur: "ایمرجنسی", hi: "आपातकाल", bn: "জরুরি", fil: "Emergency" },
  "التمريض المنزلي": { ar: "التمريض المنزلي", en: "Home Nursing", ur: "گھریلو نرسنگ", hi: "होम नर्सिंग", bn: "হোम नर्सिंग", fil: "Home Nursing" },
  "أشعة": { ar: "أشعة", en: "Radiology", ur: "ایكسرے", hi: "रेडियोलॉजी", bn: "রেডিওলজি", fil: "Radiology" },
  "وظائف الكبد": { ar: "وظائف الكبد", en: "Liver Functions", ur: "جگر کا ٹیسٹ", hi: "लिवर प्रोफाइल", bn: "লিভার ফাংশন", fil: "Liver Functions" },
  "وظائف الكلى": { ar: "وظائف الكلى", en: "Kidney Functions", ur: "گردے کا ٹیسٹ", hi: "किडनी प्रोफाइल", bn: "কিডনি ফাংশন", fil: "Kidney Functions" },
  "أخصائية": { ar: "أخصائية", en: "Specialist", ur: "ماہر", hi: "विशेषज्ञ", bn: "বিশেষজ্ঞ", fil: "Specialist" },
  "استشارة": { ar: "استشارة", en: "Consultation", ur: "مشاورت", hi: "परामर्श", bn: "পরামর্শ", fil: "Consultation" },
  "رسالة": { ar: "رسالة", en: "Message", ur: "پیغام", hi: "संदेश", bn: "বার্তা", fil: "Message" },
  "طلب صيدلية": { ar: "طلب صيدلية", en: "Pharmacy Order", ur: "فارمیسی کا آرڈر", hi: "फार्मेसी ऑर्डर", bn: "ফার্মেসি অর্ডার", fil: "Pharmacy Order" },
  "صداع": { ar: "صداع", en: "Headache", ur: "سر درد", hi: "सिरदर्द", bn: "মাথাব্যথা", fil: "Headache" },
  "منذ ساعة": { ar: "منذ ساعة", en: "1h ago", ur: "ایک گھنٹہ پہلے", hi: "1 घंटे पहले", bn: "১ ঘণ্টা আগে", fil: "1h ago" },
  "منذ 3 ساعات": { ar: "منذ 3 ساعات", en: "3h ago", ur: "3 گھنٹے پہلے", hi: "3 घंटे पहले", bn: "৩ ঘণ্টা আগে", fil: "3h ago" },
  "استشارة قلب": { ar: "استشارة قلب", en: "Heart Consult", ur: "دل کی مشاورت", hi: "हृदय परामर्श", bn: "হৃদরোগ পরামর্শ", fil: "Heart Consult" },
  "قلب وأوعية": { ar: "قلب وأوعية", en: "Cardiovascular", ur: "دل اور رگیں", hi: "हृदय प्रणाली", bn: "হৃদযন্ত্র", fil: "Cardiovascular" },
  "وظائف الغدة الدرقية": { ar: "وظائف الغدة الدرقية", en: "Thyroid Functions", ur: "تھائرائڈ ٹیسٹ", hi: "थायराइड प्रोफाइल", bn: "थाईरॉइड प्रोफाइल", fil: "Thyroid Functions" },
  "تفاصيل الموعد": { ar: "تفاصيل الموعد", en: "Appointment Details", ur: "ملاقات کی تفصیلات", hi: "अपॉइंटमेंट विवरण", bn: "অ্যাপয়েন্টমেন্টের বিবরণ", fil: "Appointment Details" },
  "شحن": { ar: "شحن", en: "Top-up", ur: "ریچارج", hi: "टॉप-अप", bn: "টপ-আপ", fil: "Top-up" },
  "تحويل": { ar: "تحويل", en: "Transfer", ur: "تحویل", hi: "स्थानांतरण", bn: "স্থানান্তর", fil: "Transfer" },
  "كاشباك": { ar: "كاشباك", en: "Cashback", ur: "کیش بیک", hi: "कैशबैक", bn: "ক্যাশব্যাক", fil: "Cashback" },
  "الغداء": { ar: "الغداء", en: "Lunch", ur: "دوپہر کا کھانا", hi: "दोपहर का भोजन", bn: "দুপুরের খাবার", fil: "Lunch" },
  "العشاء": { ar: "العشاء", en: "Dinner", ur: "رات کا کھانا", hi: "रात का भोजन", bn: "রাতের খাবার", fil: "Dinner" },
  "تحاليل وأشعة": { ar: "تحاليل وأشعة", en: "Labs & Radiology", ur: "ٹیسٹ اور ایکسرے", hi: "लैब और एक्स-रे", bn: "পরীক্ষা ও এক্স-রে", fil: "Labs & Radiology" },
  "أهلاً بك": { ar: "أهلاً بك", en: "Welcome", ur: "خوش آمدید", hi: "स्वागत है", bn: "স্বাগতম", fil: "Welcome" },
  "كيف يمكننا مساعدتك اليوم؟": { ar: "كيف يمكننا مساعدتك اليوم؟", en: "How can we help you today?", ur: "آج ہم آپ کی کیا مدد کر سکتے ہیں؟", hi: "आज हम आपकी क्या मदद कर सकते हैं?", bn: "আজ আমরা কীভাবে সাহায্য করতে পারি?", fil: "How can we help you today?" },
  "ابحث عن طبيب، دواء، تحليل...": { ar: "ابحث عن طبيب، دواء، تحليل...", en: "Search doctor, medicine, lab test...", ur: "ڈاکٹر، دوا، ٹیسٹ تلاش کریں...", hi: "डॉक्टर, दवा, लैब टेस्ट खोजें...", bn: "ডাক্তার, ওষুধ বা ল্যাব টেস্ট খুঁজুন...", fil: "Search doctor, medicine, lab test..." },
  "خصم 30% على الاستشارات": { ar: "خصم 30% على الاستشارات", en: "30% off consultations", ur: "مشاورت پر 30٪ چھوٹ", hi: "परामर्श पर 30% की छूट", bn: "পরামর্শে ৩০% ছাড়", fil: "30% off consultations" },
  "عرض محدود — مختبرات معتمدة": { ar: "عرض محدود — مختبرات معتمدة", en: "Limited offer — certified labs", ur: "محدود پیشکش — مصدقہ لیبز", hi: "सीमित समय का ऑफर — प्रमाणित लैब", bn: "সীমিত অফার — প্রত্যয়িত ল্যাব", fil: "Limited offer — certified labs" },
  "استشر طبيبك الآن": { ar: "استشر طبيبك الآن", en: "Consult your doctor now", ur: "ابھی اپنے داکٹر سے مشورہ کریں", hi: "अभी अपने डॉक्टर से परामर्श करें", bn: "এখনই ডাক্তারের সাথে পরামর্শ করুন", fil: "Consult your doctor now" },
  "أطباء متاحون على مدار الساعة": { ar: "أطباء متاحون على مدار الساعة", en: "Doctors available 24/7", ur: "ڈاکٹرز 24/7 دستیاب ہیں", hi: "डॉक्टर 24/7 उपलब्ध हैं", bn: "২৪/৭ ডাক্তার উপলব্ধ আছেন", fil: "Doctors available 24/7" },
  "خدماتنا": { ar: "خدماتنا", en: "Our Services", ur: "ہماری خدمات", hi: "हमारी सेवाएँ", bn: "আমাদের সেবাসমূহ", fil: "Our Services" },
  "عيادات ومستشفيات": { ar: "عيادات ومستشفيات", en: "Clinics & Hospitals", ur: "کلینک اور ہسپتال", hi: "क्लिनिक और अस्पताल", bn: "ক্লিনিক ও হাসপাতাল", fil: "Clinics & Hospitals" },
  "حجز موعد": { ar: "حجز موعد", en: "Book Appointment", ur: "ملاقات بک کریں", hi: "अपॉइंटमेंट बुक करें", bn: "অ্যাপয়েন্টমেন্ট বুক করুন", fil: "Book Appointment" },
  "الملف الطبي": { ar: "الملف الطبي", en: "Medical File", ur: "طبی فائل", hi: "मेडिकल फ़ाइल", bn: "মেডিকেল ফাইল", fil: "Medical File" },
  "تأكيد الطلب": { ar: "تأكيد الطلب", en: "Confirm Order", ur: "آرڈر की تصدیق", hi: "ऑर्डर की पुष्टि", bn: "অর্ডার নিশ্চিত করুন", fil: "Confirm Order" },
  "إلغاء الطلب": {"ar": "إلغاء الطلب", "en": "Cancel Order", "ur": "آرڈر منسوخ کریں", "hi": "ऑर्डर रद्द करें", "bn": "অর্ডার বাতিল করুন", "fil": "Cancel Order"},
  "بوبا للتأمين": {"ar": "بوبا للتأمين", "en": "Bupa Insurance", "ur": "بوبا انشورنس", "hi": "ब्यूपा बीमा", "bn": "বুপا বীমা", "fil": "Bupa Insurance"},
  "تكافل الراجحي": {"ar": "تكافل الراجحي", "en": "Al Rajhi Takaful", "ur": "الراجحی تکافل", "hi": "अल राजी तकाफुल", "bn": "আল রাজি তাকাফুল", "fil": "Al Rajhi Takaful"},
  "ملاذ للتأمين": {"ar": "ملاذ للتأمين", "en": "Malath Insurance", "ur": "ملاذ انشورنس", "hi": "मालाथ बीमा", "bn": "মালাথ বীমা", "fil": "Malath Insurance"},
  "الدرع العربي": {"ar": "الدرع العربي", "en": "Arabian Shield", "ur": "عرب شیلڈ", "hi": "अरेबियन शील्ड", "bn": "আরবীয় শিল্ড", "fil": "Arabian Shield"},
  "التعاونية": {"ar": "التعاونية", "en": "Tawuniya", "ur": "التعاونیہ", "hi": "तवानिया", "bn": "তাওউনিয়া", "fil": "Tawuniya"},
  "سايكو": {"ar": "سايكو", "en": "SAICO", "ur": "سائیکو", "hi": "सायको", "bn": "সাইকো", "fil": "SAICO"},
  "ميدغلف": {"ar": "ميدغلف", "en": "MedGulf", "ur": "مڈ گلف", "hi": "मेडगल्फ", "bn": "মেডগালফ", "fil": "MedGulf"},
  "بوبا للتأمين (Bupa Arabia)": {"ar": "بوبا للتأمين (Bupa Arabia)", "en": "Bupa Arabia", "ur": "بوبا عربیہ", "hi": "ब्यूपा अरेबिया", "bn": "বুপা আরাবিয়া", "fil": "Bupa Arabia"},
  "الدرع العربي (Arabian Shield)": {"ar": "الدرع العربي (Arabian Shield)", "en": "Arabian Shield", "ur": "عرب شیلڈ", "hi": "अरेबियन शील्ड", "bn": "আরবীয় শিল্ড", "fil": "Arabian Shield"},
  "ميدغلف (MedGulf)": {"ar": "ميدغلف (MedGulf)", "en": "MedGulf", "ur": "مڈ گلف", "hi": "मेडगल्फ", "bn": "মেডগালف", "fil": "MedGulf"},
  "الراجحي تكافل (Al Rajhi Takaful)": {"ar": "الراجحي تكافل (Al Rajhi Takaful)", "en": "Al Rajhi Takaful", "ur": "الراجحی تکافل", "hi": "अल राजी तकाफुल", "bn": "আল রাজি তাকাফুল", "fil": "Al Rajhi Takaful"},
  "أليانز السعودي الفرنسي (Allianz SF)": {"ar": "أليانز السعودي الفرنسي (Allianz SF)", "en": "Allianz SF", "ur": "الیانز سعودی فرانسیسی", "hi": "एलियांज एसएफ", "bn": "অ্যালিয়ানজ এসএফ", "fil": "Allianz SF"},
  "ولاء للتأمين (Walaa)": {"ar": "ولاء للتأمين (Walaa)", "en": "Walaa Insurance", "ur": "ولاء انشورنس", "hi": "वला बीमा", "bn": "ওয়ালা বীমা", "fil": "Walaa Insurance"},
  "سلامة للتأمين (Salama)": {"ar": "سلامة للتأمين (Salama)", "en": "Salama Insurance", "ur": "سلامہ انشورنس", "hi": "सलामा बीमा", "bn": "সালামা বীমা", "fil": "Salama Insurance"},
  "المتوسط والخليج (MEDGULF)": {"ar": "المتوسط والخليج (MEDGULF)", "en": "MedGulf", "ur": "مڈ گلف", "hi": "मेडगल्फ", "bn": "মেডগালফ", "fil": "MedGulf"},
};

export function t(lang: LangCode, key: keyof TranslationKeys): string {
  return translations[lang]?.[key] ?? translations.ar[key] ?? key;
}

export function useTranslation(lang: LangCode) {
  return (key: keyof TranslationKeys) => t(lang, key);
}

// Dynamic autoTranslate helper
export function autoTranslate(text: any, lang: LangCode): any {
  if (text === null || text === undefined) return text;
  
  if (typeof text === 'string') {
    const trimmed = text.trim();
    if (!trimmed) return text;
    
    // 1. Direct match in autoTranslations
    if (autoTranslations[trimmed]) {
      return autoTranslations[trimmed][lang] ?? text;
    }
    
    // 2. Exact match in the generated static UI catalog. Arabic is the source.
    const generated = generatedStaticTranslations[trimmed];
    if (generated && lang !== 'ar') {
      return generated[lang] ?? text;
    }

    // 3. Match generated source templates against runtime values while preserving the dynamic segments.
    const templateTranslation = translateGeneratedTemplate(trimmed, lang);
    if (templateTranslation) return templateTranslation;

    // 4. Exact match in translations.ar values
    for (const key in translations.ar) {
      const k = key as keyof TranslationKeys;
      if (translations.ar[k] === trimmed) {
        return translations[lang]?.[k] ?? text;
      }
    }
    
    return text;
  }
  
  if (Array.isArray(text)) {
    return text.map((item) => autoTranslate(item, lang));
  }
  
  return text;
}

export type { TranslationKeys };
export default translations;
export * from './LanguageManager';
