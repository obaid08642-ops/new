export type InsuranceCompanyOption = {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  defaultCoPay: number;
  maxCoPaySar: number;
};

export const SAUDI_INSURANCE_COMPANIES: InsuranceCompanyOption[] = [
  { id: "bupa", code: "bupa", nameAr: "بوبا العربية للتأمين التعاوني", nameEn: "Bupa Arabia", defaultCoPay: 0.2, maxCoPaySar: 50 },
  { id: "tawuniya", code: "tawuniya", nameAr: "شركة التعاونية للتأمين", nameEn: "Tawuniya", defaultCoPay: 0.2, maxCoPaySar: 50 },
  { id: "medgulf", code: "medgulf", nameAr: "شركة المتوسط والخليج (ميدغلف)", nameEn: "MedGulf", defaultCoPay: 0.2, maxCoPaySar: 50 },
  { id: "al_rajhi_takaful", code: "al_rajhi_takaful", nameAr: "تكافل الراجحي", nameEn: "Al Rajhi Takaful", defaultCoPay: 0.2, maxCoPaySar: 50 },
  { id: "gigi", code: "gigi", nameAr: "مجموعة الخليج للتأمين (GIG / أكسا)", nameEn: "GIG Insurance (AXA)", defaultCoPay: 0.2, maxCoPaySar: 75 },
  { id: "walaa", code: "walaa", nameAr: "شركة ولاء للتأمين التعاوني", nameEn: "Walaa Cooperative Insurance", defaultCoPay: 0.2, maxCoPaySar: 50 },
  { id: "malath", code: "malath", nameAr: "شركة ملاذ للتأمين التعاوني", nameEn: "Malath Insurance", defaultCoPay: 0.2, maxCoPaySar: 50 },
  { id: "arabian_shield", code: "arabian_shield", nameAr: "شركة الدرع العربي للتأمين", nameEn: "Arabian Shield", defaultCoPay: 0.2, maxCoPaySar: 75 },
  { id: "salama", code: "salama", nameAr: "شركة سلامة للتأمين التعاوني", nameEn: "Salama Insurance", defaultCoPay: 0.2, maxCoPaySar: 50 },
  { id: "al_sagr", code: "al_sagr", nameAr: "شركة الصقر للتأمين التعاوني", nameEn: "Al Sagr Insurance", defaultCoPay: 0.2, maxCoPaySar: 50 },
  { id: "amana", code: "amana", nameAr: "شركة أمانة للتأمين التعاوني", nameEn: "Amana Cooperative Insurance", defaultCoPay: 0.2, maxCoPaySar: 50 },
  { id: "gulf_union", code: "gulf_union", nameAr: "اتحاد الخليج الأهلية للتأمين", nameEn: "Gulf Union Alahlia", defaultCoPay: 0.2, maxCoPaySar: 50 },
  { id: "enaya", code: "enaya", nameAr: "شركة عناية السعودية للتأمين", nameEn: "Saudi Enaya", defaultCoPay: 0.2, maxCoPaySar: 50 },
  { id: "allianz", code: "allianz", nameAr: "أليانز السعودي الفرنسي", nameEn: "Allianz Saudi Fransi", defaultCoPay: 0.2, maxCoPaySar: 50 },
];
