import {
  Injectable,
  NotFoundException,
  BadRequestException, Inject } from '@nestjs/common';
import { Model, Document, Types } from 'mongoose';
import { ProcurementStatus } from '../enums/procurement-status.enum';
import { ProcurementRequest } from '../schemas/procurement-request.schema';
import { Quotation } from '../schemas/quotation.schema';
import { CreateProcurementRequestDto } from '../dto/create-procurement-request.dto';
import { AdminCreateQuotationDto } from '../dto/admin-create-quotation.dto';
import { PharmacyQuotationFeedbackDto } from '../dto/pharmacy-quotation-feedback.dto';
import { ProcurementRequestRepository } from "./repositories/procurementrequest.repository";
import { QuotationRepository } from "./repositories/quotation.repository";

@Injectable()
export class ProcurementService {
  constructor(
    
    @Inject('ProcurementRequestRepository') private readonly procurementModel: ProcurementRequestRepository,
    
    @Inject('QuotationRepository') private readonly quotationModel: QuotationRepository,
  ) {}

  // ─── PHARMACY: Create a new procurement request ───────────────────────────
  async createRequest(
    pharmacyId: string,
    createdBy: string,
    dto: CreateProcurementRequestDto,
  ): Promise<any> {
    return this.procurementModel.create({
      pharmacy_id: String(pharmacyId),
      created_by: String(createdBy),
      items: dto.items,
      status: ProcurementStatus.PENDING_ADMIN_REVIEW,
    });
  }

  // ─── PHARMACY: List own requests ──────────────────────────────────────────
  async getPharmacyRequests(pharmacyId: string): Promise<any[]> {
    return this.procurementModel
      .find({ pharmacy_id: String(pharmacyId) })
      .sort({ createdAt: -1 })
      .lean() as any[];
  }

  // ─── PHARMACY: Get single request ─────────────────────────────────────────
  async getPharmacyRequest(pharmacyId: string, requestId: string): Promise<any> {
    const req = await this.procurementModel
      .findOne({ _id: new Types.ObjectId(requestId), pharmacy_id: String(pharmacyId) })
      .lean() as any;
    if (!req) throw new NotFoundException('Procurement request not found');
    return req;
  }

  // ─── PHARMACY: Submit feedback on quotation ───────────────────────────────
  async submitPharmacyFeedback(
    pharmacyId: string,
    requestId: string,
    dto: PharmacyQuotationFeedbackDto,
  ): Promise<any> {
    const req = await this.procurementModel.findOne({ _id: new Types.ObjectId(requestId), pharmacy_id: String(pharmacyId) });
    if (!req) throw new NotFoundException('Procurement request not found');

    if (req.status !== ProcurementStatus.QUOTATION_ISSUED) {
      throw new BadRequestException(
        `Cannot respond to quotation when status is '${req.status}'. Expected '${ProcurementStatus.QUOTATION_ISSUED}'.`,
      );
    }

    const allowedStatuses: ProcurementStatus[] = [
      ProcurementStatus.APPROVED_BY_PHARMACY,
      ProcurementStatus.CANCELLED, // Previously rejected or revision requested, now we use CANCELLED or DRAFT? The blueprint only has CANCELLED for rejection.
    ];
    if (!allowedStatuses.includes(dto.status)) {
      throw new BadRequestException('Invalid status transition');
    }

    req.status = dto.status;
    (req as any).pharmacyFeedback = dto.pharmacyFeedback;
    await req.save();

    // Mirror status to the linked quotation
    await this.quotationModel.updateOne(
      { procurementRequestId: requestId },
      { status: dto.status },
    );

    return req;
  }

  // ─── ADMIN: List all requests ─────────────────────────────────────────────
  async adminListRequests(status?: ProcurementStatus): Promise<any[]> {
    const filter = status ? { status } : {};
    return this.procurementModel.find(filter).sort({ createdAt: -1 }).lean() as any[];
  }

  // ─── ADMIN: Get single request ────────────────────────────────────────────
  async adminGetRequest(requestId: string): Promise<any> {
    const req = await this.procurementModel.findById(requestId).lean() as any;
    if (!req) throw new NotFoundException('Procurement request not found');
    return req;
  }

