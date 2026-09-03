export interface SeedCondition {
  code: string;
  name_ar: string;
  name_en: string;
  symptoms: string[];
  specialties: string[];
  relevant_services: string[];
  relevant_ingredients: string[];
  overview_ar: string;
  overview_en: string;
  is_active: boolean;
}

export const SEED_CONDITIONS: SeedCondition[] = [
  {
    code: 'headache',
    name_ar: 'الصداع وألم الرأس',
    name_en: 'Headache',
    symptoms: ['صداع', 'headache', 'ألم بالرأس', 'شقيقة', 'migraine'],
    specialties: ['internal_medicine', 'neurology'],
    relevant_services: ['consultation', 'brain_mri'],
    relevant_ingredients: ['paracetamol', 'ibuprofen'],
    overview_ar: 'الصداع عرض شائع قد ينجم عن الإجهاد أو التوتر أو قلة النوم أو أسباب طبية أخرى.',
    overview_en: 'Headache is a common condition that can result from stress, tension, lack of sleep, or other medical causes.',
    is_active: true,
  },
  {
    code: 'fever',
    name_ar: 'الحمى وارتفاع درجة الحرارة',
    name_en: 'Fever',
    symptoms: ['حرارة', 'حمى', 'fever', 'سخونة', 'ارتفاع حرارة'],
    specialties: ['pediatrics', 'internal_medicine'],
    relevant_services: ['consultation', 'blood_test', 'cbc'],
    relevant_ingredients: ['paracetamol', 'ibuprofen'],
    overview_ar: 'الحمى هي ارتفاع مؤقت في درجة حرارة الجسم وغالباً ما تكون استجابة مناعية لعدوى.',
    overview_en: 'Fever is a temporary increase in body temperature, often due to an infection or illness.',
    is_active: true,
  },
  {
    code: 'hypertension',
    name_ar: 'ارتفاع ضغط الدم',
    name_en: 'Hypertension',
    symptoms: ['ضغط دم', 'hypertension', 'ارتفاع الضغط', 'blood pressure'],
    specialties: ['cardiology', 'internal_medicine'],
    relevant_services: ['consultation', 'ecg', 'kidney_function_test'],
    relevant_ingredients: ['amlodipine', 'losartan'],
    overview_ar: 'ارتفاع ضغط الدم حالة طبية مزمنة تتطلب متابعة دورية ونمط حياة صحي واستشارة الطبيب المختص.',
    overview_en: 'Hypertension is a chronic medical condition that requires regular monitoring and professional consultation.',
    is_active: true,
  },
  {
    code: 'diabetes',
    name_ar: 'داء السكري',
    name_en: 'Diabetes Mellitus',
    symptoms: ['سكر', 'سكري', 'diabetes', 'عطش مستمر', 'blood sugar'],
    specialties: ['internal_medicine'],
    relevant_services: ['consultation', 'hba1c_test', 'fasting_blood_sugar'],
    relevant_ingredients: ['metformin', 'insulin'],
    overview_ar: 'داء السكري اضطراب أيضي يؤثر على كيفية استخدام الجسم للسكر في الدم.',
    overview_en: 'Diabetes is a metabolic disorder that affects how the body uses blood glucose.',
    is_active: true,
  },
  {
    code: 'dermatitis',
    name_ar: 'التهاب الجلد والأكزيما',
    name_en: 'Dermatitis and Eczema',
    symptoms: ['اكزيما', 'طفح جلدي', 'حكة', 'eczema', 'dermatitis', 'rash'],
    specialties: ['dermatology'],
    relevant_services: ['consultation', 'skin_allergy_test'],
    relevant_ingredients: ['hydrocortisone', 'cetirizine'],
    overview_ar: 'التهاب الجلد مصطلح عام يصف التهاباً جلدياً شائعاً يتميز بالحكة والاحمرار.',
    overview_en: 'Dermatitis is a general term describing skin inflammation characterized by itching and redness.',
    is_active: true,
  },
  {
    code: 'acne',
    name_ar: 'حب الشباب',
    name_en: 'Acne Vulgaris',
    symptoms: ['حب شباب', 'بثور', 'acne', 'pimples'],
    specialties: ['dermatology'],
    relevant_services: ['consultation', 'dermatology_procedure'],
    relevant_ingredients: ['benzoyl_peroxide', 'adapalene'],
    overview_ar: 'حب الشباب حالة جلدية تحدث عندما تنسد بصيلات الشعر بالزيوت وخلايا الجلد الميتة.',
    overview_en: 'Acne is a skin condition that occurs when hair follicles become plugged with oil and dead skin cells.',
    is_active: true,
  },
  {
    code: 'influenza',
    name_ar: 'الإنفلونزا ونزلات البرد',
    name_en: 'Influenza and Common Cold',
    symptoms: ['زكام', 'رشح', 'انفلونزا', 'سعال', 'cold', 'flu', 'cough'],
    specialties: ['internal_medicine', 'pediatrics', 'ent'],
    relevant_services: ['consultation', 'rapid_influenza_test'],
    relevant_ingredients: ['paracetamol', 'cetirizine'],
    overview_ar: 'نزلات البرد والإنفلونزا عدوى فيروسية تصيب الجهاز التنفسي العلوي.',
    overview_en: 'The common cold and flu are viral infections of the upper respiratory tract.',
    is_active: true,
  },
];
