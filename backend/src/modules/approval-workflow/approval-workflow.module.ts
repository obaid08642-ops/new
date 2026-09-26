import { Module, Controller, Get, Post, Body, Param, Query, UseGuards, Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser, SelfService } from '../../common/auth.guard';
import { Audited } from '../../common/audit-log.interceptor';
import { UserRole } from '../../common/enums';
import { ApprovalRequest, ApprovalRequestSchema, ApprovalStatus } from '../../schemas/approval-request.schema';
import { Medicine, MedicineSchema } from '../../schemas/medicine.schema';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { Facility, FacilitySchema } from '../../schemas/facility.schema';
import { LabService, LabServiceSchema } from '../../schemas/lab.schema';
import { RadiologyService, RadiologyServiceSchema } from '../../schemas/radiology.schema';
import { HomeCareService, HomeCareServiceSchema } from '../../schemas/home-care.schema';
import { CatalogPublicationService, CatalogEntityType } from '../events/catalog-publication.service';
import { MedicinesService } from '../medicines/medicines.service';
import { PROVIDER_CONFIG_EDITABLE_FIELDS } from '../providers/providers.service';
import { ServiceOwnership, ServiceOwnershipSchema } from '../service-catalog/service-catalog.module';
import { CreateDto, DecideDto } from './approval-workflow.dto';

export type ApprovalEntityType = 'medicine' | 'provider' | 'facility' | 'service';

/**
 * R4-1: per-entity field allowlists. Only these keys may flow from a
 * caller-supplied `change_data`/`edit_data` object into a `$set` (or a
 * created document). Identity, status, verification, ownership and
 * public-governance fields are never writable through approvals.
 */
const MEDICINE_FIELDS: string[] = [
  ...MedicinesService.EDITABLE_FIELDS,
  // Live pharmacy-client compat: the app sends `name`; it is not a schema
  // path, so Mongoose strict mode drops it on write. Listed here only so the
  // existing client flow is not rejected; it can never write governance data.
  'name',
];
const PROVIDER_FIELDS: string[] = [...PROVIDER_CONFIG_EDITABLE_FIELDS];
const FACILITY_FIELDS = [
  'name_ar', 'name_en', 'type', 'description_ar', 'description_en',
  'city', 'district', 'address', 'location', 'logo_url', 'images',
  'phone', 'whatsapp', 'website', 'email', 'departments',
  'accepted_insurance', 'accepts_insurance', 'insurance_contracts', 'working_hours',
];
const LAB_SERVICE_FIELDS = [
  'type', 'name_ar', 'name_en', 'short_code', 'description_ar', 'description_en',
  'category', 'sample_type', 'price', 'old_price', 'fasting_required', 'fasting_hours',
  'home_visit_supported', 'facility_visit_supported', 'turnaround_hours',
  'preparation_ar', 'preparation_en', 'is_package', 'included_services',
  'medical_referral_required', 'cash_availability', 'insurance_availability',
  'home_collection_availability', 'in_lab_availability', 'special_notes',
  'reference_ranges', 'image_url', 'icon',
  // Live lab-app compat: sent by LabDashboard edits; not schema paths, so
  // dropped by Mongoose strict on write. Never governance/identity fields.
  'home_drawing_fee', 'insurance_covered', 'available',
];
const RADIOLOGY_SERVICE_FIELDS = [
  'type', 'name_ar', 'name_en', 'short_code', 'description_ar', 'description_en',
  'modality', 'modality_category', 'body_part', 'price', 'old_price',
  'contrast_required', 'fasting_required', 'fasting_hours',
  'home_visit_supported', 'facility_visit_supported', 'turnaround_hours',
  'preparation_ar', 'preparation_en', 'requires_referral', 'medical_referral_required',
  'estimated_duration_minutes', 'requires_pregnancy_check',
  'requires_metal_implant_check', 'requires_contrast_allergy_check',
  'cash_availability', 'insurance_availability', 'portable_ultrasound',
  'special_notes', 'image_url', 'icon',
];
const HOME_CARE_SERVICE_FIELDS = [
  'type', 'name_ar', 'name_en', 'description_ar', 'description_en',
  'category', 'icon', 'price', 'duration', 'duration_value',
  'requires_patient_medication', 'requires_companion',
  'cash_availability', 'insurance_availability', 'image_url',
];

