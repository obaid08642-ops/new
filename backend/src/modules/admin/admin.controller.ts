import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, BadRequestException, ForbiddenException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { User, UserDocument } from '../../schemas/user.schema';
import { ProviderDelta } from '../providers/schemas/provider-delta.schema';

/** Provider roles an admin may create accounts for (never staff/admin roles). */
const PROVIDER_CREATABLE_ROLES = [
  UserRole.DOCTOR, UserRole.PHARMACY, UserRole.HOSPITAL, UserRole.LAB,
  UserRole.RADIOLOGY, UserRole.NURSING, UserRole.HOME_CARE, UserRole.AMBULANCE,
  UserRole.PHYSIOTHERAPIST,
];

@Controller('admin')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN) // Globally secures this controller to ADMIN only
export class AdminController {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(ProviderDelta.name) private readonly deltaModel: Model<any>,
    @InjectModel('Appointment') private readonly appointmentModel: Model<any>,
    @InjectModel('EmergencyRequest') private readonly emergencyModel: Model<any>,
    @InjectConnection() private readonly connection: Connection,
    @Optional() private readonly events?: EventEmitter2,
  ) {}

  // ── Referral program report (admin) ──────────────────────────

  /**
   * Platform-wide referral report: funnel (invited → registered → rewarded),
   * points paid out, top referrers, and the latest invites — all from the
   * real referral_invites / loyalty_transactions collections.
   */
  @Get('referrals/report')
  async referralReport() {
    const invites = this.connection.db.collection('referral_invites');
    const users = this.connection.db.collection('users');
    const loyaltyTx = this.connection.db.collection('loyalty_transactions');

    const [funnel, topRaw, recent, referralPoints, usersWithCode] = await Promise.all([
      invites.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, points: { $sum: { $ifNull: ['$reward_points', 0] } } } }]).toArray(),
      invites.aggregate([
        { $group: { _id: '$referrer_id', invites: { $sum: 1 }, rewarded: { $sum: { $cond: [{ $eq: ['$status', 'rewarded'] }, 1, 0] } }, points: { $sum: { $cond: [{ $eq: ['$status', 'rewarded'] }, { $ifNull: ['$reward_points', 0] }, 0] } } } },
        { $sort: { rewarded: -1, invites: -1 } },
        { $limit: 20 },
      ]).toArray(),
      invites.find({}).sort({ createdAt: -1 }).limit(20).toArray(),
      loyaltyTx.aggregate([
        { $match: { reason: { $regex: /^referral/ } } },
        { $group: { _id: null, total: { $sum: '$points_delta' }, count: { $sum: 1 } } },
      ]).toArray(),
      users.countDocuments({ referral_code: { $exists: true, $ne: null } }),
    ]);

    const ids = [...new Set([
      ...topRaw.map((t: any) => t._id),
      ...recent.map((i: any) => i.referrer_id),
      ...recent.map((i: any) => i.referred_user_id),
    ].filter(Boolean))];
    const named = await users.find({ id: { $in: ids } }, { projection: { id: 1, full_name: 1, phone: 1 } }).toArray();
    const nameById = new Map(named.map((u: any) => [u.id, u.full_name || u.phone || 'مستخدم']));

    const byStatus = (s: string) => funnel.find((f: any) => f._id === s)?.count || 0;
    return {
      funnel: {
        total_invites: funnel.reduce((a: number, f: any) => a + f.count, 0),
        registered: byStatus('registered'),
        rewarded: byStatus('rewarded'),
        users_with_code: usersWithCode,
      },
      points: {
        referral_points_paid: referralPoints[0]?.total || 0,
        referral_transactions: referralPoints[0]?.count || 0,
      },
      top_referrers: topRaw.map((t: any) => ({
        user_id: t._id,
        name: nameById.get(t._id) || t._id,
        invites: t.invites,
        rewarded: t.rewarded,
        points_earned: t.points,
      })),
      recent_invites: recent.map((i: any) => ({
        id: i.id,
        referrer: nameById.get(i.referrer_id) || i.referrer_id,
        referred: nameById.get(i.referred_user_id) || 'مستخدم جديد',
        status: i.status,
        reward_points: i.reward_points || 0,
        created_at: i.createdAt,
        rewarded_at: i.rewarded_at || null,
      })),
    };
  }

  /** Loyalty program overview: balances, tiers, top earners, latest movements. */
  @Get('loyalty/overview')
  async loyaltyOverview() {
    const accounts = this.connection.db.collection('loyalty_accounts');
    const tx = this.connection.db.collection('loyalty_transactions');
    const users = this.connection.db.collection('users');

    const [totals, tiers, top, recent] = await Promise.all([
      accounts.aggregate([{ $group: { _id: null, accounts: { $sum: 1 }, balance: { $sum: '$points' }, lifetime: { $sum: '$lifetime_points' } } }]).toArray(),
      accounts.aggregate([{ $group: { _id: '$tier', count: { $sum: 1 } } }]).toArray(),
      accounts.find({}).sort({ lifetime_points: -1 }).limit(15).toArray(),
      tx.find({}).sort({ createdAt: -1 }).limit(20).toArray(),
    ]);
    const named = await users.find(
      { id: { $in: [...new Set([...top.map((t: any) => t.user_id), ...recent.map((r: any) => r.user_id)])] } },
      { projection: { id: 1, full_name: 1, phone: 1 } },
    ).toArray();
    const nameById = new Map(named.map((u: any) => [u.id, u.full_name || u.phone || 'مستخدم']));

    return {
      accounts_total: totals[0]?.accounts || 0,
      points_in_circulation: totals[0]?.balance || 0,
      lifetime_points_issued: totals[0]?.lifetime || 0,
      tiers: Object.fromEntries(tiers.map((t: any) => [t._id || 'bronze', t.count])),
      top_earners: top.map((t: any) => ({
        user_id: t.user_id, name: nameById.get(t.user_id) || t.user_id,
        points: t.points, lifetime_points: t.lifetime_points, tier: t.tier,
      })),
      recent_transactions: recent.map((r: any) => ({
        user: nameById.get(r.user_id) || r.user_id,
        points_delta: r.points_delta, reason: r.reason, created_at: r.createdAt,
      })),
    };
  }

  /**
   * User 360° profile — everything that happened on this account:
   * identity/status, registered devices, request history (appointments,
   * SOS), provider profile-change audit (deltas). All live DB reads.
   */
  @Get('users/:userId/overview')
  async userOverview(@Param('userId') userId: string, @Query('days') daysQ?: string): Promise<any> {
    const user: any = await this.userModel.findOne({ id: userId }, { password_hash: 0, otp_codes: 0 }).lean()
      || await this.userModel.findById(userId, { password_hash: 0, otp_codes: 0 }).catch(() => null);
    if (!user) throw new BadRequestException('user_not_found');

    const asPatient = { patient_id: user.id };
    const asProvider = { doctor_user_id: user.id };
    const isProvider = user.role !== UserRole.PATIENT && user.role !== UserRole.GUEST;

    // Period filter for the activity block (default 30 days, 0 = all time)
    const days = Math.max(0, parseInt(String(daysQ ?? '30'), 10) || 0);
    const since = days > 0 ? new Date(Date.now() - days * 86400000) : null;
    const periodFilter = (base: any) => since ? { ...base, createdAt: { $gte: since } } : base;

    const db = this.userModel.db;
    // provider account link (for provider service requests stats)
    const providerProfile: any = isProvider
      ? await db.collection('provider_profiles').findOne({ user_id: user.id } as any, { projection: { account_id: 1, status: 1 } }).catch(() => null)
      : null;
    const providerAccountId = providerProfile?.account_id || null;

    const apptScope = periodFilter(isProvider ? { $or: [asPatient, asProvider] } : asPatient);
    const [apptCount, apptByStatus, recentAppts, sosCount, recentSos, deltas, providerRequests, providerReqByStatus, family] = await Promise.all([
      this.appointmentModel.countDocuments(apptScope),
      this.appointmentModel.aggregate([
        { $match: apptScope },
        { $group: { _id: { $ifNull: ['$status', '$state'] }, n: { $sum: 1 } } },
      ]),
      this.appointmentModel
        .find(apptScope,
          { id: 1, type: 1, status: 1, state: 1, slot_start: 1, createdAt: 1, price: 1, fee: 1 })
        .sort({ createdAt: -1 }).limit(20).lean(),
      this.emergencyModel.countDocuments({ patient_id: user.id }),
      this.emergencyModel
        .find({ patient_id: user.id }, { id: 1, state: 1, location: 1, createdAt: 1 })
        .sort({ createdAt: -1 }).limit(10).lean(),
      this.deltaModel
        .find({ providerId: user._id })
        .sort({ createdAt: -1 }).limit(10).lean(),
      // Provider service requests (orders assigned to this provider account)
      providerAccountId
        ? db.collection('provider_requests')
            .find(periodFilter({ provider_account_id: providerAccountId }) as any,
              { projection: { _id: 0, id: 1, type: 1, status: 1, summary_ar: 1, amount_total: 1, currency: 1, createdAt: 1 } })
            .sort({ createdAt: -1 }).limit(20).toArray().catch(() => [])
        : Promise.resolve([]),
      providerAccountId
        ? db.collection('provider_requests').aggregate([
            { $match: periodFilter({ provider_account_id: providerAccountId }) },
            { $group: { _id: '$status', n: { $sum: 1 } } },
          ]).toArray().catch(() => [])
        : Promise.resolve([]),
      // Patient family members
      !isProvider
        ? db.collection('family_groups').findOne({ 'members.user_id': user.id } as any, { projection: { _id: 0, name: 1, members: 1 } }).catch(() => null)
        : Promise.resolve(null),
    ]);

    return {
      user: {
        id: user.id, full_name: user.full_name, email: user.email, phone: user.phone,
        role: user.role, active: user.active !== false, suspended: !!user.suspended,
        verified: !!user.verified, is_guest: !!user.is_guest,
        city: user.city, specialty: user.specialty, license_number: user.license_number,
        years_experience: user.years_experience, consultation_fee: user.consultation_fee,
        createdAt: user.createdAt, last_login_at: user.last_login_at,
      },
      devices: {
        // Push-registered devices = the phones/tablets this account signed into
        registered_count: Array.isArray(user.device_tokens) ? user.device_tokens.length : 0,
        last_login_at: user.last_login_at || null,
      },
      activity: {
        period_days: days,
        appointments_total: apptCount,
        appointments_by_status: Object.fromEntries((apptByStatus as any[]).map((r) => [String(r._id || 'unknown'), r.n])),
        sos_total: sosCount,
        recent_appointments: recentAppts,
        recent_sos: recentSos,
        provider_requests_total: (providerRequests as any[]).length,
        provider_requests_by_status: Object.fromEntries((providerReqByStatus as any[]).map((r) => [String(r._id || 'unknown'), r.n])),
        recent_provider_requests: providerRequests,
      },
      family: family ? { group_name: (family as any).name || null, members: ((family as any).members || []).map((m: any) => ({ user_id: m.user_id, name: m.name || m.full_name || null, relation: m.relation || m.role || null })) } : null,
      provider_status: providerProfile?.status || null,
      profile_changes: (deltas as any[]).map((d) => ({
        id: d.id || d._id,
        status: d.status,
        old_data: d.oldData,
        new_data: d.newData,
        reviewed_at: d.reviewedAt,
        rejection_reason: d.rejectionReason,
        created_at: d.createdAt,
      })),
    };
  }

  /**
   * Dispute center: open complaint/refund support tickets mapped to the
   * disputes page shape. Resolution happens via the existing force-cancel /
   * refund flows; here we only expose the queue.
   */
  @Get('disputes')
  async listDisputes(@Query('status') status = 'open') {
    throw new ServiceUnavailableException('admin dispute queue is unavailable pending approved case, evidence, financial-reconciliation and maker-checker workflow');
  }

  /**
   * User directory for the admin dashboard (users-management page):
   * paginated, filterable by role and free-text search (name/phone/email).
   */
  @Get('users')
  async listUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @Query('role') role?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: string,
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const filter: any = {};
    if (role) filter.role = role;
    if (q?.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ full_name: rx }, { phone: rx }, { email: rx }];
    }
    const sortMap: Record<string, any> = {
      activity: { last_login_at: -1, createdAt: -1 }, // most recently active first
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      name: { full_name: 1 },
    };
    const [items, total] = await Promise.all([
      this.userModel
        .find(filter, { password_hash: 0, otp_codes: 0 })
        .sort(sortMap[sort || ''] || sortMap.newest)
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      this.userModel.countDocuments(filter),
    ]);
    // Provider approval status overlay: a provider account that is still
    // PENDING_ADMIN_APPROVAL must NOT display as "نشط" in the directory — the
    // directory status reflects moderation state, not just users.active.
    const nonPatient = (items as any[]).filter((u) => u.role && !['patient', 'guest', 'admin', 'super_admin'].includes(u.role));
    let providerStatusMap = new Map<string, string>();
    if (nonPatient.length) {
      const ids = nonPatient.map((u) => u.id);
      const db = this.userModel.db;
      // provider_profiles links user_id → account_id; the moderation account
      // (provider_accounts) carries the authoritative approval status.
      const profiles = await db.collection('provider_profiles')
        .find({ user_id: { $in: ids } } as any, { projection: { user_id: 1, account_id: 1, status: 1 } }).toArray().catch(() => [] as any[]);
      const accountIds = (profiles as any[]).map((p2) => p2.account_id).filter(Boolean);
      const accounts = accountIds.length
        ? await db.collection('provider_accounts').find({ id: { $in: accountIds } } as any, { projection: { id: 1, status: 1 } }).toArray().catch(() => [] as any[])
        : [];
      const accountStatus = new Map<string, string>((accounts as any[]).map((a) => [a.id, a.status]));
      for (const p2 of profiles as any[]) {
        // prefer the moderation account status; fall back to the profile's own
        providerStatusMap.set(p2.user_id, accountStatus.get(p2.account_id) || p2.status);
      }
    }
    const enriched = (items as any[]).map((u) => ({ ...u, provider_status: providerStatusMap.get(u.id) || null }));
    return { data: enriched, total, page: p, pages: Math.ceil(total / l) };
  }

  /** Per-role counts for the dashboard filter chips (patients/doctors/…). */
  @Get('users/stats')
  async userStats() {
    const rows = await this.userModel.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    const byRole: Record<string, number> = {};
    for (const r of rows) byRole[r._id || 'unknown'] = r.count;
    return { byRole, total: rows.reduce((a, r) => a + r.count, 0) };
  }

  /** Only the platform owner (designated admin email) may manage sub-admins. */
  private assertOwner(user: any, dbUser?: any) {
    const designated = (process.env.ADMIN_PASSKEY_EMAIL || 'Obaid08642@gmail.com').trim().toLowerCase();
    const email = (dbUser?.email || user?.email || '').trim().toLowerCase();
    if (email !== designated) throw new ForbiddenException('owner_only');
  }

  private async resolveUser(jwtUser: any) {
    return this.userModel.findOne({ id: jwtUser?.id }).lean();
  }

  // ── Sub-admin management (owner-only) ────────────────────────

  @Get('sub-admins')
  async listSubAdmins(@CurrentUser() by: any) {
    this.assertOwner(by, await this.resolveUser(by));
    const admins = await this.userModel
      .find({ role: { $in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } }, { password_hash: 0 })
      .sort({ createdAt: -1 })
      .lean();
    const designated = (process.env.ADMIN_PASSKEY_EMAIL || 'Obaid08642@gmail.com').trim().toLowerCase();
    return admins.map((a: any) => ({
      id: a.id, full_name: a.full_name, email: a.email, phone: a.phone,
      role: a.role, permissions: a.permissions || [],
      is_owner: (a.email || '').trim().toLowerCase() === designated,
      active: a.active !== false, createdAt: a.createdAt, last_login_at: a.last_login_at,
    }));
  }

  @Post('sub-admins')
  async createSubAdmin(@CurrentUser() by: any, @Body() body: any) {
    this.assertOwner(by, await this.resolveUser(by));
    const email = (body?.email || '').trim().toLowerCase();
    const name = (body?.full_name || '').trim();
    if (!email || !email.includes('@')) throw new BadRequestException('valid_email_required');
    if (!name) throw new BadRequestException('full_name_required');
    const exists = await this.userModel.findOne({ email });
    if (exists) throw new BadRequestException('email_already_registered');
    const password = body?.password && String(body.password).length >= 8
      ? String(body.password)
      : randomBytes(9).toString('base64url') + '@1';
    const permissions = Array.isArray(body?.permissions)
      ? body.permissions.filter((p: any) => typeof p === 'string').slice(0, 64)
      : [];
    const doc = await this.userModel.create({
      full_name: name,
      email,
      phone: body?.phone || undefined,
      password_hash: await bcrypt.hash(password, 12),
      role: UserRole.ADMIN,
      permissions,
      active: true,
      is_guest: false,
    });
    try { this.events?.emit('admin.user_updated', { admin_id: by?.id, target_user_id: doc.id, action: 'sub_admin_created' }); } catch {}
    return { ok: true, id: doc.id, email, initial_password: body?.password ? undefined : password };
  }

  @Patch('sub-admins/:userId')
  async updateSubAdmin(@CurrentUser() by: any, @Param('userId') userId: string, @Body() body: any) {
    this.assertOwner(by, await this.resolveUser(by));
    const target = await this.userModel.findOne({ id: userId });
    if (!target) throw new BadRequestException('user_not_found');
    if (target.role !== UserRole.ADMIN && target.role !== UserRole.SUPER_ADMIN) {
      throw new BadRequestException('not_an_admin');
    }
    const designated = (process.env.ADMIN_PASSKEY_EMAIL || 'Obaid08642@gmail.com').trim().toLowerCase();
    if ((target.email || '').trim().toLowerCase() === designated) {
      throw new BadRequestException('cannot_modify_owner');
    }
    if (Array.isArray(body?.permissions)) {
      target.permissions = body.permissions.filter((p: any) => typeof p === 'string').slice(0, 64);
    }
    if (body?.active !== undefined) (target as any).active = !!body.active;
    await target.save();
    try { this.events?.emit('admin.user_updated', { admin_id: by?.id, target_user_id: userId, action: 'sub_admin_updated' }); } catch {}
    return { ok: true };
  }

  @Delete('sub-admins/:userId')
  async deleteSubAdmin(@CurrentUser() by: any, @Param('userId') userId: string) {
    this.assertOwner(by, await this.resolveUser(by));
    const target = await this.userModel.findOne({ id: userId });
    if (!target) throw new BadRequestException('user_not_found');
    const designated = (process.env.ADMIN_PASSKEY_EMAIL || 'Obaid08642@gmail.com').trim().toLowerCase();
    if ((target.email || '').trim().toLowerCase() === designated) {
      throw new BadRequestException('cannot_modify_owner');
    }
    if (target.role !== UserRole.ADMIN && target.role !== UserRole.SUPER_ADMIN) {
      throw new BadRequestException('not_an_admin');
    }
    await this.userModel.deleteOne({ id: userId });
    try { this.events?.emit('admin.user_updated', { admin_id: by?.id, target_user_id: userId, action: 'sub_admin_deleted' }); } catch {}
    return { ok: true };
  }

  // ── Provider account creation (admin-onboarded providers) ────

  /**
   * Admin creates a provider account (doctor/pharmacy/lab/…). The provider
   * then signs into the Provider app, completes settings and uploads
   * documents, and stays INVISIBLE to patients until admin approval
   * (verified=true via /admin/approve/:userId or the moderation page).
   */
  @Post('providers/create')
  async createProvider(@CurrentUser() by: any, @Body() body: any) {
    const role = body?.role as UserRole;
    if (!PROVIDER_CREATABLE_ROLES.includes(role)) throw new BadRequestException('invalid_provider_role');
    const name = (body?.full_name || '').trim();
    if (!name) throw new BadRequestException('full_name_required');
    const email = (body?.email || '').trim().toLowerCase() || undefined;
    const phone = (body?.phone || '').trim() || undefined;
    if (!email && !phone) throw new BadRequestException('email_or_phone_required');
    if (email && await this.userModel.findOne({ email })) throw new BadRequestException('email_already_registered');
    if (phone && await this.userModel.findOne({ phone })) throw new BadRequestException('phone_already_registered');
    const password = body?.password && String(body.password).length >= 8
      ? String(body.password)
      : randomBytes(9).toString('base64url') + '@1';
    const doc = await this.userModel.create({
      full_name: name,
      email,
      phone,
      password_hash: await bcrypt.hash(password, 12),
      role,
      // Provider details captured at creation; the provider can refine them
      // from the Provider app (delta-audited) before approval.
      specialty: body?.specialty || undefined,
      license_number: body?.license_number || undefined,
      city: body?.city || undefined,
      verified: false,      // ← hidden from patients until admin approval
      suspended: false,
      active: true,
      is_guest: false,
    });
    try { this.events?.emit('admin.provider_created', { admin_id: by?.id, provider_id: doc.id, role }); } catch {}
    return { ok: true, id: doc.id, role, email, phone, initial_password: body?.password ? undefined : password };
  }

  /** Ban/deactivate a user account (blocks login via active=false). */
  @Post('users/:userId/ban')
  async banUser(@Param('userId') userId: string, @CurrentUser() by?: any) {
    const user = await this.userModel.findOne({ id: userId }).exec()
      || await this.userModel.findById(userId).catch(() => null);
    if (!user) throw new BadRequestException('user_not_found');
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('cannot_ban_admin');
    }
    (user as any).active = false;
    (user as any).suspended = true;
    await user.save();
    try { this.events?.emit('admin.user_updated', { admin_id: by?.id, target_user_id: user.id || userId, action: 'ban' }); } catch {}
    return { ok: true, message: 'user_banned' };
  }

  /** Lift a ban / reactivate an account. */
  @Post('users/:userId/unban')
  async unbanUser(@Param('userId') userId: string, @CurrentUser() by?: any) {
    const user = await this.userModel.findOne({ id: userId }).exec()
      || await this.userModel.findById(userId).catch(() => null);
    if (!user) throw new BadRequestException('user_not_found');
    (user as any).active = true;
    (user as any).suspended = false;
    await user.save();
    try { this.events?.emit('admin.user_updated', { admin_id: by?.id, target_user_id: user.id || userId, action: 'unban' }); } catch {}
    return { ok: true, message: 'user_unbanned' };
  }

  /**
   * Permanently delete a user account and purge their directly-owned records.
   * Irreversible — the admin UI requires an explicit typed confirmation.
   */
  @Delete('users/:userId')
  async deleteUser(@Param('userId') userId: string, @CurrentUser() by?: any) {
    const user = await this.userModel.findOne({ id: userId }).exec()
      || await this.userModel.findById(userId).catch(() => null);
    if (!user) throw new BadRequestException('user_not_found');
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('cannot_delete_admin');
    }
    const uid = user.id;
    const db = this.userModel.db;
    // Purge directly-owned, user-scoped records. Shared clinical/financial
    // records (orders, appointments, ledger) are kept for audit integrity.
    const ownedCollections: Array<{ name: string; fields: string[] }> = [
      { name: 'patients', fields: ['user_id'] },
      { name: 'provider_profiles', fields: ['user_id'] },
      { name: 'carts', fields: ['user_id', 'patient_id'] },
      { name: 'pushtokens', fields: ['user_id'] },
      { name: 'notifications', fields: ['user_id'] },
      { name: 'notificationpreferences', fields: ['user_id'] },
      { name: 'wallets', fields: ['user_id'] },
      { name: 'familymembers', fields: ['user_id', 'member_user_id', 'owner_id'] },
      { name: 'healthmedications', fields: ['user_id'] },
      { name: 'wearabledevices', fields: ['user_id'] },
      { name: 'medicationreminders', fields: ['user_id'] },
      { name: 'provider_contracts', fields: ['user_id'] },
    ];
    for (const c of ownedCollections) {
      try {
        await db.collection(c.name).deleteMany({ $or: c.fields.map((f) => ({ [f]: uid })) } as any);
      } catch { /* collection may not exist yet */ }
    }
    await this.userModel.deleteOne({ _id: user._id });
    try { this.events?.emit('admin.user_updated', { admin_id: by?.id, target_user_id: uid, action: 'permanent_delete' }); } catch {}
    return { ok: true, message: 'user_deleted_permanently' };
  }

  /**
   * Manually approve a Doctor or Pharmacy (ensures 'verified: boolean' blocks booking until Admin approves).
   */
  @Post('approve/:userId')
  async approveProvider(@Param('userId') userId: string, @CurrentUser() by?: any) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new BadRequestException('user_not_found');
    if (![UserRole.DOCTOR, UserRole.PHARMACY].includes(user.role)) {
      throw new BadRequestException('user_not_a_provider');
    }
    
    user.verified = true;
    await user.save();
    try { this.events?.emit('admin.provider_approved', { admin_id: by?.id, provider_id: user.id || userId }); } catch {}
    return { ok: true, message: 'provider_verified' };
  }

  @Post('suspend/:userId')
  async suspendProvider(@Param('userId') userId: string, @CurrentUser() by?: any) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new BadRequestException('user_not_found');
    
    user.suspended = true;
    user.verified = false;
    await user.save();
    try { this.events?.emit('admin.provider_rejected', { admin_id: by?.id, provider_id: user.id || userId, action: 'suspend' }); } catch {}
    return { ok: true, message: 'provider_suspended' };
  }

  // --- DELTA AUDIT GUARD ENDPOINTS ---

  @Post('provider-deltas')
  async getPendingDeltas() {
    const deltas = await this.deltaModel.find({ status: 'pending' }).exec();
    return deltas;
  }

  @Post('provider-deltas/:deltaId/approve')
  async approveDelta(@Param('deltaId') deltaId: string) {
    const delta = (await this.deltaModel.findById(deltaId).catch(() => null))
      || (await this.deltaModel.findOne({ id: deltaId }).exec());
    if (!delta) throw new BadRequestException('delta_not_found');

    delta.status = 'approved';
    delta.reviewedAt = new Date();
    await delta.save();

    // Apply the changes to the provider_profiles collection
    const accountId = delta.account_id || delta.provider_account_id || delta.user_id || delta.providerId;
    let changes = delta.requested_changes || delta.changes || delta.newData || {};
    if (changes && typeof changes === 'object' && typeof (changes as any).changes === 'object' && (changes as any).changes) changes = (changes as any).changes;
    else if (changes && typeof changes === 'object' && typeof (changes as any).newData === 'object' && (changes as any).newData) changes = (changes as any).newData;

    if (accountId && Object.keys(changes).length) {
      await this.connection.collection('provider_profiles').updateOne(
        { $or: [{ account_id: accountId }, { user_id: accountId }, { id: accountId }] } as any,
        { $set: { ...changes, updated_at: new Date() } },
      );
    }
    
    return { ok: true, message: 'delta_approved' };
  }

  @Post('provider-deltas/:deltaId/reject')
  async rejectDelta(@Param('deltaId') deltaId: string, @Body() body?: any) {
    const delta = (await this.deltaModel.findById(deltaId).catch(() => null))
      || (await this.deltaModel.findOne({ id: deltaId }).exec());
    if (!delta) throw new BadRequestException('delta_not_found');

    delta.status = 'rejected';
    delta.reviewedAt = new Date();
    if (body?.reason) delta.rejectionReason = String(body.reason);
    await delta.save();
    
    return { ok: true, message: 'delta_rejected' };
  }
}
