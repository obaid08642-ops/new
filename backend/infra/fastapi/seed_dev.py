"""
Comprehensive seed data for Nabd Healthcare Platform - Saudi Arabia
Cities, Districts, Specialties, Insurance, Lab Tests, Radiology, Doctors, Pharmacies, Products
"""

from uuid import uuid4

# ============== CITIES & DISTRICTS (Comprehensive Saudi Arabia) ==============
CITIES_WITH_DISTRICTS = {
    "الرياض": {
        "en": "Riyadh",
        "districts": [
            # الشمال
            "الملقا", "الياسمين", "النرجس", "العقيق", "الصحافة", "حطين", "الغدير",
            "النخيل", "المحمدية", "القيروان", "العارض", "الندى", "الوادي",
            # الشرق
            "الروضة", "الريان", "اليرموك", "قرطبة", "غرناطة", "النهضة", "الخليج",
            "النسيم الشرقي", "النسيم الغربي", "إشبيلية", "المونسية", "الفلاح",
            # الوسط والجنوب
            "العليا", "السليمانية", "المربع", "الشفاء", "العزيزية", "الحاير",
            "بدر", "نمار", "الدار البيضاء", "منفوحة",
            # الغرب
            "لبن", "طويق", "العوالي", "السويدي", "البديعة", "ظهرة البديعة", "العريجاء"
        ]
    },
    "جدة": {
        "en": "Jeddah",
        "districts": [
            "الشاطئ", "أبحر الشمالية", "أبحر الجنوبية", "المحمدية", "المرجان",
            "النعيم", "النهضة", "الروضة", "السلامة", "الزهراء", "الحمراء",
            "الأندلس", "المشرفة", "العزيزية", "الصفا", "المروة", "الفيحاء",
            "السليمانية", "كنانة"
        ]
    },
    "مكة المكرمة": {
        "en": "Makkah",
        "districts": [
            "العوالي", "الشوقية", "بطحاء قريش", "العزيزية", "المسفلة", "الرصيفة",
            "الزاهر", "النزهة", "كدي", "جبل النور", "الشرائع"
        ]
    },
    "المدينة المنورة": {
        "en": "Madinah",
        "districts": [
            "العزيزية", "باقدو", "الحديقة", "الرانوناء", "الشريبات", "العريض",
            "الفيصلية", "الجرف", "الدويمة"
        ]
    },
    "الدمام": {
        "en": "Dammam",
        "districts": [
            "حي الشاطئ", "حي الفنار", "الدانة", "العقربية", "الراكة", "الهدا",
            "الحزام الذهبي", "الحزام الأخضر", "الروابي", "القصور"
        ]
    },
    "الخبر": {
        "en": "Khobar",
        "districts": [
            "الراكة الشمالية", "الراكة الجنوبية", "العقربية", "الثقبة",
            "الحزام الذهبي", "اليرموك", "الجوهرة", "الخبر الشمالية", "الخبر الجنوبية"
        ]
    },
    "الطائف": {
        "en": "Taif",
        "districts": ["شهار", "الحوية", "الشفا", "الهدا", "الخالدية", "النسيم", "السلامة"]
    },
    "تبوك": {
        "en": "Tabuk",
        "districts": ["العليا", "الورود", "السلام", "النسيم", "الفيصلية", "المروج"]
    },
    "أبها": {
        "en": "Abha",
        "districts": ["الموظفين", "المنسك", "الخالدية", "النصب", "الورود", "الشفا"]
    },
    "بريدة": {
        "en": "Buraidah",
        "districts": ["الصفراء", "الإسكان", "النخيل", "الروضة", "العزيزية", "الجامعيين"]
    },
    "حائل": {
        "en": "Hail",
        "districts": ["الجامعيين", "النقرة", "الزبارة", "الراشدية", "السمراء"]
    },
    "نجران": {
        "en": "Najran",
        "districts": ["الفيصلية", "الموفجة", "الفهد", "النهضة", "العزيزية"]
    },
    "جازان": {
        "en": "Jazan",
        "districts": ["الشاطئ", "الروضة", "السلام", "المطار", "البلد"]
    },
    "ينبع": {
        "en": "Yanbu",
        "districts": ["ينبع الصناعية", "ينبع البحر", "الشاطئ", "الندى", "الهجرة"]
    },
    "الجبيل": {
        "en": "Jubail",
        "districts": ["الجلمودة", "الفنار", "الديفي", "البلد", "الجوهرة"]
    },
    "الأحساء": {
        "en": "Al-Ahsa",
        "districts": ["الهفوف", "المبرز", "العيون", "الجفر", "العمران"]
    }
}

