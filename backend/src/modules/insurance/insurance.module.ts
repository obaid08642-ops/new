import { Module, Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Injectable, BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser, Public } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import {
  InsuranceCompany, InsuranceCompanyDocument, InsuranceCompanySchema,
  InsuranceNetwork, InsuranceNetworkDocument, InsuranceNetworkSchema,
  CoverageRule, CoverageRuleDocument, CoverageRuleSchema,
  InsuranceNetworkContract,
  InsuranceClaim, InsuranceClaimDocument, InsuranceClaimSchema
} from '../../schemas/insurance.schema';
import { ProviderProfile, ProviderProfileDocument, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { Facility, FacilityDocument, FacilitySchema } from '../../schemas/facility.schema';
import { PatientProfile, PatientProfileSchema } from '../../schemas/patient-profile.schema';
import { AiModule } from '../ai/ai.module';
import { AiGatewayService } from '../ai/ai-gateway.service';

@Injectable()
export class InsuranceService {
  constructor(
    @InjectModel('InsuranceCompany') private companyModel: Model<InsuranceCompanyDocument>,
    @InjectModel('InsuranceNetwork') private networkModel: Model<InsuranceNetworkDocument>,
    @InjectModel('CoverageRule') private ruleModel: Model<CoverageRuleDocument>,
    @InjectModel('ProviderProfile') private providerModel: Model<ProviderProfileDocument>,
    @InjectModel('Facility') private facilityModel: Model<FacilityDocument>,
    @InjectModel('PatientProfile') private patientModel: Model<any>,
    @InjectModel('InsuranceClaim') private claimModel: Model<InsuranceClaimDocument>,
    private readonly ai: AiGatewayService,
  ) {}

  private cleanJson(text: string): string {
    return String(text || '').replace(/```json|```/g, '').trim();
  }

  // Companies
  /**
   * SINGLE SOURCE OF TRUTH for the insurance directory.
   * Every client (provider onboarding, provider dashboard, patient app) reads
   * companies from here — with their plan tiers (الفئات) embedded from
   * insurance_networks so no app ever hardcodes a second list.
   */
  async listCompanies(): Promise<any[]> {
    const [companies, networks] = await Promise.all([
      this.companyModel.find({ is_active: true }).lean(),
      this.networkModel.find({}, { _id: 0, company_id: 1, id: 1, code: 1, name_ar: 1, name_en: 1, tier_level: 1 } as any).lean(),
    ]);
    const byCompany = new Map<string, any[]>();
    for (const n of networks as any[]) {
      const arr = byCompany.get(n.company_id) || [];
      arr.push(n);
      byCompany.set(n.company_id, arr);
    }
    return (companies as any[]).map((c) => ({
      ...c,
      plans: (byCompany.get(c.id) || []).sort((a, b) => (a.tier_level || 0) - (b.tier_level || 0)),
    }));
  }

  async createCompany(data: any): Promise<InsuranceCompany> {
    const code = data.code?.toLowerCase();
    const existing = await this.companyModel.findOne({ code });
    if (existing) throw new BadRequestException('Company code already exists');
    return this.companyModel.create({ ...data, code });
  }

  /** Admin: all companies (incl. disabled) with their tier networks embedded. */
  async listAllCompaniesWithNetworks(): Promise<any[]> {
    const [companies, networks] = await Promise.all([
      this.companyModel.find({}).sort({ name_en: 1 }).lean(),
      this.networkModel.find({}).sort({ tier_level: 1 }).lean(),
    ]);
    const byCompany = new Map<string, any[]>();
    for (const n of networks as any[]) {
      const arr = byCompany.get(n.company_id) || [];
      arr.push(n);
      byCompany.set(n.company_id, arr);
    }
    return (companies as any[]).map((c) => ({ ...c, tiers: byCompany.get(c.id) || [] }));
  }

  /** Admin: whitelist-based company update (rename / logo / enable-disable). */
  async updateCompany(id: string, allowed: any): Promise<any> {
    if (!Object.keys(allowed).length) throw new BadRequestException('nothing_to_update');
    const res = await this.companyModel.findOneAndUpdate({ id }, { $set: allowed }, { new: true }).lean();
    if (!res) throw new NotFoundException('Company not found');
    return res;
  }

  /** Admin: remove a tier network from a company. */
  async deleteNetwork(companyId: string, networkId: string): Promise<any> {
    const res = await this.networkModel.deleteOne({ id: networkId, company_id: companyId });
    if (!res.deletedCount) throw new NotFoundException('Network not found');
    return { ok: true };
  }

  // Networks
  async listNetworks(companyId: string): Promise<InsuranceNetwork[]> {
    return this.networkModel.find({ company_id: companyId }).lean();
  }

  async createNetwork(companyId: string, data: any): Promise<InsuranceNetwork> {
    const comp = await this.companyModel.findOne({ id: companyId });
    if (!comp) throw new NotFoundException('Company not found');
    return this.networkModel.create({ ...data, company_id: companyId });
  }

  // Coverage Rules
  async listRules(networkId: string): Promise<CoverageRule[]> {
    return this.ruleModel.find({ network_id: networkId }).lean();
  }

  async createRule(networkId: string, data: any): Promise<CoverageRule> {
    const net = await this.networkModel.findOne({ id: networkId });
    if (!net) throw new NotFoundException('Network not found');
    return this.ruleModel.create({ ...data, network_id: networkId });
  }

  // Check Coverage
  async checkCoverage(
    patientId: string,
    query: {
      provider_id?: string;
      facility_id?: string;
      service_type: string; // consultation, pharmacy, lab, radiology, nursing
      service_key?: string; // e.g. cardiology, cbc-test
    }
  ) {
    const patient = (await this.patientModel.findOne({ user_id: patientId }).lean()) as any;
    if (!patient || !patient.insurance || !patient.insurance.provider) {
      return {
        covered: false,
        reason: 'Patient has no registered insurance policy',
        copay_percent: 100,
        copay_flat: 0,
        requires_preauth: false,
      };
    }

    const patientIns = patient.insurance; // { provider: 'bupa', network: 'gold', policy_number: '...', class: 'A' }
    
    // Find provider or facility contracts
    let contracts: InsuranceNetworkContract[] = [];
    let name = '';

    if (query.provider_id) {
      const provider = await this.providerModel.findOne({ id: query.provider_id }).lean();
      if (provider) {
        contracts = provider.insurance_contracts || [];
        name = provider.name_ar;
      }
    } else if (query.facility_id) {
      const facility = await this.facilityModel.findOne({ id: query.facility_id }).lean();
      if (facility) {
        contracts = facility.insurance_contracts || [];
        name = facility.name_ar;
      }
    }

    // Match patient insurance company & network code
    const matchingContract = contracts.find(c => 
      c.company_id.toLowerCase() === patientIns.provider.toLowerCase() &&
      c.network_id.toLowerCase() === patientIns.network.toLowerCase() &&
      (c.covered_classes.length === 0 || c.covered_classes.includes(patientIns.class))
    );

    if (!matchingContract) {
      return {
        covered: false,
        reason: `Provider/Facility does not accept patient's insurance network (${patientIns.provider} - ${patientIns.network})`,
        copay_percent: 100,
        copay_flat: 0,
        requires_preauth: false,
        patient_policy: patientIns,
      };
    }

    // Now check if there is a coverage rule for this service
    // Find network
    const network = await this.networkModel.findOne({ 
      company_id: matchingContract.company_id, 
      code: matchingContract.network_id 
    }).lean();

    let rule: CoverageRule | null = null;
    if (network) {
      // Find rules matching network
      const rules = await this.ruleModel.find({ network_id: network.id, service_type: query.service_type }).lean();
      // Look for specific key first, then fallback to general service_type
      rule = rules.find(r => r.service_key === query.service_key) || rules.find(r => !r.service_key) || null;
    }

    const copayPercent = rule ? rule.copay_percent : matchingContract.copay_percent;
    const copayFlat = rule ? Math.min(rule.copay_flat_limit, matchingContract.copay_flat) : matchingContract.copay_flat;
    const requiresPreauth = rule ? rule.requires_preauth : false;

    return {
      covered: true,
      provider_name: name,
      company_id: matchingContract.company_id,
      company_name_ar: matchingContract.company_name_ar,
      network_id: matchingContract.network_id,
      network_name_ar: matchingContract.network_name_ar,
      class: patientIns.class,
      copay_percent: copayPercent,
      copay_flat: copayFlat,
      requires_preauth: requiresPreauth,
      patient_policy: patientIns,
    };
  }

  /** Real insurance-card OCR through the AI vision gateway. Never invents fields. */
  async ocrExtract(fileData: any) {
    const base64 = fileData?.image_base64 || fileData?.file;
    if (!base64 || typeof base64 !== 'string' || base64.length < 100 || base64 === 'base64_simulated_data') {
      throw new BadRequestException('card image (image_base64) is required');
    }
    const prompt = `Read this Saudi health insurance card image and extract the fields as ONLY valid JSON:
{ "provider": string|null, "policy_number": string|null, "member_name": string|null, "national_id": string|null, "network": string|null, "class": string|null, "expiry_date": string|null }
Use null for any field not clearly visible. Do not guess.`;
    try {
      const r = await this.ai.generate({ prompt, feature: 'insuranceCardOcr', imageBase64: base64, mimeType: fileData?.mime_type || 'image/jpeg' });
      const data = JSON.parse(this.cleanJson(r.text));
      // Strip anything the model could not actually see
      const extracted: any = {};
      for (const k of ['provider', 'policy_number', 'member_name', 'national_id', 'network', 'class', 'expiry_date']) {
        if (data?.[k]) extracted[k] = String(data[k]).slice(0, 120);
      }
      if (!Object.keys(extracted).length) {
        throw new ServiceUnavailableException('تعذّر استخراج بيانات البطاقة — أدخلها يدويًا');
      }
      return { success: true, extracted_data: extracted };
    } catch (e: any) {
      if (e instanceof ServiceUnavailableException || e instanceof BadRequestException) throw e;
      throw new ServiceUnavailableException('تعذّر مسح البطاقة حاليًا — أدخل البيانات يدويًا');
    }
  }

  /** Stores the uploaded policy on the patient profile as UNVERIFIED pending review. */
  async uploadPolicy(fileData: any, patientId?: string) {
    const policyNumber = String(fileData?.policy_number || '').trim();
    const provider = String(fileData?.provider || '').trim();
    if (!policyNumber || !provider) {
      throw new BadRequestException('provider and policy_number are required');
    }
    const doc: any = {
      provider,
      company_id: fileData.company_id || provider,
      policy_number: policyNumber,
      network: fileData.network || null,
      class: fileData.class || null,
      expiry_date: fileData.expiry_date || null,
      member_name: fileData.member_name || null,
      national_id: fileData.national_id || null,
      verified: false,
      pdf_url: fileData.pdf_url || null,
      ocr_extracted: !!fileData.ocr_extracted,
      nphies_eligible: false,
    };
    if (patientId) {
      await this.patientModel.findOneAndUpdate(
        { user_id: patientId },
        { $set: { insurance: doc } },
        { upsert: true, new: true },
      );
    }
    return { success: true, policy: doc };
  }

  /**
   * Eligibility check against the patient's stored, verified policy.
   * NOTE: the live NPHIES exchange is NOT integrated yet — this answers from
   * locally stored policy data only and says so explicitly (nphies_live: false).
   */
  async nphiesEligibility(nationalId: string, companyCode: string, memberId?: string) {
    if (!nationalId || !companyCode) {
      throw new BadRequestException('national_id and insurance_company_code are required');
    }
    const patient: any = await this.patientModel.findOne({ 'insurance.national_id': nationalId }).lean();
    const ins = patient?.insurance;
    const code = String(companyCode).toLowerCase();
    const matches = ins && (
      String(ins.provider || '').toLowerCase().includes(code) ||
      String(ins.company_id || '').toLowerCase().includes(code)
    );
    if (!matches) {
      return { eligible: false, reason: 'no_matching_policy_on_file', nphies_live: false };
    }
    return {
      eligible: true,
      source: 'stored_policy',
      nphies_live: false,
      verified: !!ins.verified,
      network: ins.network || null,
      network_class: ins.class || null,
      expiry_date: ins.expiry_date || null,
    };
  }

  async savePolicy(patientId: string, policyData: any) {
    let patient = await this.patientModel.findOne({ user_id: patientId });
    if (!patient) {
      patient = await this.patientModel.create({ user_id: patientId });
    }
    patient.insurance = {
      company_id: policyData.company_id || policyData.provider,
      provider: policyData.provider,
      policy_number: policyData.policy_number,
      network: policyData.network,
      class: policyData.class,
      expiry_date: policyData.expiry_date,
      member_name: policyData.member_name,
      national_id: policyData.national_id,
      verified: policyData.verified ?? false,
      pdf_url: policyData.pdf_url,
      ocr_extracted: policyData.ocr_extracted ?? false,
      nphies_eligible: policyData.nphies_eligible ?? false,
    };
    await patient.save();
    return { success: true, insurance: patient.insurance };
  }

  async submitClaim(patientId: string, claimData: any) {
    const amount = Number(claimData?.amount);
    if (!claimData?.service || !String(claimData.service).trim()) {
      throw new BadRequestException('service is required');
    }
    if (!amount || amount <= 0) {
      throw new BadRequestException('a valid amount is required');
    }
    const claim = await this.claimModel.create({
      patient_id: patientId,
      service: String(claimData.service).trim(),
      amount,
      covered: Number(claimData.covered) || 0,
      status: 'pending',
      date: new Date().toISOString()
    });
    return {
      success: true,
      claim_id: claim.id,
      status: claim.status,
      submitted_at: new Date().toISOString(),
      ...claimData
    };
  }

  async getClaims(patientId: string) {
    return this.claimModel.find({ patient_id: patientId }).sort({ createdAt: -1 }).lean();
  }
}

@Controller('insurance')
@UseGuards(JwtAuthGuard)
export class InsuranceController {
  constructor(private svc: InsuranceService) {}

  @Public()
  @Get('companies')
  companies() {
    return this.svc.listCompanies();
  }

  /**
   * Admin directory: ALL companies (active + disabled) with their tier networks
   * embedded — powers the admin insurance-companies management screen.
   */
  @Get('companies/all')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async allCompanies() {
    return this.svc.listAllCompaniesWithNetworks();
  }

  @Post('companies')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createCompany(@Body() b: any) {
    return this.svc.createCompany(b);
  }

  /** Admin edit (whitelist): rename, logo, enable/disable. */
  @Patch('companies/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateCompany(@Param('id') id: string, @Body() b: any) {
    const allowed: any = {};
    for (const k of ['name_ar', 'name_en', 'logo_url']) {
      if (typeof b?.[k] === 'string' && b[k].trim()) allowed[k] = b[k].trim();
    }
    if (typeof b?.is_active === 'boolean') allowed.is_active = b.is_active;
    return this.svc.updateCompany(id, allowed);
  }

  /** Admin: delete a tier (network) from a company. */
  @Delete('companies/:companyId/networks/:networkId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deleteNetwork(@Param('companyId') companyId: string, @Param('networkId') networkId: string) {
    return this.svc.deleteNetwork(companyId, networkId);
  }

  @Public()
  @Get('companies/:companyId/networks')
  networks(@Param('companyId') companyId: string) {
    return this.svc.listNetworks(companyId);
  }

  @Post('companies/:companyId/networks')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createNetwork(@Param('companyId') companyId: string, @Body() b: any) {
    return this.svc.createNetwork(companyId, b);
  }

  @Public()
  @Get('networks/:networkId/rules')
  rules(@Param('networkId') networkId: string) {
    return this.svc.listRules(networkId);
  }

  @Post('networks/:networkId/rules')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createRule(@Param('networkId') networkId: string, @Body() b: any) {
    return this.svc.createRule(networkId, b);
  }

  @Get('coverage-check')
  coverageCheck(
    @CurrentUser() u: any,
    @Query('provider_id') providerId?: string,
    @Query('facility_id') facilityId?: string,
    @Query('service_type') serviceType?: string,
    @Query('service_key') serviceKey?: string
  ) {
    if (!serviceType) throw new BadRequestException('service_type is required');
    return this.svc.checkCoverage(u.id, {
      provider_id: providerId,
      facility_id: facilityId,
      service_type: serviceType,
      service_key: serviceKey,
    });
  }

  @Post('ocr-extract')
  ocrExtract(@Body() body: any) {
    return this.svc.ocrExtract(body);
  }

  @Post('upload-policy')
  uploadPolicy(@CurrentUser() u: any, @Body() body: any) {
    return this.svc.uploadPolicy(body, u?.id);
  }

  @Post('nphies/eligibility')
  nphiesEligibility(@Body() body: any) {
    return this.svc.nphiesEligibility(body.national_id, body.insurance_company_code, body.member_id);
  }

  @Post('save-policy')
  savePolicy(@CurrentUser() u: any, @Body() body: any) {
    return this.svc.savePolicy(u.id, body);
  }

  @Post('claims/submit')
  submitClaim(@CurrentUser() u: any, @Body() body: any) {
    return this.svc.submitClaim(u.id, body);
  }

  @Get('claims')
  getClaims(@CurrentUser() u: any) {
    return this.svc.getClaims(u.id);
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'InsuranceCompany', schema: InsuranceCompanySchema },
      { name: 'InsuranceNetwork', schema: InsuranceNetworkSchema },
      { name: 'CoverageRule', schema: CoverageRuleSchema },
      { name: 'ProviderProfile', schema: ProviderProfileSchema },
      { name: 'Facility', schema: FacilitySchema },
      { name: 'PatientProfile', schema: PatientProfileSchema },
      { name: 'InsuranceClaim', schema: InsuranceClaimSchema },
    ]),
    AiModule
  ],
  controllers: [InsuranceController],
  providers: [InsuranceService],
  exports: [InsuranceService, MongooseModule],
})
export class InsuranceModule {}
