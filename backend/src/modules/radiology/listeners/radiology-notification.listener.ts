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
      await this.notificationModel.create({
        user_id: payload.doctorId,
        user_type: 'provider',
        title: 'نتيجة أشعة جاهزة لمريضك',
        title_en: 'Radiology Results Ready for Patient',
        body: `تم إصدار تقرير الأشعة للمريض ${payload.patientName}. يمكنك استعراض التقرير والصور الآن.`,
        body_en: `Radiology report for ${payload.patientName} is ready. You can view the report and DICOM images now.`,
        type: 'RADIOLOGY_RESULT',
        action_url: `/provider/radiology/${payload.reportId}`,
        metadata: {
          patient_id: payload.patientId,
          report_id: payload.reportId,
          pdf_url: payload.pdfUrl,
          dicom_viewer_url: payload.dicomViewerUrl,
        },
        read: false,
        created_at: new Date(),
      });

      this.logger.log(`Successfully dispatched radiology notification to Doctor ${payload.doctorId}`);

    } catch (error) {
      this.logger.error(`Failed to process radiology.doctor_notify for Doctor ${payload.doctorId}: ${error.message}`);
    }
  }
}