# ============== MEDICAL SPECIALTIES ==============
SPECIALTIES = [
    {"ar": "جلدية", "en": "Dermatology", "icon": "skin"},
    {"ar": "أسنان", "en": "Dentistry", "icon": "tooth"},
    {"ar": "نفسي", "en": "Psychiatry", "icon": "brain"},
    {"ar": "أطفال", "en": "Pediatrics", "icon": "child"},
    {"ar": "مخ وأعصاب", "en": "Neurology", "icon": "brain"},
    {"ar": "عظام", "en": "Orthopedics", "icon": "bone"},
    {"ar": "نساء وتوليد", "en": "Gynecology & Obstetrics", "icon": "baby"},
    {"ar": "أنف وأذن وحنجرة", "en": "ENT", "icon": "ear"},
    {"ar": "قلب وأوعية دموية", "en": "Cardiology", "icon": "heart"},
    {"ar": "أمراض دم", "en": "Hematology", "icon": "blood"},
    {"ar": "أورام", "en": "Oncology", "icon": "ribbon"},
    {"ar": "باطنة", "en": "Internal Medicine", "icon": "stethoscope"},
    {"ar": "تغذية", "en": "Nutrition", "icon": "apple"},
    {"ar": "جراحة أطفال", "en": "Pediatric Surgery", "icon": "scalpel"},
    {"ar": "جراحة تجميل", "en": "Plastic Surgery", "icon": "face"},
    {"ar": "جراحة السمنة ومناظير", "en": "Bariatric & Endoscopic Surgery", "icon": "stomach"},
    {"ar": "ذكورة وعقم", "en": "Andrology & Infertility", "icon": "dna"},
    {"ar": "سكر وغدد صماء", "en": "Endocrinology", "icon": "pancreas"},
    {"ar": "طب الأسرة", "en": "Family Medicine", "icon": "family"},
    {"ar": "طب المسنين", "en": "Geriatrics", "icon": "elderly"},
    {"ar": "طب تقويمي", "en": "Orthodontics", "icon": "braces"},
    {"ar": "علاج الآلام", "en": "Pain Management", "icon": "syringe"},
    {"ar": "علاج طبيعي", "en": "Physical Therapy", "icon": "physio"},
    {"ar": "عيون", "en": "Ophthalmology", "icon": "eye"},
    {"ar": "كلى", "en": "Nephrology", "icon": "kidney"},
    {"ar": "مسالك بولية", "en": "Urology", "icon": "bladder"},
    {"ar": "معامل تحاليل", "en": "Medical Labs", "icon": "flask"},
    {"ar": "مراكز أشعة", "en": "Radiology Centers", "icon": "scan"}
]

