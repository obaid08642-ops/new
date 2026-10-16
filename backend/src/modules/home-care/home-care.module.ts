import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NursingController, HomeCareContractController } from './home-care.controller';
import { HomeCareTrackingController } from './controllers/home-care-tracking.controller';
import { HomeCareSvc } from './home-care.service';
import { HomeCareBookingSchema, NursingVisitReportSchema, MedicalSupplyRequestSchema, NurseProviderSchema, HomeCarePackageSchema, HomeCareServiceSchema, CarePlanSchema } from '../../schemas/home-care.schema';
import { WorkflowEngineModule } from '../workflow-engine/workflow-engine.module';
import { CarePlanRepository } from "./repositories/careplan.repository";
import { HomeCareCompatController, NursingOpsController, ChatAliasController } from './home-care-compat.module';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { ChatModule } from '../chat/chat.module';
import { HomeCareBookingRepository } from "./repositories/homecarebooking.repository";
import { HomeCareServiceRepository } from "./repositories/homecareservice.repository";
import { MedicalSupplyRequestRepository } from "./repositories/medicalsupplyrequest.repository";
import { NursingVisitReportRepository } from "./repositories/nursingvisitreport.repository";
import { HomeCarePackagesController } from './home-care-packages.controller';
import { NursingCompatController } from './nursing-compat.controller';
import { PatientHomeCareController } from './patient-home-care.controller';
import { PatientNurseProfileController } from './nurse-profile.controller';

@Module({
  imports: [
    WorkflowEngineModule,
    ChatModule,
    MongooseModule.forFeature([
      { name: 'HomeCareService', schema: HomeCareServiceSchema },
      { name: 'NurseProvider', schema: NurseProviderSchema },
      { name: 'HomeCarePackage', schema: HomeCarePackageSchema },
      { name: 'HomeCareBooking', schema: HomeCareBookingSchema },
      { name: 'NursingVisitReport', schema: NursingVisitReportSchema },
      { name: 'CarePlan', schema: CarePlanSchema },
      { name: 'MedicalSupplyRequest', schema: MedicalSupplyRequestSchema },
      { name: 'ProviderProfile', schema: ProviderProfileSchema },
    ]),
  ],
  // HomeCareContractController (bookings/:bookingId) goes LAST: registered first it swallowed the static
  // GET /home-care/bookings/my ("my" taken as a booking id -> 404 home_care_booking_not_found).
  controllers: [NursingController, HomeCareTrackingController, HomeCareCompatController, NursingOpsController, ChatAliasController, HomeCarePackagesController, NursingCompatController, PatientHomeCareController, PatientNurseProfileController, HomeCareContractController],
  providers: [HomeCareSvc, { provide: 'CarePlanRepository', useClass: CarePlanRepository }, { provide: 'HomeCareBookingRepository', useClass: HomeCareBookingRepository }, { provide: 'HomeCareServiceRepository', useClass: HomeCareServiceRepository }, { provide: 'MedicalSupplyRequestRepository', useClass: MedicalSupplyRequestRepository }, { provide: 'NursingVisitReportRepository', useClass: NursingVisitReportRepository }],
  exports: [HomeCareSvc],
})
// #1556 F: nursing_services is seeded from catalogs/seed-data/nursing.json only (one source, no duplicate rows).
export class HomeCareModule {}
