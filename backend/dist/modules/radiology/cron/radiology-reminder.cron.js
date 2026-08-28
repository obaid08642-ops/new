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
var RadiologyReminderCron_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RadiologyReminderCron = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
let RadiologyReminderCron = RadiologyReminderCron_1 = class RadiologyReminderCron {
    constructor(bkgModel, events) {
        this.bkgModel = bkgModel;
        this.events = events;
        this.logger = new common_1.Logger(RadiologyReminderCron_1.name);
    }
    async handlePreparationReminders() {
        this.logger.debug('Running Radiology Preparation Reminders Cron Job...');
        const now = new Date();
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
            }
            else if (hoursDiff === 12) {
                reminderMessage = 'تذكير: لا تأكل ولا تشرب حتى موعد أشعتك';
                reminderMessageEn = 'Reminder: Do not eat or drink until your scan';
            }
            else if (hoursDiff === 2) {
                reminderMessage = 'تذكير: موعدك بعد ساعتين في مركز الأشعة';
                reminderMessageEn = 'Reminder: Your scan is in 2 hours at the radiology center';
            }
            if (reminderMessage) {
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
};
exports.RadiologyReminderCron = RadiologyReminderCron;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RadiologyReminderCron.prototype, "handlePreparationReminders", null);
exports.RadiologyReminderCron = RadiologyReminderCron = RadiologyReminderCron_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('RadiologyCenterBooking')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        event_emitter_1.EventEmitter2])
], RadiologyReminderCron);
//# sourceMappingURL=radiology-reminder.cron.js.map