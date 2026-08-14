import * as mongoose from 'mongoose';
import { ProviderProfileSchema } from '../schemas/provider-profile.schema';
import { MedicineSchema } from '../schemas/medicine.schema';
import { ProviderType, ProviderStatus, AcademicDegree } from '../common/enums';
import { v4 as uuidv4 } from 'uuid';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/nabd';

const doctorData = [
  {
    name_ar: 'د. أحمد محمود',
    name_en: 'Dr. Ahmed Mahmoud',
    specialty: 'cardiology',
    academic_degree: AcademicDegree.CONSULTANT,
    price_clinic: 300,
    price_online: 200,
    price_home: 500,
    city: 'Riyadh',
    rating: 4.8,
    reviews_count: 120,
    years_experience: 15,
  },
  {
    name_ar: 'د. سارة خالد',
    name_en: 'Dr. Sarah Khaled',
    specialty: 'dermatology',
    academic_degree: AcademicDegree.SPECIALIST,
    price_clinic: 250,
    price_online: 150,
    price_home: 400,
    city: 'Jeddah',
    rating: 4.6,
    reviews_count: 85,
    years_experience: 8,
  },
  {
    name_ar: 'د. محمد عبدالله',
    name_en: 'Dr. Mohammed Abdullah',
    specialty: 'pediatrics',
    academic_degree: AcademicDegree.SENIOR_SPECIALIST,
    price_clinic: 200,
    price_online: 100,
    price_home: 350,
    city: 'Dammam',
    rating: 4.9,
    reviews_count: 200,
    years_experience: 12,
  },
  {
    name_ar: 'د. نورة سالم',
    name_en: 'Dr. Noura Salem',
    specialty: 'gynecology',
    academic_degree: AcademicDegree.CONSULTANT,
    price_clinic: 400,
    price_online: 250,
    price_home: 600,
    city: 'Riyadh',
    rating: 4.7,
    reviews_count: 150,
    years_experience: 20,
  },
  {
    name_ar: 'د. عمر طارق',
    name_en: 'Dr. Omar Tariq',
    specialty: 'orthopedics',
    academic_degree: AcademicDegree.CONSULTANT,
    price_clinic: 350,
    price_online: 200,
    price_home: 550,
    city: 'Mecca',
    rating: 4.5,
    reviews_count: 90,
    years_experience: 18,
  },
  {
    name_ar: 'د. فاطمة علي',
    name_en: 'Dr. Fatima Ali',
    specialty: 'internal_medicine',
    academic_degree: AcademicDegree.SPECIALIST,
    price_clinic: 200,
    price_online: 150,
    price_home: 300,
    city: 'Medina',
    rating: 4.4,
    reviews_count: 60,
    years_experience: 10,
  },
  {
    name_ar: 'د. يوسف سعيد',
    name_en: 'Dr. Youssef Saeed',
    specialty: 'ophthalmology',
    academic_degree: AcademicDegree.SENIOR_SPECIALIST,
    price_clinic: 300,
    price_online: 200,
    price_home: 450,
    city: 'Riyadh',
    rating: 4.8,
    reviews_count: 110,
    years_experience: 14,
  },
  {
    name_ar: 'د. ليلى حسن',
    name_en: 'Dr. Laila Hassan',
    specialty: 'neurology',
    academic_degree: AcademicDegree.CONSULTANT,
    price_clinic: 450,
    price_online: 300,
    price_home: 700,
    city: 'Jeddah',
    rating: 4.9,
    reviews_count: 180,
    years_experience: 22,
  },
  {
    name_ar: 'د. حسن إبراهيم',
    name_en: 'Dr. Hassan Ibrahim',
    specialty: 'ent',
    academic_degree: AcademicDegree.SPECIALIST,
    price_clinic: 250,
    price_online: 150,
    price_home: 400,
    city: 'Dammam',
    rating: 4.6,
    reviews_count: 75,
    years_experience: 9,
  },
  {
    name_ar: 'د. ريم فهد',
    name_en: 'Dr. Reem Fahd',
    specialty: 'psychiatry',
    academic_degree: AcademicDegree.CONSULTANT,
    price_clinic: 500,
    price_online: 350,
    price_home: 800,
    city: 'Riyadh',
    rating: 4.7,
    reviews_count: 140,
    years_experience: 16,
  },
  {
    name_ar: 'د. خالد وليد',
    name_en: 'Dr. Khaled Waleed',
    specialty: 'urology',
    academic_degree: AcademicDegree.SENIOR_SPECIALIST,
    price_clinic: 350,
    price_online: 200,
    price_home: 500,
    city: 'Khobar',
    rating: 4.5,
    reviews_count: 95,
    years_experience: 11,
  },
  {
    name_ar: 'د. مريم صالح',
    name_en: 'Dr. Maryam Saleh',
    specialty: 'dentistry',
    academic_degree: AcademicDegree.SPECIALIST,
    price_clinic: 200,
    price_online: 100,
    price_home: 0,
    city: 'Riyadh',
    rating: 4.8,
    reviews_count: 210,
    years_experience: 7,
  },
  {
    name_ar: 'د. عبدالمجيد ناصر',
    name_en: 'Dr. Abdulmajeed Nasser',
    specialty: 'gastroenterology',
    academic_degree: AcademicDegree.CONSULTANT,
    price_clinic: 400,
    price_online: 250,
    price_home: 600,
    city: 'Jeddah',
    rating: 4.9,
    reviews_count: 160,
    years_experience: 19,
  },
  {
    name_ar: 'د. أسماء عبدالرحمن',
    name_en: 'Dr. Asma Abdulrahman',
    specialty: 'endocrinology',
    academic_degree: AcademicDegree.SENIOR_SPECIALIST,
    price_clinic: 300,
    price_online: 200,
    price_home: 450,
    city: 'Abha',
    rating: 4.6,
    reviews_count: 80,
    years_experience: 13,
  },
  {
    name_ar: 'د. زيد العتيبي',
    name_en: 'Dr. Zaid Al-Otaibi',
    specialty: 'general_surgery',
    academic_degree: AcademicDegree.CONSULTANT,
    price_clinic: 500,
    price_online: 300,
    price_home: 0,
    city: 'Riyadh',
    rating: 4.7,
    reviews_count: 130,
    years_experience: 25,
  }
];

