import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { recordAudit } from '../../common/audit-record';
import { LabsService } from '../labs/labs.service';
import { PatientUxService } from '../patient-ux/patient-ux.module';
import { ItemDecisionsDto, PartialChoiceDto } from './ordering.dto';
import { round2 } from './ordering-engine';
import { OrderingService } from './ordering.service';

// M5: insurance per item. The contracted provider decides each item (D-37: Nabd+ never contacts an insurer); the patient sees an
// estimate until then and the final share after. Home fee and packages are cash unless the provider approves them.

const APPROVALS = 'ordering_approvals';
const BOOKINGS = 'labbookings'; // the Mongoose default of the LabBooking model
const bad = (code: string) => new BadRequestException(code);

export type Decision = 'pending' | 'approved' | 'rejected';
export interface ApprovalItem { catalog_id: string; decision: Decision; price: number; coverage: string; insurer_share: number | null; patient_share: number | null }
interface ApprovalDoc {
  booking_id: string; patient_id: string; provider_account_id: string; status: 'approved' | 'partial' | 'rejected'; items: ApprovalItem[];
  home_fee: { amount: number; covered: boolean }; valid_until: Date | null; decided_at: Date; choice?: string;
}

@Injectable()
export class OrderingApprovalService implements OnModuleInit {
  private readonly logger = new Logger(OrderingApprovalService.name);

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly labs: LabsService,
    private readonly ordering: OrderingService,
    private readonly patientUx: PatientUxService,
  ) {}

  private approvals() { return this.conn.collection<any>(APPROVALS); }

  async onModuleInit() {
    await this.approvals().createIndex({ booking_id: 1 }, { unique: true, name: 'approval_booking_unique' });
    await this.approvals().createIndex({ patient_id: 1, decided_at: -1 }, { name: 'approval_patient' });
  }

  private async booking(id: string): Promise<any> {
    const b = await this.conn.collection(BOOKINGS).findOne({ id });
    if (!b || b.payment_method !== 'insurance' || !b.price_lock) throw new NotFoundException('approval_not_found');
    return b;
  }

  private visitStart(b: any): Date | null {
    const v = b.scheduled_start ?? b.scheduled_at;
    return v ? new Date(v) : null;
  }

  // ---------- the provider decides ----------

  async decide(provider: { id: string }, bookingId: string, dto: ItemDecisionsDto) {
    const b = await this.booking(bookingId);
    if (b.provider_account_id !== provider.id) throw new ForbiddenException('not_your_booking');
    const lock: Array<{ catalog_id: string; price: number; coverage?: string }> = b.price_lock.items;
    const seen = new Set<string>();
    for (const d of dto.decisions) {
      if (!lock.some((i) => i.catalog_id === d.catalog_id)) throw bad('unknown_booking_item');
      if (seen.has(d.catalog_id)) throw bad('duplicate_decision');
      seen.add(d.catalog_id);
    }
    if (lock.some((i) => !seen.has(i.catalog_id))) throw bad('decision_missing_for_items');
    const items: ApprovalItem[] = lock.map((i) => {
      const d = dto.decisions.find((x) => x.catalog_id === i.catalog_id)!;
      if (d.decision === 'rejected') return { catalog_id: i.catalog_id, decision: 'rejected', price: i.price, coverage: i.coverage ?? 'needs_approval', insurer_share: 0, patient_share: i.price };
      if (d.patient_share == null) throw bad('patient_share_required');
      if (d.patient_share > i.price) throw bad('patient_share_above_price');
      return { catalog_id: i.catalog_id, decision: 'approved', price: i.price, coverage: i.coverage ?? 'needs_approval', insurer_share: round2(i.price - d.patient_share), patient_share: d.patient_share };
    });
    const approvedCount = items.filter((i) => i.decision === 'approved').length;
    const status: ApprovalDoc['status'] = approvedCount === items.length ? 'approved' : approvedCount === 0 ? 'rejected' : 'partial';
    const homeFee = { amount: Number(b.price_lock.home_fee) || 0, covered: dto.home_fee_approved === true && approvedCount > 0 };
    const doc: ApprovalDoc = {
      booking_id: bookingId, patient_id: b.patient_id, provider_account_id: provider.id, status, items, home_fee: homeFee,
      valid_until: dto.valid_until ? new Date(dto.valid_until) : null, decided_at: new Date(),
    };
    try {
      await this.approvals().insertOne(doc as never); // the unique index on booking_id: a booking is decided once
    } catch (e) {
      if ((e as { code?: number }).code === 11000) throw new ConflictException('already_decided');
      throw e;
    }
    await this.labs.applyOrderingDecision(bookingId, status, this.total(doc));
    await recordAudit(this.conn, { action: 'ordering.item_decisions', user_id: provider.id, role: 'provider', resource_kind: 'lab_booking', resource_id: bookingId, details: { status, items: items.length } });
    return { status, patient_share_total: this.total(doc) };
  }

  /** What the patient pays: the shares of the items still on the booking plus the home fee unless the provider approved it. */
  private total(d: Pick<ApprovalDoc, 'items' | 'home_fee'>): number {
    return round2(d.items.reduce((s, i) => s + (i.patient_share ?? 0), 0) + (d.home_fee.covered ? 0 : d.home_fee.amount));
  }

  // ---------- the patient reads and chooses ----------

  async view(user: { id: string }, bookingId: string) {
    const b = await this.booking(bookingId);
    if (b.patient_id !== user.id) throw new NotFoundException('approval_not_found');
    const doc = (await this.approvals().findOne({ booking_id: bookingId })) as unknown as ApprovalDoc | null;
    if (!doc) return this.pendingView(b);
    const awaiting = (doc.status === 'partial' || doc.status === 'rejected') && !doc.choice;
    const visit = this.visitStart(b);
    const expires = doc.valid_until && visit && doc.valid_until.getTime() < visit.getTime();
    return {
      status: doc.status,
      items: doc.items,
      final: !awaiting,
      patient_share_total: this.total(doc),
      home_fee: doc.home_fee,
      valid_until: doc.valid_until,
      ...(expires ? { warning: 'approval_expires_before_visit', rebook_earlier: true } : {}),
      ...(awaiting ? { choices: doc.status === 'rejected' ? ['pay_difference', 'cancel_free'] : ['pay_difference', 'covered_only', 'cancel_free'] } : {}),
    };
  }

  /** Before any decision: the per-item coverage the quote showed, an estimate of the share, and the home fee as cash. */
  private async pendingView(b: any) {
    const rate = await this.ordering.shareRate();
    const lock: Array<{ catalog_id: string; price: number; coverage?: string }> = b.price_lock.items;
    const items = lock.map((i) => ({
      catalog_id: i.catalog_id, decision: 'pending' as Decision, coverage: i.coverage ?? 'needs_approval', price: i.price, insurer_share: null, patient_share: null,
      estimated_patient_share: i.coverage === 'not_covered' ? i.price : round2(i.price * (1 - rate)),
    }));
    const homeFee = Number(b.price_lock.home_fee) || 0;
    return {
      status: 'pending', final: false, estimate: true, items,
      patient_share_total: null, estimated_patient_share_total: round2(items.reduce((s, i) => s + i.estimated_patient_share, 0) + homeFee),
      home_fee: { amount: homeFee, covered: false }, valid_until: null,
    };
  }

  async choose(user: any, bookingId: string, dto: PartialChoiceDto) {
    const b = await this.booking(bookingId);
    if (b.patient_id !== user.id) throw new NotFoundException('approval_not_found');
    const doc = (await this.approvals().findOne({ booking_id: bookingId })) as unknown as ApprovalDoc | null;
    if (!doc || doc.status === 'approved' || doc.choice) throw new ConflictException('choice_not_pending');
    if (dto.choice === 'covered_only' && doc.status === 'rejected') throw bad('nothing_covered');
    // the choice is taken once: the first call flips it, a second sees it set
    const taken = await this.approvals().findOneAndUpdate({ booking_id: bookingId, patient_id: user.id, choice: { $exists: false } }, { $set: { choice: dto.choice, chosen_at: new Date() } }, { returnDocument: 'after' });
    if (!taken) throw new ConflictException('choice_not_pending');
    const rejected = doc.items.filter((i) => i.decision === 'rejected').map((i) => i.catalog_id);
    const kept: ApprovalDoc = dto.choice === 'covered_only' ? { ...doc, items: doc.items.filter((i) => i.decision === 'approved') } : doc;
    try {
      await this.labs.applyOrderingChoice(bookingId, user, { choice: dto.choice, copay: this.total(kept), drop: dto.choice === 'covered_only' ? rejected : undefined });
    } catch (e) {
      await this.approvals().updateOne({ booking_id: bookingId }, { $unset: { choice: '', chosen_at: '' } }).catch(() => null);
      throw e;
    }
    if (dto.choice === 'covered_only') await this.approvals().updateOne({ booking_id: bookingId }, { $set: { items: kept.items } });
    if (dto.choice === 'cancel_free' && ['paid', 'partially_refunded'].includes(b.payment_status)) {
      // anything already paid goes back to the patient; the admin decides the refund request as for every refund
      await this.patientUx.requestRefund(user, { booking_kind: 'lab', booking_id: bookingId, reason: 'insurance_choice_cancel_free', amount: b.total_price }).catch((e) => this.logger.warn(`refund request not created: ${(e as Error).message}`));
    }
    await recordAudit(this.conn, { action: 'ordering.partial_choice', user_id: user.id, role: 'patient', resource_kind: 'lab_booking', resource_id: bookingId, details: { choice: dto.choice } });
    return { choice: dto.choice, patient_share_total: dto.choice === 'cancel_free' ? 0 : this.total(kept) };
  }
}
