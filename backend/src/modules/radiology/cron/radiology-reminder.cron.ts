import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class RadiologyReminderCron {
  private readonly logger = new Logger(RadiologyReminderCron.name);

  constructor(
    @InjectModel('RadiologyCenterBooking') private bkgModel: Model<any>,
    private events: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handlePreparationReminders() {
    this.logger.debug('Running Radiology Preparation Reminders Cron Job...');
    const now = new Date();
    
    // Find upcoming CONFIRMED bookings in the next 24 hours
    const upcoming = await this.bkgModel.find({
      state: 'CONFIRMED',
      scheduled_at: { $gt: now, $lt: new Date(now.getTime() + 25 * 60 * 60 * 1000) }
    }).populate('service_id');

    for (const booking of upcoming) {
      const msDiff = new Date(booking.scheduled_at).getTime() - now.getTime();
      const hoursDiff = Math.round(msDiff / (1000 * 60 * 60));

      let reminderMessage = null;
      let reminderMessageEn = null;

      if (hoursDiff === 24) {
        reminderMessage = 'تذكير: يرجى الصيام 6 ساعات قبل أشعتك غداً';
        reminderMessageEn = 'Reminder: Please fast for 6 hours before your scan tomorrow';
      } else if (hoursDiff === 12) {
        reminderMessage = 'تذكير: لا تأكل ولا تشرب حتى موعد أشعتك';
        reminderMessageEn = 'Reminder: Do not eat or drink until your scan';
      } else if (hoursDiff === 2) {
        reminderMessage = 'تذكير: موعدك بعد ساعتين في مركز الأشعة';
        reminderMessageEn = 'Reminder: Your scan is in 2 hours at the radiology center';
      }

      if (reminderMessage) {
        // Emit notification event to Patient
        this.events.emit('patient.notify', {
          patientId: booking.patient_id,
          type: 'radiology_reminder',
          title: 'تذكير بموعد الأشعة',
          message: reminderMessage,
          message_en: reminderMessageEn,
          metadata: { bookingId: booking.id }
        });
        this.logger.debug(`Sent ${hoursDiff}h reminder for booking ${booking.id}`);
      }
    }
  }
}