# ============== INSURANCE COMPANIES ==============
INSURANCE_COMPANIES = [
    {"ar": "بوبا", "en": "Bupa", "tiers": ["الزرقاء", "البرونزية", "الفضية", "الذهبية"]},
    {"ar": "التعاونية", "en": "Tawuniya", "tiers": ["الأساسية", "البرونزية", "الفضية", "الذهبية", "البلاتينية", "المميزة A", "المميزة B"]},
    {"ar": "ميدغلف", "en": "MedGulf", "tiers": ["A", "B", "C"]},
    {"ar": "تكافل الراجحي", "en": "Al-Rajhi Takaful", "tiers": ["أساسية", "ذهبية"]},
    {"ar": "أمانة", "en": "Amana", "tiers": ["عادية", "ممتازة"]},
    {"ar": "بروج", "en": "Buruj", "tiers": ["أساسية", "VIP"]},
    {"ar": "الصقر", "en": "Al-Sagr", "tiers": ["A", "B"]},
    {"ar": "الدرع العربي", "en": "Arabian Shield", "tiers": ["برونزية", "ذهبية"]},
    {"ar": "إكسا", "en": "AXA", "tiers": ["أساسية", "متقدمة"]},
    {"ar": "العالمية", "en": "Alalamiya", "tiers": ["أساسية"]},
    {"ar": "سايكو", "en": "SAICO", "tiers": ["أساسية", "VIP"]},
    {"ar": "المتحدة", "en": "United Cooperative", "tiers": ["A", "B"]},
    {"ar": "اتحاد الخليج", "en": "Gulf Union", "tiers": ["أساسية"]},
    {"ar": "التأمين العربية", "en": "Arabia Insurance", "tiers": ["A", "B"]},
    {"ar": "أسيج", "en": "ACIG", "tiers": ["أساسية"]},
    {"ar": "الأهلية", "en": "Al-Ahlia", "tiers": ["عادية"]},
    {"ar": "ولاء", "en": "Walaa", "tiers": ["أساسية", "متقدمة"]},
    {"ar": "وفا", "en": "Wafa", "tiers": ["أساسية"]}
]

