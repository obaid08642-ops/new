import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { isDbOutageError } from '../../../common/db-outage';

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

    let upcoming: any[];
    try {
    // Find upcoming CONFIRMED bookings in the next 24 hours
    upcoming = await this.bkgModel.find({
      state: 'CONFIRMED',
      scheduled_at: { $gt: now, $lt: new Date(now.getTime() + 25 * 60 * 60 * 1000) }
    }).populate('service_id');
    } catch (err: any) {
      if (isDbOutageError(err)) {
        this.logger.warn('radiology reminders skipped (db unavailable)');
        return;
      }
      throw err;
    }

    for (const booking of upcoming) {
      const msDiff = new Date(booking.scheduled_at).getTime() - now.getTime();
      const hoursDiff = Math.round(msDiff / (1000 * 60 * 60));

      // The texts live in the notification keys (notif.rad_reminder_<h>h); NotificationsService onRadPrepReminder.
      if ([24, 12, 2].includes(hoursDiff)) {
        this.events.emit('radiology.prep_reminder', { patient_id: booking.patient_id, booking_id: booking.id, hours: hoursDiff });
        this.logger.debug(`Sent ${hoursDiff}h reminder for booking ${booking.id}`);
      }
    }
  }
}
