import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { JwtAuthGuard, CurrentUser } from '../../../common/auth.guard';
import { HomeCareBooking, NursingBookingState } from '../../../schemas/home-care.schema';
import { MedicalSupplyRequest } from '../schemas/medical-supply-request.schema';

@Controller('home-care/tracking')
@UseGuards(JwtAuthGuard)
export class HomeCareTrackingController {
  constructor(
    @InjectModel(MedicalSupplyRequest.name) private supplyModel: Model<MedicalSupplyRequest>,
    @InjectModel('HomeCareBooking') private bookingModel: Model<HomeCareBooking>,
    @InjectConnection() private connection: Connection,
  ) {}

  private isAdmin(user: any): boolean {
    return user?.role === 'admin' || user?.role === 'super_admin';
  }

  private async userDocumentId(user: any): Promise<Types.ObjectId> {
    if (!user?.id) throw new ForbiddenException('authenticated user required');
    const account: any = await this.connection.model('User').findOne({ id: user.id }).select({ _id: 1 }).lean();
    if (!account?._id) throw new ForbiddenException('provider account not found');
    return account._id;
  }

  private async assignedBooking(bookingId: string, user: any): Promise<any> {
    if (!bookingId) throw new BadRequestException('bookingId is required');
    const booking: any = await this.bookingModel.findOne({ id: bookingId });
    if (!booking) throw new NotFoundException('booking_not_found');
    if (this.isAdmin(user)) return booking;
    const providerRoles = ['nurse', 'nursing', 'home_care', 'hospital'];
    if (!providerRoles.includes(String(user?.role || '').toLowerCase()) || booking.provider_id !== user.id) {
      throw new ForbiddenException('booking is not assigned to this provider');
    }
    return booking;
  }

  @Post('verify-attendance/:bookingId')
  @HttpCode(HttpStatus.OK)
  async verifyAttendance(
    @Param('bookingId') bookingId: string,
    @Body() body: { nurseLat: number; nurseLng: number },
    @CurrentUser() user: any,
  ) {
    const booking: any = await this.assignedBooking(bookingId, user);
    const { nurseLat, nurseLng } = body || ({} as any);
    if (!Number.isFinite(nurseLat) || !Number.isFinite(nurseLng)) {
      throw new BadRequestException('nurseLat and nurseLng are required');
    }
    const patientLat = booking.address?.lat;
    const patientLng = booking.address?.lng;
    if (!Number.isFinite(patientLat) || !Number.isFinite(patientLng)) {
      throw new BadRequestException({ code: 'PATIENT_LOCATION_UNAVAILABLE', message: 'لا يمكن التحقق من الحضور قبل توفر موقع المريض.' });
    }

    const earthRadiusKm = 6371;
    const dLat = (patientLat - nurseLat) * (Math.PI / 180);
    const dLng = (patientLng - nurseLng) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(nurseLat * (Math.PI / 180)) * Math.cos(patientLat * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMeters = earthRadiusKm * c * 1000;
    if (distanceMeters > 500) {
      throw new BadRequestException({
        code: 'GEOFENCE_VIOLATION_THRESHOLD',
        distance_calculated_meters: distanceMeters,
        message: 'فشل تسجيل الدخول. يجب أن تكون متواجدًا في موقع المريض الفعلي (أقل من 500 متر) لبدء الجلسة الطبية.',
      });
    }

    booking.gps_tracking = { ...(booking.gps_tracking || {}), current_lat: nurseLat, current_lng: nurseLng, last_updated: new Date() };
    booking.markModified('gps_tracking');
    await booking.save();
    return { success: true, distance_meters: distanceMeters, message: 'تم التحقق من الحضور الجغرافي بنجاح. الجلسة مفتوحة الآن.' };
  }

  @Post('submit-supplies-request')
  @HttpCode(HttpStatus.CREATED)
  async requestSupplies(@Body() dto: any, @CurrentUser() user: any) {
    const booking: any = await this.assignedBooking(String(dto?.bookingId || ''), user);
    const items = Array.isArray(dto?.items) ? dto.items : [];
    if (!items.length) throw new BadRequestException('items are required');
    const nurseObjectId = await this.userDocumentId(user);
    if (!Types.ObjectId.isValid(String(booking._id))) throw new BadRequestException('booking reference is invalid');
    const request = await this.supplyModel.create({
      booking_id: booking._id,
      nurse_id: nurseObjectId,
      requested_items: items,
      priority: dto?.priority || 'NORMAL',
    });
    return { success: true, request_id: request._id, message: 'تم إرسال طلب المستلزمات الطبية وجاري تجهيزه للشحن فوراً.' };
  }
}
