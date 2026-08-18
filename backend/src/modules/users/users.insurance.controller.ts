import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser, JwtAuthGuard } from '../../common/auth.guard';

@Controller('users/me/insurance')
@UseGuards(JwtAuthGuard)
export class UsersInsuranceController {
  constructor(private users: UsersService) {}

  @Get()
  async getInsurance(@CurrentUser('id') id: string) {
    const profile = await this.users.getPatientProfile(id);
    return profile.insurance || null;
  }

  @Post()
  async updateInsurance(@CurrentUser('id') id: string, @Body() body: any) {
    const profile = await this.users.getPatientProfile(id);
    const updatedInsurance = {
      ...profile.insurance,
      ...body,
      verified: false, // Must be verified by admin
    };
    await this.users.updatePatientProfile(id, { insurance: updatedInsurance });
    return updatedInsurance;
  }
}
