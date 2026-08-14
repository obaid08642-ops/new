import { Controller, Post, Body, Param, BadRequestException, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MedicalSupplyRequest } from '../schemas/medical-supply-request.schema';

@Controller('home-care/tracking')
export class HomeCareTrackingController {
  constructor(@InjectModel(MedicalSupplyRequest.name) private supplyModel: Model<MedicalSupplyRequest>) {}

  @Post('verify-attendance/:bookingId')
  @HttpCode(HttpStatus.OK)
  async verifyAttendance(
    @Param('bookingId') bookingId: string,
    @Body() body: { nurseLat: number; nurseLng: number; patientLat: number; patientLng: number }
  ) {
    const { nurseLat, nurseLng, patientLat, patientLng } = body;

    // Mathematical Earth Radius Haversine Distance Tracking Implementation
    const earthRadiusKm = 6371;
    const dLat = (patientLat - nurseLat) * (Math.PI / 180);
    const dLng = (patientLng - nurseLng) * (Math.PI / 180);

    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(nurseLat * (Math.PI / 180)) * Math.cos(patientLat * (Math.PI / 180)) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const finalDistanceMeters = earthRadiusKm * c * 1000;

    // HARD GEOCONSTRAINT RULE: Strict block if nurse boundary exceeds 500-meter tolerance threshold
    if (finalDistanceMeters > 500) {
      throw new BadRequestException({
        code: 'GEOFENCE_VIOLATION_THRESHOLD',
        distance_calculated_meters: finalDistanceMeters,
        message: 'فشل تسجيل الدخول. يجب أن تكون متواجدًا في موقع المريض الفعلي (أقل من 500 متر) لبدء الجلسة الطبية.'
      });
    }

    return { success: true, distance_meters: finalDistanceMeters, message: 'تم التحقق من الحضور الجغرافي بنجاح. الجلسة مفتوحة الآن.' };
  }

  @Post('submit-supplies-request')
  async requestSupplies(@Body() dto: any) {
    const request = await this.supplyModel.create({
      booking_id: new Types.ObjectId(dto.bookingId || new Types.ObjectId().toString()), // Fallback for testing
      nurse_id: new Types.ObjectId(dto.nurseId || new Types.ObjectId().toString()),
      requested_items: dto.items || [],
      priority: dto.priority || 'NORMAL'
    });
    return { success: true, request_id: request._id, message: 'تم إرسال طلب المستلزمات الطبية وجاري تجهيزه للشحن فوراً.' };
  }
}
