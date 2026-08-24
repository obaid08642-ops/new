export interface MedicalSpecialty {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  color: string;
  description: string;
}

export interface LabTest {
  id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  price: number;
  turnaround: string;
  description: string;
}

export interface RadiologyService {
  id: string;
  nameAr: string;
  nameEn: string;
  price: number;
  description: string;
}

export interface NursingServiceFull {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string;
  basePrice: number;
  duration: string;
  icon: string;
}

export const MEDICAL_SPECIALTIES: MedicalSpecialty[] = [
  { id: '1', nameAr: 'طب عام', nameEn: 'General Medicine', icon: 'consultations', color: '#3B82F6', description: 'تشخيص وعلاج الأمراض الشائعة والحالات العامة' },
  { id: '2', nameAr: 'طب الأطفال', nameEn: 'Pediatrics', icon: 'baby', color: '#00C9A7', description: 'الرعاية الطبية للرضع والأطفال والمراهقين' },
  { id: '3', nameAr: 'جراحة عيون', nameEn: 'Ophthalmology', icon: 'eye', color: '#8B5CF6', description: 'تشخيص وعلاج أمراض العيون والجراحة البصرية' },
  { id: '4', nameAr: 'قلب وأوعية دموية', nameEn: 'Cardiology', icon: 'monitor_heart', color: '#EF4444', description: 'تشخيص وعلاج أمراض القلب والأوعية الدموية' },
  { id: '5', nameAr: 'جراحة عظام', nameEn: 'Orthopedics', icon: 'bone', color: '#F59E0B', description: 'علاج إصابات العظام والمفاصل والعمود الفقري' },
  { id: '6', nameAr: 'أمراض جلدية', nameEn: 'Dermatology', icon: 'sparkles', color: '#EC4899', description: 'تشخيص وعلاج أمراض الجلد والشعر والأظافر' },
  { id: '7', nameAr: 'نساء وولادة', nameEn: 'Obstetrics & Gynecology', icon: 'pregnant', color: '#F472B6', description: 'رعاية صحة المرأة والحمل والولادة' },
  { id: '8', nameAr: 'طب أسنان', nameEn: 'Dentistry', icon: 'tooth', color: '#06B6D4', description: 'علاج وتجميل الأسنان واللثة' },
  { id: '9', nameAr: 'طب نفسي', nameEn: 'Psychiatry', icon: 'brain', color: '#6366F1', description: 'تشخيص وعلاج الاضطرابات النفسية والعقلية' },
  { id: '10', nameAr: 'أنف وأذن وحنجرة', nameEn: 'ENT', icon: 'ear', color: '#84CC16', description: 'علاج أمراض الأنف والأذن والحنجرة' },
  { id: '11', nameAr: 'مسالك بولية', nameEn: 'Urology', icon: 'kidneys', color: '#14B8A6', description: 'علاج أمراض الجهاز البولي والتناسلي' },
  { id: '12', nameAr: 'طب داخلي', nameEn: 'Internal Medicine', icon: 'microscope', color: '#3B82F6', description: 'تشخيص الأمراض الداخلية المعقدة وإدارتها' },
  { id: '13', nameAr: 'جراحة عامة', nameEn: 'General Surgery', icon: 'doctor', color: '#78716C', description: 'العمليات الجراحية العامة ومنظار البطن' },
  { id: '14', nameAr: 'طب طوارئ', nameEn: 'Emergency Medicine', icon: 'emergency', color: '#FF3B30', description: 'الرعاية الطبية العاجلة والحالات الطارئة' },
  { id: '15', nameAr: 'تغذية علاجية', nameEn: 'Clinical Nutrition', icon: 'food', color: '#22C55E', description: 'التقييم الغذائي والحميات العلاجية' },
  { id: '16', nameAr: 'علاج طبيعي', nameEn: 'Physiotherapy', icon: 'run', color: '#F97316', description: 'إعادة تأهيل العضلات والمفاصل بعد الإصابات' },
  { id: '17', nameAr: 'أمراض الجهاز الهضمي', nameEn: 'Gastroenterology', icon: 'stomach', color: '#D97706', description: 'تشخيص وعلاج أمراض المعدة والأمعاء والكبد' },
  { id: '18', nameAr: 'أمراض صدرية', nameEn: 'Pulmonology', icon: 'lungs', color: '#0EA5E9', description: 'تشخيص وعلاج أمراض الجهاز التنفسي والرئتين' },
  { id: '19', nameAr: 'أمراض كلى', nameEn: 'Nephrology', icon: 'kidneys', color: '#7C3AED', description: 'علاج أمراض الكلى والغسيل الكلوي' },
  { id: '20', nameAr: 'أمراض دم', nameEn: 'Hematology', icon: 'bloodtype', color: '#DC2626', description: 'تشخيص وعلاج أمراض الدم وأورام الدم' },
  { id: '21', nameAr: 'غدد صماء وسكري', nameEn: 'Endocrinology', icon: 'dna', color: '#059669', description: 'علاج اضطرابات الغدد والسكري والهرمونات' },
  { id: '22', nameAr: 'أمراض روماتيزم', nameEn: 'Rheumatology', icon: 'bone', color: '#B45309', description: 'علاج أمراض المفاصل والأمراض المناعية' },
  { id: '23', nameAr: 'أمراض أعصاب', nameEn: 'Neurology', icon: 'brain', color: '#4F46E5', description: 'تشخيص وعلاج أمراض الجهاز العصبي' },
  { id: '24', nameAr: 'جراحة أعصاب', nameEn: 'Neurosurgery', icon: 'brain', color: '#312E81', description: 'العمليات الجراحية للمخ والعمود الفقري' },
  { id: '25', nameAr: 'جراحة تجميل', nameEn: 'Plastic Surgery', icon: 'sparkles', color: '#DB2777', description: 'الجراحة التجميلية والترميمية' },
  { id: '26', nameAr: 'أمراض معدية', nameEn: 'Infectious Disease', icon: 'virus', color: '#16A34A', description: 'تشخيص وعلاج الأمراض المعدية والوبائية' },
  { id: '27', nameAr: 'أشعة تشخيصية', nameEn: 'Diagnostic Radiology', icon: 'xray', color: '#64748B', description: 'التصوير الطبي والتشخيص بالأشعة' },
  { id: '28', nameAr: 'تخدير وعناية مركزة', nameEn: 'Anesthesiology & ICU', icon: 'syringe', color: '#475569', description: 'التخدير والعناية المركزة وإدارة الألم' },
  { id: '29', nameAr: 'طب أسرة', nameEn: 'Family Medicine', icon: 'users', color: '#2563EB', description: 'الرعاية الصحية الشاملة لجميع أفراد الأسرة' },
  { id: '30', nameAr: 'أورام', nameEn: 'Oncology', icon: 'shield', color: '#991B1B', description: 'تشخيص وعلاج الأورام السرطانية' },
  { id: '31', nameAr: 'طب كبار السن', nameEn: 'Geriatrics', icon: 'wheelchair', color: '#78716C', description: 'الرعاية الصحية المتخصصة لكبار السن' },
  { id: '32', nameAr: 'طب الكبد', nameEn: 'Hepatology', icon: 'liver', color: '#92400E', description: 'تشخيص وعلاج أمراض الكبد والمرارة' },
  { id: '33', nameAr: 'جراحة قلب مفتوح', nameEn: 'Cardiac Surgery', icon: 'monitor_heart', color: '#BE123C', description: 'العمليات الجراحية للقلب والشرايين' },
  { id: '34', nameAr: 'طب رياضي', nameEn: 'Sports Medicine', icon: 'run', color: '#EA580C', description: 'علاج إصابات الرياضيين وتأهيلهم' },
  { id: '35', nameAr: 'صحة نفسية', nameEn: 'Mental Health', icon: 'meditation', color: '#7C3AED', description: 'الدعم النفسي والعلاج السلوكي المعرفي' },
  { id: '36', nameAr: 'جراحة أوعية دموية', nameEn: 'Vascular Surgery', icon: 'monitor_heart', color: '#C62828', description: 'جراحة الشرايين والأوردة والأوعية الليمفاوية' },
  { id: '37', nameAr: 'طب نووي', nameEn: 'Nuclear Medicine', icon: 'xray', color: '#4A148C', description: 'التشخيص والعلاج بالنظائر المشعة' },
  { id: '38', nameAr: 'جراحة صدر', nameEn: 'Thoracic Surgery', icon: 'lungs', color: '#0D47A1', description: 'العمليات الجراحية للصدر والرئتين' },
  { id: '39', nameAr: 'طب الألم', nameEn: 'Pain Management', icon: 'pulse', color: '#E65100', description: 'إدارة وعلاج الآلام المزمنة والحادة' },
  { id: '40', nameAr: 'طب النوم', nameEn: 'Sleep Medicine', icon: 'sleep', color: '#1A237E', description: 'تشخيص وعلاج اضطرابات النوم' },
  { id: '41', nameAr: 'علاج وظيفي', nameEn: 'Occupational Therapy', icon: 'walk', color: '#33691E', description: 'إعادة تأهيل المهارات الحياتية اليومية' },
  { id: '42', nameAr: 'طب الإنجاب', nameEn: 'Reproductive Medicine', icon: 'pregnant', color: '#AD1457', description: 'علاج العقم والمساعدة على الإنجاب' },
  { id: '43', nameAr: 'أمراض المناعة', nameEn: 'Immunology', icon: 'shield', color: '#1B5E20', description: 'تشخيص وعلاج أمراض الجهاز المناعي' },
  { id: '44', nameAr: 'جراحة الأطفال', nameEn: 'Pediatric Surgery', icon: 'baby', color: '#00838F', description: 'العمليات الجراحية للرضع والأطفال' },
  { id: '45', nameAr: 'طب الطوارئ للأطفال', nameEn: 'Pediatric Emergency', icon: 'emergency', color: '#D84315', description: 'الرعاية الطارئة المتخصصة للأطفال' },
];

