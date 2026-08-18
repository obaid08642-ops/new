import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NursingController } from './home-care.controller';
import { HomeCareTrackingController } from './controllers/home-care-tracking.controller';
import { HomeCareSvc } from './home-care.service';
import { HomeCareBookingSchema, NursingVisitReportSchema, MedicalSupplyRequestSchema, NurseProviderSchema, HomeCarePackageSchema, HomeCareServiceSchema, CarePlanSchema } from '../../schemas/home-care.schema';
import { HOME_CARE_SEED } from './home-care.seed';
import { WorkflowEngineModule } from '../workflow-engine/workflow-engine.module';
import { CarePlanRepository } from "./repositories/careplan.repository";
import { HomeCareBookingRepository } from "./repositories/homecarebooking.repository";
import { HomeCareServiceRepository } from "./repositories/homecareservice.repository";
import { MedicalSupplyRequestRepository } from "./repositories/medicalsupplyrequest.repository";
import { NursingVisitReportRepository } from "./repositories/nursingvisitreport.repository";

@Module({
  imports: [
    WorkflowEngineModule,
    MongooseModule.forFeature([
      { name: 'HomeCareService', schema: HomeCareServiceSchema },
      { name: 'NurseProvider', schema: NurseProviderSchema },
      { name: 'HomeCarePackage', schema: HomeCarePackageSchema },
      { name: 'HomeCareBooking', schema: HomeCareBookingSchema },
      { name: 'NursingVisitReport', schema: NursingVisitReportSchema },
      { name: 'CarePlan', schema: CarePlanSchema },
      { name: 'MedicalSupplyRequest', schema: MedicalSupplyRequestSchema },
    ]),
  ],
  controllers: [NursingController, HomeCareTrackingController],
  providers: [HomeCareSvc, { provide: 'CarePlanRepository', useClass: CarePlanRepository }, { provide: 'HomeCareBookingRepository', useClass: HomeCareBookingRepository }, { provide: 'HomeCareServiceRepository', useClass: HomeCareServiceRepository }, { provide: 'MedicalSupplyRequestRepository', useClass: MedicalSupplyRequestRepository }, { provide: 'NursingVisitReportRepository', useClass: NursingVisitReportRepository }],
  exports: [HomeCareSvc],
})
export class HomeCareModule implements OnModuleInit {
  private readonly logger = new Logger('HomeCareSeed');
  constructor(@InjectModel('HomeCareService') private readonly svcModel: Model<any>) {}
  async onModuleInit() {
    const existing = await this.svcModel.countDocuments({ id: { $ne: null } });
    if (existing >= HOME_CARE_SEED.length) return;
    // Idempotent per-doc upsert — insertMany previously produced id:null zombie
    // docs (unique index allows only one null) and silently failed the whole seed.
    let ok = 0;
    for (const x of HOME_CARE_SEED as any[]) {
      try {
        // Map seed shape (title/basePrice) onto the actual schema (name_ar/name_en/price/duration)
        const doc = {
          id: x.id || require('uuid').v4(),
          name_ar: x.title?.ar,
          name_en: x.title?.en,
          description_ar: x.description?.ar,
          description_en: x.description?.en,
          category: x.category,
          price: x.basePrice,
          duration: 'hour',
          duration_value: Math.max(1, Math.round((x.estimatedDurationMins || 60) / 60)),
          icon: x.iconName || 'general',
          active: true,
        };
        await this.svcModel.updateOne(
          { name_en: doc.name_en, category: doc.category },
          { $setOnInsert: doc },
          { upsert: true },
        );
        ok++;
      } catch (e: any) {
        this.logger.error(`seed_doc_failed (${x?.title?.en}): ${e?.message?.slice(0, 120)}`);
      }
    }
    this.logger.log(`Seeded ${ok}/${HOME_CARE_SEED.length} home-care services`);
  }
}
