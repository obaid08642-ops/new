import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { Model, Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ProviderAccount, ProviderProfile, ProviderDocument, ProviderBankAccount, ProviderAuditLog, DocumentReviewStatus, BankReviewStatus, SAUDI_BANKS } from '../schemas';
import { ProviderAccountStatus, ProviderDocumentType, PROVIDER_STATUS_TRANSITIONS, REQUIRED_DOCS_BY_PROVIDER_TYPE, HOSPITAL_SUB_MODULES, ProviderType } from '../provider.enums';
import { StorageService } from '../../storage/storage.module';
import { ProviderAccountRepository } from "./repositories/provideraccount.repository";
import { ProviderAccountProfileRepository } from "./repositories/provideraccountprofile.repository";
import { ProviderDocumentRepository } from "./repositories/providerdocument.repository";
import { ProviderBankAccountRepository } from "./repositories/providerbankaccount.repository";
import { ProviderAuditLogRepository } from "./repositories/providerauditlog.repository";

function validateIban(iban: string) {
  if (!iban) return false;
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  if (!/^SA\d{22}$/.test(clean)) return false;
  return clean;
}

@Injectable()
export class ProviderProfileService {
  constructor(
    @Inject('ProviderAccountRepository') private accounts: ProviderAccountRepository,
    @Inject('ProviderAccountProfileRepository') private profiles: ProviderAccountProfileRepository,
    @Inject('ProviderDocumentRepository') private docs: ProviderDocumentRepository,
    @Inject('ProviderBankAccountRepository') private banks: ProviderBankAccountRepository,
    @Inject('ProviderAuditLogRepository') private audit: ProviderAuditLogRepository,
    @InjectConnection() private readonly connection: Connection,
    private readonly storage: StorageService,
  ) {}

  // ===================== PROFILE =====================
  async getProfile(user: any) {
    const p = await this.profiles.findOne({ account_id: user.id }, { _id: 0, __v: 0 });
    if (!p) throw new NotFoundException();
    return p;
  }