export const LAB_TESTS: LabTest[] = [
  { id: 'cbc', nameAr: 'تحليل صورة دم كاملة', nameEn: 'Complete Blood Count (CBC)', category: 'blood', price: 45, turnaround: '4 ساعات', description: 'قياس مكونات الدم الأساسية والكشف عن فقر الدم والعدوى' },
  { id: 'fbs', nameAr: 'سكر الدم صائم', nameEn: 'Fasting Blood Sugar (FBS)', category: 'blood', price: 25, turnaround: '2 ساعات', description: 'قياس مستوى السكر في الدم أثناء الصيام' },
  { id: 'hba1c', nameAr: 'السكر التراكمي', nameEn: 'HbA1c', category: 'blood', price: 55, turnaround: '6 ساعات', description: 'قياس متوسط مستوى السكر في الدم خلال 3 أشهر' },
  { id: 'lipid', nameAr: 'تحليل دهون شامل', nameEn: 'Lipid Profile', category: 'blood', price: 65, turnaround: '6 ساعات', description: 'قياس الكوليسترول والدهون الثلاثية في الدم' },
  { id: 'tft', nameAr: 'وظائف الغدة الدرقية', nameEn: 'Thyroid Function Tests', category: 'hormones', price: 85, turnaround: '8 ساعات', description: 'قياس هرمونات الغدة الدرقية TSH و T3 و T4' },
  { id: 'lft', nameAr: 'وظائف الكبد', nameEn: 'Liver Function Tests', category: 'blood', price: 70, turnaround: '6 ساعات', description: 'تقييم وظائف الكبد وقياس الإنزيمات الكبدية' },
  { id: 'rft', nameAr: 'وظائف الكلى', nameEn: 'Renal Function Tests', category: 'blood', price: 60, turnaround: '6 ساعات', description: 'تقييم وظائف الكلى وقياس الكرياتينين واليوريا' },
  { id: 'urine', nameAr: 'تحليل بول كامل', nameEn: 'Urinalysis', category: 'urine', price: 30, turnaround: '3 ساعات', description: 'فحص البول للكشف عن أمراض الكلى والمسالك البولية' },
  { id: 'urine_culture', nameAr: 'مزرعة بول', nameEn: 'Urine Culture', category: 'urine', price: 65, turnaround: '48 ساعة', description: 'الكشف عن البكتيريا المسببة لالتهابات المسالك البولية' },
  { id: 'vitd', nameAr: 'فيتامين د', nameEn: 'Vitamin D', category: 'blood', price: 80, turnaround: '8 ساعات', description: 'قياس مستوى فيتامين د في الدم' },
  { id: 'vitb12', nameAr: 'فيتامين ب12', nameEn: 'Vitamin B12', category: 'blood', price: 75, turnaround: '8 ساعات', description: 'قياس مستوى فيتامين ب12 في الدم' },
  { id: 'iron', nameAr: 'دراسة الحديد', nameEn: 'Iron Studies', category: 'blood', price: 70, turnaround: '6 ساعات', description: 'قياس مستوى الحديد ومخزون الحديد (الفيريتين)' },
  { id: 'crp', nameAr: 'بروتين سي التفاعلي', nameEn: 'C-Reactive Protein (CRP)', category: 'blood', price: 45, turnaround: '4 ساعات', description: 'مؤشر الالتهاب في الجسم' },
  { id: 'esr', nameAr: 'سرعة الترسيب', nameEn: 'Erythrocyte Sedimentation Rate (ESR)', category: 'blood', price: 30, turnaround: '2 ساعات', description: 'قياس سرعة ترسيب كريات الدم الحمراء' },
  { id: 'psa', nameAr: 'مستضد البروستات', nameEn: 'Prostate Specific Antigen (PSA)', category: 'hormones', price: 90, turnaround: '8 ساعات', description: 'فحص للكشف المبكر عن أمراض البروستات' },
  { id: 'testosterone', nameAr: 'هرمون التستوستيرون', nameEn: 'Testosterone', category: 'hormones', price: 85, turnaround: '12 ساعة', description: 'قياس مستوى هرمون الذكورة' },
  { id: 'estrogen', nameAr: 'هرمون الإستروجين', nameEn: 'Estrogen', category: 'hormones', price: 85, turnaround: '12 ساعة', description: 'قياس مستوى هرمون الأنوثة' },
  { id: 'pregnancy', nameAr: 'فحص الحمل (دم)', nameEn: 'Beta-hCG (Pregnancy Test)', category: 'hormones', price: 50, turnaround: '4 ساعات', description: 'الكشف عن الحمل عبر تحليل الدم' },
  { id: 'coagulation', nameAr: 'اختبارات التجلط', nameEn: 'Coagulation Profile', category: 'blood', price: 75, turnaround: '6 ساعات', description: 'قياس قدرة الدم على التجلط (PT, INR, aPTT)' },
  { id: 'blood_group', nameAr: 'فصيلة الدم', nameEn: 'Blood Grouping & Rh', category: 'blood', price: 35, turnaround: '2 ساعات', description: 'تحديد فصيلة الدم وعامل الريزوس' },
  { id: 'hep_b', nameAr: 'فحص التهاب الكبد ب', nameEn: 'Hepatitis B Panel', category: 'blood', price: 95, turnaround: '12 ساعة', description: 'الكشف عن فيروس التهاب الكبد الوبائي ب' },
  { id: 'hep_c', nameAr: 'فحص التهاب الكبد سي', nameEn: 'Hepatitis C Antibody', category: 'blood', price: 85, turnaround: '12 ساعة', description: 'الكشف عن فيروس التهاب الكبد الوبائي سي' },
  { id: 'hiv', nameAr: 'فحص نقص المناعة', nameEn: 'HIV Screening', category: 'blood', price: 80, turnaround: '12 ساعة', description: 'الكشف عن فيروس نقص المناعة البشرية' },
  { id: 'stool', nameAr: 'تحليل براز', nameEn: 'Stool Analysis', category: 'urine', price: 35, turnaround: '4 ساعات', description: 'فحص البراز للكشف عن الطفيليات والعدوى' },
  { id: 'calcium', nameAr: 'الكالسيوم', nameEn: 'Calcium', category: 'blood', price: 30, turnaround: '4 ساعات', description: 'قياس مستوى الكالسيوم في الدم' },
  { id: 'electrolytes', nameAr: 'الأملاح والشوارد', nameEn: 'Electrolytes Panel', category: 'blood', price: 50, turnaround: '4 ساعات', description: 'قياس مستوى الصوديوم والبوتاسيوم والكلوريد' },
  { id: 'uric_acid', nameAr: 'حمض البوليك', nameEn: 'Uric Acid', category: 'blood', price: 30, turnaround: '4 ساعات', description: 'قياس مستوى حمض البوليك للكشف عن النقرس' },
  { id: 'allergy_panel', nameAr: 'فحص حساسية شامل', nameEn: 'Allergy Panel (IgE)', category: 'allergy', price: 250, turnaround: '24 ساعة', description: 'فحص شامل لتحديد مسببات الحساسية' },
  { id: 'culture', nameAr: 'مزرعة دم', nameEn: 'Blood Culture', category: 'blood', price: 120, turnaround: '72 ساعة', description: 'الكشف عن البكتيريا والفطريات في الدم' },
  { id: 'covid_pcr', nameAr: 'فحص كوفيد PCR', nameEn: 'COVID-19 PCR', category: 'genetics', price: 150, turnaround: '12 ساعة', description: 'الكشف عن فيروس كورونا المستجد' },
  { id: 'tumor_markers', nameAr: 'دلالات الأورام', nameEn: 'Tumor Markers Panel', category: 'blood', price: 300, turnaround: '24 ساعة', description: 'فحص شامل لدلالات الأورام (CEA, CA125, AFP)' },
  { id: 'genetic_screen', nameAr: 'فحص جيني ما قبل الزواج', nameEn: 'Pre-Marital Genetic Screen', category: 'genetics', price: 350, turnaround: '5 أيام', description: 'فحص جيني شامل للكشف عن الأمراض الوراثية' },
];

