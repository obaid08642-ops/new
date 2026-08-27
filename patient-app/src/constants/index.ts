export const APP_NAME = 'نبض بلس';
export const APP_NAME_EN = 'Nabdah Plus';
export const APP_VERSION = '1.0.0';

// M1-ENV: fixed wrong default (was missing the /api prefix → pointed at non-existent /v1)
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL
  ?? (process.env.EXPO_PUBLIC_API_URL ? `${process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '')}/api/v1` : 'https://api.nabd.plus/api/v1');
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'https://api.nabd.plus';
export const CDN_URL = process.env.EXPO_PUBLIC_CDN_URL ?? 'https://cdn.nabd.plus';

export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@nabdah_auth_token',
  REFRESH_TOKEN: '@nabdah_refresh_token',
  USER_DATA: '@nabdah_user_data',
  THEME: '@nabdah_theme',
  LANGUAGE: '@nabdah_language',
  ONBOARDING_DONE: '@nabdah_onboarding_done',
  CART: '@nabdah_cart',
  SAVED_ADDRESSES: '@nabdah_addresses',
  HEALTH_PROFILE: '@nabdah_health_profile',
  GUEST_MODE: '@nabdah_guest_mode',
};

export const SPECIALTIES = [
  { id: '1', nameAr: 'طب عام', nameEn: 'General Medicine', icon: 'consultations', color: '#3B82F6' },
  { id: '2', nameAr: 'طب الأطفال', nameEn: 'Pediatrics', icon: 'baby', color: '#00C9A7' },
  { id: '3', nameAr: 'جراحة عيون', nameEn: 'Ophthalmology', icon: 'eye', color: '#8B5CF6' },
  { id: '4', nameAr: 'قلب وأوعية', nameEn: 'Cardiology', icon: 'monitor_heart', color: '#EF4444' },
  { id: '5', nameAr: 'جراحة عظام', nameEn: 'Orthopedics', icon: 'bone', color: '#F59E0B' },
  { id: '6', nameAr: 'أمراض جلدية', nameEn: 'Dermatology', icon: 'sparkles', color: '#EC4899' },
  { id: '7', nameAr: 'نساء وولادة', nameEn: 'Gynecology', icon: 'pregnant', color: '#F472B6' },
  { id: '8', nameAr: 'طب أسنان', nameEn: 'Dentistry', icon: 'tooth', color: '#06B6D4' },
  { id: '9', nameAr: 'طب نفسي', nameEn: 'Psychiatry', icon: 'brain', color: '#6366F1' },
  { id: '10', nameAr: 'أنف وأذن وحنجرة', nameEn: 'ENT', icon: 'ear', color: '#84CC16' },
  { id: '11', nameAr: 'مسالك بولية', nameEn: 'Urology', icon: 'kidneys', color: '#14B8A6' },
  { id: '12', nameAr: 'طب داخلي', nameEn: 'Internal Medicine', icon: 'microscope', color: '#3B82F6' },
  { id: '13', nameAr: 'جراحة عامة', nameEn: 'General Surgery', icon: 'doctor', color: '#78716C' },
  { id: '14', nameAr: 'طب طوارئ', nameEn: 'Emergency Medicine', icon: 'emergency', color: '#FF3B30' },
  { id: '15', nameAr: 'تغذية وحمية', nameEn: 'Nutrition', icon: 'food', color: '#22C55E' },
  { id: '16', nameAr: 'علاج طبيعي', nameEn: 'Physiotherapy', icon: 'run', color: '#F97316' },
  { id: '17', nameAr: 'أمراض باطنية', nameEn: 'Gastroenterology', icon: 'stomach', color: '#D97706' },
  { id: '18', nameAr: 'أمراض صدرية', nameEn: 'Pulmonology', icon: 'lungs', color: '#0EA5E9' },
  { id: '19', nameAr: 'أمراض كلى', nameEn: 'Nephrology', icon: 'kidneys', color: '#7C3AED' },
  { id: '20', nameAr: 'أمراض دم', nameEn: 'Hematology', icon: 'bloodtype', color: '#DC2626' },
  { id: '21', nameAr: 'أمراض غدد صماء', nameEn: 'Endocrinology', icon: 'dna', color: '#059669' },
  { id: '22', nameAr: 'أمراض روماتيزم', nameEn: 'Rheumatology', icon: 'bone', color: '#B45309' },
  { id: '23', nameAr: 'أمراض أعصاب', nameEn: 'Neurology', icon: 'brain', color: '#4F46E5' },
  { id: '24', nameAr: 'جراحة أعصاب', nameEn: 'Neurosurgery', icon: 'brain', color: '#312E81' },
  { id: '25', nameAr: 'جراحة تجميل', nameEn: 'Plastic Surgery', icon: 'sparkles', color: '#DB2777' },
  { id: '26', nameAr: 'أمراض معدية', nameEn: 'Infectious Disease', icon: 'virus', color: '#16A34A' },
  { id: '27', nameAr: 'أشعة تشخيصية', nameEn: 'Radiology', icon: 'xray', color: '#64748B' },
  { id: '28', nameAr: 'تخدير', nameEn: 'Anesthesiology', icon: 'syringe', color: '#475569' },
  { id: '29', nameAr: 'طب أسرة', nameEn: 'Family Medicine', icon: 'users', color: '#2563EB' },
  { id: '30', nameAr: 'أورام', nameEn: 'Oncology', icon: 'shield', color: '#991B1B' },
  { id: '31', nameAr: 'طب كبار السن', nameEn: 'Geriatrics', icon: 'wheelchair', color: '#78716C' },
  { id: '32', nameAr: 'طب الكبد', nameEn: 'Hepatology', icon: 'liver', color: '#92400E' },
  { id: '33', nameAr: 'جراحة قلب', nameEn: 'Cardiac Surgery', icon: 'monitor_heart', color: '#BE123C' },
  { id: '34', nameAr: 'طب رياضي', nameEn: 'Sports Medicine', icon: 'run', color: '#EA580C' },
  { id: '35', nameAr: 'صحة نفسية', nameEn: 'Mental Health', icon: 'meditation', color: '#7C3AED' },
];