const medicineData = [
  { name_en: 'Panadol Advance 500mg', name_ar: 'بانادول ادفانس ٥٠٠ ملجم', price: 12, requires_prescription: false, form: 'tablet', image: 'https://example.com/panadol.jpg', category: 'medications', active_ingredient: 'Paracetamol' },
  { name_en: 'Brufen 400mg', name_ar: 'بروفين ٤٠٠ ملجم', price: 18, requires_prescription: false, form: 'tablet', image: 'https://example.com/brufen.jpg', category: 'medications', active_ingredient: 'Ibuprofen' },
  { name_en: 'Amoxil 500mg', name_ar: 'اموكسيل ٥٠٠ ملجم', price: 35, requires_prescription: true, form: 'capsule', image: 'https://example.com/amoxil.jpg', category: 'medications', active_ingredient: 'Amoxicillin' },
  { name_en: 'Augmentin 1g', name_ar: 'اوجمنتين ١ جم', price: 85, requires_prescription: true, form: 'tablet', image: 'https://example.com/augmentin.jpg', category: 'medications', active_ingredient: 'Amoxicillin/Clavulanate' },
  { name_en: 'Zyrtec 10mg', name_ar: 'زيرتيك ١٠ ملجم', price: 25, requires_prescription: false, form: 'tablet', image: 'https://example.com/zyrtec.jpg', category: 'medications', active_ingredient: 'Cetirizine' },
  { name_en: 'Clarityn 10mg', name_ar: 'كلاريتين ١٠ ملجم', price: 28, requires_prescription: false, form: 'tablet', image: 'https://example.com/clarityn.jpg', category: 'medications', active_ingredient: 'Loratadine' },
  { name_en: 'Nexium 20mg', name_ar: 'نيكسيوم ٢٠ ملجم', price: 65, requires_prescription: true, form: 'tablet', image: 'https://example.com/nexium.jpg', category: 'medications', active_ingredient: 'Esomeprazole' },
  { name_en: 'Lipitor 20mg', name_ar: 'ليبِتور ٢٠ ملجم', price: 90, requires_prescription: true, form: 'tablet', image: 'https://example.com/lipitor.jpg', category: 'medications', active_ingredient: 'Atorvastatin' },
  { name_en: 'Concor 5mg', name_ar: 'كونكور ٥ ملجم', price: 45, requires_prescription: true, form: 'tablet', image: 'https://example.com/concor.jpg', category: 'medications', active_ingredient: 'Bisoprolol' },
  { name_en: 'Glucophage 500mg', name_ar: 'جلوكوفاج ٥٠٠ ملجم', price: 30, requires_prescription: true, form: 'tablet', image: 'https://example.com/glucophage.jpg', category: 'medications', active_ingredient: 'Metformin' },
  { name_en: 'Eltroxin 50mcg', name_ar: 'التروكسين ٥٠ ميكروجرام', price: 22, requires_prescription: true, form: 'tablet', image: 'https://example.com/eltroxin.jpg', category: 'medications', active_ingredient: 'Levothyroxine' },
  { name_en: 'Voltaren 50mg', name_ar: 'فولتارين ٥٠ ملجم', price: 40, requires_prescription: true, form: 'tablet', image: 'https://example.com/voltaren.jpg', category: 'medications', active_ingredient: 'Diclofenac' },
  { name_en: 'Ventolin Inhaler', name_ar: 'بخاخ فنتولين', price: 32, requires_prescription: true, form: 'inhaler', image: 'https://example.com/ventolin.jpg', category: 'medications', active_ingredient: 'Salbutamol' },
  { name_en: 'Symbicort Turbuhaler', name_ar: 'سيمبيكورت تيربوهيلر', price: 150, requires_prescription: true, form: 'inhaler', image: 'https://example.com/symbicort.jpg', category: 'medications', active_ingredient: 'Budesonide/Formoterol' },
  { name_en: 'Gaviscon Advance', name_ar: 'جافيسكون ادفانس', price: 26, requires_prescription: false, form: 'syrup', image: 'https://example.com/gaviscon.jpg', category: 'medications', active_ingredient: 'Sodium Alginate/Potassium Bicarbonate' },
  { name_en: 'Buscopan 10mg', name_ar: 'بسكوبان ١٠ ملجم', price: 15, requires_prescription: false, form: 'tablet', image: 'https://example.com/buscopan.jpg', category: 'medications', active_ingredient: 'Hyoscine Butylbromide' },
  { name_en: 'Imodium 2mg', name_ar: 'ايموديوم ٢ ملجم', price: 20, requires_prescription: false, form: 'capsule', image: 'https://example.com/imodium.jpg', category: 'medications', active_ingredient: 'Loperamide' },
  { name_en: 'Motilium 10mg', name_ar: 'موتيليوم ١٠ ملجم', price: 24, requires_prescription: true, form: 'tablet', image: 'https://example.com/motilium.jpg', category: 'medications', active_ingredient: 'Domperidone' },
  { name_en: 'Cataflam 50mg', name_ar: 'كاتافلام ٥٠ ملجم', price: 38, requires_prescription: true, form: 'tablet', image: 'https://example.com/cataflam.jpg', category: 'medications', active_ingredient: 'Diclofenac Potassium' },
  { name_en: 'Daflon 500mg', name_ar: 'دافلون ٥٠٠ ملجم', price: 55, requires_prescription: false, form: 'tablet', image: 'https://example.com/daflon.jpg', category: 'medications', active_ingredient: 'Diosmin/Hesperidin' }
];

async function seed() {
  
  await mongoose.connect(MONGO_URL);
  

  const ProviderModel = mongoose.model('ProviderProfile', ProviderProfileSchema);
  const MedicineModel = mongoose.model('Medicine', MedicineSchema);

  
  let doctorsCount = 0;
  for (const doc of doctorData) {
    const existing = await ProviderModel.findOne({ name_en: doc.name_en });
    if (!existing) {
      const user_id = uuidv4();
      await ProviderModel.create({
        ...doc,
        user_id,
        id: uuidv4(),
        type: ProviderType.DOCTOR,
        status: ProviderStatus.ACTIVE,
        consultation_modes: ['clinic', 'video', 'home'],
      });
      doctorsCount++;
    }
  }
  

  
  let medicinesCount = 0;
  for (const med of medicineData) {
    const existing = await MedicineModel.findOne({ name_en: med.name_en });
    if (!existing) {
      await MedicineModel.create({
        ...med,
        id: uuidv4(),
        verified: true,
      });
      medicinesCount++;
    }
  }
  

  
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Failed to seed:', err);
  process.exit(1);
});