# ============== LAB TESTS (50+) ==============
LAB_TESTS = [
    # المسح الشامل
    {"ar": "صورة دم كاملة CBC", "en": "Complete Blood Count (CBC)", "category": "blood", "price": 80},
    {"ar": "سكر صائم", "en": "Fasting Blood Sugar", "category": "diabetes", "price": 30},
    {"ar": "سكر عشوائي", "en": "Random Blood Sugar", "category": "diabetes", "price": 30},
    {"ar": "السكر التراكمي HbA1c", "en": "Hemoglobin A1c", "category": "diabetes", "price": 90},
    {"ar": "وظائف الكبد AST", "en": "AST", "category": "liver", "price": 40},
    {"ar": "وظائف الكبد ALT", "en": "ALT", "category": "liver", "price": 40},
    {"ar": "وظائف الكبد ALP", "en": "Alkaline Phosphatase", "category": "liver", "price": 45},
    {"ar": "بيليروبين Bilirubin", "en": "Bilirubin", "category": "liver", "price": 50},
    {"ar": "وظائف الكلى يوريا", "en": "Urea", "category": "kidney", "price": 35},
    {"ar": "وظائف الكلى كرياتينين", "en": "Creatinine", "category": "kidney", "price": 35},
    {"ar": "معدل الترشيح GFR", "en": "GFR", "category": "kidney", "price": 60},
    {"ar": "صوديوم", "en": "Sodium", "category": "electrolytes", "price": 30},
    {"ar": "بوتاسيوم", "en": "Potassium", "category": "electrolytes", "price": 30},
    {"ar": "كالسيوم", "en": "Calcium", "category": "electrolytes", "price": 35},
    # الهرمونات
    {"ar": "الغدة الدرقية TSH", "en": "TSH", "category": "hormones", "price": 90},
    {"ar": "T3", "en": "T3", "category": "hormones", "price": 85},
    {"ar": "T4", "en": "T4", "category": "hormones", "price": 85},
    {"ar": "فيتامين د", "en": "Vitamin D", "category": "vitamins", "price": 150},
    {"ar": "فيتامين ب12", "en": "Vitamin B12", "category": "vitamins", "price": 120},
    {"ar": "حديد Ferritin", "en": "Ferritin", "category": "minerals", "price": 90},
    {"ar": "هرمون FSH", "en": "FSH", "category": "fertility", "price": 110},
    {"ar": "هرمون LH", "en": "LH", "category": "fertility", "price": 110},
    {"ar": "برولاكتين", "en": "Prolactin", "category": "fertility", "price": 100},
    {"ar": "تستوستيرون", "en": "Testosterone", "category": "fertility", "price": 130},
    # الفحوصات المتخصصة
    {"ar": "دلالة ورم البروستاتا PSA", "en": "PSA", "category": "tumor_markers", "price": 180},
    {"ar": "دلالة ورم CEA", "en": "CEA", "category": "tumor_markers", "price": 160},
    {"ar": "فحص المناعة ANA", "en": "ANA Test", "category": "immunology", "price": 200},
    {"ar": "سيولة الدم PT", "en": "PT", "category": "coagulation", "price": 70},
    {"ar": "سيولة الدم PTT", "en": "PTT", "category": "coagulation", "price": 70},
    {"ar": "سيولة الدم INR", "en": "INR", "category": "coagulation", "price": 80},
    {"ar": "حمض اليوريك (النقرس)", "en": "Uric Acid", "category": "blood", "price": 45},
    {"ar": "حساسية الطعام", "en": "Food Allergy Panel", "category": "allergy", "price": 350},
    {"ar": "فحص ما قبل الزواج", "en": "Pre-Marriage Screening", "category": "general", "price": 250},
    {"ar": "فحص العمالة", "en": "Worker Health Screening", "category": "general", "price": 200},
    {"ar": "تحليل السموم", "en": "Toxicology Screen", "category": "general", "price": 280},
    {"ar": "كوليسترول كلي", "en": "Total Cholesterol", "category": "lipids", "price": 60},
    {"ar": "كوليسترول HDL", "en": "HDL", "category": "lipids", "price": 55},
    {"ar": "كوليسترول LDL", "en": "LDL", "category": "lipids", "price": 55},
    {"ar": "دهون ثلاثية", "en": "Triglycerides", "category": "lipids", "price": 60},
    {"ar": "تحليل بول كامل", "en": "Urinalysis", "category": "urine", "price": 40},
    {"ar": "زراعة بول", "en": "Urine Culture", "category": "urine", "price": 90},
    {"ar": "زراعة براز", "en": "Stool Culture", "category": "stool", "price": 80},
    {"ar": "فحص الحمل HCG", "en": "Beta HCG", "category": "fertility", "price": 90},
    {"ar": "فيتامين A", "en": "Vitamin A", "category": "vitamins", "price": 140},
    {"ar": "فيتامين E", "en": "Vitamin E", "category": "vitamins", "price": 140},
    {"ar": "ماغنسيوم", "en": "Magnesium", "category": "electrolytes", "price": 50},
    {"ar": "زنك", "en": "Zinc", "category": "minerals", "price": 70},
    {"ar": "فحص HIV", "en": "HIV Test", "category": "infectious", "price": 120},
    {"ar": "التهاب الكبد B", "en": "Hepatitis B", "category": "infectious", "price": 110},
    {"ar": "التهاب الكبد C", "en": "Hepatitis C", "category": "infectious", "price": 130},
    {"ar": "فحص كورونا PCR", "en": "COVID-19 PCR", "category": "infectious", "price": 140},
]

