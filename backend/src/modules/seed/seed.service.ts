import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../../schemas/user.schema';
import { PatientProfile, PatientProfileDocument } from '../../schemas/patient-profile.schema';
import { ProviderProfile, ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { Medicine, MedicineDocument } from '../../schemas/medicine.schema';
import { PharmacyInventory, PharmacyInventoryDocument } from '../../schemas/inventory.schema';
import { Facility, FacilityDocument } from '../../schemas/facility.schema';
import { LabService } from '../../schemas/lab.schema';
import { SystemConfig, SystemConfigDocument } from '../../schemas/system-config.schema';
import { UserRole, ProviderType, ProviderStatus } from '../../common/enums';
import { SEED_USERS, SEED_PHARMACIES, SEED_DOCTORS, SEED_DELIVERY, SEED_MEDICINES } from './seed.data';
import { SEED_FACILITIES } from './seed.facilities';
import { LAB_SEED } from '../labs/labs.seed';
import { UserRepository } from "./repositories/user.repository";
import { PatientProfileRepository } from "./repositories/patientprofile.repository";
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
import { MedicineRepository } from "./repositories/medicine.repository";
import { PharmacyInventoryRepository } from "./repositories/pharmacyinventory.repository";
import { FacilityRepository } from "./repositories/facility.repository";
import { LabServiceRepository } from "./repositories/labservice.repository";
import { SystemConfigRepository } from "./repositories/systemconfig.repository";

@Injectable()
export class SeedService implements OnModuleInit {
  private logger = new Logger('Seed');

  constructor(
    @Inject('UserRepository') private userModel: UserRepository,
    @Inject('PatientProfileRepository') private patientModel: PatientProfileRepository,
    @Inject('ProviderProfileRepository') private providerModel: ProviderProfileRepository,
    @Inject('MedicineRepository') private medModel: MedicineRepository,
    @Inject('PharmacyInventoryRepository') private invModel: PharmacyInventoryRepository,
    @Inject('FacilityRepository') private facilityModel: FacilityRepository,
    @Inject('LabServiceRepository') private labSvcModel: LabServiceRepository,
    @Inject('SystemConfigRepository') private configModel: SystemConfigRepository,
  ) {}

  async onModuleInit() {
    // Each reference-data seeder is isolated: one failure never aborts the rest.
    for (const step of [
      () => this.seedSystemConfig(),
      () => this.seedMedicines(),
      () => this.seedLabs(),
      () => this.seedFacilities(),
    ]) {
      try {
        await step();
      } catch (e: any) {
        this.logger.error(`Seed step failed: ${e?.message}`);
      }
    }

    const testSeedEnabled = process.env.NODE_ENV === 'test' && process.env.ALLOW_TEST_SEED === 'true';
    if (testSeedEnabled) {
      for (const step of [
        () => this.seedPatient(),
        () => this.seedPharmacies(),
        () => this.seedDoctors(),
        () => this.seedExtraProviders(),
        () => this.seedDelivery(),
        () => this.seedInventory(),
      ]) {
        try {
          await step();
        } catch (e: any) {
          this.logger.error(`Seed step failed: ${e?.message}`);
        }
      }
      this.logger.log('Seed complete — idempotent test data enabled explicitly');
    } else {
      this.logger.log('Seed complete — reference data only (demo identities skipped outside explicit test mode)');
    }
  }

  /** Seed facilities (hospitals/clinics) with stable IDs by slug.
   * INSERT-ONLY ($setOnInsert): existing records — including admin
   * deactivation (is_active:false) or edits — are NEVER overwritten.
   * Previously $set re-activated suspended facilities on every restart (P0-17). */
  async seedFacilities() {
    for (const f of SEED_FACILITIES) {
      await this.facilityModel.updateOne(
        { slug: f.slug },
        { $setOnInsert: { ...f, id: f.slug, slug: f.slug, is_active: true } },
        { upsert: true },
      );
    }
  }

  async seedMedicines() {
    for (const m of SEED_MEDICINES) {
      await this.medModel.updateOne(
        { name_ar: m.name_ar },
        { $setOnInsert: { ...m, source: 'master' } },
        { upsert: true },
      );
    }
  }

  async seedPatient() {
    for (const p of SEED_USERS) {
      const exists = await this.userModel.findOne({ phone: p.phone });
      if (exists) continue;
      const hash = await bcrypt.hash(p.password, 12);
      const u = await this.userModel.create({
        full_name: p.full_name,
        phone: p.phone,
        password_hash: hash,
        role: UserRole.PATIENT,
        city: p.city, district: p.district,
      });
      await this.patientModel.create({
        user_id: u.id, age: 32, gender: 'male', blood_type: 'O+',
        chronic_diseases: ['ضغط دم'],
        emergency_contacts: [{ name: 'والدة', phone: '+966500000111', relation: 'أسرة' }],
      });
    }
  }

  async seedPharmacies() {
    for (const ph of SEED_PHARMACIES) {
      const exists = await this.userModel.findOne({ phone: ph.phone });
      if (exists) continue;
      const hash = await bcrypt.hash(ph.password, 12);
      const u = await this.userModel.create({
        full_name: ph.full_name,
        phone: ph.phone,
        password_hash: hash,
        role: UserRole.PHARMACY,
        city: ph.city, district: ph.district,
        location: ph.location,
      });
      await this.providerModel.create({
        user_id: u.id,
        account_id: u.id,
        type: ProviderType.PHARMACY,
        status: ProviderStatus.ACTIVE,
        name_ar: ph.name_ar,
        name_en: ph.name_en,
        pharmacy_chain: ph.pharmacy_chain,
        city: ph.city,
        district: ph.district,
        location: ph.location,
        has_own_drivers: ph.has_own_drivers,
        delivery_radius_km: ph.delivery_radius_km,
        rating: ph.rating,
        license_verified: true,
        working_hours: ph.working_hours,
        approved_at: new Date(),
      });
    }
  }

  async seedDoctors() {
    for (const d of SEED_DOCTORS) {
      let user = await this.userModel.findOne({ phone: d.phone });
      if (!user) {
        const hash = await bcrypt.hash(d.password, 12);
        user = await this.userModel.create({
          full_name: d.full_name, phone: d.phone, password_hash: hash,
          role: UserRole.DOCTOR, city: d.city, district: d.district,
        });
      }
      // Resolve facility id by name_ar
      let facility_id: string | undefined;
      const fs = (d as any).facility_slug;
      if (fs) {
        const facilityNameAr = SEED_FACILITIES.find((f) => f.slug === fs)?.name_ar;
        if (facilityNameAr) {
          const facility = await this.facilityModel.findOne({ name_ar: facilityNameAr });
          if (facility) facility_id = facility.id;
        }
      }
      const update = {
        user_id: user.id,
        account_id: user.id,
        type: ProviderType.DOCTOR,
        status: ProviderStatus.ACTIVE,
        name_ar: d.name_ar, name_en: d.name_en,
        specialty: d.specialty, title: d.title, license_number: d.license_number,
        years_experience: d.years_experience, city: d.city, district: d.district,
        consultation_modes: d.consultation_modes,
        price_clinic: d.price_clinic, price_online: d.price_online, price_home: (d as any).price_home,
        rating: d.rating, license_verified: true, approved_at: new Date(),
        hospital: (d as any).hospital,
        facility_id,
        academic_degree: (d as any).academic_degree,
        bio: (d as any).bio,
        languages: (d as any).languages || [],
        location: (d as any).location,
        accepts_insurance: !!(d as any).accepts_insurance,
        accepted_insurance: (d as any).accepted_insurance || [],
        working_hours: (d as any).working_hours || [],
      };
      await this.providerModel.updateOne(
        { user_id: user.id, type: ProviderType.DOCTOR },
        { $set: update },
        { upsert: true },
      );
    }
  }

  async seedExtraProviders() {
    // 1. Hospital/Facility
    const hospPhone = '+966555000004';
    let hospUser = await this.userModel.findOne({ phone: hospPhone });
    if (!hospUser) {
      const hash = await bcrypt.hash('Hospital@123', 12);
      hospUser = await this.userModel.create({
        full_name: 'مستشفى الملك فيصل التخصصي', phone: hospPhone, password_hash: hash,
        role: UserRole.HOSPITAL, city: 'الرياض', district: 'العليا',
      });
      await this.providerModel.create({
        user_id: hospUser.id, account_id: hospUser.id,
        type: ProviderType.HOSPITAL, status: ProviderStatus.ACTIVE,
        name_ar: 'مستشفى الملك فيصل التخصصي', name_en: 'King Faisal Specialist Hospital',
        city: 'الرياض', district: 'العليا', location: { lat: 24.7142, lng: 46.6859 },
        license_verified: true, approved_at: new Date(),
      });
    }

    // 2. Laboratory
    const labPhone = '+966555000005';
    let labUser = await this.userModel.findOne({ phone: labPhone });
    if (!labUser) {
      const hash = await bcrypt.hash('Lab@123', 12);
      labUser = await this.userModel.create({
        full_name: 'معمل نبض الطبي', phone: labPhone, password_hash: hash,
        role: UserRole.LAB, city: 'الرياض', district: 'العليا',
      });
      await this.providerModel.create({
        user_id: labUser.id, account_id: labUser.id,
        type: ProviderType.LAB, status: ProviderStatus.ACTIVE,
        name_ar: 'معمل نبض الطبي', name_en: 'Nabd Medical Lab',
        city: 'الرياض', district: 'العليا', location: { lat: 24.7136, lng: 46.6753 },
        license_verified: true, approved_at: new Date(),
      });
    }

    // 3. Radiology
    const radPhone = '+966555000006';
    let radUser = await this.userModel.findOne({ phone: radPhone });
    if (!radUser) {
      const hash = await bcrypt.hash('Radiology@123', 12);
      radUser = await this.userModel.create({
        full_name: 'مركز نبض للأشعة', phone: radPhone, password_hash: hash,
        role: UserRole.RADIOLOGY, city: 'الرياض', district: 'العليا',
      });
      await this.providerModel.create({
        user_id: radUser.id, account_id: radUser.id,
        type: ProviderType.RADIOLOGY, status: ProviderStatus.ACTIVE,
        name_ar: 'مركز نبض للأشعة', name_en: 'Nabd Radiology Center',
        city: 'الرياض', district: 'العليا', location: { lat: 24.7130, lng: 46.6740 },
        license_verified: true, approved_at: new Date(),
      });
    }

    // 4. Nursing
    const nursePhone = '+966555000007';
    let nurseUser = await this.userModel.findOne({ phone: nursePhone });
    if (!nurseUser) {
      const hash = await bcrypt.hash('Nurse@123', 12);
      nurseUser = await this.userModel.create({
        full_name: 'ممرض نبض المنزلي', phone: nursePhone, password_hash: hash,
        role: UserRole.NURSE, city: 'الرياض', district: 'العليا',
      });
      await this.providerModel.create({
        user_id: nurseUser.id, account_id: nurseUser.id,
        type: ProviderType.HOME_CARE, status: ProviderStatus.ACTIVE,
        name_ar: 'ممرض نبض المنزلي', name_en: 'Nabd Home Nurse',
        city: 'الرياض', district: 'العليا', location: { lat: 24.7120, lng: 46.6720 },
        license_verified: true, approved_at: new Date(),
      });
    }
  }

  async seedDelivery() {
    for (const dd of SEED_DELIVERY) {
      const exists = await this.userModel.findOne({ phone: dd.phone });
      if (exists) continue;
      const hash = await bcrypt.hash(dd.password, 12);
      await this.userModel.create({
        full_name: dd.full_name, phone: dd.phone, password_hash: hash,
        role: UserRole.DELIVERY, city: dd.city, active: true,
      });
    }
  }

  /**
   * Seed PharmacyInventory: distribute medicines across the 3 pharmacies so
   * that EACH pharmacy carries ~80% of all medicines (with varied stock levels).
   * This guarantees the geo-dispatcher always has SOMETHING to choose.
   */
  async seedInventory() {
    // Skip if any inventory rows already exist
    const existing = await this.invModel.countDocuments();
    if (existing > 0) return;
    const pharmacies = await this.providerModel.find({ type: ProviderType.PHARMACY });
    const medicines = await this.medModel.find({});
    if (pharmacies.length === 0 || medicines.length === 0) return;
    const rows: any[] = [];
    for (let pIdx = 0; pIdx < pharmacies.length; pIdx++) {
      const ph = pharmacies[pIdx];
      for (let mIdx = 0; mIdx < medicines.length; mIdx++) {
        const med = medicines[mIdx];
        // Each pharmacy carries 80% of medicines deterministically; offset by index for variety
        const carries = ((mIdx + pIdx) % 5) !== 0;
        if (!carries) continue;
        rows.push({
          pharmacy_id: ph.user_id,
          medicine_id: med.id,
          stock_qty: 5 + ((mIdx * 7 + pIdx * 13) % 25), // 5..29 units
          price: med.price,
          is_available: true,
          last_restocked_at: new Date(),
        });
      }
    }
    if (rows.length > 0) {
      await this.invModel.insertMany(rows, { ordered: false }).catch(() => {});
      this.logger.log(`Seeded ${rows.length} pharmacy inventory rows`);
    }
  }

  private async seedLabs() {
    // Per-item upsert (no count gate): market-gap additions deploy live automatically.
    let ok = 0;
    for (const x of LAB_SEED as any[]) {
      if (!x.short_code) continue;
      try {
        const r = await this.labSvcModel.updateOne(
          { short_code: x.short_code },
          { $setOnInsert: { ...x, active: true } },
          { upsert: true },
        );
        if ((r as any).upsertedCount || (r as any).upsertedId) ok++;
      } catch { /* duplicate → already live */ }
    }
    if (ok) this.logger.log(`Seeded ${ok} new lab services`);
  }

  async seedSystemConfig() {
    const key = 'pharmacy_broadcast_stages';
    const exists = await this.configModel.findOne({ key });
    if (!exists) {
      await this.configModel.create({
        key,
        value: [
          // Master spec: 3km → 5km → 8km, 60s per stage (backend-configurable)
          { stage: 1, radius_km: 3, timeout_seconds: 60 },
          { stage: 2, radius_km: 5, timeout_seconds: 60 },
          { stage: 3, radius_km: 8, timeout_seconds: 60 }
        ]
      });
      this.logger.log('Seeded default pharmacy broadcast stages config');
    }

    const mainKey = 'system_config';
    const mainExists = await this.configModel.findOne({ key: mainKey });
    if (!mainExists) {
      await this.configModel.create({
        key: mainKey,
        value: {
          consultation_followup_hours: 24
        }
      });
      this.logger.log('Seeded default system config (follow-up hours)');
    }
    // F23: public policy texts (cancellation + returns) — merge defaults into
    // existing doc so live DBs pick them up without overwrite of admin edits.
    const POLICY_DEFAULTS: Record<string, any> = {
      cancellation_policy: {
        full_hours: 24,
        full_refund: true,
        half_hours: 12,
        half_refund_percent: 50,
        late_fee_percent: 25,
        pharmacy_prep_cancellable: false,
      },
      returns_policy: {
        unused_days: 7,
        intact_packaging_required: true,
        wallet_refund_days_min: 3,
        wallet_refund_days_max: 5,
      },
    };
    const main = await this.configModel.findOne({ key: mainKey });
    if (main) {
      const missing: Record<string, any> = {};
      for (const [k, v] of Object.entries(POLICY_DEFAULTS)) {
        if ((main as any).value?.[k] === undefined) missing[k] = v;
      }
      if (Object.keys(missing).length) {
        await this.configModel.updateOne({ key: mainKey }, { $set: Object.fromEntries(Object.entries(missing).map(([k, v]) => [`value.${k}`, v])) });
        this.logger.log(`Seeded policy defaults: ${Object.keys(missing).join(',')}`);
      }
    }
  }
}
