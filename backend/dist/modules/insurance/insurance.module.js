"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsuranceModule = exports.InsuranceController = exports.InsuranceService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const insurance_schema_1 = require("../../schemas/insurance.schema");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
const facility_schema_1 = require("../../schemas/facility.schema");
const patient_profile_schema_1 = require("../../schemas/patient-profile.schema");
const ai_module_1 = require("../ai/ai.module");
const ai_gateway_service_1 = require("../ai/ai-gateway.service");
let InsuranceService = class InsuranceService {
    constructor(companyModel, networkModel, ruleModel, providerModel, facilityModel, patientModel, claimModel, ai) {
        this.companyModel = companyModel;
        this.networkModel = networkModel;
        this.ruleModel = ruleModel;
        this.providerModel = providerModel;
        this.facilityModel = facilityModel;
        this.patientModel = patientModel;
        this.claimModel = claimModel;
        this.ai = ai;
    }
    cleanJson(text) {
        return String(text || '').replace(/```json|```/g, '').trim();
    }
    async listCompanies() {
        const [companies, networks] = await Promise.all([
            this.companyModel.find({ is_active: true }).lean(),
            this.networkModel.find({ catalog_status: { $ne: 'retired' } }, { _id: 0, company_id: 1, id: 1, code: 1, name_ar: 1, name_en: 1, tier_level: 1 }).lean(),
        ]);
        const byCompany = new Map();
        for (const n of networks) {
            const arr = byCompany.get(n.company_id) || [];
            arr.push(n);
            byCompany.set(n.company_id, arr);
        }
        return companies.map((c) => ({
            ...c,
            plans: (byCompany.get(c.id) || []).sort((a, b) => (a.tier_level || 0) - (b.tier_level || 0)),
        }));
    }
    async createCompany(data) {
        const code = data.code?.toLowerCase();
        const existing = await this.companyModel.findOne({ code });
        if (existing)
            throw new common_1.BadRequestException('Company code already exists');
        return this.companyModel.create({ ...data, code });
    }
    async listAllCompaniesWithNetworks() {
        const [companies, networks] = await Promise.all([
            this.companyModel.find({}).sort({ name_en: 1 }).lean(),
            this.networkModel.find({}).sort({ tier_level: 1 }).lean(),
        ]);
        const byCompany = new Map();
        for (const n of networks) {
            const arr = byCompany.get(n.company_id) || [];
            arr.push(n);
            byCompany.set(n.company_id, arr);
        }
        return companies.map((c) => ({ ...c, tiers: byCompany.get(c.id) || [] }));
    }
    async updateCompany(id, allowed) {
        if (!Object.keys(allowed).length)
            throw new common_1.BadRequestException('nothing_to_update');
        const res = await this.companyModel.findOneAndUpdate({ id }, { $set: allowed }, { new: true }).lean();
        if (!res)
            throw new common_1.NotFoundException('Company not found');
        return res;
    }
    async deleteNetwork(companyId, networkId) {
        const res = await this.networkModel.deleteOne({ id: networkId, company_id: companyId });
        if (!res.deletedCount)
            throw new common_1.NotFoundException('Network not found');
        return { ok: true };
    }
    async listNetworks(companyId) {
        const company = await this.companyModel.findOne({ id: companyId, is_active: true }, { _id: 1 }).lean();
        if (!company)
            return [];
        return this.networkModel.find({ company_id: companyId, catalog_status: { $ne: 'retired' } }).lean();
    }
    async createNetwork(companyId, data) {
        const comp = await this.companyModel.findOne({ id: companyId });
        if (!comp)
            throw new common_1.NotFoundException('Company not found');
        return this.networkModel.create({ ...data, company_id: companyId });
    }
    async listRules(networkId) {
        return this.ruleModel.find({ network_id: networkId }).lean();
    }
    async createRule(networkId, data) {
        const net = await this.networkModel.findOne({ id: networkId });
        if (!net)
            throw new common_1.NotFoundException('Network not found');
        return this.ruleModel.create({ ...data, network_id: networkId });
    }
    async checkCoverage(patientId, query) {
        const patient = (await this.patientModel.findOne({ user_id: patientId }).lean());
        if (!patient || !patient.insurance || !patient.insurance.provider) {
            return {
                covered: false,
                reason: 'Patient has no registered insurance policy',
                copay_percent: 100,
                copay_flat: 0,
                requires_preauth: false,
            };
        }
        const patientIns = patient.insurance;
        let contracts = [];
        let name = '';
        if (query.provider_id) {
            const provider = await this.providerModel.findOne({ id: query.provider_id }).lean();
            if (provider) {
                contracts = provider.insurance_contracts || [];
                name = provider.name_ar;
            }
        }
        else if (query.facility_id) {
            const facility = await this.facilityModel.findOne({ id: query.facility_id }).lean();
            if (facility) {
                contracts = facility.insurance_contracts || [];
                name = facility.name_ar;
            }
        }
        const matchingContract = contracts.find(c => c.company_id.toLowerCase() === patientIns.provider.toLowerCase() &&
            c.network_id.toLowerCase() === patientIns.network.toLowerCase() &&
            (c.covered_classes.length === 0 || c.covered_classes.includes(patientIns.class)));
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
        const network = await this.networkModel.findOne({
            company_id: matchingContract.company_id,
            code: matchingContract.network_id
        }).lean();
        let rule = null;
        if (network) {
            const rules = await this.ruleModel.find({ network_id: network.id, service_type: query.service_type }).lean();
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
    async ocrExtract(fileData) {
        const base64 = fileData?.image_base64 || fileData?.file;
        if (!base64 || typeof base64 !== 'string' || base64.length < 100 || base64 === 'base64_simulated_data') {
            throw new common_1.BadRequestException('card image (image_base64) is required');
        }
        const prompt = `Read this Saudi health insurance card image and extract the fields as ONLY valid JSON:
{ "provider": string|null, "policy_number": string|null, "member_name": string|null, "national_id": string|null, "network": string|null, "class": string|null, "expiry_date": string|null }
Use null for any field not clearly visible. Do not guess.`;
        try {
            const r = await this.ai.generate({ prompt, feature: 'insuranceCardOcr', imageBase64: base64, mimeType: fileData?.mime_type || 'image/jpeg' });
            const data = JSON.parse(this.cleanJson(r.text));
            const extracted = {};
            for (const k of ['provider', 'policy_number', 'member_name', 'national_id', 'network', 'class', 'expiry_date']) {
                if (data?.[k])
                    extracted[k] = String(data[k]).slice(0, 120);
            }
            if (!Object.keys(extracted).length) {
                throw new common_1.ServiceUnavailableException('تعذّر استخراج بيانات البطاقة — أدخلها يدويًا');
            }
            return { success: true, extracted_data: extracted };
        }
        catch (e) {
            if (e instanceof common_1.ServiceUnavailableException || e instanceof common_1.BadRequestException)
                throw e;
            throw new common_1.ServiceUnavailableException('تعذّر مسح البطاقة حاليًا — أدخل البيانات يدويًا');
        }
    }
    async uploadPolicy(fileData, patientId) {
        const policyNumber = String(fileData?.policy_number || '').trim();
        const provider = String(fileData?.provider || '').trim();
        if (!policyNumber || !provider) {
            throw new common_1.BadRequestException('provider and policy_number are required');
        }
        const doc = {
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
            await this.patientModel.findOneAndUpdate({ user_id: patientId }, { $set: { insurance: doc } }, { upsert: true, new: true });
        }
        return { success: true, policy: doc };
    }
    async nphiesEligibility(nationalId, companyCode, memberId) {
        if (!nationalId || !companyCode) {
            throw new common_1.BadRequestException('national_id and insurance_company_code are required');
        }
        const patient = await this.patientModel.findOne({ 'insurance.national_id': nationalId }).lean();
        const ins = patient?.insurance;
        const code = String(companyCode).toLowerCase();
        const matches = ins && (String(ins.provider || '').toLowerCase().includes(code) ||
            String(ins.company_id || '').toLowerCase().includes(code));
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
    async savePolicy(patientId, policyData) {
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
    async submitClaim(patientId, claimData) {
        const amount = Number(claimData?.amount);
        if (!claimData?.service || !String(claimData.service).trim()) {
            throw new common_1.BadRequestException('service is required');
        }
        if (!amount || amount <= 0) {
            throw new common_1.BadRequestException('a valid amount is required');
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
    async getClaims(patientId) {
        return this.claimModel.find({ patient_id: patientId }).sort({ createdAt: -1 }).lean();
    }
};
exports.InsuranceService = InsuranceService;
exports.InsuranceService = InsuranceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('InsuranceCompany')),
    __param(1, (0, mongoose_1.InjectModel)('InsuranceNetwork')),
    __param(2, (0, mongoose_1.InjectModel)('CoverageRule')),
    __param(3, (0, mongoose_1.InjectModel)('ProviderProfile')),
    __param(4, (0, mongoose_1.InjectModel)('Facility')),
    __param(5, (0, mongoose_1.InjectModel)('PatientProfile')),
    __param(6, (0, mongoose_1.InjectModel)('InsuranceClaim')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        ai_gateway_service_1.AiGatewayService])
], InsuranceService);
let InsuranceController = class InsuranceController {
    constructor(svc) {
        this.svc = svc;
    }
    companies() {
        return this.svc.listCompanies();
    }
    async allCompanies() {
        return this.svc.listAllCompaniesWithNetworks();
    }
    createCompany(b) {
        return this.svc.createCompany(b);
    }
    updateCompany(id, b) {
        const allowed = {};
        for (const k of [
            'name_ar', 'name_en', 'logo_url', 'logo_source_url', 'logo_sha256',
            'regulatory_source_url', 'entity_type', 'catalog_status', 'provenance',
            'superseded_by_company_id',
        ]) {
            if (typeof b?.[k] === 'string' && b[k].trim())
                allowed[k] = b[k].trim();
        }
        if (typeof b?.catalog_version === 'number' && Number.isInteger(b.catalog_version) && b.catalog_version > 0) {
            allowed.catalog_version = b.catalog_version;
        }
        if (b?.logo_verified_at && !Number.isNaN(Date.parse(b.logo_verified_at))) {
            allowed.logo_verified_at = new Date(b.logo_verified_at);
        }
        if (b?.retired_at && !Number.isNaN(Date.parse(b.retired_at))) {
            allowed.retired_at = new Date(b.retired_at);
        }
        if (typeof b?.is_active === 'boolean')
            allowed.is_active = b.is_active;
        return this.svc.updateCompany(id, allowed);
    }
    deleteNetwork(companyId, networkId) {
        return this.svc.deleteNetwork(companyId, networkId);
    }
    networks(companyId) {
        return this.svc.listNetworks(companyId);
    }
    createNetwork(companyId, b) {
        return this.svc.createNetwork(companyId, b);
    }
    rules(networkId) {
        return this.svc.listRules(networkId);
    }
    createRule(networkId, b) {
        return this.svc.createRule(networkId, b);
    }
    coverageCheck(u, providerId, facilityId, serviceType, serviceKey) {
        if (!serviceType)
            throw new common_1.BadRequestException('service_type is required');
        return this.svc.checkCoverage(u.id, {
            provider_id: providerId,
            facility_id: facilityId,
            service_type: serviceType,
            service_key: serviceKey,
        });
    }
    ocrExtract(body) {
        return this.svc.ocrExtract(body);
    }
    uploadPolicy(u, body) {
        return this.svc.uploadPolicy(body, u?.id);
    }
    nphiesEligibility(body) {
        return this.svc.nphiesEligibility(body.national_id, body.insurance_company_code, body.member_id);
    }
    savePolicy(u, body) {
        return this.svc.savePolicy(u.id, body);
    }
    submitClaim(u, body) {
        return this.svc.submitClaim(u.id, body);
    }
    getClaims(u) {
        return this.svc.getClaims(u.id);
    }
};
exports.InsuranceController = InsuranceController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('companies'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InsuranceController.prototype, "companies", null);
__decorate([
    (0, common_1.Get)('companies/all'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InsuranceController.prototype, "allCompanies", null);
__decorate([
    (0, common_1.Post)('companies'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InsuranceController.prototype, "createCompany", null);
__decorate([
    (0, common_1.Patch)('companies/:id'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InsuranceController.prototype, "updateCompany", null);
__decorate([
    (0, common_1.Delete)('companies/:companyId/networks/:networkId'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('networkId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], InsuranceController.prototype, "deleteNetwork", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('companies/:companyId/networks'),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InsuranceController.prototype, "networks", null);
__decorate([
    (0, common_1.Post)('companies/:companyId/networks'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InsuranceController.prototype, "createNetwork", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('networks/:networkId/rules'),
    __param(0, (0, common_1.Param)('networkId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InsuranceController.prototype, "rules", null);
__decorate([
    (0, common_1.Post)('networks/:networkId/rules'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('networkId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InsuranceController.prototype, "createRule", null);
__decorate([
    (0, common_1.Get)('coverage-check'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('provider_id')),
    __param(2, (0, common_1.Query)('facility_id')),
    __param(3, (0, common_1.Query)('service_type')),
    __param(4, (0, common_1.Query)('service_key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], InsuranceController.prototype, "coverageCheck", null);
__decorate([
    (0, common_1.Post)('ocr-extract'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InsuranceController.prototype, "ocrExtract", null);
__decorate([
    (0, common_1.Post)('upload-policy'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], InsuranceController.prototype, "uploadPolicy", null);
__decorate([
    (0, common_1.Post)('nphies/eligibility'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InsuranceController.prototype, "nphiesEligibility", null);
__decorate([
    (0, common_1.Post)('save-policy'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], InsuranceController.prototype, "savePolicy", null);
__decorate([
    (0, common_1.Post)('claims/submit'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], InsuranceController.prototype, "submitClaim", null);
__decorate([
    (0, common_1.Get)('claims'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InsuranceController.prototype, "getClaims", null);
exports.InsuranceController = InsuranceController = __decorate([
    (0, common_1.Controller)('insurance'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [InsuranceService])
], InsuranceController);
let InsuranceModule = class InsuranceModule {
};
exports.InsuranceModule = InsuranceModule;
exports.InsuranceModule = InsuranceModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'InsuranceCompany', schema: insurance_schema_1.InsuranceCompanySchema },
                { name: 'InsuranceNetwork', schema: insurance_schema_1.InsuranceNetworkSchema },
                { name: 'CoverageRule', schema: insurance_schema_1.CoverageRuleSchema },
                { name: 'ProviderProfile', schema: provider_profile_schema_1.ProviderProfileSchema },
                { name: 'Facility', schema: facility_schema_1.FacilitySchema },
                { name: 'PatientProfile', schema: patient_profile_schema_1.PatientProfileSchema },
                { name: 'InsuranceClaim', schema: insurance_schema_1.InsuranceClaimSchema },
            ]),
            ai_module_1.AiModule
        ],
        controllers: [InsuranceController],
        providers: [InsuranceService],
        exports: [InsuranceService, mongoose_1.MongooseModule],
    })
], InsuranceModule);
//# sourceMappingURL=insurance.module.js.map