# ============== RADIOLOGY ==============
RADIOLOGY = [
    # X-Ray
    {"ar": "أشعة عادية على الصدر", "en": "Chest X-Ray", "type": "xray", "price": 100},
    {"ar": "أشعة على العمود الفقري", "en": "Spine X-Ray", "type": "xray", "price": 150},
    {"ar": "أشعة على الأطراف", "en": "Limb X-Ray", "type": "xray", "price": 120},
    {"ar": "أشعة على الحوض", "en": "Pelvic X-Ray", "type": "xray", "price": 130},
    # Ultrasound
    {"ar": "سونار بطن", "en": "Abdominal Ultrasound", "type": "ultrasound", "price": 200},
    {"ar": "سونار حوض", "en": "Pelvic Ultrasound", "type": "ultrasound", "price": 200},
    {"ar": "سونار غدة درقية", "en": "Thyroid Ultrasound", "type": "ultrasound", "price": 180},
    {"ar": "سونار حمل 2D", "en": "Pregnancy Ultrasound 2D", "type": "ultrasound", "price": 200},
    {"ar": "سونار حمل 3D", "en": "Pregnancy Ultrasound 3D", "type": "ultrasound", "price": 350},
    {"ar": "سونار حمل 4D", "en": "Pregnancy Ultrasound 4D", "type": "ultrasound", "price": 450},
    {"ar": "دوبلر ملون للأوعية", "en": "Color Doppler", "type": "ultrasound", "price": 400},
    # MRI
    {"ar": "رنين مغناطيسي على المخ", "en": "Brain MRI", "type": "mri", "price": 900},
    {"ar": "رنين مغناطيسي على الفقرات", "en": "Spine MRI", "type": "mri", "price": 950},
    {"ar": "رنين مغناطيسي على المفاصل", "en": "Joint MRI", "type": "mri", "price": 850},
    {"ar": "رنين بالصبغة", "en": "Contrast MRI", "type": "mri", "price": 1200},
    # CT Scan
    {"ar": "مقطعية على الصدر", "en": "Chest CT Scan", "type": "ct", "price": 600},
    {"ar": "مقطعية على البطن", "en": "Abdominal CT Scan", "type": "ct", "price": 650},
    {"ar": "مقطعية على الجيوب الأنفية", "en": "Sinus CT Scan", "type": "ct", "price": 500},
    # Other
    {"ar": "بانوراما الأسنان", "en": "Dental Panorama", "type": "other", "price": 150},
    {"ar": "ماموجرام للثدي", "en": "Mammogram", "type": "other", "price": 300},
    {"ar": "ديكسا (هشاشة العظام)", "en": "DEXA Scan", "type": "other", "price": 280},
]

