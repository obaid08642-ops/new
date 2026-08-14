// @ts-nocheck
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
    if (process.env.NODE_ENV !== 'test' || process.env.ALLOW_TEST_SEED !== 'true') {
      this.logger.log('Home-care seed skipped; test seeding requires NODE_ENV=test and ALLOW_TEST_SEED=true.');
      return;
    }
    const existing = await this.svcModel.countDocuments();
    if (existing >= HOME_CARE_SEED.length) return;
    const docs = HOME_CARE_SEED.map((x: any) => ({ ...x, active: true }));
    await this.svcModel.insertMany(docs, { ordered: false }).catch(() => {});
    this.logger.log(`Seeded ${docs.length} home-care services`);
  }
}
