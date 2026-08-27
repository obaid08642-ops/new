import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeedService } from './seed.service';
import { User, UserSchema } from '../../schemas/user.schema';
import { PatientProfile, PatientProfileSchema } from '../../schemas/patient-profile.schema';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { Medicine, MedicineSchema } from '../../schemas/medicine.schema';
import { PharmacyInventory, PharmacyInventorySchema } from '../../schemas/inventory.schema';
import { Facility, FacilitySchema } from '../../schemas/facility.schema';
import { LabServiceSchema } from '../../schemas/lab.schema';
import { SystemConfig, SystemConfigSchema } from '../../schemas/system-config.schema';
import { FacilityRepository } from "./repositories/facility.repository";
import { LabServiceRepository } from "./repositories/labservice.repository";
import { MedicineRepository } from "./repositories/medicine.repository";
import { PatientProfileRepository } from "./repositories/patientprofile.repository";
import { PharmacyInventoryRepository } from "./repositories/pharmacyinventory.repository";
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
import { SystemConfigRepository } from "./repositories/systemconfig.repository";
import { UserRepository } from "./repositories/user.repository";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PatientProfile.name, schema: PatientProfileSchema },
      { name: ProviderProfile.name, schema: ProviderProfileSchema },
      { name: Medicine.name, schema: MedicineSchema },
      { name: PharmacyInventory.name, schema: PharmacyInventorySchema },
      { name: Facility.name, schema: FacilitySchema },
      { name: 'LabService', schema: LabServiceSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
    ]),
  ],
  providers: [SeedService, { provide: 'FacilityRepository', useClass: FacilityRepository }, { provide: 'LabServiceRepository', useClass: LabServiceRepository }, { provide: 'MedicineRepository', useClass: MedicineRepository }, { provide: 'PatientProfileRepository', useClass: PatientProfileRepository }, { provide: 'PharmacyInventoryRepository', useClass: PharmacyInventoryRepository }, { provide: 'ProviderProfileRepository', useClass: ProviderProfileRepository }, { provide: 'SystemConfigRepository', useClass: SystemConfigRepository }, { provide: 'UserRepository', useClass: UserRepository }],
  exports: [SeedService],
})
export class SeedModule {}
