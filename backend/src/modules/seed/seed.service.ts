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
    // Reference data only. Q103: demo identities (patients, doctors,
    // pharmacies, couriers, providers) and invented facility records are no
    // longer seeded by the application in any environment.
    for (const step of [
      () => this.seedSystemConfig(),
      () => this.seedLabs(),
      () => this.seedFulfillmentPolicies(),
    ]) {
      try {
        await step();
      } catch (e: any) {
        this.logger.error(`Seed step failed: ${e?.message}`);
      }
    }
    this.logger.log('Seed complete — reference data only');
  }

  /** Platform cash-on-delivery policy. The allocation gate (pharmacy-allocation.service) refuses to
   * prepare a COD order without an active policy, and nothing else ever created one, so no cash order
   * could be fulfilled. INSERT-ONLY: an admin who disables it (PUT /admin/pharmacy/fulfillment-policies/cod)
   * is never overridden on restart. */
  private async seedFulfillmentPolicies() {
    const col = (this.configModel as any).model.db.collection('pharmacy_fulfillment_policies');
    await col.updateOne(
      { id: 'platform-cod' },
      { $setOnInsert: { id: 'platform-cod', payment_method: 'cod', provider_account_id: null, active: true, allow_preparation: true, created_by: 'system-default', createdAt: new Date() } },
      { upsert: true },
    );
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
