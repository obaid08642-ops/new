import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';
import { MedicineSchema } from '../../schemas/medicine.schema';
import { LabServiceSchema } from '../../schemas/lab.schema';
import { HomeCareServiceSchema } from '../../schemas/home-care.schema';
import { FacilitySchema } from '../../schemas/facility.schema';
import { ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { FacilityRepository } from "./repositories/facility.repository";
import { HomeCareServiceRepository } from "./repositories/homecareservice.repository";
import { LabServiceRepository } from "./repositories/labservice.repository";
import { MedicineRepository } from "./repositories/medicine.repository";
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
import { ArticleRepository } from "./repositories/article.repository";
import { ArticleSchema } from "../../schemas/article.schema";

@Module({
  imports: [MongooseModule.forFeature([
    { name: 'Medicine', schema: MedicineSchema },
    { name: 'LabService', schema: LabServiceSchema },
    { name: 'HomeCareService', schema: HomeCareServiceSchema },
    { name: 'Facility', schema: FacilitySchema },
    { name: 'ProviderProfile', schema: ProviderProfileSchema },
    { name: 'Article', schema: ArticleSchema },
  ])],
  controllers: [SeoController],
  providers: [SeoService, { provide: 'FacilityRepository', useClass: FacilityRepository },
    { provide: 'ArticleRepository', useClass: ArticleRepository }, { provide: 'HomeCareServiceRepository', useClass: HomeCareServiceRepository }, { provide: 'LabServiceRepository', useClass: LabServiceRepository }, { provide: 'MedicineRepository', useClass: MedicineRepository }, { provide: 'ProviderProfileRepository', useClass: ProviderProfileRepository }],
  exports: [SeoService],
})
export class SeoModule {}