export const MEDICINE_CATEGORIES = [
  { id: 'all', nameAr: 'الكل', icon: 'sparkles' },
  { id: 'vitamins', nameAr: 'فيتامينات', icon: 'medication' },
  { id: 'prescription', nameAr: 'أدوية وصفة', icon: 'prescriptions' },
  { id: 'medical_devices', nameAr: 'أجهزة طبية', icon: 'consultations' },
  { id: 'beauty', nameAr: 'تجميل', icon: 'sparkles' },
  { id: 'hair', nameAr: 'شعر', icon: 'user' },
  { id: 'skin', nameAr: 'بشرة', icon: 'sparkles' },
  { id: 'baby', nameAr: 'أم وطفل', icon: 'baby' },
  { id: 'sports', nameAr: 'مكملات رياضية', icon: 'run' },
  { id: 'eye', nameAr: 'عناية بالعيون', icon: 'eye' },
  { id: 'dental', nameAr: 'عناية بالأسنان', icon: 'tooth' },
  { id: 'otc', nameAr: 'بدون وصفة', icon: 'check_circle' },
];

export const LAB_CATEGORIES = [
  { id: 'blood', nameAr: 'تحاليل دم', icon: 'bloodtype', color: '#EF4444' },
  { id: 'urine', nameAr: 'تحاليل بول', icon: 'water', color: '#3B82F6' },
  { id: 'genetics', nameAr: 'جينات', icon: 'dna', color: '#8B5CF6' },
  { id: 'radiology', nameAr: 'أشعة', icon: 'pulse', color: '#6B7280' },
  { id: 'heart', nameAr: 'قلب', icon: 'monitor_heart', color: '#EF4444' },
  { id: 'brain', nameAr: 'مخ وأعصاب', icon: 'brain', color: '#6366F1' },
  { id: 'hormones', nameAr: 'هرمونات', icon: 'science', color: '#F59E0B' },
  { id: 'allergy', nameAr: 'حساسية', icon: 'food', color: '#22C55E' },
];