  // ─── ADMIN: status counts for dashboard chips ─────────────────────────────
  async adminSummary(): Promise<any> {
    const rows = await (this.procurementModel as any).aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, items: { $sum: { $size: { $ifNull: ['$items', []] } } } } },
    ]);
    const by_status: Record<string, number> = {};
    let total_items = 0;
    for (const r of rows) { by_status[r._id || 'UNKNOWN'] = r.count; total_items += r.items || 0; }
    return { by_status, total_requests: rows.reduce((a, r) => a + r.count, 0), total_items };
  }

  // ─── ADMIN: export request items as CSV (Excel-compatible, Arabic-safe) ───
  async adminExportCsv(requestId: string): Promise<string> {
    const req = await this.adminGetRequest(requestId);
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['اسم الصنف', 'الكمية المطلوبة', 'الفئة', 'مطابق للكتالوج', 'ملاحظات'];
    const lines = (req.items || []).map((it: any) => [
      esc(it.raw_name_string || it.medicine_name || ''),
      esc(it.requested_quantity ?? it.quantity ?? ''),
      esc(it.category_group === 'non_medical' ? 'غير دوائية' : 'أدوية'),
      esc(it.medicine_id ? 'نعم' : 'لا'),
      esc(it.notes || ''),
    ].join(','));
    // BOM so Excel renders Arabic correctly
    return '﻿' + header.map(esc).join(',') + '\n' + lines.join('\n') + '\n';
  }

  // ─── ADMIN: Move request to UNDER_ADMIN_REVIEW ───────────────────────────
  async adminStartReview(requestId: string): Promise<any> {
    const req = await this.procurementModel.findById(requestId);
    if (!req) throw new NotFoundException('Procurement request not found');

    if (req.status !== ProcurementStatus.PENDING_ADMIN_REVIEW) {
      throw new BadRequestException(
        `Cannot start review when status is '${req.status}'.`,
      );
    }

    // No intermediate UNDER_ADMIN_REVIEW state in new spec, we either issue quote or cancel. 
    // We'll leave it as PENDING_ADMIN_REVIEW until quotation is issued.
    return req;
  }

  // ─── ADMIN: Create & send quotation to pharmacy ───────────────────────────
  async adminCreateQuotation(
    adminId: string,
    requestId: string,
    dto: AdminCreateQuotationDto,
  ): Promise<any> {
    const req = await this.procurementModel.findById(requestId);
    if (!req) throw new NotFoundException('Procurement request not found');

    const validStatuses: ProcurementStatus[] = [
      ProcurementStatus.PENDING_ADMIN_REVIEW,
    ];
    if (!validStatuses.includes(req.status)) {
      throw new BadRequestException(
        `Cannot create quotation when status is '${req.status}'.`,
      );
    }

    // Remove any existing quotation for this request (re-issue scenario)
    await this.quotationModel.deleteMany({ procurementRequestId: requestId });

    const quotation = await this.quotationModel.create({
      procurementRequestId: requestId,
      adminId,
      items: dto.items,
      totalPrice: dto.totalPrice,
      adminNotes: dto.adminNotes,
      status: ProcurementStatus.QUOTATION_ISSUED,
    });

    req.status = ProcurementStatus.QUOTATION_ISSUED;
    (req as any).quotationId = (quotation as any)._id?.toString();
    await req.save();

    return quotation;
  }

  // ─── ADMIN: Get quotation for a request ──────────────────────────────────
  async adminGetQuotation(requestId: string): Promise<any> {
    const quotation = await this.quotationModel
      .findOne({ procurementRequestId: requestId })
      .lean() as any;
    if (!quotation) throw new NotFoundException('Quotation not found for this request');
    return quotation;
  }

  // ─── ADMIN: Cancel a request ──────────────────────────────────────────────
  async adminCancelRequest(requestId: string): Promise<any> {
    const req = await this.procurementModel.findById(requestId);
    if (!req) throw new NotFoundException('Procurement request not found');

    const nonCancellable: ProcurementStatus[] = [
      ProcurementStatus.APPROVED_BY_PHARMACY,
      ProcurementStatus.COMPLETED,
      ProcurementStatus.CANCELLED,
    ];
    if (nonCancellable.includes(req.status)) {
      throw new BadRequestException(
        `Cannot cancel request with status '${req.status}'.`,
      );
    }

    req.status = ProcurementStatus.CANCELLED;
    return req.save();
  }

  // ─── ADMIN: Mark as COMPLETED (after delivery) ───────────────────────────
  async adminCompleteRequest(requestId: string): Promise<any> {
    const req = await this.procurementModel.findById(requestId);
    if (!req) throw new NotFoundException('Procurement request not found');

    if (req.status !== ProcurementStatus.APPROVED_BY_PHARMACY) {
      throw new BadRequestException(
        `Cannot complete request when status is '${req.status}'. Expected APPROVED_BY_PHARMACY.`,
      );
    }

    req.status = ProcurementStatus.COMPLETED;
    return req.save();
  }
}