function serviceFieldsFor(subtype: string): string[] {
  if (subtype === 'lab') return LAB_SERVICE_FIELDS;
  if (subtype === 'radiology') return RADIOLOGY_SERVICE_FIELDS;
  return HOME_CARE_SERVICE_FIELDS;
}

/** Keep only allowlisted keys (proven CodeQL-green shape: static allow-list filter). */
function pickAllowlisted(obj: any, fields: string[]): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj || {}).filter(([key, value]) => fields.includes(key) && value !== undefined),
  );
}

function serviceSubtypeOf(changeData: any): string {
  const t = String(changeData?.type || '').toLowerCase();
  if (t === 'lab' || t === 'laboratory') return 'lab';
  if (t === 'home_care' || t === 'home-care' || t === 'nursing') return 'home_care';
  return 'radiology';
}

@Injectable()
export class ApprovalWorkflowService {
  constructor(
    @InjectModel('ApprovalRequest') private reqModel: Model<any>,
    @InjectModel('Medicine') private medicineModel: Model<any>,
    @InjectModel('ProviderProfile') private providerModel: Model<any>,
    @InjectModel('Facility') private facilityModel: Model<any>,
    @InjectModel('LabService') private labModel: Model<any>,
    @InjectModel('RadiologyService') private radiologyModel: Model<any>,
    @InjectModel('HomeCareService') private homeCareModel: Model<any>,
    @InjectModel('ServiceOwnership') private ownershipModel: Model<any>,
    private readonly publication: CatalogPublicationService,
  ) {}

  private isAdminRole(role?: string): boolean {
    return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
  }

  private allowlistFor(entityType: ApprovalEntityType, changeData: any): string[] {
    if (entityType === 'medicine') return MEDICINE_FIELDS;
    if (entityType === 'provider') return PROVIDER_FIELDS;
    if (entityType === 'facility') return FACILITY_FIELDS;
    return serviceFieldsFor(serviceSubtypeOf(changeData));
  }

  /** Resolve an existing service record (lab/radiology/home-care) by id. */
  private async resolveServiceTarget(entityId: string): Promise<{ model: Model<any>; subtype: string; publicationType: CatalogEntityType } | null> {
    const filter = { id: { $eq: entityId } };
    if (await this.labModel.findOne(filter).lean()) {
      return { model: this.labModel, subtype: 'lab', publicationType: 'lab_service' };
    }
    if (await this.radiologyModel.findOne(filter).lean()) {
      return { model: this.radiologyModel, subtype: 'radiology', publicationType: 'radiology_service' };
    }
    if (await this.homeCareModel.findOne(filter).lean()) {
      return { model: this.homeCareModel, subtype: 'home_care', publicationType: 'home_care_service' };
    }
    return null;
  }

  /**
   * R4-1: ownership check for edit proposals against an existing record.
   * Medicine → created_by_user_id; provider → user_id/account_id; facility →
   * the requester's provider profile facility link; lab/radiology service →
   * ServiceOwnership row (same rule as ServiceCatalogService.updateService);
   * home-care service has no ownership model → admin only.
   */
  private async ownsEntity(userId: string, entityType: ApprovalEntityType, entityId: string, changeData: any): Promise<boolean> {
    if (entityType === 'medicine') {
      const doc: any = await this.medicineModel.findOne({ id: { $eq: entityId } }).lean();
      return !!doc && String(doc.created_by_user_id || '') === String(userId);
    }
    if (entityType === 'provider') {
      const doc: any = await this.providerModel.findOne({ id: { $eq: entityId } }).lean();
      return !!doc && (String(doc.user_id || '') === String(userId) || (doc.account_id && String(doc.account_id) === String(userId)));
    }
    if (entityType === 'facility') {
      const profile: any = await this.providerModel.findOne({ user_id: { $eq: userId } }).lean();
      return !!profile?.facility_id && String(profile.facility_id) === String(entityId);
    }
    const subtype = changeData?.type ? serviceSubtypeOf(changeData) : (await this.resolveServiceTarget(entityId))?.subtype;
    if (subtype === 'lab' || subtype === 'radiology') {
      const own: any = await this.ownershipModel.findOne({ account_id: { $eq: userId }, entity_id: { $eq: entityId } }).lean();
      return !!own;
    }
    return false;
  }

