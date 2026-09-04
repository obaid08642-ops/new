import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
    private events: EventEmitter2,
  ) {}


  /** Physically delete a provider's stored images (Cloudinary/R2) so rejected or
   *  replaced assets never linger. Accepts storage IDs or raw URLs. */
  private async purgeImages(values: any[]) {
    const flat: string[] = [];
    for (const v of values) {
      if (Array.isArray(v)) flat.push(...v.map(String));
      else if (v) flat.push(String(v));
    }
    for (const s of flat) {
      try {
        let url = s.startsWith('http') ? s : null;
        if (!url) {
          const obj = await (this.accounts.model.db.collection('storage_objects') as any).findOne({ id: s });
          url = obj?.external_url || null;
        }
        if (url) this.events.emit('storage.delete_by_url', { url });
      } catch { /* best-effort cleanup */ }
    }
  }

  private assertAdmin(user: any) {
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      throw new ForbiddenException('admin only');
    }
  }

  async list(user: any, q: { status?: string; provider_type?: string; page?: number; limit?: number; search?: string }): Promise<any> {
    this.assertAdmin(user);
    const filter: any = {};
    if (q.status) filter.status = q.status === 'pending' ? ProviderAccountStatus.PENDING_ADMIN_APPROVAL : q.status;
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
    // Onboarding submissions carry their names on the common provider profile (same collection, has user_id)
    const onboardingProfiles = await this.accounts.model.db.collection('provider_profiles')
      .find({ account_id: { $in: accountIds }, user_id: { $exists: true } }, { projection: { account_id: 1, name_ar: 1, name_en: 1 } }).toArray();
    const onboardingMap = new Map(onboardingProfiles.map((p: any) => [p.account_id, p]));
    const enrichedItems = items.map(i => {
      const p = profileMap.get(i.id);
      const o: any = onboardingMap.get(i.id);
      return {
        ...i,
        display_name_ar: (p as any)?.display_name_ar || (p as any)?.legal_name || o?.name_ar || 'مزود خدمة',
        display_name_en: (p as any)?.display_name_en || (p as any)?.legal_name || o?.name_en || o?.name_ar || 'Service Provider',
      };
    });
    return { items: enrichedItems, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async detail(user: any, id: string): Promise<any> {
    this.assertAdmin(user);
    const account = await this.accounts.findOne({ id }, { password_hash: 0 });
    if (!account) throw new NotFoundException();
    const [profile, docs, bank] = await Promise.all([
      this.profiles.findOne({ account_id: id }, { _id: 0, __v: 0 }),
      this.docs.find({ account_id: id }, { _id: 0, __v: 0 }),
      this.banks.findOne({ account_id: id }, { _id: 0, __v: 0 }),
    ]);
    // Onboarding bridge: the full submission file (contract, drawn signature, signer,
    // licenses, photos, location, bank) lives on the common provider profile.
    const onboarding = await this.accounts.model.db.collection('provider_profiles').findOne(
      { account_id: id, user_id: { $exists: true } },
      { projection: { _id: 0, __v: 0 } },
    );
    return { account, profile, documents: docs, bank, onboarding: onboarding || null };
  }

  /**
   * Same full file as detail(), but keyed by the USER id (users collection).
   * The users-management page lists users — when the admin opens a provider
   * user, they must see the identical complete registration record.
   */
  async detailByUser(user: any, userId: string): Promise<any> {
    this.assertAdmin(user);
    const onboarding: any = await this.accounts.model.db.collection('provider_profiles').findOne(
      { user_id: userId, is_deleted: { $ne: true } } as any,
      { projection: { _id: 0, __v: 0 } },
    );
    if (!onboarding) throw new NotFoundException('لا يوجد ملف مزود مرتبط بهذا المستخدم');
    const accountId = onboarding.account_id;
    const account = accountId ? await this.accounts.findOne({ id: accountId }, { password_hash: 0 }) : null;
    const [profile, docs, bank] = accountId ? await Promise.all([
      this.profiles.findOne({ account_id: accountId }, { _id: 0, __v: 0 }),
      this.docs.find({ account_id: accountId }, { _id: 0, __v: 0 }),
      this.banks.findOne({ account_id: accountId }, { _id: 0, __v: 0 }),
    ]) : [null, [], null];
    return { account, profile, documents: docs, bank, onboarding };
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
    if (body?.commission !== undefined) {
      await this.profiles.updateOne({ account_id: id }, { $set: { commission_rate: Number(body.commission) } });
    }
    await this.docs.updateMany({ account_id: id, review_status: { $in: [DocumentReviewStatus.PENDING, DocumentReviewStatus.UNDER_REVIEW] } }, { $set: { review_status: DocumentReviewStatus.APPROVED, reviewer_id: user.id, reviewed_at: new Date() } });
    await this.banks.updateMany({ account_id: id, review_status: { $in: [BankReviewStatus.PENDING, BankReviewStatus.UNDER_REVIEW] } }, { $set: { review_status: BankReviewStatus.APPROVED, reviewer_id: user.id } });
    await this.accounts.model.db.collection('provider_profiles').updateMany(
      { account_id: id, user_id: { $exists: true } },
      { $set: { status: 'active', approved_at: new Date(), approved_by: user.id, rejected_reason: null } },
    );
    await this.audit.create({ provider_account_id: id, actor_id: user.id, actor_role: 'admin', action: 'admin.provider_approved', after: { note: body?.note, commission: body?.commission } });
    return a.toObject();
  }

  async reject(user: any, id: string, body: any) {
    this.assertAdmin(user);
    const a = await this.accounts.findOne({ id }); if (!a) throw new NotFoundException();
    await this.transition(a, ProviderAccountStatus.REJECTED, user, body?.reason);
    a.rejection_reason = body?.reason || 'rejected';
    await a.save();
    await this.accounts.model.db.collection('provider_profiles').updateMany(
      { account_id: id, user_id: { $exists: true } },
      { $set: { status: 'rejected', rejected_reason: a.rejection_reason } },
    );
    await this.audit.create({ provider_account_id: id, actor_id: user.id, actor_role: 'admin', action: 'admin.provider_rejected', after: { reason: a.rejection_reason } });
    // Free storage: rejected provider's images are physically deleted (Cloudinary/R2)
    const prof: any = await this.accounts.model.db.collection('provider_profiles').findOne({ account_id: id });
    if (prof) {
      const docs: any[] = await this.accounts.model.db.collection('providerdocuments').find({ account_id: id }).toArray();
      await this.purgeImages([
        prof.profile_photo, prof.logo, prof.clinic_images, prof.license_documents,
        ...docs.map((d: any) => d.file_url || d.storage_id || d.url),
      ]);
    }
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
    await this.audit.create({ provider_account_id: id, actor_id: user.id, actor_role: 'admin', action: 'admin.provider_suspended', after: { reason: body?.reason } });
    return a.toObject();
  }

  async listDeltas(user: any): Promise<any[]> {
    this.assertAdmin(user);
    const data = await this.accounts.model.db.collection('provider_deltas').find({ status: 'pending' }).toArray();
    return data;
  }

  async approveDelta(user: any, id: string): Promise<any> {
    this.assertAdmin(user);
    const delta: any = await this.accounts.model.db.collection('provider_deltas').findOne({ id });
    if (!delta) throw new NotFoundException('التغييرات المطلوبة غير موجودة');
    if (delta.status !== 'pending') throw new BadRequestException(`التغييرات تمت معالجتها مسبقاً (${delta.status})`);

    let changes = delta.requested_changes || delta.changes || {};
    if (changes && typeof changes === 'object' && typeof changes.changes === 'object' && changes.changes) changes = changes.changes;
    else if (changes && typeof changes === 'object' && typeof changes.newData === 'object' && changes.newData) changes = changes.newData;

    const accountId = delta.account_id || delta.provider_account_id || delta.user_id || delta.provider_id;
    let applied = 0;
    if (accountId && Object.keys(changes).length) {
      const res = await this.accounts.model.db.collection('provider_profiles').updateOne(
        { $or: [{ account_id: accountId }, { user_id: accountId }, { id: accountId }] } as any,
        { $set: { ...changes, updated_at: new Date() } },
      );
      applied = res.modifiedCount;
      const accountUpdates: any = {};
      if (changes.name_ar) accountUpdates.display_name_ar = changes.name_ar;
      if (changes.name_en) accountUpdates.display_name_en = changes.name_en;
      if (changes.legal_name) accountUpdates.legal_name = changes.legal_name;
      if (Object.keys(accountUpdates).length) {
        await this.accounts.model.updateOne({ id: accountId }, { $set: accountUpdates });
      }
    }
    await this.accounts.model.db.collection('provider_deltas').updateOne(
      { id },
      { $set: { status: 'approved', reviewed_at: new Date(), reviewer_id: user.id, applied_at: new Date() } },
    );
    await this.audit.create({
      provider_account_id: accountId || id,
      actor_id: user.id,
      actor_role: 'admin',
      action: 'admin.provider_delta_approved',
      after: { delta_id: id, changes }
    });
    return { success: true, applied };
  }

  async rejectDelta(user: any, id: string, body?: any): Promise<any> {
    this.assertAdmin(user);
    const delta: any = await this.accounts.model.db.collection('provider_deltas').findOne({ id });
    if (!delta) throw new NotFoundException('التغييرات المطلوبة غير موجودة');
    if (delta.status !== 'pending') throw new BadRequestException(`التغييرات تمت معالجتها مسبقاً (${delta.status})`);

    await this.accounts.model.db.collection('provider_deltas').updateOne(
      { id },
      { $set: { status: 'rejected', rejection_reason: body?.reason || 'rejected', reviewed_at: new Date(), reviewer_id: user.id } },
    );
    await this.audit.create({
      provider_account_id: delta.account_id || delta.provider_id || id,
      actor_id: user.id,
      actor_role: 'admin',
      action: 'admin.provider_delta_rejected',
      after: { delta_id: id, reason: body?.reason }
    });
    return { success: true };
  }
}