# ============== SAMPLE DOCTORS (Realistic Seed) ==============
SAMPLE_DOCTORS = [
    {
        "full_name_ar": "د. فتحي الكردي",
        "full_name_en": "Dr. Fathi Al-Kurdi",
        "specialty": "جلدية",
        "title": "إخصائي",
        "sub_specialties": ["تجميل وليزر", "جلدية بالغين"],
        "credentials": "زمالة الكلية الملكية البريطانية، MD Dermatology",
        "city": "الرياض", "district": "العليا",
        "hospital": "مركز الطائف الطبي بالرياض",
        "consultation_modes": ["clinic", "online", "home"],
        "price_clinic": 75, "price_online": 50, "price_home": 200,
        "rating": 4.8, "reviews_count": 213,
        "avatar": "https://images.unsplash.com/photo-1612531385446-f7e6d131e1d0?w=400",
        "license_verified": True, "status": "active",
        "available_today": True, "next_slot": "2:00 م",
        "wait_time_min": 9
    },
    {
        "full_name_ar": "د. سارة العتيبي",
        "full_name_en": "Dr. Sarah Al-Otaibi",
        "specialty": "نساء وتوليد",
        "title": "استشاري",
        "sub_specialties": ["أمراض النساء", "عقم وحقن مجهري"],
        "credentials": "بورد سعودي، زمالة كندية",
        "city": "جدة", "district": "الروضة",
        "hospital": "مستشفى الدكتور سليمان فقيه",
        "consultation_modes": ["clinic", "online"],
        "price_clinic": 250, "price_online": 150,
        "rating": 4.9, "reviews_count": 489,
        "avatar": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400",
        "license_verified": True, "status": "active",
        "available_today": True, "next_slot": "5:30 م",
        "wait_time_min": 15
    },
    {
        "full_name_ar": "د. أحمد الشمري",
        "full_name_en": "Dr. Ahmed Al-Shammari",
        "specialty": "قلب وأوعية دموية",
        "title": "استشاري",
        "sub_specialties": ["قسطرة قلبية", "قصور قلب"],
        "credentials": "زمالة أمريكية، بورد سعودي",
        "city": "الرياض", "district": "النخيل",
        "hospital": "مستشفى الملك فيصل التخصصي",
        "consultation_modes": ["clinic", "online", "home"],
        "price_clinic": 400, "price_online": 200, "price_home": 600,
        "rating": 4.9, "reviews_count": 612,
        "avatar": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400",
        "license_verified": True, "status": "active",
        "available_today": False, "next_slot": "غداً 10:00 ص",
        "wait_time_min": 0
    },
    {
        "full_name_ar": "د. ليلى الزهراني",
        "full_name_en": "Dr. Layla Al-Zahrani",
        "specialty": "أطفال",
        "title": "إخصائي",
        "sub_specialties": ["حديثي الولادة", "تطعيمات"],
        "credentials": "ماجستير طب أطفال - جامعة الملك سعود",
        "city": "الرياض", "district": "الياسمين",
        "hospital": "مستشفى الحبيب",
        "consultation_modes": ["clinic", "online", "home"],
        "price_clinic": 150, "price_online": 90, "price_home": 300,
        "rating": 4.7, "reviews_count": 305,
        "avatar": "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400",
        "license_verified": True, "status": "active",
        "available_today": True, "next_slot": "3:15 م",
        "wait_time_min": 12
    },
    {
        "full_name_ar": "د. خالد المطيري",
        "full_name_en": "Dr. Khalid Al-Mutairi",
        "specialty": "أسنان",
        "title": "استشاري",
        "sub_specialties": ["تقويم أسنان", "زراعة"],
        "credentials": "ماجستير تقويم - زمالة أمريكية",
        "city": "الدمام", "district": "الراكة",
        "hospital": "عيادات سمايل الدنتل",
        "consultation_modes": ["clinic", "online"],
        "price_clinic": 200, "price_online": 100,
        "rating": 4.6, "reviews_count": 178,
        "avatar": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400",
        "license_verified": True, "status": "active",
        "available_today": True, "next_slot": "1:00 م",
        "wait_time_min": 5
    },
    {
        "full_name_ar": "د. منى السبيعي",
        "full_name_en": "Dr. Mona Al-Subaie",
        "specialty": "نفسي",
        "title": "استشاري",
        "sub_specialties": ["اكتئاب", "قلق", "علاج معرفي سلوكي"],
        "credentials": "بورد سعودي طب نفسي",
        "city": "الرياض", "district": "الملقا",
        "hospital": "مركز إرادة للصحة النفسية",
        "consultation_modes": ["online", "clinic"],
        "price_clinic": 350, "price_online": 200,
        "rating": 4.9, "reviews_count": 422,
        "avatar": "https://images.unsplash.com/photo-1638202993928-7267aad84c31?w=400",
        "license_verified": True, "status": "active",
        "available_today": True, "next_slot": "6:00 م",
        "wait_time_min": 20
    },
    {
        "full_name_ar": "د. عبدالله الحربي",
        "full_name_en": "Dr. Abdullah Al-Harbi",
        "specialty": "عظام",
        "title": "استشاري",
        "sub_specialties": ["جراحة العمود الفقري", "إصابات الملاعب"],
        "credentials": "زمالة بريطانية FRCS",
        "city": "جدة", "district": "الحمراء",
        "hospital": "مستشفى الدكتور سامير عباس",
        "consultation_modes": ["clinic", "online"],
        "price_clinic": 300, "price_online": 180,
        "rating": 4.8, "reviews_count": 256,
        "avatar": "https://images.unsplash.com/photo-1612531386530-97286d97c2d2?w=400",
        "license_verified": True, "status": "active",
        "available_today": False, "next_slot": "بعد غد 9:00 ص",
        "wait_time_min": 0
    },
    {
        "full_name_ar": "د. نورة القحطاني",
        "full_name_en": "Dr. Noura Al-Qahtani",
        "specialty": "تغذية",
        "title": "إخصائي",
        "sub_specialties": ["تغذية رياضية", "تخسيس"],
        "credentials": "بكالوريوس تغذية إكلينيكية",
        "city": "الرياض", "district": "الروضة",
        "hospital": "عيادات صحتي",
        "consultation_modes": ["online", "clinic", "home"],
        "price_clinic": 150, "price_online": 80, "price_home": 250,
        "rating": 4.7, "reviews_count": 189,
        "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400",
        "license_verified": True, "status": "active",
        "available_today": True, "next_slot": "4:30 م",
        "wait_time_min": 8
    },
]

