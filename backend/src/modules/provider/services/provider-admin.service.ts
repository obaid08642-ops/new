import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { ProviderAccount, ProviderProfile, ProviderDocument, ProviderBankAccount, ProviderAuditLog, DocumentReviewStatus, BankReviewStatus } from '../schemas';
import { ProviderAccountStatus, PROVIDER_STATUS_TRANSITIONS } from '../provider.enums';
import { ProviderAccountRepository } from "./repositories/provideraccount.repository";
import { ProviderAccountProfileRepository } from "./repositories/provideraccountprofile.repository";
import { ProviderDocumentRepository } from "./repositories/providerdocument.repository";
import { ProviderBankAccountRepository } from "./repositories/providerbankaccount.repository";
import { ProviderAuditLogRepository } from "./repositories/providerauditlog.repository";

@Injectable()
export class ProviderAdminService {
  constructor(
    @Inject('ProviderAccountRepository') private accounts: ProviderAccountRepository,
    @Inject('ProviderAccountProfileRepository') private profiles: ProviderAccountProfileRepository,
    @Inject('ProviderDocumentRepository') private docs: ProviderDocumentRepository,
    @Inject('ProviderBankAccountRepository') private banks: ProviderBankAccountRepository,
    @Inject('ProviderAuditLogRepository') private audit: ProviderAuditLogRepository,
  ) {}

  private assertAdmin(user: any) { if (user.role !== 'admin') throw new ForbiddenException('admin only'); }

  async list(user: any, q: { status?: string; provider_type?: string; page?: number; limit?: number; search?: string }): Promise<any> {
    this.assertAdmin(user);
    const filter: any = {};
    if (q.status) filter.status = q.status;
    if (q.provider_type) filter.provider_type = q.provider_type;
    if (q.search) filter.email = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const page = Math.max(1, parseInt(String(q.page || 1)));
    const limit = Math.min(100, Math.max(5, parseInt(String(q.limit || 20))));
    const [items, total] = await Promise.all([
      this.accounts.find(filter, { password_hash: 0 }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.accounts.countDocuments(filter),
    ]);
    const accountIds = items.map(i => i.id);
    const profiles = await this.profiles.find({ account_id: { $in: accountIds } }, { account_id: 1, display_name_ar: 1, display_name_en: 1, legal_name: 1 }).lean();
    const profileMap = new Map(profiles.map(p => [p.account_id, p]));
    const enrichedItems = items.map(i => {
      const p = profileMap.get(i.id);
      return {
        ...i,
        display_name_ar: (p as any)?.display_name_ar || (p as any)?.legal_name || 'مزود خدمة',
        display_name_en: (p as any)?.display_name_en || (p as any)?.legal_name || 'Service Provider',
      };
    });
    return { items: enrichedItems, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async detail(user: any, id: string) {
    this.assertAdmin(user);
    const account = await this.accounts.findOne({ id }, { password_hash: 0 });
    if (!account) throw new NotFoundException();
    const [profile, docs, bank] = await Promise.all([
      this.profiles.findOne({ account_id: id }, { _id: 0, __v: 0 }),
      this.docs.find({ account_id: id }, { _id: 0, __v: 0 }),
      this.banks.findOne({ account_id: id }, { _id: 0, __v: 0 }),
    ]);
    return { account, profile, documents: docs, bank };
  }

  private async transition(account: ProviderAccount, to: ProviderAccountStatus, user: any, note?: string) {
    const allowed = PROVIDER_STATUS_TRANSITIONS[account.status] || [];
    if (!allowed.includes(to)) throw new BadRequestException(`invalid transition ${account.status} → ${to}`);
    account.status_history.push({ from: account.status, to, by_user_id: user.id, by_role: 'admin', at: new Date(), note });
    account.status = to;
  }

  async approve(user: any, id: string, body: any) {
    this.assertAdmin(user);
    const a = await this.accounts.findOne({ id }); if (!a) throw new NotFoundException();
    await this.transition(a, ProviderAccountStatus.APPROVED, user, body?.note);
    a.approved_at = new Date(); a.approved_by = user.id;
    await a.save();
    await this.profiles.updateOne({ account_id: id }, { $set: { user_id: id, type: a.provider_type, status: 'active' } });
    if (body?.commission !== undefined) {
      await this.profiles.updateOne({ account_id: id }, { $set: { commission_rate: Number(body.commission) } });
    }
    await this.docs.updateMany({ account_id: id, review_status: { $in: [DocumentReviewStatus.PENDING, DocumentReviewStatus.UNDER_REVIEW] } }, { $set: { review_status: DocumentReviewStatus.APPROVED, reviewer_id: user.id, reviewed_at: new Date() } });
    await this.banks.updateMany({ account_id: id, review_status: { $in: [BankReviewStatus.PENDING, BankReviewStatus.UNDER_REVIEW] } }, { $set: { review_status: BankReviewStatus.APPROVED, reviewer_id: user.id } });
    await this.audit.create({ provider_account_id: id, actor_id: user.id, actor_role: 'admin', action: 'admin.provider_approved', after: { note: body?.note, commission: body?.commission } });
    return a.toObject();
  }

  async reject(user: any, id: string, body: any) {
    this.assertAdmin(user);
    const a = await this.accounts.findOne({ id }); if (!a) throw new NotFoundException();
    await this.transition(a, ProviderAccountStatus.REJECTED, user, body?.reason);
    a.rejection_reason = body?.reason || 'rejected';
    await a.save();
    await this.profiles.updateOne({ account_id: id }, { $set: { user_id: id, type: a.provider_type, status: 'rejected' } });
    await this.audit.create({ provider_account_id: id, actor_id: user.id, actor_role: 'admin', action: 'admin.provider_rejected', after: { reason: a.rejection_reason } });
    return a.toObject();
  }

  async requestChanges(user: any, id: string, body: any) {
    this.assertAdmin(user);
    const a = await this.accounts.findOne({ id }); if (!a) throw new NotFoundException();
    await this.transition(a, ProviderAccountStatus.NEEDS_CHANGES, user, body?.note);
    await a.save();
    if (Array.isArray(body?.docs_needing_replacement)) {
      await this.docs.updateMany({ account_id: id, doc_type: { $in: body.docs_needing_replacement } }, { $set: { review_status: DocumentReviewStatus.NEEDS_REPLACEMENT, reviewer_id: user.id, reviewer_note: body?.note, reviewed_at: new Date() } });
    }
    await this.audit.create({ provider_account_id: id, actor_id: user.id, actor_role: 'admin', action: 'admin.provider_needs_changes', after: { note: body?.note, docs: body?.docs_needing_replacement } });
    return a.toObject();
  }

  async suspend(user: any, id: string, body: any) {
    this.assertAdmin(user);
    const a = await this.accounts.findOne({ id }); if (!a) throw new NotFoundException();
    await this.transition(a, ProviderAccountStatus.SUSPENDED, user, body?.reason);
    await a.save();
    await this.profiles.updateOne({ account_id: id }, { $set: { user_id: id, type: a.provider_type, status: 'suspended' } });
    await this.audit.create({ provider_account_id: id, actor_id: user.id, actor_role: 'admin', action: 'admin.provider_suspended', after: { reason: body?.reason } });
    return a.toObject();
  }
}
