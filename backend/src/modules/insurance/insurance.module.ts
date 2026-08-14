import { Module, Controller, Get, Post, Body, Param, Query, UseGuards, Injectable, BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
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
  ) {}

  // Companies
  async listCompanies(): Promise<InsuranceCompany[]> {
    return this.companyModel.find({ is_active: true }).lean();
  }

  async createCompany(data: any): Promise<InsuranceCompany> {
    const code = data.code?.toLowerCase();
    const existing = await this.companyModel.findOne({ code });
    if (existing) throw new BadRequestException('Company code already exists');
    return this.companyModel.create({ ...data, code });
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

  async ocrExtract(_fileData: any): Promise<never> {
    throw new ServiceUnavailableException('Insurance OCR is not configured. A verified file-storage and OCR integration is required.');
  }

  async uploadPolicy(_fileData: any): Promise<never> {
    throw new ServiceUnavailableException('Insurance policy upload is not configured. A verified storage and validation workflow is required.');
  }

  async nphiesEligibility(_nationalId: string, _companyCode: string, _memberId?: string): Promise<never> {
    throw new ServiceUnavailableException('Insurance eligibility is not configured. A verified NPHIES integration is required.');
  }

  async savePolicy(_patientId: string, _policyData: any): Promise<never> {
    throw new ServiceUnavailableException('Insurance policy persistence is disabled until it accepts only validated data from a verified policy workflow.');
  }

  async submitClaim(_patientId: string, _claimData: any): Promise<never> {
    throw new ServiceUnavailableException('Insurance claims are disabled until amounts and coverage are derived from an owned, server-priced service order.');
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

  @Post('companies')
  @Roles(UserRole.ADMIN)
  createCompany(@Body() b: any) {
    return this.svc.createCompany(b);
  }

  @Public()
  @Get('companies/:companyId/networks')
  networks(@Param('companyId') companyId: string) {
    return this.svc.listNetworks(companyId);
  }

  @Post('companies/:companyId/networks')
  @Roles(UserRole.ADMIN)
  createNetwork(@Param('companyId') companyId: string, @Body() b: any) {
    return this.svc.createNetwork(companyId, b);
  }

  @Public()
  @Get('networks/:networkId/rules')
  rules(@Param('networkId') networkId: string) {
    return this.svc.listRules(networkId);
  }

  @Post('networks/:networkId/rules')
  @Roles(UserRole.ADMIN)
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
  uploadPolicy(@Body() body: any) {
    return this.svc.uploadPolicy(body);
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
  ],
  controllers: [InsuranceController],
  providers: [InsuranceService],
  exports: [InsuranceService, MongooseModule],
})
export class InsuranceModule {}
