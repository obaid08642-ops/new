import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '../../common/auth.guard';
import { PatientProfileRepository } from './repositories/patient-profile.repository';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserInsuranceController {
  constructor(
    @Inject('PatientProfileRepository') private readonly patientProfileRepo: PatientProfileRepository
  ) {}

  @Get('insurance')
  async getInsurance(@CurrentUser() user: any) {
    const profile = await this.patientProfileRepo.findOne({ user_id: user.id });
    return { policies: profile?.insurance_policies || [] };
  }
}
