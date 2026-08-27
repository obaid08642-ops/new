import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HospitalBranch, HospitalBranchSchema } from './schemas/hospital-branch.schema';
import { HospitalDepartment, HospitalDepartmentSchema } from './schemas/hospital-department.schema';
import { HospitalStaff, HospitalStaffSchema } from './schemas/hospital-staff.schema';
import { HospitalInvitation, HospitalInvitationSchema } from './schemas/hospital-invitation.schema';
import { DoctorProfileExtended, DoctorProfileExtendedSchema } from '../care/schemas/doctor-profile-extended.schema';
import { HospitalController } from './controllers/hospital.controller';
import { HospitalService } from './services/hospital.service';

import { User, UserSchema } from '../../schemas/user.schema';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HospitalBranch.name, schema: HospitalBranchSchema },
      { name: HospitalDepartment.name, schema: HospitalDepartmentSchema },
      { name: HospitalStaff.name, schema: HospitalStaffSchema },
      { name: HospitalInvitation.name, schema: HospitalInvitationSchema },
      { name: DoctorProfileExtended.name, schema: DoctorProfileExtendedSchema },
      { name: User.name, schema: UserSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
  ],
  controllers: [HospitalController],
  providers: [HospitalService],
  exports: [HospitalService],
})
export class HospitalModule {}
