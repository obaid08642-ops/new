export interface InsuranceCategory {
  key: string;
  label: string;
  copayPercent: number;
  maxCoverage: number;
}

export interface InsurancePlan {
  planId: string;
  planName: string;
  planType: 'individual' | 'family' | 'corporate';
  coverageClass: 'VIP' | 'A' | 'B' | 'C' | 'D';
}

export interface InsuranceCompanyFull {
  id: string;
  name: string;
  nameEn: string;
  shortName: string;
  logo: string;
  brandColor: string;
  plans: InsurancePlan[];
}

export const COVERAGE_CLASSES = [
  { id: 'vip', nameAr: 'VIP', nameEn: 'VIP', level: 1 },
  { id: 'a', nameAr: 'الفئة A', nameEn: 'Class A', level: 2 },
  { id: 'b', nameAr: 'الفئة B', nameEn: 'Class B', level: 3 },
  { id: 'c', nameAr: 'الفئة C', nameEn: 'Class C', level: 4 },
  { id: 'd', nameAr: 'الفئة D', nameEn: 'Class D', level: 5 },
];

export const INSURANCE_CATEGORIES: InsuranceCategory[] = [
  { key: 'vip', label: 'VIP', copayPercent: 0, maxCoverage: 1000000 },
  { key: 'a_plus', label: 'A+', copayPercent: 0, maxCoverage: 750000 },
  { key: 'a', label: 'A', copayPercent: 10, maxCoverage: 500000 },
  { key: 'b_plus', label: 'B+', copayPercent: 15, maxCoverage: 500000 },
  { key: 'b', label: 'B', copayPercent: 20, maxCoverage: 300000 },
  { key: 'c', label: 'C', copayPercent: 20, maxCoverage: 250000 },
  { key: 'basic', label: 'أساسي', copayPercent: 25, maxCoverage: 150000 },
];

