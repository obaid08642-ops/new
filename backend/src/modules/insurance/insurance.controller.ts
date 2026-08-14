import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth.guard';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@UseGuards(JwtAuthGuard)
@Controller('insurance')
export class InsuranceController {
  constructor(@InjectModel('PatientProfile') private profileModel: Model<any>) {}

  @Get('active')
  async getActivePolicies(@Req() req) {
    const profile = await this.profileModel.findOne({ user_id: req.user.id });
    return { policies: profile?.insurance_details ? [profile.insurance_details] : [] };
  }
}
