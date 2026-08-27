import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { MailService } from '../../mail/mail.module';

@Processor('email-queue')
export class MailProcessor {
  constructor(private readonly mail: MailService) {}

  @Process('send-otp-transactional')
  async processOtpEmail(job: Job<{ destinationEmail: string; secureCode: string }>) {
    const { destinationEmail, secureCode } = job.data;

    const result = await this.mail.sendOtp(destinationEmail, secureCode);
    if (!result.ok) {
      // Fail job explicitly to push payload string directly into BullMQ's Dead-Letter Queue (DLQ)
      throw new Error(`Transactional delivery engine error mapping: ${result.error}`);
    }
  }
}