  async updateProfile(user: any, patch: any) {
    const allowed = ['display_name_ar', 'display_name_en', 'legal_name', 'description_ar', 'description_en', 'commercial_registration_number', 'tax_number', 'medical_license_number', 'facility_license_number', 'established_year', 'years_of_experience', 'website', 'social', 'address', 'geo', 'has_own_delivery', 'use_platform_delivery', 'delivery_fee', 'estimated_delivery_minutes', 'profile_image_id', 'cover_image_id', 'enabled_modules', 'delivery_mode', 'max_delivery_radius_km', 'estimated_delivery_time'];
    const set: any = {};
    for (const k of allowed) if (patch[k] !== undefined) set[k] = patch[k];
    if (set.enabled_modules) {
      const p = await this.profiles.findOne({ account_id: user.id });
      if (p && p.provider_type !== ProviderType.HOSPITAL && p.provider_type !== ProviderType.CLINIC) throw new BadRequestException('enabled_modules only allowed for hospitals/clinics');
      set.enabled_modules = (set.enabled_modules as string[]).filter((m) => (HOSPITAL_SUB_MODULES as readonly string[]).includes(m));
    }
    // recompute completeness
    const updated = await this.profiles.findOneAndUpdate({ account_id: user.id }, { $set: set }, { new: true });
    if (!updated) throw new NotFoundException();
    updated.profile_completeness = this.computeCompleteness(updated);
    await updated.save();
    await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'profile.update', after: set });
    return updated;
  }

  private computeCompleteness(p: ProviderProfile): number {
    const checks = [!!p.display_name_ar, !!p.display_name_en, !!p.description_ar, !!(p.phones && p.phones.length), !!p.address?.city, !!p.geo?.lat, !!p.commercial_registration_number || !!p.medical_license_number];
    const pct = (checks.filter(Boolean).length / checks.length) * 100;
    return Math.round(pct);
  }

  // phones[]
  async addPhone(user: any, phone: any) {
    if (!phone?.number || !phone?.type) throw new BadRequestException('type and number required');
    if (!['mobile', 'whatsapp', 'landline', 'emergency'].includes(phone.type)) throw new BadRequestException('invalid phone.type');
    const p = await this.profiles.findOne({ account_id: user.id });
    if (!p) throw new NotFoundException();
    if ((p.phones || []).length >= 5) throw new BadRequestException('max 5 phones per provider');
    const id = require('uuid').v4();
    const isPrimary = !(p.phones || []).length || !!phone.is_primary;
    if (isPrimary) for (const ph of (p.phones || [])) (ph as any).is_primary = false;
    p.phones.push({ id, type: phone.type, country_code: phone.country_code || '+966', number: phone.number, is_primary: isPrimary, verified: false });
    await p.save();
    await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'profile.phone_added', after: { id, type: phone.type } });
    return p;
  }

  async removePhone(user: any, phone_id: string) {
    const p = await this.profiles.findOne({ account_id: user.id });
    if (!p) throw new NotFoundException();
    const before = (p.phones || []).length;
    p.phones = (p.phones || []).filter((x: any) => x.id !== phone_id);
    if (p.phones.length === before) throw new NotFoundException('phone');
    if (p.phones.length && !p.phones.some((x: any) => x.is_primary)) (p.phones[0] as any).is_primary = true;
    await p.save();
    return p;
  }

  // ===================== DOCUMENTS (KYC) =====================
  async uploadDocument(user: any, body: any) {
    if (!body?.doc_type || !Object.values(ProviderDocumentType).includes(body.doc_type)) throw new BadRequestException('invalid doc_type');
    if (!body?.file?.data_base64 || !body?.file?.mime) throw new BadRequestException('file required');
    const sto = await this.storage.upload({ owner_account_id: user.id, owner_kind: 'provider_account', mime: body.file.mime, data_base64: body.file.data_base64, original_name: body.file.original_name || body.doc_type });
    // delete previous PENDING/NEEDS_REPLACEMENT of same type? keep history but mark prior as superseded by leaving them.
    const existing = await this.docs.findOne({ account_id: user.id, doc_type: body.doc_type, review_status: { $in: [DocumentReviewStatus.PENDING, DocumentReviewStatus.NEEDS_REPLACEMENT, DocumentReviewStatus.UNDER_REVIEW] } });
    if (existing) {
      existing.storage_object_id = sto.id;
      existing.doc_number = body.doc_number;
      existing.issuer = body.issuer;
      existing.issued_date = body.issued_date ? new Date(body.issued_date) : undefined as any;
      existing.expiry_date = body.expiry_date ? new Date(body.expiry_date) : undefined as any;
      existing.review_status = DocumentReviewStatus.PENDING;
      existing.reviewer_id = undefined as any; existing.reviewer_note = undefined as any; existing.reviewed_at = undefined as any;
      await existing.save();
      await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'kyc.document_replaced', after: { doc_type: body.doc_type, id: existing.id } });
      return existing;
    }
    const doc = await this.docs.create({ account_id: user.id, doc_type: body.doc_type, storage_object_id: sto.id, doc_number: body.doc_number, issuer: body.issuer, issued_date: body.issued_date ? new Date(body.issued_date) : undefined, expiry_date: body.expiry_date ? new Date(body.expiry_date) : undefined });
    await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'kyc.document_uploaded', after: { doc_type: body.doc_type, id: doc.id } });
    return doc;
  }

  async listDocuments(user: any) {
    const docs = await this.docs.find({ account_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 });
    const a = await this.accounts.findOne({ id: user.id });
    const required = REQUIRED_DOCS_BY_PROVIDER_TYPE[a!.provider_type];
    const presentTypes = new Set(docs.map((d) => d.doc_type));
    const missing = required.filter((r) => !presentTypes.has(r));
    return { documents: docs, required, missing };
  }

  // ===================== BANK ACCOUNT =====================
  async upsertBank(user: any, body: any) {
    if (!body?.bank_code || !body?.holder_name || !body?.iban) throw new BadRequestException('bank_code/holder_name/iban required');
    const cleanIban = validateIban(body.iban);
    if (!cleanIban) throw new BadRequestException('invalid IBAN: must be SA followed by 22 digits');
    const bankRef = SAUDI_BANKS.find((b) => b.code === body.bank_code);
    if (!bankRef) throw new BadRequestException('unknown bank_code');
    const existing = await this.banks.findOne({ account_id: user.id });
    if (existing) {
      existing.bank_code = body.bank_code; existing.bank_name = bankRef.name_ar;
      existing.holder_name = body.holder_name; existing.iban = cleanIban;
      existing.vat_number = body.vat_number; existing.review_status = BankReviewStatus.PENDING;
      existing.reviewer_id = undefined as any; existing.reviewer_note = undefined as any;
      await existing.save();
      await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'bank.updated' });
      return existing;
    }
    const b = await this.banks.create({ account_id: user.id, bank_code: body.bank_code, bank_name: bankRef.name_ar, holder_name: body.holder_name, iban: cleanIban, vat_number: body.vat_number });
    await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'bank.created' });
    return b;
  }
  async getBank(user: any) { return this.banks.findOne({ account_id: user.id }, { _id: 0, __v: 0 }); }
  banks_list() { return SAUDI_BANKS; }

  // ===================== SUBMIT FOR APPROVAL =====================
  async submitForApproval(user: any) {
    const a = await this.accounts.findOne({ id: user.id });
    if (!a) throw new NotFoundException();
    if (!a.email_verified) throw new BadRequestException('email not verified');
    if ([ProviderAccountStatus.PENDING_ADMIN_APPROVAL, ProviderAccountStatus.UNDER_REVIEW, ProviderAccountStatus.APPROVED].includes(a.status)) {
      return { account: a.toObject(), already: true };
    }
    const profile = await this.profiles.findOne({ account_id: user.id });
    if (!profile?.display_name_ar) throw new BadRequestException('display_name_ar required');
    if (!(profile.phones || []).length) throw new BadRequestException('at least one phone is required');
    if (!profile.address?.city) throw new BadRequestException('address.city required');
    const required = REQUIRED_DOCS_BY_PROVIDER_TYPE[a.provider_type];
    const docs = await this.docs.find({ account_id: user.id });
    const present = new Set(docs.map((d) => d.doc_type));
    const missing = required.filter((r) => !present.has(r));
    if (missing.length) throw new BadRequestException('missing documents: ' + missing.join(', '));
    const bank = await this.banks.findOne({ account_id: user.id });
    if (!bank) throw new BadRequestException('bank account required');
    // transition to PENDING_ADMIN_APPROVAL (through ONBOARDING when possible)
    if (a.status === ProviderAccountStatus.EMAIL_VERIFIED) { a.status_history.push({ from: a.status, to: ProviderAccountStatus.ONBOARDING, by_user_id: user.id, by_role: 'provider', at: new Date() }); a.status = ProviderAccountStatus.ONBOARDING; }
    a.status_history.push({ from: a.status, to: ProviderAccountStatus.PENDING_ADMIN_APPROVAL, by_user_id: user.id, by_role: 'provider', at: new Date() });
    a.status = ProviderAccountStatus.PENDING_ADMIN_APPROVAL;
    a.onboarding_progress = { profile: true, location: !!profile.geo?.lat, documents: true, bank: true, submitted: true };
    await a.save();
    await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'onboarding.submitted' });
    await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'onboarding.submitted' });
    return { account: a.toObject() };
  }

  // ===================== DELTA GUARD =====================
  async submitDelta(user: any, body: any) {
    const delta = {
      id: uuidv4(),
      provider_id: user.id,
      requested_changes: body,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await this.connection.collection('provider_deltas').insertOne(delta);
    await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'delta.submitted' });
    return { ok: true, message: 'delta_submitted', data: delta };
  }

  async directory() {
    const accounts = await this.accounts.model.find({ provider_type: 'doctor' }).limit(50).exec();
    const profiles = await this.profiles.model.find({ account_id: { $in: accounts.map(a => a.id) } }).exec();
    return accounts.map(a => {
      const p = profiles.find(pr => pr.account_id === a.id);
      return {
        id: a.id,
        name: p?.display_name_ar || p?.display_name_en || 'طبيب',
        spec: 'عام',
        hospital: 'مستشفى نبض الافتراضي',
        mutual: Math.floor(Math.random() * 10)
      };
    });
  }
}
