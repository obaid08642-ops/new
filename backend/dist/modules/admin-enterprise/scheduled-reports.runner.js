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
exports.ScheduledReportsRunner = void 0;
exports.toCsv = toCsv;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const analytics_suite_service_1 = require("./analytics-suite.service");
const finance_suite_service_1 = require("./finance-suite.service");
const mail_module_1 = require("../mail/mail.module");
let ScheduledReportsRunner = class ScheduledReportsRunner {
    constructor(conn, analytics, finance, mail) {
        this.conn = conn;
        this.analytics = analytics;
        this.finance = finance;
        this.mail = mail;
        this.logger = new common_1.Logger('ScheduledReports');
        this.running = false;
    }
    async runDue() {
        if (this.running)
            return;
        this.running = true;
        try {
            const now = new Date();
            const hourUtc = now.getUTCHours();
            const due = await this.conn.collection('scheduled_reports').find({ enabled: true }).toArray();
            for (const row of due) {
                const matchesFrequency = row.frequency === 'daily' ? true :
                    row.frequency === 'weekly' ? now.getUTCDay() === 1 :
                        now.getUTCDate() === 1;
                const hourMatches = Number(row.hour_utc ?? 4) === hourUtc;
                if (!matchesFrequency || !hourMatches)
                    continue;
                await this.runOne(row);
            }
        }
        catch (e) {
            this.logger.error(`run_due_failed: ${e?.message}`);
        }
        finally {
            this.running = false;
        }
    }
    async runOne(row) {
        const startedAt = Date.now();
        try {
            const payload = await this.computePayload(row.report);
            const csv = toCsv(payload.rows);
            const subject = `نبض — تقرير ${row.report} (${row.frequency})`;
            const html = `<div dir="rtl" style="font-family:sans-serif">
        <h2>تقرير ${REPORT_AR[row.report] || row.report}</h2>
        <p>الفترة: ${payload.period}</p>
        <p>مرفق: ملف CSV بأرقام حقيقية من قاعدة البيانات.</p>
      </div>`;
            let lastError = null;
            for (const to of row.recipients || []) {
                const res = await this.mail.sendWithAttachment({ to, subject, html, filename: `${row.report}-${payload.period}.csv`, content: csv });
                if (!res?.ok)
                    lastError = res?.error || 'send_failed';
            }
            await this.conn.collection('scheduled_reports').updateOne({ id: row.id }, { $set: { last_run_at: new Date(), last_status: lastError ? 'partial_or_failed' : 'sent', last_error: lastError, run_ms: Date.now() - startedAt } });
            await this.conn.collection('scheduled_report_runs').insertOne({
                id: `srr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
                report_id: row.id, report: row.report, status: lastError ? 'failed' : 'sent',
                error: lastError, rows: payload.rows.length, period: payload.period,
                created_at: new Date(),
            });
            this.logger.log(`report_sent id=${row.id} rows=${payload.rows.length}`);
            return { ok: !lastError, detail: lastError ? String(lastError) : `sent:${payload.rows.length}_rows` };
        }
        catch (e) {
            await this.conn.collection('scheduled_reports').updateOne({ id: row.id }, { $set: { last_run_at: new Date(), last_status: 'error', last_error: String(e?.message).slice(0, 300) } }).catch(() => null);
            return { ok: false, detail: e?.message };
        }
    }
    async computePayload(report) {
        const dayMs = 86_400_000;
        switch (report) {
            case 'revenue': {
                const from = new Date(Date.now() - 7 * dayMs);
                const res = await this.finance.revenue({ from: from.toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10), granularity: 'day' });
                return { rows: res.series, period: `${from.toISOString().slice(0, 10)}→${new Date().toISOString().slice(0, 10)}` };
            }
            case 'commissions': {
                const from = new Date(Date.now() - 30 * dayMs);
                const res = await this.finance.commissions({ from: from.toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) });
                return { rows: [{ ...res.totals, ...res.by_vertical }].length ? Object.entries(res.by_vertical).map(([vertical, r]) => ({ vertical, ...r })) : [], period: `${from.toISOString().slice(0, 10)}→${new Date().toISOString().slice(0, 10)}` };
            }
            case 'funnels': {
                const from = new Date(Date.now() - 30 * dayMs);
                const res = await this.analytics.funnel(from.toISOString(), new Date().toISOString());
                return { rows: res.channels, period: `${from.toISOString().slice(0, 10)}→${new Date().toISOString().slice(0, 10)}` };
            }
            case 'cohorts': {
                const from = new Date(Date.now() - 60 * dayMs);
                const res = await this.analytics.cohorts(from.toISOString(), new Date().toISOString());
                return { rows: res.cohorts, period: `${from.toISOString().slice(0, 10)}→${new Date().toISOString().slice(0, 10)}` };
            }
            case 'provider_league': {
                const from = new Date(Date.now() - 30 * dayMs);
                const res = await this.analytics.providerLeague(from.toISOString(), new Date().toISOString());
                return { rows: res.slice(0, 100), period: `${from.toISOString().slice(0, 10)}→${new Date().toISOString().slice(0, 10)}` };
            }
            case 'anomalies': {
                const res = await this.analytics.anomalies(45);
                return { rows: [...(res.cancellation_anomalies || []).map((a) => ({ kind: 'cancellation', ...a })), ...(res.payment_failure_anomalies || []).map((a) => ({ kind: 'payment_failure', ...a }))], period: 'last45d' };
            }
            default:
                throw new Error(`unknown_report:${report}`);
        }
    }
};
exports.ScheduledReportsRunner = ScheduledReportsRunner;
__decorate([
    (0, schedule_1.Cron)('*/30 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ScheduledReportsRunner.prototype, "runDue", null);
exports.ScheduledReportsRunner = ScheduledReportsRunner = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        analytics_suite_service_1.AnalyticsSuiteService,
        finance_suite_service_1.FinanceSuiteService,
        mail_module_1.MailService])
], ScheduledReportsRunner);
const REPORT_AR = {
    revenue: 'الإيرادات', commissions: 'العمولات وVAT', funnels: 'قمع التحويل',
    cohorts: 'Cohorts والاحتفاظ', provider_league: 'ترتيب المزودين', anomalies: 'تنبيهات الشذوذ',
};
function toCsv(rows) {
    if (!rows.length)
        return '\uFEFF(no data)\n';
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r ?? {})))];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return ['\uFEFF' + cols.join(','), ...rows.map((r) => cols.map((c) => esc((r ?? {})[c])).join(','))].join('\n') + '\n';
}
//# sourceMappingURL=scheduled-reports.runner.js.map