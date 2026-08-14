import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  
  async sendOtp(phone: string, otp: string): Promise<boolean> {
    if (!process.env.UNIFONIC_APP_ID && !process.env.TAQNYAT_API_KEY) {
      this.logger.warn(`SMS Provider not configured. OTP for ${phone} is ${otp}`);
      return true; // Auto-pass in dev
    }
    
    try {
      if (process.env.TAQNYAT_API_KEY) {
        // Taqnyat Integration
        const res = await axios.post('https://api.taqnyat.sa/v1/messages', {
          recipients: [phone],
          body: `Your Nabdah Plus OTP is: ${otp}`,
          sender: 'Nabdah'
        }, {
          headers: { Authorization: `Bearer ${process.env.TAQNYAT_API_KEY}` }
        });
        return res.status === 200 || res.status === 201;
      }
      return false;
    } catch (e) {
      this.logger.error(`Failed to send SMS to ${phone}`, e.stack);
      return false;
    }
  }
}
