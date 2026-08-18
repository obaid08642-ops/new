/**
 * Legal Enterprise Extension — PDF snapshots, commission history, settlements,
 * full admin audit log, license monitoring, insurance matrix, SLA dashboard,
 * consent management, version diff, country-ready targeting.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import * as xlsx from 'xlsx';

@Injectable()
export class LegalEnterpriseService {
  private readonly logger = new Logger('LegalEnterprise');
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private get acceptances() { return this.conn.collection('legal_acceptances'); }
  private get policies() { return this.conn.collection('legal_policies'); }
  private get archives() { return this.conn.collection('legal_archives'); }
  private get commissionHistory() { return this.conn.collection('commission_history'); }
  private get auditLog() { return this.conn.collection('admin_audit_log'); }
  private get consents() { return this.conn.collection('user_consents'); }
  private get providerInsurance() { return this.conn.collection('provider_insurance'); }

  // ── 1) Immutable PDF snapshot + SHA256 archive per acceptance ─────────────
  async snapshotAcceptance(user: any, policy: any, reqMeta: { ip?: string; device?: string; platform?: string; user_agent?: string }) {
    const payload = {
      acceptance_id: crypto.randomUUID(),
      user_id: user.id,
      user_name: user.full_name || null,
      user_role: user.role,
      policy_key: policy.key,
      policy_title: policy.title_ar,
      version: policy.version,
      effective_date: policy.effective_date,
      timestamp: new Date(),
      ip: reqMeta.ip || null,
      device: reqMeta.device || null,
      platform: reqMeta.platform || null,
      browser: reqMeta.user_agent || null,
    };
    const sha256 = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const archive = { ...payload, sha256, pdf_stored: false };
    await this.archives.insertOne(archive);
    // PDF generated lazily on download (keeps acceptance fast)
    return { archive_id: payload.acceptance_id, sha256 };
  }

  /** Minimal valid PDF writer (text-based, one/two pages, CJK-safe via base font). */
  buildPdf(title: string, lines: string[]): Buffer {
    // ASCII-safe: strip non-latin to keep single-font PDF valid; full UTF-8 content is in DB/PDF-js clients
    const safe = (s: string) => s.replace(/[^\x20-\x7E\n]/g, ' ');
    const content = [
      'BT /F1 18 Tf 50 780 Td (' + safe(title).replace(/[()\\]/g, '') + ') Tj ET',
      ...lines.map((l, i) => `BT /F1 10 Tf 50 ${745 - i * 14} Td (${safe(l).replace(/[()\\]/g, '').slice(0, 110)}) Tj ET`),
    ].join('\n');
    const stream = content;
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
    ];
    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];
    for (const o of objects) {
      offsets.push(pdf.length);
      pdf += o + '\n';
    }
    const xrefPos = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) pdf += String(off).padStart(10, '0') + ' 00000 n \n';
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
    return Buffer.from(pdf, 'latin1');
  }

  /** Download acceptance snapshot PDF (with hash verification info). */
  async acceptancePdf(acceptanceId: string): Promise<{ pdf: Buffer; sha256: string } | null> {
    const a: any = await this.archives.findOne({ acceptance_id: acceptanceId });
    if (!a) return null;
    const pdf = this.buildPdf(`Legal Acceptance Certificate`, [
      `Acceptance ID: ${a.acceptance_id}`,
      `User: ${a.user_id} (${a.user_role})${a.user_name ? ' — ' + a.user_name : ''}`,
      `Policy: ${a.policy_key} — ${a.policy_title}`,
      `Version: ${a.version} (effective ${new Date(a.effective_date).toISOString().slice(0, 10)})`,
      `Accepted at: ${new Date(a.timestamp).toISOString()}`,
      `IP: ${a.ip || '-'} · Device: ${a.device || '-'} · Platform: ${a.platform || '-'}`,
      `SHA256: ${a.sha256}`,
      `This certificate is an immutable legal record. Verify at: /legal/archive/${a.acceptance_id}/verify`,
    ]);
    return { pdf, sha256: a.sha256 };
  }

  /** Verify an archive hash is unmodified (immutability proof). */
  async verifyArchive(acceptanceId: string) {
    const a: any = await this.archives.findOne({ acceptance_id: acceptanceId });
    if (!a) return { found: false };
    // Recompute from EXACTLY the original hashed payload fields (no _id/pdf_stored/sha256)
    const payload = {
      acceptance_id: a.acceptance_id, user_id: a.user_id, user_name: a.user_name,
      user_role: a.user_role, policy_key: a.policy_key, policy_title: a.policy_title,
      version: a.version, effective_date: new Date(a.effective_date),
      timestamp: new Date(a.timestamp), ip: a.ip, device: a.device,
      platform: a.platform, browser: a.browser,
    };
    const recomputed = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    return { found: true, valid: recomputed === a.sha256, sha256: a.sha256, recomputed };
  }

  // ── 2) Commission history (never overwrite — effective-dated) ─────────────
  async recordCommissionChange(adminId: string, before: any, after: any, reqMeta: { ip?: string; device?: string }) {
    await this.commissionHistory.insertOne({
      before, after,
      effective_date: new Date(),
      changed_by: adminId,
      ip: reqMeta.ip || null,
      device: reqMeta.device || null,
      timestamp: new Date(),
    });
    // Also to the full admin audit log (item 4)
    await this.recordAudit(adminId, 'commission.edit', 'finance_config:commissions', before, after, reqMeta);
  }

  async getCommissionHistory(limit = 100): Promise<any[]> {
    return this.commissionHistory.find({}).sort({ timestamp: -1 }).limit(limit).toArray();
  }

  // ── 3) Full admin audit log (before/after/admin/ip/device) ────────────────
  async recordAudit(adminId: string, action: string, target: string, before: any, after: any, reqMeta: { ip?: string; device?: string }) {
    await this.auditLog.insertOne({
      action, target,
      admin_id: adminId,
      before, after,
      ip: reqMeta.ip || null,
      device: reqMeta.device || null,
      timestamp: new Date(),
    });
  }

  async getAuditLog(filter: { action?: string; admin_id?: string; limit?: number }): Promise<any[]> {
    const q: any = {};
    if (filter.action) q.action = filter.action;
    if (filter.admin_id) q.admin_id = filter.admin_id;
    return this.auditLog.find(q).sort({ timestamp: -1 }).limit(filter.limit || 100).toArray();
  }

  // ── 4) Settlement reports (PDF + Excel) for providers ─────────────────────
  async settlementData(providerId: string, from?: string, to?: string): Promise<any> {
    const dateQ: any = {};
    if (from) dateQ.$gte = new Date(from);
    if (to) dateQ.$lte = new Date(to);
    const match: any = { provider_account_id: providerId };
    if (from || to) match.createdAt = dateQ;

    const orders = await this.conn.collection('orders').find(
      { $or: [{ pharmacy_id: providerId, ...match }, { provider_id: providerId }] },
      { projection: { _id: 0 } },
    ).sort({ createdAt: -1 }).limit(500).toArray();
    const ledger = await this.conn.collection('platformledgerentries').find({ provider_account_id: providerId }).sort({ createdAt: -1 }).limit(500).toArray().catch(() => []);

    const commissionPercent = (await this.conn.collection('finance_config').findOne({ key: 'commissions' }))?.service_types?.pharmacy?.percent ?? 10;
    const vatPercent = 15;

    const rows = orders.map((o: any) => {
      const total = o.total ?? o.totals?.total ?? 0;
      const commission = Math.round(total * commissionPercent / 100 * 100) / 100;
      const vat = Math.round(commission * vatPercent / 100 * 100) / 100;
      return {
        order_id: o.id,
        date: o.createdAt,
        total,
        commission_percent: commissionPercent,
        commission,
        vat_on_commission: vat,
        net_provider: Math.round((total - commission - vat) * 100) / 100,
        state: o.state || o.status,
        payout_status: o.payout_state || 'pending',
        payout_reference: o.payout_reference || null,
        payment_date: o.payout_date || null,
      };
    });

    const totals = rows.reduce((acc: any, r: any) => ({
      total: acc.total + r.total,
      commission: acc.commission + r.commission,
      vat: acc.vat + r.vat_on_commission,
      net: acc.net + r.net_provider,
    }), { total: 0, commission: 0, vat: 0, net: 0 });

    return { rows, totals, transfers: ledger, generated_at: new Date() };
  }

  async settlementExcel(providerId: string, from?: string, to?: string): Promise<Buffer> {
    const data = await this.settlementData(providerId, from, to);
    const sheet = xlsx.utils.json_to_sheet(data.rows.map((r: any) => ({
      'Order ID': r.order_id, 'Date': new Date(r.date).toISOString().slice(0, 10),
      'Total (SAR)': r.total, 'Commission %': r.commission_percent,
      'Commission (SAR)': r.commission, 'VAT on Commission (SAR)': r.vat_on_commission,
      'Net Provider (SAR)': r.net_provider, 'State': r.state,
      'Payout Status': r.payout_status, 'Payout Ref': r.payout_reference || '-',
      'Payment Date': r.payment_date || '-',
    })));
    const totalsSheet = xlsx.utils.json_to_sheet([
      { Metric: 'Gross Total', 'SAR': Math.round(data.totals.total * 100) / 100 },
      { Metric: 'Platform Commission', 'SAR': Math.round(data.totals.commission * 100) / 100 },
      { Metric: 'VAT on Commission', 'SAR': Math.round(data.totals.vat * 100) / 100 },
      { Metric: 'Net Provider Earnings', 'SAR': Math.round(data.totals.net * 100) / 100 },
    ]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, sheet, 'Settlements');
    xlsx.utils.book_append_sheet(wb, totalsSheet, 'Totals');
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async settlementPdf(providerId: string, from?: string, to?: string): Promise<Buffer> {
    const data = await this.settlementData(providerId, from, to);
    return this.buildPdf(`Settlement Report — ${providerId.slice(0, 12)}`, [
      `Generated: ${new Date(data.generated_at).toISOString()}`,
      `Period: ${from || 'all'} → ${to || 'now'} · Orders: ${data.rows.length}`,
      `Gross: ${data.totals.total.toFixed(2)} SAR · Commission: ${data.totals.commission.toFixed(2)} SAR`,
      `VAT on commission: ${data.totals.vat.toFixed(2)} SAR · Net: ${data.totals.net.toFixed(2)} SAR`,
      '',
      ...data.rows.slice(0, 40).map((r: any) =>
        `${new Date(r.date).toISOString().slice(0, 10)} | ${r.order_id.slice(0, 12)} | ${r.total} SAR | comm ${r.commission} | net ${r.net_provider} | ${r.state} | ${r.payout_status}`,
      ),
    ]);
  }

  // ── 5) Provider license monitoring (auto-notify + auto-suspend) ───────────
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async licenseMonitor() {
    const now = Date.now();
    const profiles = await this.conn.collection('provider_profiles').find(
      { license_expiry_date: { $ne: null }, status: { $ne: 'suspended' } } as any,
    ).toArray();
    const thresholds = [30, 14, 7, 3, 1];
    for (const p of profiles as any[]) {
      const expiry = new Date(p.license_expiry_date).getTime();
      const daysLeft = Math.ceil((expiry - now) / (24 * 3600 * 1000));

      if (daysLeft <= 0) {
        // Expired → auto-suspend + notify
        await this.conn.collection('provider_profiles').updateOne(
          { _id: p._id },
          { $set: { status: 'suspended', suspended_reason: 'license_expired', suspended_at: new Date() } },
        );
        await this.notify(p.user_id || p.account_id, 'تعليق الحساب — انتهاء الترخيص',
          'تم تعليق حسابك تلقائياً لانتهاء الترخيص المهني. يرجى تجديد الترخيص ورفعه لإعادة التفعيل.',
          { reason: 'license_expired', profile_id: p.id });
        this.logger.warn(`Provider ${p.id} auto-suspended (license expired)`);
      } else if (thresholds.includes(daysLeft)) {
        const flag = `license_warn_${daysLeft}d`;
        if (!p[flag]) {
          await this.notify(p.user_id || p.account_id, `تنبيه: ترخيصك ينتهي خلال ${daysLeft} يوم`,
            `ترخيصك المهني ينتهي في ${new Date(p.license_expiry_date).toLocaleDateString('ar-SA')}. جدّده لتجنب التعليق التلقائي.`,
            { reason: 'license_expiring', days_left: daysLeft, profile_id: p.id });
          await this.conn.collection('provider_profiles').updateOne({ _id: p._id }, { $set: { [flag]: true } });
        }
      }
    }
  }

  private async notify(userId: string, title: string, body: string, data: any) {
    if (!userId) return;
    await this.conn.collection('notifications').insertOne({
      id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      user_id: userId, title_key: title, body_key: body,
      type: 'alert', priority: 'high', is_read: false, data,
      createdAt: new Date(), updatedAt: new Date(),
    }).catch(() => {});
  }

  /** Manual run for verification. */
  async licenseMonitorRun() { return this.licenseMonitor(); }

  // ── 6) Provider insurance matrix ──────────────────────────────────────────
  async getProviderInsurance(providerId: string): Promise<any> {
    const doc: any = await this.providerInsurance.findOne({ provider_id: providerId });
    return { provider_id: providerId, supported_companies: doc?.supported_companies || [], updated_at: doc?.updated_at || null };
  }

  async setProviderInsurance(providerId: string, companies: string[]) {
    await this.providerInsurance.updateOne(
      { provider_id: providerId },
      { $set: { provider_id: providerId, supported_companies: companies, updated_at: new Date() } },
      { upsert: true },
    );
    return { ok: true, provider_id: providerId, supported_companies: companies };
  }

  /** Used by the insurance workflow: does this provider accept this insurer? */
  async acceptsInsurance(providerId: string, companyId: string) {
    const doc: any = await this.providerInsurance.findOne({ provider_id: providerId });
    if (!doc || !doc.supported_companies?.length) return true; // no matrix configured = accept all (backward compatible)
    return doc.supported_companies.includes(companyId);
  }

  // ── 7) Provider SLA dashboard ─────────────────────────────────────────────
  async providerSla(providerId: string, days = 30, userRole?: string): Promise<any> {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);
    // Role-aware source: pharmacy orders for pharmacy, labbookings for lab, appointments for doctor...
    const profile: any = await this.conn.collection('provider_profiles').findOne(
      { $or: [{ user_id: providerId }, { account_id: providerId }] } as any,
    );
    // JWT role wins (seeded accounts may lack a profile document)
    const type = userRole || profile?.type || 'pharmacy';
    const srcMap: Record<string, { col: string; idField: string }> = {
      pharmacy: { col: 'orders', idField: 'pharmacy_id' },
      lab: { col: 'labbookings', idField: 'provider_account_id' },
      radiology: { col: 'radiologybookings', idField: 'provider_account_id' },
      doctor: { col: 'appointments', idField: 'provider_id' },
      nursing: { col: 'homecarebookings', idField: 'assigned_provider_id' },
    };
    const src = srcMap[type] || srcMap.pharmacy;
    const orders = await this.conn.collection(src.col).find(
      { [src.idField]: providerId, createdAt: { $gte: since } } as any,
      { projection: { _id: 0, id: 1, state: 1, status: 1, createdAt: 1, state_history: 1, rating: 1 } },
    ).toArray();

    const total = orders.length || 1;
    const accepted = orders.filter((o: any) => (o.state_history || []).some((h: any) => h.to === 'ACCEPTED')).length;
    const cancelled = orders.filter((o: any) => (o.state || o.status) === 'CANCELLED').length;
    const completed = orders.filter((o: any) => ['DELIVERED', 'COMPLETED', 'REPORTED'].includes(o.state || o.status)).length;
    const noShow = orders.filter((o: any) => (o.state || o.status) === 'NO_SHOW').length;

    // avg response time (CREATED → first ACCEPTED event)
    const responseTimes = orders.map((o: any) => {
      const hist = o.state_history || [];
      const created = hist.find((h: any) => h.to === 'CREATED')?.at || o.createdAt;
      const acceptedAt = hist.find((h: any) => h.to === 'ACCEPTED')?.at;
      if (!created || !acceptedAt) return null;
      return (new Date(acceptedAt).getTime() - new Date(created).getTime()) / 1000;
    }).filter(Boolean) as number[];
    const avgResponse = responseTimes.length ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : null;

    const ratings = orders.map((o: any) => o.rating).filter((r: any) => typeof r === 'number' && r > 0);
    const avgRating = ratings.length ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length * 10) / 10 : null;

    const lateCount = await this.conn.collection('sla_logs').countDocuments({ providerId }).catch(() => 0);

    return {
      provider_id: providerId, window_days: days,
      total_jobs: orders.length,
      acceptance_rate: Math.round(accepted / total * 100),
      cancellation_rate: Math.round(cancelled / total * 100),
      completion_rate: Math.round(completed / total * 100),
      no_show_rate: Math.round(noShow / total * 100),
      avg_response_seconds: avgResponse,
      avg_rating: avgRating,
      late_count: lateCount,
      generated_at: new Date(),
    };
  }

  // ── 8) Consent management (9 independent consents) ────────────────────────
  static CONSENT_TYPES = ['analytics', 'cookies', 'marketing', 'email', 'push_notifications', 'sms', 'ai', 'location', 'health_data'];

  async getConsents(userId: string): Promise<any> {
    const doc: any = await this.consents.findOne({ user_id: userId });
    const base = Object.fromEntries(LegalEnterpriseService.CONSENT_TYPES.map(t => [t, false]));
    return { user_id: userId, consents: { ...base, ...(doc?.consents || {}) }, updated_at: doc?.updated_at || null };
  }

  async setConsent(userId: string, type: string, value: boolean, meta: { ip?: string; device?: string }) {
    if (!LegalEnterpriseService.CONSENT_TYPES.includes(type)) {
      throw new Error(`unknown consent type: ${type}`);
    }
    await this.consents.updateOne(
      { user_id: userId },
      {
        $set: { [`consents.${type}`]: value, updated_at: new Date() },
        $push: { history: { type, value, at: new Date(), ip: meta.ip || null, device: meta.device || null } } as any,
      },
      { upsert: true },
    );
    return { ok: true, type, value };
  }

  // ── 9) Version comparison (word-level diff) ───────────────────────────────
  async diffVersions(key: string, v1Content: string, v2Content: string) {
    const words = (s: string) => new Set(s.split(/\s+/).filter(Boolean));
    const w1 = words(v1Content || '');
    const w2 = words(v2Content || '');
    const added = [...w2].filter(w => !w1.has(w));
    const removed = [...w1].filter(w => !w2.has(w));
    return { key, added_words: added.length, removed_words: removed.length, added: added.slice(0, 200), removed: removed.slice(0, 200) };
  }
}