# ============== SAMPLE PHARMACIES ==============
SAMPLE_PHARMACIES = [
    {
        "name_ar": "صيدلية النهدي - الياسمين",
        "name_en": "Al-Nahdi Pharmacy - Yasmin",
        "city": "الرياض", "district": "الياسمين",
        "address": "شارع الأمير محمد بن عبدالعزيز",
        "lat": 24.8347, "lng": 46.6753,
        "rating": 4.7, "delivery_available": True, "delivery_fee": 15,
        "open_24h": True, "phone": "920001907",
        "license_verified": True, "status": "active"
    },
    {
        "name_ar": "صيدلية الدواء - العليا",
        "name_en": "Al-Dawaa Pharmacy - Olaya",
        "city": "الرياض", "district": "العليا",
        "address": "شارع العليا الرئيسي",
        "lat": 24.6912, "lng": 46.6855,
        "rating": 4.6, "delivery_available": True, "delivery_fee": 12,
        "open_24h": True, "phone": "920003344",
        "license_verified": True, "status": "active"
    },
    {
        "name_ar": "صيدلية الشفاء - السلامة",
        "name_en": "Al-Shifa Pharmacy - Salama",
        "city": "جدة", "district": "السلامة",
        "address": "طريق الأمير سلطان",
        "lat": 21.5867, "lng": 39.1567,
        "rating": 4.5, "delivery_available": True, "delivery_fee": 18,
        "open_24h": False, "phone": "920002233",
        "license_verified": True, "status": "active"
    },
    {
        "name_ar": "صيدلية يونايتد - الراكة",
        "name_en": "United Pharmacy - Rakah",
        "city": "الدمام", "district": "الراكة",
        "address": "شارع الملك فهد",
        "lat": 26.3023, "lng": 50.2189,
        "rating": 4.4, "delivery_available": True, "delivery_fee": 20,
        "open_24h": True, "phone": "920005511",
        "license_verified": True, "status": "active"
    },
]

