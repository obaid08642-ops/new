"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUBLIC_CATALOG_LOCALES = void 0;
exports.missingPublicMedicineTranslations = missingPublicMedicineTranslations;
exports.localizeMedicineStructured = localizeMedicineStructured;
exports.PUBLIC_CATALOG_LOCALES = ['ar', 'en', 'ur', 'hi', 'bn', 'fil'];
const DB_TRANSLATION_LOCALES = [
    { product: 'ur', db: 'ur' },
    { product: 'hi', db: 'hi' },
    { product: 'bn', db: 'bn' },
    { product: 'fil', db: 'tl' },
];
function missingPublicMedicineTranslations(raw) {
    const missing = [];
    if (!String(raw?.name_ar || '').trim())
        missing.push('ar.name');
    if (!String(raw?.name_en || '').trim())
        missing.push('en.name');
    const conditional = [
        ['category', 'main_category'],
        ['active_ingredient', 'active_ingredient'],
        ['form', 'dosage_form'],
        ['strength', 'strength'],
    ];
    for (const { product, db } of DB_TRANSLATION_LOCALES) {
        const translation = raw?.translations?.[db];
        if (!String(translation?.name || '').trim())
            missing.push(`${product}.name`);
        for (const [sourceField, translationKey] of conditional) {
            if (String(raw?.[sourceField] || '').trim() && !String(translation?.[translationKey] || '').trim()) {
                missing.push(`${product}.${translationKey}`);
            }
        }
    }
    return missing;
}
const FORM_EN = [
    [/أقراص|قرص|حبوب/i, 'Tablets'],
    [/كبسول/i, 'Capsules'],
    [/شراب/i, 'Syrup'],
    [/نقط|قطره|قطرة/i, 'Drops'],
    [/كريم/i, 'Cream'],
    [/مرهم/i, 'Ointment'],
    [/جل\b/i, 'Gel'],
    [/لوشن/i, 'Lotion'],
    [/بخاخ|اسبراي|رذاذ/i, 'Spray'],
    [/أمبول|امبول|حقن/i, 'Injection'],
    [/تحاميل|لبوس/i, 'Suppositories'],
    [/لصقة|لاصق|لصقات|بلاستر/i, 'Patches'],
    [/مسحوق|بودر/i, 'Powder'],
    [/أكياس|اكياس/i, 'Sachets'],
    [/معجون/i, 'Paste'],
    [/غسول/i, 'Cleanser'],
    [/شامبو/i, 'Shampoo'],
    [/صابون/i, 'Soap'],
    [/مكمل/i, 'Supplement'],
    [/سيروم/i, 'Serum'],
    [/زيت/i, 'Oil'],
    [/مناديل/i, 'Wipes'],
    [/كمامة|كمامات|قناع/i, 'Mask'],
    [/جهاز/i, 'Device'],
    [/إبر|ابر/i, 'Needles'],
    [/رباط|ضماد/i, 'Bandage'],
    [/فرشاة/i, 'Brush'],
    [/خيط/i, 'Floss'],
];
const CATEGORY_EN = [
    [/أدوية ومكملات/i, 'Medicines & Supplements'],
    [/أدوية/i, 'Medicines'],
    [/مكملات/i, 'Supplements'],
    [/فيتامينات/i, 'Vitamins'],
    [/مسكنات الألم|مسكنات/i, 'Pain Relief'],
    [/البرد والإنفلونزا|البرد/i, 'Cold & Flu'],
    [/مضادات حيوية/i, 'Antibiotics'],
    [/الحساسية/i, 'Allergy'],
    [/الجهاز الهضمي|معدة|هضم/i, 'Digestive Health'],
    [/القلب|ضغط/i, 'Heart & Blood Pressure'],
    [/السكري|سكر/i, 'Diabetes Care'],
    [/الأم والطفل|الأم والطفوله/i, 'Mother & Baby'],
    [/مستلزمات أطفال|أطفال/i, 'Baby Essentials'],
    [/حليب أطفال|حليب/i, 'Baby Formula'],
    [/حفاضات/i, 'Diapers'],
    [/العناية بالبشرة|بشرة/i, 'Skin Care'],
    [/العناية بالشعر|شعر/i, 'Hair Care'],
    [/العناية الشخصية/i, 'Personal Care'],
    [/العناية بالفم|فم|أسنان/i, 'Oral Care'],
    [/مستلزمات طبية|مستلزمات/i, 'Medical Supplies'],
    [/أجهزة طبية|أجهزة/i, 'Medical Devices'],
    [/تغذية/i, 'Nutrition'],
    [/تجميل|مكياج/i, 'Beauty'],
    [/عطور/i, 'Fragrances'],
    [/عدسات/i, 'Contact Lenses'],
    [/إسعافات أولية|إسعافات/i, 'First Aid'],
];
const UNIT_EN = [
    [/قطعة|قطعه|قطع|حبة|حبه/g, 'Pc'],
    [/قرص|أقراص/g, 'Tabs'],
    [/كبسولة|كبسولات/g, 'Caps'],
    [/مللي جرام|ملجم|ملج|مجم/g, 'mg'],
    [/جرام|جم|غم/g, 'g'],
    [/ملليلتر|مل/g, 'ml'],
    [/لتر/g, 'L'],
    [/عبوة|علبة/g, 'Pack'],
    [/زوج/g, 'Pair'],
    [/كيس|أكياس/g, 'Sachets'],
    [/بخاخ/g, 'Spray'],
    [/شريط/g, 'Strip'],
    [/وحدة/g, 'Unit'],
    [/متر/g, 'm'],
    [/سم/g, 'cm'],
];
function translateWith(table, value) {
    for (const [re, en] of table) {
        if (re.test(value))
            return value.replace(re, en).trim();
    }
    return null;
}
function translateUnits(value) {
    let out = value;
    for (const [re, en] of UNIT_EN)
        out = out.replace(re, en);
    return out.replace(/\s{2,}/g, ' ').trim();
}
const TR_KEY = {
    category: 'main_category',
    sub_category: 'sub_category',
    sub_sub_category: 'sub_sub_category',
    form: 'dosage_form',
    strength: 'strength',
    package_size: 'size_volume',
    package_content_details: 'package_content_details',
};
const LOCALIZABLE = ['category', 'sub_category', 'sub_sub_category', 'form', 'strength', 'package_size', 'package_content_details'];
function localizeMedicineStructured(raw, lang) {
    if (!raw || !lang || lang === 'ar')
        return raw;
    const out = { ...raw };
    for (const base of LOCALIZABLE) {
        const current = out[base];
        const trKey = TR_KEY[base];
        const fromTr = trKey ? raw?.translations?.[lang]?.[trKey] : undefined;
        if (typeof fromTr === 'string' && fromTr.trim()) {
            out[base] = fromTr;
            continue;
        }
        if (typeof current !== 'string' || !current.trim())
            continue;
        let translated = null;
        if (base === 'form')
            translated = translateWith(FORM_EN, current);
        else if (base === 'package_size' || base === 'package_content_details' || base === 'strength')
            translated = translateUnits(current);
        else
            translated = translateWith(CATEGORY_EN, current);
        if (translated && translated !== current)
            out[base] = translated;
    }
    return out;
}
//# sourceMappingURL=med-i18n.js.map