export const RADIOLOGY_SERVICES: RadiologyService[] = [
  { id: 'xray_chest', nameAr: 'أشعة سينية للصدر', nameEn: 'Chest X-Ray', price: 80, description: 'تصوير شعاعي للصدر للكشف عن أمراض الرئة والقلب' },
  { id: 'xray_bone', nameAr: 'أشعة سينية للعظام', nameEn: 'Bone X-Ray', price: 100, description: 'تصوير شعاعي للعظام للكشف عن الكسور والإصابات' },
  { id: 'us_abdomen', nameAr: 'سونار البطن', nameEn: 'Abdominal Ultrasound', price: 200, description: 'تصوير بالموجات فوق الصوتية لأعضاء البطن' },
  { id: 'us_pregnancy', nameAr: 'سونار الحمل', nameEn: 'Obstetric Ultrasound', price: 250, description: 'متابعة الحمل والجنين بالموجات فوق الصوتية' },
  { id: 'us_thyroid', nameAr: 'سونار الغدة الدرقية', nameEn: 'Thyroid Ultrasound', price: 180, description: 'تصوير الغدة الدرقية بالموجات فوق الصوتية' },
  { id: 'ct_brain', nameAr: 'أشعة مقطعية للدماغ', nameEn: 'CT Brain', price: 600, description: 'تصوير مقطعي محوسب للدماغ' },
  { id: 'ct_chest', nameAr: 'أشعة مقطعية للصدر', nameEn: 'CT Chest', price: 700, description: 'تصوير مقطعي محوسب للصدر والرئتين' },
  { id: 'ct_abdomen', nameAr: 'أشعة مقطعية للبطن', nameEn: 'CT Abdomen & Pelvis', price: 800, description: 'تصوير مقطعي محوسب لأعضاء البطن والحوض' },
  { id: 'mri_brain', nameAr: 'رنين مغناطيسي للدماغ', nameEn: 'MRI Brain', price: 1200, description: 'تصوير بالرنين المغناطيسي للدماغ والأعصاب' },
  { id: 'mri_spine', nameAr: 'رنين مغناطيسي للعمود الفقري', nameEn: 'MRI Spine', price: 1400, description: 'تصوير بالرنين المغناطيسي للعمود الفقري' },
  { id: 'mri_knee', nameAr: 'رنين مغناطيسي للركبة', nameEn: 'MRI Knee', price: 1100, description: 'تصوير بالرنين المغناطيسي لمفصل الركبة' },
  { id: 'mammography', nameAr: 'تصوير الثدي (ماموغرام)', nameEn: 'Mammography', price: 350, description: 'فحص الثدي بالأشعة للكشف المبكر عن الأورام' },
  { id: 'dexa', nameAr: 'فحص هشاشة العظام', nameEn: 'DEXA Bone Density Scan', price: 400, description: 'قياس كثافة العظام للكشف عن هشاشة العظام' },
  { id: 'echo', nameAr: 'إيكو القلب', nameEn: 'Echocardiography', price: 500, description: 'تصوير القلب بالموجات فوق الصوتية' },
  { id: 'doppler', nameAr: 'دوبلر الأوعية الدموية', nameEn: 'Doppler Ultrasound', price: 350, description: 'تصوير الأوعية الدموية بالدوبلر الملون' },
  { id: 'panoramic', nameAr: 'أشعة بانورامية للأسنان', nameEn: 'Dental Panoramic X-Ray', price: 120, description: 'تصوير بانورامي شامل للفكين والأسنان' },
  { id: 'pet_ct', nameAr: 'PET-CT تصوير مقطعي بالإصدار البوزيتروني', nameEn: 'PET-CT Scan', price: 5000, description: 'تصوير متقدم للكشف عن الأورام وتقييم انتشارها' },
];

