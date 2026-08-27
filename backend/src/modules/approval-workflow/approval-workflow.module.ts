import { Module, Controller, Get, Post, Body, Param, Query, UseGuards, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
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
    private readonly publication: CatalogPublicationService,
  ) {}

  async createRequest(
    userId: string,
    dto: {
      entity_type: 'medicine' | 'provider' | 'facility' | 'service';
      entity_id?: string;
      change_data: Record<string, any>;
    }
  ) {
    if (!dto.entity_type || !dto.change_data) {
      throw new BadRequestException('entity_type and change_data are required');
    }

    // Determine the next version number if editing an existing entity
    let nextVersion = 1;
    if (dto.entity_id) {
      const lastRequest = await this.reqModel
        .findOne({ entity_type: dto.entity_type, entity_id: dto.entity_id })
        .sort({ version: -1 })
        .lean();
      if (lastRequest) nextVersion = (lastRequest as any).version + 1;
    }

    return this.reqModel.create({
      entity_type: dto.entity_type,
      entity_id: dto.entity_id,
      submitted_by: userId,
      change_data: dto.change_data,
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
    const req = await this.reqModel.findOne({ id }).lean();
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
    const req = await this.reqModel.findOne({ id: requestId });
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
    const requestedData = dto.edit_data ? { ...req.change_data, ...dto.edit_data } : req.change_data;
    // Approval is an explicit publication review; indexing still remains opt-in.
    const finalData = {
      ...requestedData,
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
        await this.medicineModel.updateOne({ id: req.entity_id }, { $set: finalData });
      } else {
        const newDoc = await this.medicineModel.create(finalData);
        req.entity_id = newDoc.id;
      }
    } else if (req.entity_type === 'provider') {
      publicationType = 'provider';
      if (req.entity_id) {
        await this.providerModel.updateOne({ id: req.entity_id }, { $set: finalData });
      } else {
        const newDoc = await this.providerModel.create(finalData);
        req.entity_id = newDoc.id;
      }
    } else if (req.entity_type === 'facility') {
      publicationType = 'facility';
      if (req.entity_id) {
        await this.facilityModel.updateOne({ id: req.entity_id }, { $set: finalData });
      } else {
        const newDoc = await this.facilityModel.create(finalData);
        req.entity_id = newDoc.id;
      }
    } else if (req.entity_type === 'service') {
      const serviceType = String(requestedData.type || req.change_data.type || '').toLowerCase();
      const isLab = serviceType === 'lab' || serviceType === 'laboratory';
      const isHomeCare = serviceType === 'home_care' || serviceType === 'home-care' || serviceType === 'nursing';
      publicationType = isLab ? 'lab_service' : isHomeCare ? 'home_care_service' : 'radiology_service';
      const model = isLab ? this.labModel : isHomeCare ? this.homeCareModel : this.radiologyModel;
      if (req.entity_id) {
        await model.updateOne({ id: req.entity_id }, { $set: finalData });
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
@UseGuards(JwtAuthGuard)
export class ApprovalWorkflowController {
  constructor(private svc: ApprovalWorkflowService) {}

  @Post('requests')
  create(@CurrentUser() u: any, @Body() b: any) {
    return this.svc.createRequest(u.id, b);
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
  decide(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
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
    ]),
  ],
  controllers: [ApprovalWorkflowController],
  providers: [ApprovalWorkflowService],
  exports: [ApprovalWorkflowService],
})
export class ApprovalWorkflowModule {}
