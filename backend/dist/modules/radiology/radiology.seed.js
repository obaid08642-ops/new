"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RADIOLOGY_SEED = void 0;
exports.RADIOLOGY_SEED = [
    { name_ar: 'أشعة سينية - صدر', name_en: 'Chest X-Ray', short_code: 'CXR', modality: 'xray', body_part: 'chest', price: 90, turnaround_hours: 2, popularity: 90 },
    { name_ar: 'أشعة سينية - عمود فقري', name_en: 'Spine X-Ray', short_code: 'SXR', modality: 'xray', body_part: 'spine', price: 110, turnaround_hours: 2, popularity: 70 },
    { name_ar: 'أشعة سينية - بطن', name_en: 'Abdomen X-Ray', short_code: 'AXR', modality: 'xray', body_part: 'abdomen', price: 100, turnaround_hours: 2, popularity: 60 },
    { name_ar: 'أشعة سينية - ركبة', name_en: 'Knee X-Ray', short_code: 'KXR', modality: 'xray', body_part: 'knee', price: 95, turnaround_hours: 2, popularity: 65 },
    { name_ar: 'موجات صوتية - بطن', name_en: 'Abdomen Ultrasound', short_code: 'USA', modality: 'ultrasound', body_part: 'abdomen', price: 180, fasting_required: true, fasting_hours: 6, turnaround_hours: 2, popularity: 80 },
    { name_ar: 'موجات صوتية - حوض', name_en: 'Pelvic Ultrasound', short_code: 'USP', modality: 'ultrasound', body_part: 'pelvis', price: 170, turnaround_hours: 2, popularity: 60 },
    { name_ar: 'موجات صوتية - حمل', name_en: 'Pregnancy Ultrasound', short_code: 'USPR', modality: 'ultrasound', body_part: 'obstetric', price: 200, turnaround_hours: 2, popularity: 85 },
    { name_ar: 'موجات صوتية - غدة درقية', name_en: 'Thyroid Ultrasound', short_code: 'UST', modality: 'ultrasound', body_part: 'thyroid', price: 160, turnaround_hours: 2, popularity: 55 },
    { name_ar: 'إيكو القلب', name_en: 'Echocardiogram', short_code: 'ECHO', modality: 'ultrasound', body_part: 'heart', price: 280, turnaround_hours: 4, popularity: 70, requires_referral: true },
    { name_ar: 'أشعة مقطعية - دماغ', name_en: 'CT Brain', short_code: 'CTB', modality: 'ct', body_part: 'brain', price: 650, turnaround_hours: 6, popularity: 60, requires_referral: true },
    { name_ar: 'أشعة مقطعية - بطن وحوض', name_en: 'CT Abdomen & Pelvis', short_code: 'CTAP', modality: 'ct', body_part: 'abdomen', price: 850, fasting_required: true, fasting_hours: 6, contrast_required: true, turnaround_hours: 8, popularity: 50, requires_referral: true },
    { name_ar: 'أشعة مقطعية - صدر', name_en: 'CT Chest', short_code: 'CTC', modality: 'ct', body_part: 'chest', price: 720, turnaround_hours: 6, popularity: 45, requires_referral: true },
    { name_ar: 'رنين مغناطيسي - دماغ', name_en: 'MRI Brain', short_code: 'MRIB', modality: 'mri', body_part: 'brain', price: 1100, turnaround_hours: 24, popularity: 55, requires_referral: true },
    { name_ar: 'رنين مغناطيسي - ركبة', name_en: 'MRI Knee', short_code: 'MRIK', modality: 'mri', body_part: 'knee', price: 950, turnaround_hours: 24, popularity: 50, requires_referral: true },
    { name_ar: 'رنين مغناطيسي - عمود فقري', name_en: 'MRI Spine', short_code: 'MRIS', modality: 'mri', body_part: 'spine', price: 1200, turnaround_hours: 24, popularity: 45, requires_referral: true },
    { name_ar: 'ماموجرام - ثدي', name_en: 'Mammography', short_code: 'MAMMO', modality: 'mammography', body_part: 'breast', price: 320, turnaround_hours: 8, popularity: 55, requires_referral: false },
    { name_ar: 'قياس كثافة العظام DEXA', name_en: 'DEXA Bone Density', short_code: 'DEXA', modality: 'dexa', body_part: 'spine_hip', price: 380, turnaround_hours: 6, popularity: 40 },
];
//# sourceMappingURL=radiology.seed.js.map