export const NURSING_SERVICES = [
  { id: '1', nameAr: 'ضرب إبر', icon: 'bandage', basePrice: 50 },
  { id: '2', nameAr: 'غيار جروح', icon: 'bandaid', basePrice: 80 },
  { id: '3', nameAr: 'تركيب كانيولا ومحاليل', icon: 'water', basePrice: 120 },
  { id: '4', nameAr: 'رعاية كبار سن', icon: 'user', basePrice: 150 },
  { id: '5', nameAr: 'سحب دم للتحاليل', icon: 'bloodtype', basePrice: 60 },
  { id: '6', nameAr: 'إعطاء الأدوية', icon: 'medication', basePrice: 40 },
  { id: '7', nameAr: 'مراقبة علامات حيوية', icon: 'pulse', basePrice: 100 },
  { id: '8', nameAr: 'علاج تنفسي', icon: 'lungs', basePrice: 130 },
  { id: '9', nameAr: 'تركيب قسطرة بولية', icon: 'syringe', basePrice: 140 },
  { id: '10', nameAr: 'رعاية ما بعد العمليات', icon: 'vital_signs', basePrice: 200 },
  { id: '11', nameAr: 'رعاية أم ومولود', icon: 'baby', basePrice: 180 },
  { id: '12', nameAr: 'قياس سكر وضغط', icon: 'monitor_heart', basePrice: 45 },
  { id: '13', nameAr: 'حقن وريدي', icon: 'syringe', basePrice: 90 },
  { id: '14', nameAr: 'علاج طبيعي منزلي', icon: 'run', basePrice: 250 },
  { id: '15', nameAr: 'تغذية وريدية', icon: 'water', basePrice: 300 },
];

export const INSURANCE_COMPANIES = [
  { id: '1', name: 'بوبا للتأمين', shortName: 'بوبا', logo: 'bupa', color: '#E30613' },
  { id: '2', name: 'تكافل الراجحي', shortName: 'تكافل', logo: 'tawuniya', color: '#009933' },
  { id: '3', name: 'ملاذ للتأمين', shortName: 'ملاذ', logo: 'malath', color: '#00539B' },
  { id: '4', name: 'الدرع العربي', shortName: 'الدرع', logo: 'arabian_shield', color: '#1A3C6E' },
  { id: '5', name: 'أكسا للتأمين', shortName: 'أكسا', logo: 'axa', color: '#00008F' },
  { id: '6', name: 'وقاية للتأمين', shortName: 'وقاية', logo: 'wiqaya', color: '#006B3F' },
  { id: '7', name: 'التعاونية', shortName: 'التعاونية', logo: 'tawuniya2', color: '#C8102E' },
  { id: '8', name: 'سايكو', shortName: 'سايكو', logo: 'saico', color: '#3B82F6' },
  { id: '9', name: 'ميدغلف', shortName: 'ميدغلف', logo: 'medgulf', color: '#003366' },
  { id: '10', name: 'الراجحي تكافل', shortName: 'الراجحي', logo: 'alrajhi_takaful', color: '#00843D' },
  { id: '11', name: 'أليانز السعودي الفرنسي', shortName: 'أليانز', logo: 'allianz_sf', color: '#003781' },
  { id: '12', name: 'ولاء للتأمين', shortName: 'ولاء', logo: 'walaa', color: '#1B4F72' },
  { id: '13', name: 'الاتحاد التجاري', shortName: 'الاتحاد', logo: 'uca', color: '#2C3E50' },
  { id: '14', name: 'السعودية لإعادة التأمين', shortName: 'السعودية ري', logo: 'saudi_re', color: '#006633' },
  { id: '15', name: 'بروج للتأمين', shortName: 'بروج', logo: 'buruj', color: '#8B0000' },
  { id: '16', name: 'الأهلي تكافل', shortName: 'الأهلي', logo: 'alahli_takaful', color: '#004D40' },
  { id: '17', name: 'العربية السعودية', shortName: 'العربية', logo: 'arabi', color: '#1A237E' },
  { id: '18', name: 'سلامة للتأمين', shortName: 'سلامة', logo: 'salama', color: '#2E7D32' },
  { id: '19', name: 'تشب', shortName: 'تشب', logo: 'chubb', color: '#E65100' },
  { id: '20', name: 'المتوسط والخليج', shortName: 'المتوسط', logo: 'medgulf2', color: '#01579B' },
];