export const NURSING_SERVICES_FULL: NursingServiceFull[] = [
  { id: '1', nameAr: 'حقن عضلية', nameEn: 'Intramuscular Injection', description: 'إعطاء الحقن العضلية في المنزل بأمان', basePrice: 50, duration: '15 دقيقة', icon: 'syringe' },
  { id: '2', nameAr: 'تغيير الضمادات والجروح', nameEn: 'Wound Dressing Change', description: 'تنظيف وتغيير ضمادات الجروح بشكل احترافي', basePrice: 80, duration: '30 دقيقة', icon: 'bandage' },
  { id: '3', nameAr: 'تركيب كانيولا ومحاليل', nameEn: 'IV Cannulation & Fluids', description: 'تركيب الكانيولا الوريدية وإعطاء المحاليل', basePrice: 120, duration: '45 دقيقة', icon: 'water' },
  { id: '4', nameAr: 'رعاية كبار السن', nameEn: 'Elderly Care', description: 'رعاية شاملة لكبار السن تشمل المراقبة والنظافة', basePrice: 150, duration: '120 دقيقة', icon: 'wheelchair' },
  { id: '5', nameAr: 'سحب عينات دم', nameEn: 'Blood Sample Collection', description: 'سحب عينات دم منزلية للتحاليل المخبرية', basePrice: 60, duration: '15 دقيقة', icon: 'bloodtype' },
  { id: '6', nameAr: 'إعطاء الأدوية', nameEn: 'Medication Administration', description: 'إعطاء الأدوية الموصوفة والتأكد من الجرعات', basePrice: 40, duration: '20 دقيقة', icon: 'medication' },
  { id: '7', nameAr: 'مراقبة العلامات الحيوية', nameEn: 'Vital Signs Monitoring', description: 'قياس ومراقبة الضغط والنبض والحرارة والأكسجين', basePrice: 100, duration: '30 دقيقة', icon: 'pulse' },
  { id: '8', nameAr: 'علاج تنفسي وبخار', nameEn: 'Respiratory Therapy', description: 'جلسات العلاج التنفسي والبخار (نيبولايزر)', basePrice: 130, duration: '45 دقيقة', icon: 'lungs' },
  { id: '9', nameAr: 'تركيب قسطرة بولية', nameEn: 'Urinary Catheterization', description: 'تركيب أو تغيير القسطرة البولية بشكل آمن', basePrice: 140, duration: '30 دقيقة', icon: 'syringe' },
  { id: '10', nameAr: 'رعاية ما بعد العمليات', nameEn: 'Post-Surgical Care', description: 'متابعة المريض بعد العمليات الجراحية في المنزل', basePrice: 200, duration: '60 دقيقة', icon: 'vital_signs' },
  { id: '11', nameAr: 'رعاية الأم والمولود', nameEn: 'Mother & Newborn Care', description: 'رعاية الأم بعد الولادة والعناية بالمولود', basePrice: 180, duration: '90 دقيقة', icon: 'baby' },
  { id: '12', nameAr: 'قياس السكر والضغط', nameEn: 'Glucose & BP Monitoring', description: 'قياس مستوى السكر وضغط الدم المنزلي', basePrice: 45, duration: '15 دقيقة', icon: 'monitor_heart' },
  { id: '13', nameAr: 'حقن وريدي', nameEn: 'Intravenous Injection', description: 'إعطاء الأدوية والمضادات الحيوية عبر الوريد', basePrice: 90, duration: '30 دقيقة', icon: 'syringe' },
  { id: '14', nameAr: 'علاج طبيعي منزلي', nameEn: 'Home Physiotherapy', description: 'جلسات علاج طبيعي منزلية لتأهيل العضلات والمفاصل', basePrice: 250, duration: '60 دقيقة', icon: 'run' },
  { id: '15', nameAr: 'تغذية وريدية', nameEn: 'Parenteral Nutrition', description: 'تحضير وإعطاء التغذية الوريدية للمرضى', basePrice: 300, duration: '120 دقيقة', icon: 'water' },
  { id: '16', nameAr: 'العناية بالأنبوب الأنفي المعدي', nameEn: 'Nasogastric Tube Care', description: 'تركيب وصيانة أنبوب التغذية الأنفي المعدي', basePrice: 160, duration: '30 دقيقة', icon: 'stethoscope' },
  { id: '17', nameAr: 'العناية بفغر القصبة الهوائية', nameEn: 'Tracheostomy Care', description: 'تنظيف وتغيير أنبوب فغر القصبة الهوائية', basePrice: 200, duration: '45 دقيقة', icon: 'lungs' },
  { id: '18', nameAr: 'تخطيط قلب منزلي', nameEn: 'Home ECG', description: 'عمل تخطيط القلب الكهربائي في المنزل', basePrice: 150, duration: '30 دقيقة', icon: 'monitor_heart' },
  { id: '19', nameAr: 'حقنة شرجية', nameEn: 'Enema Administration', description: 'إعطاء الحقنة الشرجية العلاجية في المنزل', basePrice: 100, duration: '30 دقيقة', icon: 'syringe' },
  { id: '20', nameAr: 'إزالة الغرز الجراحية', nameEn: 'Suture Removal', description: 'إزالة الغرز الجراحية بعد التعافي الكافي', basePrice: 70, duration: '20 دقيقة', icon: 'bandage' },
  { id: '21', nameAr: 'العناية بقرح الفراش', nameEn: 'Pressure Ulcer Care', description: 'علاج وتنظيف قرح الفراش لطريحي الفراش', basePrice: 120, duration: '45 دقيقة', icon: 'bandage' },
  { id: '22', nameAr: 'تطعيمات منزلية', nameEn: 'Home Vaccinations', description: 'إعطاء التطعيمات والتحصينات في المنزل', basePrice: 80, duration: '15 دقيقة', icon: 'syringe' },
];
