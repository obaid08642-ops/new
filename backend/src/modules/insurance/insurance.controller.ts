import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard, NoGuestsGuard } from '../../common/auth.guard';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@UseGuards(JwtAuthGuard, NoGuestsGuard)
@Controller('insurance')
export class InsuranceController {
  constructor(@InjectModel('PatientProfile') private profileModel: Model<any>) {}

  @Get('active')
  async getActivePolicies(@Req() req) {
    const profile = await this.profileModel.findOne({ user_id: req.user.id });
    return { policies: profile?.insurance_details ? [profile.insurance_details] : [] };
  }

  /** EPIC4/S21: active insurance companies catalog (replaces a hardcoded
   * constant list in the patient app's insurance-upload flow).
   * SINGLE SOURCE OF TRUTH — every app (patient, provider onboarding, provider
   * dashboard, admin) reads companies + their plan tiers from here. Plans are
   * embedded from insurance_networks so clients never hardcode a second list. */
  @Get('companies')
  async listCompanies(): Promise<any[]> {
    const db = this.profileModel.db;
    const [companies, networks] = await Promise.all([
      db.collection('insurance_companies').find({ is_active: true }, { projection: { _id: 0 } }).toArray(),
      db.collection('insurance_networks').find({}, { projection: { _id: 0, company_id: 1, id: 1, name_ar: 1, name_en: 1, tier_level: 1, code: 1 } }).toArray(),
    ]);
    const byCompany = new Map<string, any[]>();
    for (const n of networks as any[]) {
      const arr = byCompany.get(n.company_id) || [];
      arr.push({ id: n.id, code: n.code, name_ar: n.name_ar, name_en: n.name_en, tier_level: n.tier_level });
      byCompany.set(n.company_id, arr);
    }
    return (companies as any[]).map((c) => ({
      ...c,
      plans: (byCompany.get(c.id) || []).sort((a, b) => (a.tier_level || 0) - (b.tier_level || 0)),
    }));
  }
}
