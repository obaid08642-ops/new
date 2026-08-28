import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AnalyticsSuiteService } from './analytics-suite.service';
import { FinanceSuiteService, Granularity } from './finance-suite.service';
import { MailService } from '../mail/mail.module';

/**
 * A7 — scheduled reports runner.
 * Every 30 minutes it picks up due enabled rows from `scheduled_reports`,
 * computes the report from the REAL aggregation services (no mocks), renders
 * CSV and emails recipients through the unified mail module (Resend→SES).
 */
@Injectable()
export class ScheduledReportsRunner {
  private readonly logger = new Logger('ScheduledReports');
  private running = false;

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly analytics: AnalyticsSuiteService,
    private readonly finance: FinanceSuiteService,
    private readonly mail: MailService,
  ) {}

  @Cron('*/30 * * * *')
  async runDue() {
    if (this.running) return;
    this.running = true;
    try {
      const now = new Date();
      const hourUtc = now.getUTCHours();
      const due = await this.conn.collection('scheduled_reports').find({ enabled: true }).toArray();
      for (const row of due as any[]) {
        const matchesFrequency =
          row.frequency === 'daily' ? true :
          row.frequency === 'weekly' ? now.getUTCDay() === 1 : // Mondays
          now.getUTCDate() === 1;                               // monthly on the 1st
        const hourMatches = Number(row.hour_utc ?? 4) === hourUtc;
        if (!matchesFrequency || !hourMatches) continue;
        await this.runOne(row);
      }
    } catch (e: any) {
      this.logger.error(`run_due_failed: ${e?.message}`);
    } finally {
      this.running = false;
    }
  }

  /** Compute + render + send one report row. Also used by manual-run endpoint. */
  async runOne(row: any): Promise<{ ok: boolean; detail: string }> {
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
      let lastError: string | null = null;
      for (const to of row.recipients || []) {
        const res = await this.mail.sendWithAttachment({ to, subject, html, filename: `${row.report}-${payload.period}.csv`, content: csv });
        if (!res?.ok) lastError = res?.error || 'send_failed';
      }
      await this.conn.collection('scheduled_reports').updateOne(
        { id: row.id },
        { $set: { last_run_at: new Date(), last_status: lastError ? 'partial_or_failed' : 'sent', last_error: lastError, run_ms: Date.now() - startedAt } },
      );
      await this.conn.collection('scheduled_report_runs').insertOne({
        id: `srr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        report_id: row.id, report: row.report, status: lastError ? 'failed' : 'sent',
        error: lastError, rows: payload.rows.length, period: payload.period,
        created_at: new Date(),
      });
      this.logger.log(`report_sent id=${row.id} rows=${payload.rows.length}`);
      return { ok: !lastError, detail: lastError ? String(lastError) : `sent:${payload.rows.length}_rows` };
    } catch (e: any) {
      await this.conn.collection('scheduled_reports').updateOne(
        { id: row.id },
        { $set: { last_run_at: new Date(), last_status: 'error', last_error: String(e?.message).slice(0, 300) } },
      ).catch(() => null);
      return { ok: false, detail: e?.message };
    }
  }

  private async computePayload(report: string): Promise<{ rows: any[]; period: string }> {
    const dayMs = 86_400_000;
    switch (report) {
      case 'revenue': {
        const from = new Date(Date.now() - 7 * dayMs);
        const res = await this.finance.revenue({ from: from.toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10), granularity: 'day' as Granularity });
        return { rows: res.series, period: `${from.toISOString().slice(0, 10)}→${new Date().toISOString().slice(0, 10)}` };
      }
      case 'commissions': {
        const from = new Date(Date.now() - 30 * dayMs);
        const res = await this.finance.commissions({ from: from.toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) });
        return { rows: [{ ...res.totals, ...res.by_vertical }].length ? Object.entries(res.by_vertical).map(([vertical, r]: any) => ({ vertical, ...r })) : [], period: `${from.toISOString().slice(0, 10)}→${new Date().toISOString().slice(0, 10)}` };
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
}

const REPORT_AR: Record<string, string> = {
  revenue: 'الإيرادات', commissions: 'العمولات وVAT', funnels: 'قمع التحويل',
  cohorts: 'Cohorts والاحتفاظ', provider_league: 'ترتيب المزودين', anomalies: 'تنبيهات الشذوذ',
};

/** Minimal RFC-4180-ish CSV with UTF-8 BOM. */
export function toCsv(rows: any[]): string {
  if (!rows.length) return '\uFEFF(no data)\n';
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r ?? {})))];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return ['\uFEFF' + cols.join(','), ...rows.map((r) => cols.map((c) => esc((r ?? {})[c])).join(','))].join('\n') + '\n';
}
