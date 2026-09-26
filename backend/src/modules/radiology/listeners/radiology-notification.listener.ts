import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class RadiologyNotificationListener {
  private readonly logger = new Logger(RadiologyNotificationListener.name);

  constructor(
    @InjectModel('ProviderNotification') private readonly notificationModel: Model<any>,
  ) {}

  @OnEvent('radiology.doctor_notify')
  async handleRadiologyDoctorNotifyEvent(payload: {
    doctorId: string;
    patientId: string;
    patientName: string;
    reportId: string;
    pdfUrl?: string;
    dicomViewerUrl?: string;
  }) {
    this.logger.log(`Received radiology.doctor_notify event for Doctor ${payload.doctorId} regarding Patient ${payload.patientId}`);
    
    try {
      // 1. Create In-App Notification for the Doctor
      // Shape of ProviderNotification (provider_notifications): the old payload used user_id/title/body
      // and a type outside the enum, so create() failed validation and the doctor was never notified.
      await this.notificationModel.create({
        provider_account_id: payload.doctorId,
        type: 'booking_update',
        title_ar: 'نتيجة أشعة جاهزة لمريضك',
        title_en: 'Radiology Results Ready for Patient',
        body_ar: `تم إصدار تقرير الأشعة للمريض ${payload.patientName}. يمكنك استعراض التقرير والصور الآن.`,
        body_en: `Radiology report for ${payload.patientName} is ready. You can view the report and DICOM images now.`,
        icon: 'radiology',
        related_id: payload.reportId,
        related_type: 'radiology_report',
        read: false,
      });

      this.logger.log(`Successfully dispatched radiology notification to Doctor ${payload.doctorId}`);

    } catch (error) {
      this.logger.error(`Failed to process radiology.doctor_notify for Doctor ${payload.doctorId}: ${error.message}`);
    }
  }
}
