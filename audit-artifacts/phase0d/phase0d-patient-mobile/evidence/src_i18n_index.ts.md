# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/i18n/index.ts`
- **Member SHA-256:** `fb6c6938d4694f95187252c00c74f6b442262d0806969330d07346456afc6d32`
- **Line count:** 357
- **Read range:** `1-357`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: settings: string; profile: string; search: string; save: string; cancel: string; back: string;`
- `7: loading: string; error: string; success: string; retry: string; logout: string;`
- `8: login: string; register: string; forgotPassword: string; otp: string; guestMode: string;`
- `13: doctor: string; appointment: string; booking: string; price: string; rating: string;`
- `19: checkout: string; track: string; confirm: string; reject: string; accept: string; decline: string;`
- `29: settings: 'الإعدادات', profile: 'حسابي', search: 'بحث', save: 'حفظ', cancel: 'إلغاء', back: 'رجوع',`
- `30: loading: 'جاري التحميل...', error: 'خطأ', success: 'تم بنجاح', retry: 'إعادة المحاولة', logout: 'تسجيل الخروج',`
- `31: login: 'تسجيل الدخول', register: 'إنشاء حساب', forgotPassword: 'نسيت كلمة المرور', otp: 'رمز التحقق', guestMode: 'تصفّح كزائر',`
- `36: doctor: 'طبيب', appointment: 'موعد', booking: 'حجز', price: 'السعر', rating: 'التقييم',`
- `42: checkout: 'إتمام الشراء', track: 'تتبع', confirm: 'تأكيد', reject: 'رفض', accept: 'قبول', decline: 'رفض',`
- `50: settings: 'Settings', profile: 'Profile', search: 'Search', save: 'Save', cancel: 'Cancel', back: 'Back',`
- `51: loading: 'Loading...', error: 'Error', success: 'Success', retry: 'Retry', logout: 'Logout',`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `7: loading: string; error: string; success: string; retry: string; logout: string;`
- `8: login: string; register: string; forgotPassword: string; otp: string; guestMode: string;`
- `30: loading: 'جاري التحميل...', error: 'خطأ', success: 'تم بنجاح', retry: 'إعادة المحاولة', logout: 'تسجيل الخروج',`
- `31: login: 'تسجيل الدخول', register: 'إنشاء حساب', forgotPassword: 'نسيت كلمة المرور', otp: 'رمز التحقق', guestMode: 'تصفّح كزائر',`
- `51: loading: 'Loading...', error: 'Error', success: 'Success', retry: 'Retry', logout: 'Logout',`
- `52: login: 'Login', register: 'Register', forgotPassword: 'Forgot Password', otp: 'Verification', guestMode: 'Browse as Guest',`
- `72: loading: 'لوڈ ہو رہا ہے...', error: 'خرابی', success: 'کامیاب', retry: 'دوبارہ', logout: 'لاگ آؤٹ',`
- `73: login: 'لاگ ان', register: 'اکاؤنٹ بنائیں', forgotPassword: 'پاسورڈ بھول گئے', otp: 'تصدیقی کوڈ', guestMode: 'مہمان کے طور پر',`
- `93: loading: 'लोड हो रहा है...', error: 'त्रुटि', success: 'सफल', retry: 'पुनः प्रयास', logout: 'लॉगआउट',`
- `94: login: 'लॉगइन', register: 'रजिस्टर', forgotPassword: 'पासवर्ड भूल गए', otp: 'सत्यापन', guestMode: 'अतिथि मोड',`
- `114: loading: 'লোড হচ্ছে...', error: 'ত্রুটি', success: 'সফল', retry: 'আবার চেষ্টা', logout: 'লগআউট',`
- `115: login: 'লগইন', register: 'নিবন্ধন', forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন', otp: 'যাচাইকরণ', guestMode: 'অতিথি হিসেবে',`
### state_transitions
- `6: settings: string; profile: string; search: string; save: string; cancel: string; back: string;`
- `7: loading: string; error: string; success: string; retry: string; logout: string;`
- `29: settings: 'الإعدادات', profile: 'حسابي', search: 'بحث', save: 'حفظ', cancel: 'إلغاء', back: 'رجوع',`
- `30: loading: 'جاري التحميل...', error: 'خطأ', success: 'تم بنجاح', retry: 'إعادة المحاولة', logout: 'تسجيل الخروج',`
- `50: settings: 'Settings', profile: 'Profile', search: 'Search', save: 'Save', cancel: 'Cancel', back: 'Back',`
- `51: loading: 'Loading...', error: 'Error', success: 'Success', retry: 'Retry', logout: 'Logout',`
- `71: settings: 'ترتیبات', profile: 'پروفائل', search: 'تلاش', save: 'محفوظ', cancel: 'منسوخ', back: 'واپس',`
- `72: loading: 'لوڈ ہو رہا ہے...', error: 'خرابی', success: 'کامیاب', retry: 'دوبارہ', logout: 'لاگ آؤٹ',`
- `92: settings: 'सेटिंग्स', profile: 'प्रोफ़ाइल', search: 'खोज', save: 'सेव', cancel: 'रद्द', back: 'वापस',`
- `93: loading: 'लोड हो रहा है...', error: 'त्रुटि', success: 'सफल', retry: 'पुनः प्रयास', logout: 'लॉगआउट',`
- `113: settings: 'সেটিংস', profile: 'প্রোফাইল', search: 'খুঁজুন', save: 'সেভ', cancel: 'বাতিল', back: 'পেছনে',`
- `114: loading: 'লোড হচ্ছে...', error: 'ত্রুটি', success: 'সফল', retry: 'আবার চেষ্টা', logout: 'লগআউট',`
### payment_insurance_relevance
- `13: doctor: string; appointment: string; booking: string; price: string; rating: string;`
- `17: nursing: string; delivery: string; emergency: string; wallet: string; insurance: string; map: string; community: string;`
- `21: myCards: string; addCard: string; myOrders: string; orderTracking: string;`
- `36: doctor: 'طبيب', appointment: 'موعد', booking: 'حجز', price: 'السعر', rating: 'التقييم',`
- `40: nursing: 'تمريض منزلي', delivery: 'توصيل', emergency: 'طوارئ', wallet: 'المحفظة', insurance: 'التأمين', map: 'الخريطة', community: 'المجتمع',`
- `44: myCards: 'بطاقاتي', addCard: 'إضافة بطاقة', myOrders: 'طلباتي', orderTracking: 'تتبع الطلب',`
- `57: doctor: 'Doctor', appointment: 'Appointment', booking: 'Booking', price: 'Price', rating: 'Rating',`
- `61: nursing: 'Home Nursing', delivery: 'Delivery', emergency: 'Emergency', wallet: 'Wallet', insurance: 'Insurance', map: 'Map', community: 'Community',`
- `65: myCards: 'My Cards', addCard: 'Add Card', myOrders: 'My Orders', orderTracking: 'Order Tracking',`
- `78: doctor: 'ڈاکٹر', appointment: 'ملاقات', booking: 'بکنگ', price: 'قیمت', rating: 'درجہ بندی',`
- `82: nursing: 'گھریلو نرسنگ', delivery: 'ڈیلیوری', emergency: 'ایمرجنسی', wallet: 'والیٹ', insurance: 'انشورنس', map: 'نقشہ', community: 'کمیونٹی',`
- `86: myCards: 'میرے کارڈز', addCard: 'کارڈ شامل کریں', myOrders: 'میرے آرڈرز', orderTracking: 'آرڈر ٹریکنگ',`
### error_empty_loading_retry_cancel
- `6: settings: string; profile: string; search: string; save: string; cancel: string; back: string;`
- `7: loading: string; error: string; success: string; retry: string; logout: string;`
- `29: settings: 'الإعدادات', profile: 'حسابي', search: 'بحث', save: 'حفظ', cancel: 'إلغاء', back: 'رجوع',`
- `30: loading: 'جاري التحميل...', error: 'خطأ', success: 'تم بنجاح', retry: 'إعادة المحاولة', logout: 'تسجيل الخروج',`
- `50: settings: 'Settings', profile: 'Profile', search: 'Search', save: 'Save', cancel: 'Cancel', back: 'Back',`
- `51: loading: 'Loading...', error: 'Error', success: 'Success', retry: 'Retry', logout: 'Logout',`
- `71: settings: 'ترتیبات', profile: 'پروفائل', search: 'تلاش', save: 'محفوظ', cancel: 'منسوخ', back: 'واپس',`
- `72: loading: 'لوڈ ہو رہا ہے...', error: 'خرابی', success: 'کامیاب', retry: 'دوبارہ', logout: 'لاگ آؤٹ',`
- `92: settings: 'सेटिंग्स', profile: 'प्रोफ़ाइल', search: 'खोज', save: 'सेव', cancel: 'रद्द', back: 'वापस',`
- `93: loading: 'लोड हो रहा है...', error: 'त्रुटि', success: 'सफल', retry: 'पुनः प्रयास', logout: 'लॉगआउट',`
- `113: settings: 'সেটিংস', profile: 'প্রোফাইল', search: 'খুঁজুন', save: 'সেভ', cancel: 'বাতিল', back: 'পেছনে',`
- `114: loading: 'লোড হচ্ছে...', error: 'ত্রুটি', success: 'সফল', retry: 'আবার চেষ্টা', logout: 'লগআউট',`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
