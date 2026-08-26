import * as mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { UserSchema } from '../schemas/user.schema';
import { ProviderProfileSchema } from '../schemas/provider-profile.schema';
import { UserRole, ProviderType, ProviderStatus } from '../common/enums';
import { v4 as uuidv4 } from 'uuid';

const MONGO_URL = process.env.MONGO_URL;

function assertTestSeedAllowed() {
  if (process.env.NODE_ENV !== 'test' || process.env.ALLOW_TEST_SEED !== 'true') {
    throw new Error('seed_test_providers is restricted to NODE_ENV=test with ALLOW_TEST_SEED=true');
  }
  if (!MONGO_URL) throw new Error('MONGO_URL is required for test seeding');
}

const providersData = [
  {
    phone: '+966500000001',
    role: UserRole.DOCTOR,
    type: ProviderType.DOCTOR,
    name_ar: 'د. أحمد التجريبي',
    name_en: 'Dr. Ahmed Test',
    details: {
      specialty: 'cardiology',
      academic_degree: 'consultant',
      price_clinic: 300,
      price_online: 200,
      price_home: 500,
      consultation_modes: ['clinic', 'video', 'home'],
    }
  },
  {
    phone: '+966500000002',
    role: UserRole.PHARMACY,
    type: ProviderType.PHARMACY,
    name_ar: 'صيدلية التجريبية الأولى',
    name_en: 'First Test Pharmacy',
    details: {
      delivery_radius_km: 15,
      delivery_fee: 10,
      min_order_sar: 50,
      has_own_delivery: true,
      delivery_mode: 'self_delivery',
    }
  },
  {
    phone: '+966500000003',
    role: UserRole.LAB,
    type: ProviderType.LAB,
    name_ar: 'معمل التحاليل التجريبي',
    name_en: 'Test Medical Lab',
    details: {
      test_categories: ['blood', 'urine', 'hormones'],
      home_visit_supported: true,
      home_visit_radius_km: 20,
    }
  },
  {
    phone: '+966500000004',
    role: UserRole.RADIOLOGY,
    type: ProviderType.RADIOLOGY,
    name_ar: 'مركز الأشعة التجريبي',
    name_en: 'Test Radiology Center',
    details: {
      test_categories: ['xray', 'mri', 'ct'],
      radiation_safety_license: 'RAD-SAFE-100223',
    }
  },
  {
    phone: '+966500000005',
    role: UserRole.NURSE,
    type: ProviderType.NURSING,
    name_ar: 'ممرض نبض التجريبي',
    name_en: 'Test Home Nurse',
    details: {
      gender: 'male',
      nationality: 'Saudi',
      priceVisit: 150,
      priceHour: 40,
      priceDay: 400,
      home_visit_supported: true,
    }
  },
  {
    phone: '+966500000006',
    role: UserRole.HOSPITAL,
    type: ProviderType.HOSPITAL,
    name_ar: 'مستشفى نبضة التجريبي',
    name_en: 'Test Nabdah Hospital',
    details: {
      departments: ['cardiology', 'pediatrics', 'dermatology', 'general_surgery'],
      accepts_insurance: true,
    }
  }
];

async function seed() {
  assertTestSeedAllowed();
  await mongoose.connect(MONGO_URL);
  

  const UserModel = mongoose.model('User', UserSchema);
  const ProviderModel = mongoose.model('ProviderProfile', ProviderProfileSchema);

  const passwordHash = await bcrypt.hash('Test@1234', 12);

  for (const prov of providersData) {
    let user = await UserModel.findOne({ phone: prov.phone });
    if (!user) {
      
      user = await UserModel.create({
        id: uuidv4(),
        full_name: prov.name_en,
        phone: prov.phone,
        password_hash: passwordHash,
        role: prov.role,
        active: true,
        verified: true,
        city: 'Riyadh',
        district: 'Al-Malqa',
      });
    } else {
      
      // Update password hash to make sure it is Test@1234
      user.password_hash = passwordHash;
      user.role = prov.role;
      user.active = true;
      user.verified = true;
      await user.save();
    }

    let profile = await ProviderModel.findOne({ user_id: user.id });
    if (!profile) {
      
      await ProviderModel.create({
        id: uuidv4(),
        user_id: user.id,
        account_id: user.id,
        type: prov.type,
        status: ProviderStatus.ACTIVE,
        name_ar: prov.name_ar,
        name_en: prov.name_en,
        city: 'Riyadh',
        district: 'Al-Malqa',
        license_verified: true,
        approved_at: new Date(),
        rating: 4.9,
        reviews_count: 32,
        location: { lat: 24.7963, lng: 46.6128 },
        ...prov.details
      });
    } else {
      
      profile.type = prov.type;
      profile.status = ProviderStatus.ACTIVE;
      profile.name_ar = prov.name_ar;
      profile.name_en = prov.name_en;
      profile.license_verified = true;
      profile.approved_at = new Date();
      // Apply details
      Object.assign(profile, prov.details);
      await profile.save();
    }
  }

  
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Failed to seed:', err);
  process.exit(1);
});
