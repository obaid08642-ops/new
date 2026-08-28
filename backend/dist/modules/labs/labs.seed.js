"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LAB_SEED = void 0;
exports.LAB_SEED = [
    { name_ar: 'تحليل دم شامل CBC', name_en: 'Complete Blood Count', short_code: 'CBC', category: 'blood', sample_type: 'blood', price: 35, turnaround_hours: 4, popularity: 95 },
    { name_ar: 'سرعة الترسيب ESR', name_en: 'ESR', short_code: 'ESR', category: 'blood', sample_type: 'blood', price: 25, turnaround_hours: 6, popularity: 60 },
    { name_ar: 'فصيلة الدم', name_en: 'Blood Group', short_code: 'ABO', category: 'blood', sample_type: 'blood', price: 30, turnaround_hours: 4, popularity: 75 },
    { name_ar: 'سكر صائم FBS', name_en: 'Fasting Blood Sugar', short_code: 'FBS', category: 'diabetes', sample_type: 'blood', price: 25, fasting_required: true, fasting_hours: 8, turnaround_hours: 3, popularity: 90 },
    { name_ar: 'سكر تراكمي HbA1c', name_en: 'HbA1c', short_code: 'HbA1c', category: 'diabetes', sample_type: 'blood', price: 75, turnaround_hours: 8, popularity: 88 },
    { name_ar: 'منحنى السكر OGTT', name_en: 'OGTT', short_code: 'OGTT', category: 'diabetes', sample_type: 'blood', price: 110, fasting_required: true, fasting_hours: 10, turnaround_hours: 4, popularity: 50 },
    { name_ar: 'هرمون الغدة TSH', name_en: 'TSH', short_code: 'TSH', category: 'hormones', sample_type: 'blood', price: 85, turnaround_hours: 12, popularity: 80 },
    { name_ar: 'هرمون T3', name_en: 'T3', short_code: 'T3', category: 'hormones', sample_type: 'blood', price: 75, turnaround_hours: 12, popularity: 55 },
    { name_ar: 'هرمون T4', name_en: 'T4', short_code: 'T4', category: 'hormones', sample_type: 'blood', price: 75, turnaround_hours: 12, popularity: 55 },
    { name_ar: 'كورتيزول', name_en: 'Cortisol', short_code: 'COR', category: 'hormones', sample_type: 'blood', price: 95, turnaround_hours: 24, popularity: 40 },
    { name_ar: 'برولاكتين', name_en: 'Prolactin', short_code: 'PRL', category: 'hormones', sample_type: 'blood', price: 90, turnaround_hours: 24, popularity: 45 },
    { name_ar: 'فيتامين D', name_en: 'Vitamin D', short_code: 'VITD', category: 'vitamins', sample_type: 'blood', price: 140, turnaround_hours: 24, popularity: 92 },
    { name_ar: 'فيتامين B12', name_en: 'Vitamin B12', short_code: 'B12', category: 'vitamins', sample_type: 'blood', price: 95, turnaround_hours: 24, popularity: 70 },
    { name_ar: 'الحديد + فيريتين', name_en: 'Iron + Ferritin', short_code: 'FE', category: 'vitamins', sample_type: 'blood', price: 110, turnaround_hours: 12, popularity: 65 },
    { name_ar: 'ملف الدهون Lipid', name_en: 'Lipid Profile', short_code: 'LIP', category: 'cardiac', sample_type: 'blood', price: 95, fasting_required: true, fasting_hours: 12, turnaround_hours: 8, popularity: 85 },
    { name_ar: 'CK-MB', name_en: 'CK-MB', short_code: 'CKMB', category: 'cardiac', sample_type: 'blood', price: 65, turnaround_hours: 6, popularity: 40 },
    { name_ar: 'تروبونين', name_en: 'Troponin I', short_code: 'TRP', category: 'cardiac', sample_type: 'blood', price: 120, turnaround_hours: 4, popularity: 35 },
    { name_ar: 'وظائف الكلى', name_en: 'Kidney Function', short_code: 'KFT', category: 'kidney', sample_type: 'blood', price: 75, turnaround_hours: 6, popularity: 78 },
    { name_ar: 'وظائف الكبد', name_en: 'Liver Function', short_code: 'LFT', category: 'liver', sample_type: 'blood', price: 85, turnaround_hours: 6, popularity: 80 },
    { name_ar: 'تحليل بول كامل', name_en: 'Urine Complete', short_code: 'UA', category: 'blood', sample_type: 'urine', price: 30, turnaround_hours: 4, popularity: 82 },
    { name_ar: 'باقة الفحص الشامل', name_en: 'Comprehensive Health Package', category: 'blood', is_package: true, sample_type: 'blood', price: 399, old_price: 510, fasting_required: true, fasting_hours: 10, turnaround_hours: 24, popularity: 95, preparation_ar: ['الصيام 10 ساعات', 'شرب الماء فقط', 'لا توجد أنشطة شاقة قبل التحليل'], included_services: ['CBC', 'FBS', 'HbA1c', 'LIP', 'KFT', 'LFT', 'VITD', 'TSH'] },
    { name_ar: 'باقة السكري الشاملة', name_en: 'Diabetes Care Package', category: 'diabetes', is_package: true, sample_type: 'blood', price: 199, old_price: 260, fasting_required: true, fasting_hours: 8, turnaround_hours: 12, popularity: 88, preparation_ar: ['الصيام 8 ساعات'], included_services: ['FBS', 'HbA1c', 'KFT', 'LIP'] },
    { name_ar: 'باقة هرمونات المرأة', name_en: 'Women Hormones Package', category: 'hormones', is_package: true, sample_type: 'blood', price: 349, old_price: 420, turnaround_hours: 24, popularity: 75, included_services: ['TSH', 'T3', 'T4', 'PRL', 'COR'] },
    { name_ar: 'باقة القلب', name_en: 'Cardiac Package', category: 'cardiac', is_package: true, sample_type: 'blood', price: 289, old_price: 380, fasting_required: true, fasting_hours: 12, turnaround_hours: 12, popularity: 70, included_services: ['LIP', 'CKMB', 'CBC'] },
    { name_ar: 'باقة الحمل المتقدمة', name_en: 'Pregnancy Advanced Package', category: 'blood', is_package: true, sample_type: 'blood', price: 459, old_price: 560, turnaround_hours: 24, popularity: 80, included_services: ['CBC', 'TSH', 'VITD', 'FE', 'B12'] },
];
//# sourceMappingURL=labs.seed.js.map