  async createRequest(
    userId: string,
    userRole: string | undefined,
    dto: {
      entity_type: 'medicine' | 'provider' | 'facility' | 'service';
      entity_id?: string;
      change_data: Record<string, any>;
    }
  ) {
    if (!dto.entity_type || !dto.change_data) {
      throw new BadRequestException('entity_type and change_data are required');
    }

    // R4-1: reject non-allowlisted keys at creation (400 on unknown keys).
    let fields = this.allowlistFor(dto.entity_type, dto.change_data);
    if (dto.entity_type === 'service' && dto.entity_id && !['lab', 'laboratory', 'home_care', 'home-care', 'nursing', 'radiology'].includes(String((dto.change_data as any)?.type || '').toLowerCase())) {
      // Edit proposals may omit `type` (lab price edits do); validate against
      // the allowlist of the collection that actually holds the record.
      const resolved = await this.resolveServiceTarget(String(dto.entity_id));
      if (resolved) fields = serviceFieldsFor(resolved.subtype);
    }
    const unknown = Object.keys(dto.change_data || {}).filter((k) => !fields.includes(k));
    if (unknown.length) {
      throw new BadRequestException(`uneditable_fields: ${unknown.join(',')}`);
    }

    // R4-1: editing an existing record requires owning it (or admin).
    if (dto.entity_id && !this.isAdminRole(userRole)) {
      const owned = await this.ownsEntity(userId, dto.entity_type, dto.entity_id, dto.change_data);
      if (!owned) throw new ForbiddenException('not_entity_owner');
    }

    // Determine the next version number if editing an existing entity
    let nextVersion = 1;
    if (dto.entity_id) {
      const lastRequest = await this.reqModel
        .findOne({ entity_type: { $eq: dto.entity_type }, entity_id: { $eq: dto.entity_id } })
        .sort({ version: -1 })
        .lean();
      if (lastRequest) nextVersion = (lastRequest as any).version + 1;
    }

    return this.reqModel.create({
      entity_type: dto.entity_type,
      entity_id: dto.entity_id,
      submitted_by: userId,
      change_data: pickAllowlisted(dto.change_data, fields),
      status: ApprovalStatus.PENDING_REVIEW,
      version: nextVersion,
    });
  }

  async listPending() {
    return this.reqModel.find({ status: ApprovalStatus.PENDING_REVIEW }).sort({ createdAt: -1 }).lean();
  }

  async listMyRequests(userId: string) {
    return this.reqModel.find({ submitted_by: userId }).sort({ createdAt: -1 }).lean();
  }

  async getRequestDetails(id: string) {
    const req = await this.reqModel.findOne({ id: { $eq: id } }).lean();
    if (!req) throw new NotFoundException('Request not found');
    return req;
  }

  async decide(
    adminUserId: string,
    requestId: string,
    dto: {
      decision: 'approved' | 'rejected';
      notes?: string;
      edit_data?: any;
    }
  ) {
    const req = await this.reqModel.findOne({ id: { $eq: requestId } });
    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== ApprovalStatus.PENDING_REVIEW) {
      throw new BadRequestException('Request is already decided');
    }

    if (dto.decision === 'rejected') {
      req.status = ApprovalStatus.REJECTED;
      req.reviewed_by = adminUserId;
      req.reviewed_at = new Date();
      req.rejected_reason = dto.notes;
      await req.save();
      return req.toObject();
    }

    // Apply changes on approval
    req.status = ApprovalStatus.APPROVED;
    req.reviewed_by = adminUserId;
    req.reviewed_at = new Date();

    const reviewedAt = new Date();
    const requestedData = dto.edit_data ? { ...req.change_data, ...dto.edit_data } : { ...(req.change_data || {}) };
    // R4-1: the $set is built from allowlisted keys only — neither the stored
    // change_data nor the admin's edit_data can smuggle governance fields.
    let fields = this.allowlistFor(req.entity_type, requestedData);
    if (req.entity_type === 'service' && req.entity_id && !['lab', 'laboratory', 'home_care', 'home-care', 'nursing', 'radiology'].includes(String((requestedData as any)?.type || '').toLowerCase())) {
      const resolvedFields = await this.resolveServiceTarget(String(req.entity_id));
      if (resolvedFields) fields = serviceFieldsFor(resolvedFields.subtype);
    }
    const clean = pickAllowlisted(requestedData, fields);
    // Approval is an explicit publication review; indexing still remains opt-in.
    const finalData = {
      ...clean,
      public_eligibility: true,
      indexing_eligibility: false,
      medical_review_status: 'approved',
      last_reviewed: reviewedAt,
      provenance: `approval_workflow:${requestId}`,
    };
    let publicationType: CatalogEntityType;

