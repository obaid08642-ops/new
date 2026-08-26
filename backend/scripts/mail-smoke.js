#!/usr/bin/env node
/**
 * GO-2 mail smoke — proves the ENTIRE scheduled-reports delivery chain with
 * ONE command, using the same provider path as production (Resend primary,
 * SES fallback) and the same attachment encoding as ScheduledReportsRunner.
 *
 * Usage (on the box where RESEND_API_KEY / SES_* are provisioned):
 *   RESEND_API_KEY=re_xxx MAIL_SMOKE_TO=you@nabd.plus node scripts/mail-smoke.js
 *
 * Exit 0 = delivered. Exit 1 = both providers failed (prints why).
 */
const fs = require('fs');
const path = require('path');

async function main() {
  const to = process.env.MAIL_SMOKE_TO;
  if (!to) {
    console.error('usage: MAIL_SMOKE_TO=you@nabd.plus node scripts/mail-smoke.js');
    process.exit(1);
  }

  // Same CSV shape/encoding ScheduledReportsRunner produces (BOM + quoted).
  const rows = [
    { bucket: 'SMOKE', vertical: 'revenue-check', gross: 1, count: 1 },
  ];
  const cols = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = ['\uFEFF' + cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  const filename = `smoke-${Date.now()}.csv`;

  const subject = 'نبض — اختبار تسليم التقارير المجدولة (smoke)';
  const html = `<div dir="rtl" style="font-family:sans-serif">
    <h2>اختبار تسليم بريد نبض</h2>
    <p>هذا البريد يثبت: المفتاح صالح، الدومين موثّق، والمرفق CSV يصل سليمًا.</p>
    <p>إن رأيت المرفق <b>${filename}</b> فسلسلة «تشغيل الآن» جاهزة تمامًا.</p>
  </div>`;

  // ── Primary: Resend (identical to MailService.sendWithAttachment) ──
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.MAIL_FROM || 'نَبْض <no-reply@nabd.plus>';
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        html,
        attachments: [{ filename, content: Buffer.from(csv, 'utf-8').toString('base64') }],
      });
      if (error) throw new Error(error.message || 'resend_error');
      console.log(JSON.stringify({ ok: true, provider: 'resend', id: data?.id || null, to, attachment: filename }, null, 2));
      process.exit(0);
    } catch (e) {
      console.error(`resend failed: ${e.message} — trying SES fallback…`);
    }
  } else {
    console.error('RESEND_API_KEY not set in this shell — skipping to SES fallback');
  }

  // ── Fallback: SES SMTP (identical encoding to MailService) ──
  if (process.env.SES_SMTP_HOST && process.env.SES_SMTP_USER && process.env.SES_SMTP_PASS) {
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SES_SMTP_HOST,
        port: parseInt(process.env.SES_SMTP_PORT || '587', 10),
        secure: process.env.SES_SMTP_PORT === '465',
        auth: { user: process.env.SES_SMTP_USER, pass: process.env.SES_SMTP_PASS },
      });
      const info = await transporter.sendMail({
        from: process.env.SES_FROM || 'نَبْض <no-reply@nabd.plus>',
        to, subject, html,
        attachments: [{ filename, content: Buffer.from(csv, 'utf-8') }],
      });
      console.log(JSON.stringify({ ok: true, provider: 'ses', messageId: info.messageId, to, attachment: filename }, null, 2));
      process.exit(0);
    } catch (e) {
      console.error(`ses failed: ${e.message}`);
    }
  }

  console.error(JSON.stringify({ ok: false, reason: 'no_provider_delivered', hint: 'set RESEND_API_KEY (or SES_*) in this shell' }));
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
