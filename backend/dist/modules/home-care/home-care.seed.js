"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HOME_CARE_SEED = void 0;
exports.HOME_CARE_SEED = [
    {
        category: 'basic_nursing',
        title: { ar: 'قياس العلامات الحيوية', en: 'Vital Signs Monitoring' },
        description: { ar: 'قياس الضغط، السكر، النبض، الأكسجين والحرارة بدقة في المنزل.', en: 'Accurate measurement of blood pressure, blood sugar, pulse, oxygen, and temperature at home.' },
        basePrice: 100,
        estimatedDurationMins: 30,
        tags: ['سريع', 'أساسي'],
        imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=500',
        iconName: 'monitor_heart',
        requiredSpecialty: 'nursing'
    },
    {
        category: 'basic_nursing',
        title: { ar: 'سحب دم للتحاليل', en: 'Blood Draw for Labs' },
        description: { ar: 'سحب عينات الدم من المنزل باحترافية وتوصيلها للمختبر.', en: 'Professional home blood draw and delivery to the laboratory.' },
        basePrice: 120,
        estimatedDurationMins: 30,
        tags: ['تحاليل'],
        imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=500',
        iconName: 'bloodtype',
        requiredSpecialty: 'nursing'
    },
    {
        category: 'basic_nursing',
        title: { ar: 'الحقن الطبية والمضادات', en: 'Medical Injections (IV/IM)' },
        description: { ar: 'إعطاء الحقن العضلية أو الوريدية حسب الوصفة الطبية المعتمدة.', en: 'Administration of IM or IV injections as per approved medical prescription.' },
        basePrice: 150,
        estimatedDurationMins: 45,
        tags: ['علاجي'],
        imageUrl: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=500',
        iconName: 'vaccines',
        requiredSpecialty: 'nursing'
    },
    {
        category: 'basic_nursing',
        title: { ar: 'تركيب محلول وريدي', en: 'IV Drip Therapy' },
        description: { ar: 'تركيب ومتابعة المحاليل الوريدية لتعويض السوائل أو إعطاء الأدوية.', en: 'Insertion and monitoring of IV drips for hydration or medication.' },
        basePrice: 180,
        estimatedDurationMins: 60,
        tags: ['مغذي', 'علاجي'],
        imageUrl: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=500',
        iconName: 'water_drop',
        requiredSpecialty: 'nursing'
    },
    {
        category: 'advanced_nursing',
        title: { ar: 'العناية بالجروح العميقة والسكري', en: 'Advanced Wound & Diabetic Foot Care' },
        description: { ar: 'تنظيف وتعقيم الجروح المعقدة والقدم السكري لمنع المضاعفات.', en: 'Cleaning and dressing of complex wounds and diabetic foot to prevent complications.' },
        basePrice: 250,
        estimatedDurationMins: 60,
        tags: ['جروح', 'قدم سكري'],
        imageUrl: 'https://images.unsplash.com/photo-1514415008039-38779659cdbf?w=500',
        iconName: 'healing',
        requiredSpecialty: 'nursing'
    },
    {
        category: 'advanced_nursing',
        title: { ar: 'العناية بالقسطرة البولية', en: 'Urinary Catheter Care' },
        description: { ar: 'تركيب، تغيير، أو إزالة القسطرة البولية مع العناية التامة لمنع العدوى.', en: 'Insertion, changing, or removal of urinary catheters with infection control.' },
        basePrice: 200,
        estimatedDurationMins: 45,
        tags: ['قسطرة'],
        imageUrl: 'https://images.unsplash.com/photo-1514415008039-38779659cdbf?w=500',
        iconName: 'medical_services',
        requiredSpecialty: 'nursing'
    },
    {
        category: 'advanced_nursing',
        title: { ar: 'العناية بفتحة القصبة الهوائية', en: 'Tracheostomy Care' },
        description: { ar: 'تنظيف وتعقيم شق القصبة الهوائية وشفط السوائل بأمان.', en: 'Cleaning and suctioning of tracheostomy tubes safely.' },
        basePrice: 300,
        estimatedDurationMins: 90,
        tags: ['تنفسي', 'عناية فائقة'],
        imageUrl: 'https://images.unsplash.com/photo-1514415008039-38779659cdbf?w=500',
        iconName: 'air',
        requiredSpecialty: 'nursing'
    },
    {
        category: 'advanced_nursing',
        title: { ar: 'جلسات أكسجين منزلي', en: 'Home Oxygen Therapy' },
        description: { ar: 'تركيب أجهزة الأكسجين ومتابعة حالة تشبع الأكسجين للمريض.', en: 'Setup of oxygen devices and monitoring of patient oxygen saturation.' },
        basePrice: 250,
        estimatedDurationMins: 60,
        tags: ['تنفسي'],
        imageUrl: 'https://images.unsplash.com/photo-1514415008039-38779659cdbf?w=500',
        iconName: 'masks',
        requiredSpecialty: 'nursing'
    },
    {
        category: 'specialized_care',
        title: { ar: 'رعاية ما بعد العمليات الجراحية', en: 'Post-Surgery Care' },
        description: { ar: 'متابعة حثيثة للعلامات الحيوية، غيار الجروح، وإدارة الألم بعد الجراحة.', en: 'Close monitoring of vitals, wound dressing, and pain management post-surgery.' },
        basePrice: 500,
        estimatedDurationMins: 240,
        tags: ['باقة', 'ما بعد الجراحة'],
        imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=500',
        iconName: 'surgical',
        requiredSpecialty: 'nursing'
    },
    {
        category: 'specialized_care',
        title: { ar: 'مرافقة ورعاية كبار السن', en: 'Elderly Companion & Care' },
        description: { ar: 'رعاية يومية لكبار السن تشمل المساعدة الشخصية، الأدوية، والتغذية.', en: 'Daily elderly care including personal assistance, medication, and nutrition.' },
        basePrice: 600,
        estimatedDurationMins: 480,
        tags: ['كبار السن', 'تعاقد'],
        imageUrl: 'https://images.unsplash.com/photo-1514415008039-38779659cdbf?w=500',
        iconName: 'elderly',
        requiredSpecialty: 'nursing'
    },
    {
        category: 'specialized_care',
        title: { ar: 'العناية بالأم وحديثي الولادة', en: 'Mother & Newborn Care' },
        description: { ar: 'رعاية صحية وتثقيفية للأم بعد الولادة، ومتابعة صحة المولود الجديد.', en: 'Postpartum health and educational care for the mother, and monitoring newborn health.' },
        basePrice: 450,
        estimatedDurationMins: 180,
        tags: ['أمومة', 'حديثي الولادة'],
        imageUrl: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=500',
        iconName: 'child_care',
        requiredSpecialty: 'nursing'
    },
    {
        category: 'specialized_care',
        title: { ar: 'العناية المركزة بالمنزل (ICU)', en: 'Home ICU Care' },
        description: { ar: 'تمريض متخصص للعناية بالحالات الحرجة التي تحتاج أجهزة دعم حياة بالمنزل.', en: 'Specialized nursing for critical cases requiring life support at home.' },
        basePrice: 1200,
        estimatedDurationMins: 720,
        tags: ['عناية مركزة', 'حرجة'],
        imageUrl: 'https://images.unsplash.com/photo-1514415008039-38779659cdbf?w=500',
        iconName: 'vital_signs',
        requiredSpecialty: 'ic_nursing'
    }
];
//# sourceMappingURL=home-care.seed.js.map