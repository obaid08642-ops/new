import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Resend } from 'resend';

@Processor('email-queue')
export class MailProcessor {
  private resendInstance: Resend;

  constructor() {
    this.resendInstance = new Resend(process.env.RESEND_API_KEY || 're_default_key');
  }

  @Process('send-otp-transactional')
  async processOtpEmail(job: Job<{ destinationEmail: string; secureCode: string }>) {
    const { destinationEmail, secureCode } = job.data;

    try {
      await this.resendInstance.emails.send({
        from: 'NABD Security Hub <security@nabdahplus.com>',
        to: destinationEmail,
        subject: 'رمز التحقق الرقمي الموحد - نَبْضَة بلس',
        html: `
          <div style="direction: rtl; font-family: system-ui, sans-serif; padding: 30px; text-align: right; background-color: #ffffff; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px;">منظومة نَبْضَة بلس الطبية فائقة الأمان</h2>
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">لقد قمت بطلب رمز التحقق (OTP) لتسجيل الدخول الآمن لحسابك الصحي. الرمز السري الخاص بك هو:</p>
            <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 20px; font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 6px; color: #0284c7; margin: 25px 0;">
              ${secureCode}
            </div>
            <p style="color: #64748b; font-size: 14px;">ينتهي مفعول هذا الرمز تلقائياً خلال 5 دقائق لدواعي حماية الخصوصية الصحية وقانون PDPL لبيانات المرضى. يرجى عدم الإفصاح عنه لأي فرد.</p>
          </div>
        `,
      });
    } catch (error: any) {
      // Fail job explicitly to push payload string directly into BullMQ's Dead-Letter Queue (DLQ)
      throw new Error(`Transactional delivery engine error mapping: ${error.message}`);
    }
  }
}
