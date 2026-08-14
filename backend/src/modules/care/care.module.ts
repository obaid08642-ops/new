import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CareController } from './care.controller';
import { AppointmentsController } from './appointments.controller';
import { CareService } from './care.service';
import { AppointmentsService } from './appointments.service';
import { SlotService } from './slot.service';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';
import { Facility, FacilitySchema } from '../../schemas/facility.schema';
import { WorkflowEngineModule } from '../workflow-engine/workflow-engine.module';
import { AppointmentRepository } from "./repositories/appointment.repository";
import { FacilityRepository } from "./repositories/facility.repository";
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
import { UserRepository } from "./repositories/user.repository";

@Module({
  imports: [
    WorkflowEngineModule,
    MongooseModule.forFeature([
      { name: ProviderProfile.name, schema: ProviderProfileSchema },
      { name: User.name, schema: UserSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Facility.name, schema: FacilitySchema },
    ]),
  ],
  controllers: [CareController, AppointmentsController],
  providers: [CareService, AppointmentsService, SlotService, { provide: 'AppointmentRepository', useClass: AppointmentRepository }, { provide: 'FacilityRepository', useClass: FacilityRepository }, { provide: 'ProviderProfileRepository', useClass: ProviderProfileRepository }, { provide: 'UserRepository', useClass: UserRepository }],
  exports: [CareService, AppointmentsService, SlotService],
})
export class CareModule {}