# ============== SAMPLE PRODUCTS (Medicines, Skin, Hair, Baby) ==============
SAMPLE_PRODUCTS = [
    # Medications
    {
        "name_ar": "بانادول إكسترا", "name_en": "Panadol Extra",
        "category": "medications", "active_ingredient": "Paracetamol + Caffeine",
        "price": 18, "requires_prescription": False,
        "image": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400",
        "description_ar": "مسكن قوي للصداع وآلام الجسم",
        "manufacturer": "GSK", "in_stock": True, "stock_count": 250
    },
    {
        "name_ar": "أوغمنتين 1 جم", "name_en": "Augmentin 1g",
        "category": "medications", "active_ingredient": "Amoxicillin + Clavulanic Acid",
        "price": 45, "requires_prescription": True,
        "image": "https://images.unsplash.com/photo-1550572017-edd951b55104?w=400",
        "description_ar": "مضاد حيوي واسع المجال",
        "manufacturer": "GSK", "in_stock": True, "stock_count": 80
    },
    {
        "name_ar": "كونجستال", "name_en": "Congestal",
        "category": "medications", "active_ingredient": "Paracetamol + Chlorpheniramine + Pseudoephedrine",
        "price": 22, "requires_prescription": False,
        "image": "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400",
        "description_ar": "علاج البرد والإنفلونزا",
        "manufacturer": "Sigma Pharma", "in_stock": True, "stock_count": 120
    },
    {
        "name_ar": "ابيمول للأطفال", "name_en": "Abimol Kids",
        "category": "medications", "active_ingredient": "Paracetamol",
        "price": 14, "requires_prescription": False,
        "image": "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=400",
        "description_ar": "خافض للحرارة للأطفال",
        "manufacturer": "Hikma", "in_stock": False, "stock_count": 0
    },
    # Skin Care
    {
        "name_ar": "سيرافي مرطب", "name_en": "CeraVe Moisturizer",
        "category": "skincare", "active_ingredient": "Ceramides + Hyaluronic Acid",
        "price": 89, "requires_prescription": False,
        "image": "https://images.pexels.com/photos/6167872/pexels-photo-6167872.jpeg?w=400",
        "description_ar": "مرطب يومي للوجه والجسم",
        "manufacturer": "CeraVe", "in_stock": True, "stock_count": 150
    },
    {
        "name_ar": "لاروش بوزيه واقي شمس", "name_en": "La Roche Sunscreen SPF 50",
        "category": "skincare", "active_ingredient": "Tinosorb + Avobenzone",
        "price": 175, "requires_prescription": False,
        "image": "https://images.pexels.com/photos/8101674/pexels-photo-8101674.jpeg?w=400",
        "description_ar": "واقي شمس عالي الحماية",
        "manufacturer": "La Roche Posay", "in_stock": True, "stock_count": 95
    },
    # Hair Care
    {
        "name_ar": "مينوكسيديل 5%", "name_en": "Minoxidil 5%",
        "category": "haircare", "active_ingredient": "Minoxidil",
        "price": 145, "requires_prescription": False,
        "image": "https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=400",
        "description_ar": "علاج تساقط الشعر",
        "manufacturer": "Kirkland", "in_stock": True, "stock_count": 65
    },
    # Baby Care
    {
        "name_ar": "حفاضات بامبرز مقاس 4", "name_en": "Pampers Size 4",
        "category": "babycare", "active_ingredient": "",
        "price": 95, "requires_prescription": False,
        "image": "https://images.unsplash.com/photo-1515688594390-b649af18d342?w=400",
        "description_ar": "حفاضات للأطفال 9-14 كجم",
        "manufacturer": "Pampers", "in_stock": True, "stock_count": 200
    },
    {
        "name_ar": "حليب أبتاميل 2", "name_en": "Aptamil 2",
        "category": "babycare", "active_ingredient": "",
        "price": 78, "requires_prescription": False,
        "image": "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=400",
        "description_ar": "حليب رضع للأعمار 6-12 شهر",
        "manufacturer": "Nutricia", "in_stock": True, "stock_count": 110
    },
]


async def seed_test_data(db, now_utc):
    """Populate disposable test fixtures only when the caller explicitly enables test seeding."""
    if await db.cities.count_documents({}) == 0:
        cities = [
            {"id": str(uuid4()), "name_ar": name, "name_en": value["en"], "districts": value["districts"]}
            for name, value in CITIES_WITH_DISTRICTS.items()
        ]
        await db.cities.insert_many(cities)
    if await db.specialties.count_documents({}) == 0:
        await db.specialties.insert_many([{"id": str(uuid4()), **item} for item in SPECIALTIES])
    if await db.insurance_companies.count_documents({}) == 0:
        await db.insurance_companies.insert_many([{"id": str(uuid4()), **item} for item in INSURANCE_COMPANIES])
    if await db.lab_tests.count_documents({}) == 0:
        await db.lab_tests.insert_many([{"id": str(uuid4()), **item} for item in LAB_TESTS])
    if await db.radiology.count_documents({}) == 0:
        await db.radiology.insert_many([{"id": str(uuid4()), **item} for item in RADIOLOGY])
    if await db.doctors.count_documents({}) == 0:
        await db.doctors.insert_many([{"id": str(uuid4()), "created_at": now_utc(), **item} for item in SAMPLE_DOCTORS])
    if await db.pharmacies.count_documents({}) == 0:
        await db.pharmacies.insert_many([{"id": str(uuid4()), "created_at": now_utc(), **item} for item in SAMPLE_PHARMACIES])
    if await db.products.count_documents({}) == 0:
        await db.products.insert_many([{"id": str(uuid4()), "created_at": now_utc(), **item} for item in SAMPLE_PRODUCTS])
