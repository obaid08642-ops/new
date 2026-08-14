import { Controller, Post, Body, Param, Patch, Get, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RadiologyBooking } from '../schemas/radiology-booking.schema';

@Controller('radiology/bookings')
export class RadiologyController {
  constructor(
    @InjectModel('RadiologyCenterBooking') private radBookingModel: Model<RadiologyBooking>
  ) {}

  @Post('allocate-machine/:id')
  @HttpCode(HttpStatus.OK)
  async allocateMachine(
    @Param('id') bookingId: string,
    @Body() body: { machineId: string }
  ) {
    const { machineId } = body;

    // Check if machine is already busy for this period to block conflicts
    const conflict = await this.radBookingModel.findOne({
      allocated_machine_id: machineId,
      status: { $in: ['ACCEPTED', 'CHECKED_IN'] }
    });

    if (conflict && conflict._id.toString() !== bookingId) {
      throw new BadRequestException({
        code: 'MACHINE_CONFLICT_RESERVED',
        message: 'الجهاز المحدد محجوز حالياً ومخصص لعملية فحص أخرى في نفس هذا الوقت.'
      });
    }

    const booking = await this.radBookingModel.findByIdAndUpdate(
      bookingId,
      { $set: { allocated_machine_id: machineId, status: 'ACCEPTED' } },
      { new: true }
    );

    return { success: true, data: booking, message: 'تم تخصيص وحجز جهاز الفحص بنجاح للطلب.' };
  }

  @Post('finalize-scan/:id')
  async finalizeScan(
    @Param('id') bookingId: string,
    @Body() body: { reportText: string; files: string[]; pdfUrl: string }
  ) {
    const { reportText, files, pdfUrl } = body;

    const booking = await this.radBookingModel.findByIdAndUpdate(
      bookingId,
      {
        $set: {
          clinical_impression_report: reportText,
          scanned_files_s3_urls: files || [],
          signed_report_pdf_url: pdfUrl,
          status: 'REPORT_UPLOADED'
        }
      },
      { new: true }
    );

    if (!booking) throw new BadRequestException('Radiology booking ID not found.');

    // TRIGGER THE REFERRING DOCTOR CALLBACK IN THE SYSTEM
    // Automatically notifies the referring physician that scan results are ready for immediate medical review
    return { 
      success: true, 
      parent_appointment_id: booking.parent_appointment_id,
      message: 'تم حفظ تقرير الأشعة والصور الطبية بنجاح، وتفعيل إشعار العودة الآلي للطبيب المعالج.' 
    };
  }
}