export const INSURANCE_COMPANIES_FULL: InsuranceCompanyFull[] = [
  {
    id: '1',
    name: 'بوبا العربية',
    nameEn: 'Bupa Arabia',
    shortName: 'بوبا',
    logo: 'bupa',
    brandColor: '#E30613',
    plans: [
      { planId: 'bupa-vip-ind', planName: 'بوبا VIP فردي', planType: 'individual', coverageClass: 'VIP' },
      { planId: 'bupa-a-fam', planName: 'بوبا عائلي A', planType: 'family', coverageClass: 'A' },
      { planId: 'bupa-b-corp', planName: 'بوبا مؤسسات B', planType: 'corporate', coverageClass: 'B' },
      { planId: 'bupa-c-corp', planName: 'بوبا مؤسسات C', planType: 'corporate', coverageClass: 'C' },
    ],
  },
  {
    id: '2',
    name: 'تكافل الراجحي',
    nameEn: 'Al Rajhi Takaful',
    shortName: 'تكافل',
    logo: 'tawuniya',
    brandColor: '#009933',
    plans: [
      { planId: 'rajhi-vip-ind', planName: 'تكافل VIP فردي', planType: 'individual', coverageClass: 'VIP' },
      { planId: 'rajhi-a-fam', planName: 'تكافل عائلي A', planType: 'family', coverageClass: 'A' },
      { planId: 'rajhi-b-corp', planName: 'تكافل مؤسسات B', planType: 'corporate', coverageClass: 'B' },
    ],
  },
  {
    id: '3',
    name: 'ملاذ للتأمين',
    nameEn: 'Malath Insurance',
    shortName: 'ملاذ',
    logo: 'malath',
    brandColor: '#00539B',
    plans: [
      { planId: 'malath-a-ind', planName: 'ملاذ فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'malath-b-fam', planName: 'ملاذ عائلي B', planType: 'family', coverageClass: 'B' },
      { planId: 'malath-c-corp', planName: 'ملاذ مؤسسات C', planType: 'corporate', coverageClass: 'C' },
    ],
  },
  {
    id: '4',
    name: 'الدرع العربي',
    nameEn: 'Arabian Shield',
    shortName: 'الدرع',
    logo: 'arabian_shield',
    brandColor: '#1A3C6E',
    plans: [
      { planId: 'shield-vip-ind', planName: 'الدرع VIP فردي', planType: 'individual', coverageClass: 'VIP' },
      { planId: 'shield-a-fam', planName: 'الدرع عائلي A', planType: 'family', coverageClass: 'A' },
      { planId: 'shield-b-corp', planName: 'الدرع مؤسسات B', planType: 'corporate', coverageClass: 'B' },
      { planId: 'shield-d-corp', planName: 'الدرع مؤسسات D', planType: 'corporate', coverageClass: 'D' },
    ],
  },
  {
    id: '5',
    name: 'أكسا التعاونية',
    nameEn: 'AXA Cooperative',
    shortName: 'أكسا',
    logo: 'axa',
    brandColor: '#00008F',
    plans: [
      { planId: 'axa-vip-ind', planName: 'أكسا VIP فردي', planType: 'individual', coverageClass: 'VIP' },
      { planId: 'axa-a-fam', planName: 'أكسا عائلي A', planType: 'family', coverageClass: 'A' },
      { planId: 'axa-c-corp', planName: 'أكسا مؤسسات C', planType: 'corporate', coverageClass: 'C' },
    ],
  },
  {
    id: '6',
    name: 'وقاية للتأمين',
    nameEn: 'Wiqaya Insurance',
    shortName: 'وقاية',
    logo: 'wiqaya',
    brandColor: '#006B3F',
    plans: [
      { planId: 'wiqaya-a-ind', planName: 'وقاية فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'wiqaya-b-fam', planName: 'وقاية عائلي B', planType: 'family', coverageClass: 'B' },
      { planId: 'wiqaya-c-corp', planName: 'وقاية مؤسسات C', planType: 'corporate', coverageClass: 'C' },
    ],
  },
  {
    id: '7',
    name: 'التعاونية',
    nameEn: 'Tawuniya',
    shortName: 'التعاونية',
    logo: 'tawuniya2',
    brandColor: '#C8102E',
    plans: [
      { planId: 'tawuniya-vip-ind', planName: 'التعاونية VIP فردي', planType: 'individual', coverageClass: 'VIP' },
      { planId: 'tawuniya-a-fam', planName: 'التعاونية عائلي A', planType: 'family', coverageClass: 'A' },
      { planId: 'tawuniya-b-corp', planName: 'التعاونية مؤسسات B', planType: 'corporate', coverageClass: 'B' },
      { planId: 'tawuniya-d-corp', planName: 'التعاونية مؤسسات D', planType: 'corporate', coverageClass: 'D' },
    ],
  },
  {
    id: '8',
    name: 'سايكو',
    nameEn: 'SAICO',
    shortName: 'سايكو',
    logo: 'saico',
    brandColor: '#3B82F6',
    plans: [
      { planId: 'saico-a-ind', planName: 'سايكو فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'saico-b-fam', planName: 'سايكو عائلي B', planType: 'family', coverageClass: 'B' },
      { planId: 'saico-c-corp', planName: 'سايكو مؤسسات C', planType: 'corporate', coverageClass: 'C' },
    ],
  },
  {
    id: '9',
    name: 'ميدغلف',
    nameEn: 'MedGulf',
    shortName: 'ميدغلف',
    logo: 'medgulf',
    brandColor: '#003366',
    plans: [
      { planId: 'medgulf-vip-ind', planName: 'ميدغلف VIP فردي', planType: 'individual', coverageClass: 'VIP' },
      { planId: 'medgulf-a-fam', planName: 'ميدغلف عائلي A', planType: 'family', coverageClass: 'A' },
      { planId: 'medgulf-b-corp', planName: 'ميدغلف مؤسسات B', planType: 'corporate', coverageClass: 'B' },
    ],
  },
  {
    id: '10',
    name: 'الراجحي تكافل',
    nameEn: 'Al Rajhi Takaful Plus',
    shortName: 'الراجحي',
    logo: 'alrajhi_takaful',
    brandColor: '#00843D',
    plans: [
      { planId: 'alrajhi-a-ind', planName: 'الراجحي فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'alrajhi-b-fam', planName: 'الراجحي عائلي B', planType: 'family', coverageClass: 'B' },
      { planId: 'alrajhi-c-corp', planName: 'الراجحي مؤسسات C', planType: 'corporate', coverageClass: 'C' },
      { planId: 'alrajhi-d-corp', planName: 'الراجحي مؤسسات D', planType: 'corporate', coverageClass: 'D' },
    ],
  },
  {
    id: '11',
    name: 'أليانز السعودي الفرنسي',
    nameEn: 'Allianz Saudi Fransi',
    shortName: 'أليانز',
    logo: 'allianz_sf',
    brandColor: '#003781',
    plans: [
      { planId: 'allianz-vip-ind', planName: 'أليانز VIP فردي', planType: 'individual', coverageClass: 'VIP' },
      { planId: 'allianz-a-fam', planName: 'أليانز عائلي A', planType: 'family', coverageClass: 'A' },
      { planId: 'allianz-b-corp', planName: 'أليانز مؤسسات B', planType: 'corporate', coverageClass: 'B' },
    ],
  },
  {
    id: '12',
    name: 'ولاء للتأمين',
    nameEn: 'Walaa Insurance',
    shortName: 'ولاء',
    logo: 'walaa',
    brandColor: '#1B4F72',
    plans: [
      { planId: 'walaa-a-ind', planName: 'ولاء فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'walaa-b-fam', planName: 'ولاء عائلي B', planType: 'family', coverageClass: 'B' },
      { planId: 'walaa-c-corp', planName: 'ولاء مؤسسات C', planType: 'corporate', coverageClass: 'C' },
    ],
  },
  {
    id: '13',
    name: 'الاتحاد التجاري',
    nameEn: 'United Cooperative Assurance',
    shortName: 'الاتحاد',
    logo: 'uca',
    brandColor: '#2C3E50',
    plans: [
      { planId: 'uca-a-ind', planName: 'الاتحاد فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'uca-b-fam', planName: 'الاتحاد عائلي B', planType: 'family', coverageClass: 'B' },
      { planId: 'uca-c-corp', planName: 'الاتحاد مؤسسات C', planType: 'corporate', coverageClass: 'C' },
      { planId: 'uca-d-corp', planName: 'الاتحاد مؤسسات D', planType: 'corporate', coverageClass: 'D' },
    ],
  },
  {
    id: '14',
    name: 'السعودية لإعادة التأمين',
    nameEn: 'Saudi Re',
    shortName: 'السعودية ري',
    logo: 'saudi_re',
    brandColor: '#006633',
    plans: [
      { planId: 'saudire-a-ind', planName: 'السعودية ري فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'saudire-b-corp', planName: 'السعودية ري مؤسسات B', planType: 'corporate', coverageClass: 'B' },
    ],
  },
  {
    id: '15',
    name: 'بروج للتأمين',
    nameEn: 'Buruj Insurance',
    shortName: 'بروج',
    logo: 'buruj',
    brandColor: '#8B0000',
    plans: [
      { planId: 'buruj-a-ind', planName: 'بروج فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'buruj-b-fam', planName: 'بروج عائلي B', planType: 'family', coverageClass: 'B' },
      { planId: 'buruj-c-corp', planName: 'بروج مؤسسات C', planType: 'corporate', coverageClass: 'C' },
    ],
  },
  {
    id: '16',
    name: 'الأهلي تكافل',
    nameEn: 'Al Ahli Takaful',
    shortName: 'الأهلي',
    logo: 'alahli_takaful',
    brandColor: '#004D40',
    plans: [
      { planId: 'alahli-vip-ind', planName: 'الأهلي VIP فردي', planType: 'individual', coverageClass: 'VIP' },
      { planId: 'alahli-a-fam', planName: 'الأهلي عائلي A', planType: 'family', coverageClass: 'A' },
      { planId: 'alahli-b-corp', planName: 'الأهلي مؤسسات B', planType: 'corporate', coverageClass: 'B' },
    ],
  },
  {
    id: '17',
    name: 'العربية السعودية للتأمين',
    nameEn: 'Arabian Saudi Insurance',
    shortName: 'العربية',
    logo: 'arabi',
    brandColor: '#1A237E',
    plans: [
      { planId: 'arabi-a-ind', planName: 'العربية فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'arabi-b-fam', planName: 'العربية عائلي B', planType: 'family', coverageClass: 'B' },
      { planId: 'arabi-c-corp', planName: 'العربية مؤسسات C', planType: 'corporate', coverageClass: 'C' },
    ],
  },
  {
    id: '18',
    name: 'سلامة للتأمين',
    nameEn: 'SALAMA Insurance',
    shortName: 'سلامة',
    logo: 'salama',
    brandColor: '#2E7D32',
    plans: [
      { planId: 'salama-a-ind', planName: 'سلامة فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'salama-b-fam', planName: 'سلامة عائلي B', planType: 'family', coverageClass: 'B' },
      { planId: 'salama-c-corp', planName: 'سلامة مؤسسات C', planType: 'corporate', coverageClass: 'C' },
      { planId: 'salama-d-corp', planName: 'سلامة مؤسسات D', planType: 'corporate', coverageClass: 'D' },
    ],
  },
  {
    id: '19',
    name: 'تشب العربية',
    nameEn: 'Chubb Arabia',
    shortName: 'تشب',
    logo: 'chubb',
    brandColor: '#E65100',
    plans: [
      { planId: 'chubb-vip-ind', planName: 'تشب VIP فردي', planType: 'individual', coverageClass: 'VIP' },
      { planId: 'chubb-a-fam', planName: 'تشب عائلي A', planType: 'family', coverageClass: 'A' },
      { planId: 'chubb-b-corp', planName: 'تشب مؤسسات B', planType: 'corporate', coverageClass: 'B' },
    ],
  },
  {
    id: '20',
    name: 'المتوسط والخليج للتأمين',
    nameEn: 'Mediterranean & Gulf Insurance',
    shortName: 'المتوسط',
    logo: 'medgulf2',
    brandColor: '#01579B',
    plans: [
      { planId: 'medgulf2-a-ind', planName: 'المتوسط فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'medgulf2-b-fam', planName: 'المتوسط عائلي B', planType: 'family', coverageClass: 'B' },
      { planId: 'medgulf2-c-corp', planName: 'المتوسط مؤسسات C', planType: 'corporate', coverageClass: 'C' },
    ],
  },
  {
    id: '21',
    name: 'الصقر للتأمين',
    nameEn: 'Al Sagr Insurance',
    shortName: 'الصقر',
    logo: 'sagr',
    brandColor: '#B71C1C',
    plans: [
      { planId: 'sagr-a-ind', planName: 'الصقر فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'sagr-b-fam', planName: 'الصقر عائلي B', planType: 'family', coverageClass: 'B' },
      { planId: 'sagr-c-corp', planName: 'الصقر مؤسسات C', planType: 'corporate', coverageClass: 'C' },
    ],
  },
  {
    id: '22',
    name: 'عناية للتأمين',
    nameEn: 'Enaya Insurance',
    shortName: 'عناية',
    logo: 'enaya',
    brandColor: '#0D47A1',
    plans: [
      { planId: 'enaya-a-ind', planName: 'عناية فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'enaya-b-corp', planName: 'عناية مؤسسات B', planType: 'corporate', coverageClass: 'B' },
      { planId: 'enaya-d-corp', planName: 'عناية مؤسسات D', planType: 'corporate', coverageClass: 'D' },
    ],
  },
  {
    id: '23',
    name: 'الوطنية للتأمين',
    nameEn: 'Wataniya Insurance',
    shortName: 'الوطنية',
    logo: 'wataniya',
    brandColor: '#1B5E20',
    plans: [
      { planId: 'wataniya-a-ind', planName: 'الوطنية فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'wataniya-b-fam', planName: 'الوطنية عائلي B', planType: 'family', coverageClass: 'B' },
      { planId: 'wataniya-c-corp', planName: 'الوطنية مؤسسات C', planType: 'corporate', coverageClass: 'C' },
    ],
  },
  {
    id: '24',
    name: 'جزيرة تكافل',
    nameEn: 'Al Jazira Takaful',
    shortName: 'جزيرة',
    logo: 'jazira_takaful',
    brandColor: '#004D40',
    plans: [
      { planId: 'jazira-vip-ind', planName: 'جزيرة VIP فردي', planType: 'individual', coverageClass: 'VIP' },
      { planId: 'jazira-a-fam', planName: 'جزيرة عائلي A', planType: 'family', coverageClass: 'A' },
      { planId: 'jazira-b-corp', planName: 'جزيرة مؤسسات B', planType: 'corporate', coverageClass: 'B' },
    ],
  },
  {
    id: '25',
    name: 'أمانة للتأمين',
    nameEn: 'Amana Insurance',
    shortName: 'أمانة',
    logo: 'amana',
    brandColor: '#311B92',
    plans: [
      { planId: 'amana-a-ind', planName: 'أمانة فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'amana-b-fam', planName: 'أمانة عائلي B', planType: 'family', coverageClass: 'B' },
      { planId: 'amana-c-corp', planName: 'أمانة مؤسسات C', planType: 'corporate', coverageClass: 'C' },
    ],
  },
  {
    id: '26',
    name: 'الإنماء طوكيو مارين',
    nameEn: 'Alinma Tokio Marine',
    shortName: 'الإنماء',
    logo: 'alinma_tokio',
    brandColor: '#0277BD',
    plans: [
      { planId: 'alinma-a-ind', planName: 'الإنماء فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'alinma-b-fam', planName: 'الإنماء عائلي B', planType: 'family', coverageClass: 'B' },
      { planId: 'alinma-c-corp', planName: 'الإنماء مؤسسات C', planType: 'corporate', coverageClass: 'C' },
      { planId: 'alinma-d-corp', planName: 'الإنماء مؤسسات D', planType: 'corporate', coverageClass: 'D' },
    ],
  },
  {
    id: '27',
    name: 'الخليجية العامة للتأمين',
    nameEn: 'Gulf Union Insurance',
    shortName: 'الخليجية',
    logo: 'gulf_union',
    brandColor: '#004D40',
    plans: [
      { planId: 'gulf-a-ind', planName: 'الخليجية فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'gulf-b-fam', planName: 'الخليجية عائلي B', planType: 'family', coverageClass: 'B' },
      { planId: 'gulf-c-corp', planName: 'الخليجية مؤسسات C', planType: 'corporate', coverageClass: 'C' },
    ],
  },
  {
    id: '28',
    name: 'الحياة للتأمين',
    nameEn: 'Al Hayat Insurance',
    shortName: 'الحياة',
    logo: 'alhayat',
    brandColor: '#2E7D32',
    plans: [
      { planId: 'hayat-a-ind', planName: 'الحياة فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'hayat-b-corp', planName: 'الحياة مؤسسات B', planType: 'corporate', coverageClass: 'B' },
    ],
  },
  {
    id: '29',
    name: 'اتحاد الخليج للتأمين',
    nameEn: 'Trade Union Insurance',
    shortName: 'اتحاد الخليج',
    logo: 'trade_union',
    brandColor: '#37474F',
    plans: [
      { planId: 'trade-a-ind', planName: 'اتحاد الخليج فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'trade-b-fam', planName: 'اتحاد الخليج عائلي B', planType: 'family', coverageClass: 'B' },
      { planId: 'trade-c-corp', planName: 'اتحاد الخليج مؤسسات C', planType: 'corporate', coverageClass: 'C' },
    ],
  },
  {
    id: '30',
    name: 'سوليدرتي السعودية',
    nameEn: 'Solidarity Saudi Takaful',
    shortName: 'سوليدرتي',
    logo: 'solidarity',
    brandColor: '#BF360C',
    plans: [
      { planId: 'solidarity-a-ind', planName: 'سوليدرتي فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'solidarity-b-fam', planName: 'سوليدرتي عائلي B', planType: 'family', coverageClass: 'B' },
      { planId: 'solidarity-c-corp', planName: 'سوليدرتي مؤسسات C', planType: 'corporate', coverageClass: 'C' },
    ],
  },
  {
    id: '31',
    name: 'العالمية للتأمين',
    nameEn: 'Al Alamiya Insurance',
    shortName: 'العالمية',
    logo: 'alamiya',
    brandColor: '#1565C0',
    plans: [
      { planId: 'alamiya-a-ind', planName: 'العالمية فردي A', planType: 'individual', coverageClass: 'A' },
      { planId: 'alamiya-b-corp', planName: 'العالمية مؤسسات B', planType: 'corporate', coverageClass: 'B' },
      { planId: 'alamiya-d-corp', planName: 'العالمية مؤسسات D', planType: 'corporate', coverageClass: 'D' },
    ],
  },
];

export const REQUIRES_PRESCRIPTION = {
  pharmacy: {
    controlled: true,
    otc: false,
  },
  diagnostics: true,
  radiology: true,
  consultations: false,
};

// Backward-compatible alias
export const INSURANCE_COMPANIES = INSURANCE_COMPANIES_FULL;