    // Apply logic to target collection
    if (req.entity_type === 'medicine') {
      publicationType = 'medicine';
      if (req.entity_id) {
        await this.medicineModel.updateOne({ id: { $eq: req.entity_id } }, { $set: finalData });
      } else {
        const newDoc = await this.medicineModel.create(finalData);
        req.entity_id = newDoc.id;
      }
    } else if (req.entity_type === 'provider') {
      publicationType = 'provider';
      if (req.entity_id) {
        await this.providerModel.updateOne({ id: { $eq: req.entity_id } }, { $set: finalData });
      } else {
        const newDoc = await this.providerModel.create(finalData);
        req.entity_id = newDoc.id;
      }
    } else if (req.entity_type === 'facility') {
      publicationType = 'facility';
      if (req.entity_id) {
        await this.facilityModel.updateOne({ id: { $eq: req.entity_id } }, { $set: finalData });
      } else {
        const newDoc = await this.facilityModel.create(finalData);
        req.entity_id = newDoc.id;
      }
    } else if (req.entity_type === 'service') {
      const serviceType = String(requestedData.type || (req.change_data as any)?.type || '').toLowerCase();
      // Edit proposals may omit `type` (e.g. lab price edits); resolve the
      // target collection from the existing record instead of guessing.
      const resolved = !['lab', 'laboratory', 'home_care', 'home-care', 'nursing', 'radiology'].includes(serviceType) && req.entity_id
        ? await this.resolveServiceTarget(String(req.entity_id))
        : null;
      const isLab = resolved?.subtype === 'lab' || serviceType === 'lab' || serviceType === 'laboratory';
      const isHomeCare = resolved?.subtype === 'home_care' || serviceType === 'home_care' || serviceType === 'home-care' || serviceType === 'nursing';
      publicationType = isLab ? 'lab_service' : isHomeCare ? 'home_care_service' : 'radiology_service';
      const model = isLab ? this.labModel : isHomeCare ? this.homeCareModel : this.radiologyModel;
      if (req.entity_id) {
        await model.updateOne({ id: { $eq: req.entity_id } }, { $set: finalData });
      } else {
        const newDoc = await model.create(finalData);
        req.entity_id = newDoc.id;
      }
    }

    await req.save();
    await this.publication.refresh({
      entityType: publicationType!,
      entityId: req.entity_id!,
      actorId: adminUserId,
      actorRole: 'admin',
      reason: 'approval_workflow_approved',
      idempotencyKey: `approval-workflow:${requestId}:approved`,
    });
    return req.toObject();
  }
}

@Controller('approval-workflow')
@SelfService()
@UseGuards(JwtAuthGuard)
export class ApprovalWorkflowController {
  constructor(private svc: ApprovalWorkflowService) {}

  @Post('requests')
  create(@CurrentUser() u: any, @Body() b: CreateDto) {
    return this.svc.createRequest(u.id, u?.role, b);
  }

  @Get('my-requests')
  myRequests(@CurrentUser() u: any) {
    return this.svc.listMyRequests(u.id);
  }

  @Get('requests/pending')
  @Roles(UserRole.ADMIN)
  pending() {
    return this.svc.listPending();
  }

  @Get('requests/:id')
  details(@Param('id') id: string) {
    return this.svc.getRequestDetails(id);
  }

  @Post('requests/:id/decide')
  @Roles(UserRole.ADMIN)
  @Audited({ model: 'ApprovalRequest', idParam: 'id', action: 'approval_request_decide' })
  decide(@CurrentUser() u: any, @Param('id') id: string, @Body() b: DecideDto) {
    return this.svc.decide(u.id, id, b);
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ApprovalRequest', schema: ApprovalRequestSchema },
      { name: 'Medicine', schema: MedicineSchema },
      { name: 'ProviderProfile', schema: ProviderProfileSchema },
      { name: 'Facility', schema: FacilitySchema },
      { name: 'LabService', schema: LabServiceSchema },
      { name: 'RadiologyService', schema: RadiologyServiceSchema },
      { name: 'HomeCareService', schema: HomeCareServiceSchema },
      { name: 'ServiceOwnership', schema: ServiceOwnershipSchema },
    ]),
  ],
  controllers: [ApprovalWorkflowController],
  providers: [ApprovalWorkflowService],
  exports: [ApprovalWorkflowService],
})
export class ApprovalWorkflowModule {}