export const LOYALTY_TIERS = [
  { id: 'bronze', nameAr: 'برونزي', minPoints: 0, maxPoints: 1000, color: '#CD7C3C', icon: 'trophy' },
  { id: 'silver', nameAr: 'فضي', minPoints: 1001, maxPoints: 5000, color: '#94A3B8', icon: 'trophy' },
  { id: 'gold', nameAr: 'ذهبي', minPoints: 5001, maxPoints: 10000, color: '#F59E0B', icon: 'trophy' },
  { id: 'platinum', nameAr: 'بلاتيني', minPoints: 10001, maxPoints: Infinity, color: '#3B82F6', icon: 'sparkles' },
];

export const QUICK_SERVICES = [
  { id: 'emergency', nameAr: 'طوارئ', icon: 'emergency', color: '#FF3B30', route: 'emergency' },
  { id: 'pharmacy', nameAr: 'صيدلية', icon: 'medication', color: '#22C55E', route: '(tabs)/pharmacy' },
  { id: 'diagnostics', nameAr: 'تحاليل', icon: 'science', color: '#8B5CF6', route: '(tabs)/diagnostics' },
  { id: 'nursing', nameAr: 'تمريض', icon: 'consultations', color: '#00C9A7', route: '(tabs)/nursing' },
  { id: 'mental_health', nameAr: 'صحة نفسية', icon: 'brain', color: '#6366F1', route: 'mental-health' },
  { id: 'nutrition', nameAr: 'تغذية', icon: 'food', color: '#22C55E', route: 'nutrition' },
];

export const VITAL_RANGES = {
  bloodPressure: { systolic: { min: 90, max: 120 }, diastolic: { min: 60, max: 80 } },
  heartRate: { min: 60, max: 100, unit: 'bpm' },
  bloodGlucose: { fasting: { min: 70, max: 100 }, postMeal: { min: 70, max: 140 }, unit: 'mg/dL' },
  temperature: { min: 36.1, max: 37.2, unit: '°C' },
  oxygen: { min: 95, max: 100, unit: '%' },
};

export const PAYMENT_METHODS = [
  { id: 'credit_card', nameAr: 'بطاقة ائتمان', icon: 'card' },
  { id: 'apple_pay', nameAr: 'Apple Pay', icon: 'apple', platform: 'ios' },
  { id: 'google_pay', nameAr: 'Google Pay', icon: 'google', platform: 'android' },
  { id: 'stc_pay', nameAr: 'STC Pay', icon: 'sparkles' },
  { id: 'cash', nameAr: 'كاش عند الزيارة', icon: 'cash' },
  { id: 'insurance', nameAr: 'تأمين صحي', icon: 'shield' },
  { id: 'wallet', nameAr: 'محفظة نبض', icon: 'wallet' },
  { id: 'loyalty_points', nameAr: 'نقاط النبض', icon: 'star' },
  { id: 'installment', nameAr: 'تقسيط', icon: 'receipt' },
];

export const LANGUAGES = [
  { code: 'ar', name: 'العربية', flag: 'SA', rtl: true },
  { code: 'en', name: 'English', flag: 'GB', rtl: false },
];

export const CANCELLATION_POLICY = [
  { hoursBeforeMin: 24, hoursBeforeMax: Infinity, refundPercent: 100, label: 'قبل 24 ساعة' },
  { hoursBeforeMin: 12, hoursBeforeMax: 24, refundPercent: 50, label: 'قبل 12 ساعة' },
  { hoursBeforeMin: 0, hoursBeforeMax: 12, refundPercent: 0, label: 'قبل 6 ساعات' },
];

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const FAMILY_RELATIONS = [
  { id: 'father', nameAr: 'أب', icon: 'user' },
  { id: 'mother', nameAr: 'أم', icon: 'user' },
  { id: 'son', nameAr: 'ابن', icon: 'user' },
  { id: 'daughter', nameAr: 'ابنة', icon: 'user' },
  { id: 'husband', nameAr: 'زوج', icon: 'user' },
  { id: 'wife', nameAr: 'زوجة', icon: 'user' },
  { id: 'brother', nameAr: 'شقيق', icon: 'user' },
  { id: 'sister', nameAr: 'أخت', icon: 'user' },
  { id: 'grandfather', nameAr: 'جد', icon: 'user' },
  { id: 'grandmother', nameAr: 'جدة', icon: 'user' },
];

export const EMERGENCY_NUMBERS = {
  ambulance: '997',
  police: '999',
  fire: '998',
  civilDefense: '911',
};
