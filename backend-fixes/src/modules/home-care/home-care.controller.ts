// @ts-nocheck
import { Controller, Get, Param, Post, Query, UseGuards, Body, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CurrentUser, JwtAuthGuard, Public, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HomeCareBooking, NursingBookingState, HomeCareService, NurseProvider } from '../../schemas/home-care.schema';
import { User } from '../../schemas/user.schema';

@UseGuards(JwtAuthGuard)
@Controller('nursing')
export class NursingController {
  constructor(
    @InjectModel('HomeCareBooking') private readonly bkgModel: Model<HomeCareBooking>,
    @InjectModel('HomeCareService') private readonly serviceModel: Model<HomeCareService>,
    @InjectModel('NurseProvider') private readonly nurseModel: Model<NurseProvider>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly events: EventEmitter2,
  ) {}

  private isAdmin(user: any): boolean {
    return user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
  }

  private providerIdentity(user: any): string {
    const providerId = user?.provider_account_id || user?.parent_provider_account_id || user?.provider_profile_id || user?.id;
    if (!providerId) throw new ForbiddenException('Provider identity is missing');
    return providerId;
  }

  private async findAuthorizedBooking(id: string, user: any): Promise<HomeCareBooking> {
    const booking = await this.bkgModel.findOne({ id });
    if (!booking) throw new NotFoundException('Visit not found');
    if (!this.isAdmin(user) && booking.provider_id !== this.providerIdentity(user)) {
      throw new ForbiddenException('Access denied: visit is not assigned to this provider');
    }
    return booking;
  }

  // 1. SERVICES CATALOG (Pillar 2)
  @Public() @Get('catalog')
  async getCatalog() {
    return this.serviceModel.find({ active: true }).lean();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('staff')
  async getNursingStaff() {
    return this.userModel.find({
      role: { $in: [UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE] },
      active: true,
      suspended: { $ne: true },
    }).select('id full_name phone email degree specialty').sort({ full_name: 1 }).lean();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('visits/:id/assign')
  async assignNurse(@Param('id') id: string, @Body() body: { nurse_id?: string }, @CurrentUser() user: any) {
    if (!body?.nurse_id) throw new BadRequestException('nurse_id is required');
    const booking = await this.bkgModel.findOne({ id });
    if (!booking) throw new NotFoundException('Visit not found');
    if ([NursingBookingState.COMPLETED, NursingBookingState.NO_SHOW, NursingBookingState.ESCALATED_EMERGENCY].includes(booking.state)) {
      throw new BadRequestException('Closed visit cannot be reassigned');
    }
    const nurse = await this.userModel.findOne({
      id: body.nurse_id,
      role: { $in: [UserRole.NURSE, UserRole.NURSING, UserRole.HOME_CARE] },
      active: true,
      suspended: { $ne: true },
    }).lean();
    if (!nurse) throw new NotFoundException('Active nursing provider not found');

    booking.provider_id = nurse.id;
    booking.provider_name = nurse.full_name;
    booking.provider_phone = nurse.phone;
    booking.audit_trail.push({ action: 'nurse_assigned', timestamp: new Date(), userId: user.id });
    await booking.save();
    return { success: true, booking_id: booking.id, provider_id: nurse.id };
  }

  // 2. FETCH ACTIVE VISITS (Pillar 3)
  @Roles(UserRole.HOME_CARE, UserRole.NURSING, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('visits')
  async getVisits(@Query('provider_id') providerId: string, @CurrentUser() user: any) {
    const effectiveProviderId = this.isAdmin(user) && providerId ? providerId : this.providerIdentity(user);
    return this.bkgModel.find({ provider_id: effectiveProviderId }).sort({ scheduled_at: 1 }).lean();
  }
  
  @Roles(UserRole.HOME_CARE, UserRole.NURSING, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('visits/:id')
  async getVisitById(@Param('id') id: string, @CurrentUser() user: any) {
    return (await this.findAuthorizedBooking(id, user)).toObject();
  }

  // 3. FIELD-OPS STATE MACHINE (Pillar 4 & 5)
  
  @Roles(UserRole.HOME_CARE, UserRole.NURSING, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('visits/:id/tracking')
  async getVisitTracking(@Param('id') id: string, @CurrentUser() user: any) {
    const b = await this.findAuthorizedBooking(id, user);
    
    return {
      booking_id: b.id,
      nurse_phone: b.provider_phone || null,
      hospital_lat: b.address?.lat ?? null,
      hospital_lng: b.address?.lng ?? null,
      current_lat: b.gps_tracking?.current_lat ?? null,
      current_lng: b.gps_tracking?.current_lng ?? null,
      eta_minutes: null,
      status: b.state
    };
  }

  @Roles(UserRole.HOME_CARE, UserRole.NURSING, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('visits/:id/respond')
  async respondToVisit(@Param('id') id: string, @Body() body: { accept: boolean }, @CurrentUser() user: any) {
    const b = await this.findAuthorizedBooking(id, user);
    const priorState = b.state;
    
    if (body.accept) {
      b.state = NursingBookingState.CONFIRMED;
      b.state_history.push({ from: priorState, to: NursingBookingState.CONFIRMED, at: new Date() });
    } else {
      b.state = NursingBookingState.NEW_REQUEST;
      b.provider_id = undefined;
      b.state_history.push({ from: priorState, to: NursingBookingState.NEW_REQUEST, note: 'Rejected by provider', at: new Date() });
    }
    await b.save();
    return { success: true, state: b.state };
  }

  @Roles(UserRole.HOME_CARE, UserRole.NURSING, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('visits/:id/transit')
  async startTransit(@Param('id') id: string, @CurrentUser() user: any) {
    const b = await this.findAuthorizedBooking(id, user);
    if (b.state !== NursingBookingState.CONFIRMED) throw new BadRequestException('Invalid state transition');
    
    b.state = NursingBookingState.IN_TRANSIT;
    b.timers.transit_started_at = new Date();
    b.state_history.push({ from: NursingBookingState.CONFIRMED, to: b.state, at: new Date() });
    await b.save();

    // Emitting live GPS sync event for Patient App (Pillar 7.1)
    this.events.emit('patient.notify', { patientId: b.patient_id, type: 'nursing_transit', message: 'الممرض في الطريق إليك', metadata: { bookingId: b.id } });
    
    return { success: true, state: b.state };
  }

  @Roles(UserRole.HOME_CARE, UserRole.NURSING, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('visits/:id/gps')
  async updateVisitGps(@Param('id') id: string, @Body() body: { lat: number; lng: number }, @CurrentUser() user: any) {
    if (!Number.isFinite(body?.lat) || !Number.isFinite(body?.lng)) {
      throw new BadRequestException('Valid latitude and longitude are required');
    }
    const booking = await this.findAuthorizedBooking(id, user);
    booking.gps_tracking = { ...(booking.gps_tracking || {}), current_lat: body.lat, current_lng: body.lng, last_updated: new Date() };
    booking.audit_trail.push({ action: 'gps_updated', timestamp: new Date(), userId: user.id });
    await booking.save();
    return { success: true, updated_at: booking.gps_tracking.last_updated };
  }

  @Roles(UserRole.HOME_CARE, UserRole.NURSING, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('visits/:id/check-in')
  async checkInToVisit(@Param('id') id: string, @Body() body: { lat: number; lng: number }, @CurrentUser() user: any) {
    if (!Number.isFinite(body?.lat) || !Number.isFinite(body?.lng)) {
      throw new BadRequestException('Valid latitude and longitude are required');
    }
    const booking = await this.findAuthorizedBooking(id, user);
    if (![NursingBookingState.CONFIRMED, NursingBookingState.IN_TRANSIT, NursingBookingState.ARRIVED].includes(booking.state)) {
      throw new BadRequestException('Visit must be confirmed before check-in');
    }
    const priorState = booking.state;
    booking.state = NursingBookingState.CARE_IN_PROGRESS;
    booking.timers = { ...(booking.timers || {}), care_started_at: new Date() };
    booking.gps_tracking = { ...(booking.gps_tracking || {}), current_lat: body.lat, current_lng: body.lng, last_updated: new Date() };
    booking.state_history.push({ from: priorState, to: booking.state, at: new Date() });
    booking.audit_trail.push({ action: 'visit_checked_in', timestamp: new Date(), userId: user.id });
    await booking.save();
    return { success: true, state: booking.state };
  }

  @Roles(UserRole.HOME_CARE, UserRole.NURSING, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('visits/:id/arrive')
  async arriveAtPatient(@Param('id') id: string, @Body() body: { lat: number, lng: number }, @CurrentUser() user: any) {
    const b = await this.findAuthorizedBooking(id, user);
    
    // Strict Geofencing check (< 500m logic in actual implementation)
    const patientLat = b.address?.lat;
    const patientLng = b.address?.lng;
    
    if (patientLat && patientLng) {
      // Simplified distance check (using 500m logic roughly)
      const dist = Math.sqrt(Math.pow(patientLat - body.lat, 2) + Math.pow(patientLng - body.lng, 2));
      if (dist > 0.005) { // Roughly 500m in degrees
        throw new BadRequestException('You are not close enough to the patient location (< 500m)');
      }
    }

    b.state = NursingBookingState.ARRIVED;
    b.timers.arrived_at = new Date();
    b.timers.no_show_timer_started_at = new Date(); // Start 10 min timer
    b.gps_tracking.current_lat = body.lat;
    b.gps_tracking.current_lng = body.lng;
    b.state_history.push({ from: NursingBookingState.IN_TRANSIT, to: b.state, at: new Date() });
    await b.save();

    this.events.emit('patient.notify', { patientId: b.patient_id, type: 'nursing_arrived', message: 'الممرض بالباب', metadata: { bookingId: b.id } });

    return { success: true, state: b.state };
  }

  @Roles(UserRole.HOME_CARE, UserRole.NURSING, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('visits/:id/start-care')
  async startCare(@Param('id') id: string, @CurrentUser() user: any) {
    const b = await this.findAuthorizedBooking(id, user);
    
    b.state = NursingBookingState.CARE_IN_PROGRESS;
    b.timers.care_started_at = new Date();
    b.state_history.push({ from: NursingBookingState.ARRIVED, to: b.state, at: new Date() });
    await b.save();

    return { success: true, state: b.state };
  }

  @Roles(UserRole.HOME_CARE, UserRole.NURSING, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('visits/:id/no-show')
  async triggerNoShow(@Param('id') id: string, @CurrentUser() user: any) {
    const b = await this.findAuthorizedBooking(id, user);
    if (b.state !== NursingBookingState.ARRIVED) throw new BadRequestException('Must be arrived to trigger no-show');
    
    // Check 10-minute rule
    const elapsedMs = new Date().getTime() - (b.timers.no_show_timer_started_at?.getTime() || 0);
    if (elapsedMs < 10 * 60 * 1000) {
      throw new BadRequestException('Cannot trigger No-Show until 10 minutes have elapsed since arrival');
    }

    b.state = NursingBookingState.NO_SHOW;
    b.state_history.push({ from: NursingBookingState.ARRIVED, to: b.state, at: new Date() });
    await b.save();

    return { success: true, state: b.state };
  }

  @Roles(UserRole.HOME_CARE, UserRole.NURSING, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('visits/:id/emergency-abort')
  async triggerEmergency(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() user: any) {
    const b = await this.findAuthorizedBooking(id, user);
    const priorState = b.state;
    
    b.state = NursingBookingState.ESCALATED_EMERGENCY;
    b.emergency_escalation = { reason: body.reason, refunded_amount: b.total_price, at: new Date() };
    b.state_history.push({ from: priorState, to: NursingBookingState.ESCALATED_EMERGENCY, at: new Date() });
    await b.save();

    this.events.emit('patient.notify', { patientId: b.patient_id, type: 'nursing_emergency', message: 'تم إيقاف الخدمة لدواعٍ طبية - تم إرجاع المبلغ', metadata: { bookingId: b.id } });

    return { success: true, state: b.state };
  }

  @Roles(UserRole.HOME_CARE, UserRole.NURSING, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('visits/:id/complete')
  async completeVisit(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    const b = await this.findAuthorizedBooking(id, user);
    if (b.state !== NursingBookingState.CARE_IN_PROGRESS) {
      throw new BadRequestException('Visit must be in progress before completion');
    }
    if (body?.provider_attestation !== true) {
      throw new BadRequestException('Provider attestation is required before completion');
    }
    
    const { vitals, clinical_notes, recommendations, signature_base64 } = body;
    
    b.state = NursingBookingState.COMPLETED;
    b.timers.completed_at = new Date();
    b.vitals = vitals || b.vitals;
    b.clinical_notes = clinical_notes || b.clinical_notes;
    b.recommendations = recommendations || b.recommendations;
    b.patient_signature_base64 = signature_base64;
    b.provider_attestation = { provider_id: this.providerIdentity(user), provider_name: user.full_name, attested_at: new Date() };
    b.audit_trail.push({ action: 'visit_completed', timestamp: new Date(), userId: user.id });
    b.state_history.push({ from: NursingBookingState.CARE_IN_PROGRESS, to: b.state, at: new Date() });
    await b.save();

    this.events.emit('patient.notify', { patientId: b.patient_id, type: 'nursing_completed', message: 'اكتملت الخدمة - فضلاً قيم الممرض', metadata: { bookingId: b.id } });
    
    if (b.referring_doctor_id) {
       this.events.emit('doctor.notify', { doctorId: b.referring_doctor_id, type: 'nursing_report', message: 'اكتملت خطة التمريض المنزلي', metadata: { bookingId: b.id }});
    }

    return { success: true, state: b.state };
  }

  @Roles(UserRole.HOME_CARE, UserRole.NURSING, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('visits/:id/supply-requests')
  async requestVisitSupplies(@Param('id') id: string, @Body() body: { items?: { name: string; qty: number; unit: string }[] }, @CurrentUser() user: any) {
    const booking = await this.findAuthorizedBooking(id, user);
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length || items.some((item) => !item?.name?.trim() || !Number.isFinite(item.qty) || item.qty <= 0 || !item?.unit?.trim())) {
      throw new BadRequestException('Each supply item requires a name, positive quantity, and unit');
    }
    const request = {
      requested_at: new Date(),
      nurse_id: this.providerIdentity(user),
      items: items.map((item) => ({ name: item.name.trim(), qty: item.qty, unit: item.unit.trim(), status: 'PENDING' as const })),
    };
    booking.pending_supply_requests = [...(booking.pending_supply_requests || []), request];
    booking.audit_trail.push({ action: 'supply_requested', timestamp: new Date(), userId: user.id });
    await booking.save();
    return { success: true, request };
  }

  // 15. Wallet Accounting Ledger (محفظة الممرض)
  @Roles(UserRole.HOME_CARE, UserRole.NURSING, UserRole.NURSE, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('wallet')
  async getWalletData(@Query('provider_id') providerId: string, @CurrentUser() user: any) {
    const pId = this.isAdmin(user) && providerId ? providerId : this.providerIdentity(user);
    
    // Dynamically calculate from real bookings (Zero Placeholder validation)
    const bookings = await this.bkgModel.find({ provider_id: pId }).lean();
    
    let balance = 0;
    let pendingEscrow = 0;
    const transactions: any[] = [];

    for (const b of bookings) {
      if (b.state === NursingBookingState.COMPLETED) {
        const serviceFee = Number(b.service_fee || 0);
        balance += serviceFee;
        transactions.push({
          id: b.id + '-service',
          date: b.scheduled_at ? new Date(b.scheduled_at).toISOString() : null,
          amount: serviceFee,
          type: 'EARNING',
          title: `زيارة منزلية (طلب ${b.id})`
        });

        if (b.transportation_fee && b.transportation_fee > 0) {
          balance += b.transportation_fee;
          transactions.push({
            id: b.id + '-transport',
          date: b.scheduled_at ? new Date(b.scheduled_at).toISOString() : null,
            amount: b.transportation_fee,
            type: 'ALLOWANCE',
            title: `بدل مواصلات (طلب ${b.id})`
          });
        }
      } else {
        // Pending state bookings go to escrow
        pendingEscrow += Number(b.service_fee || 0);
      }
    }

    return {
      balance,
      pendingEscrow,
      transactions: transactions.reverse()
    };
  }
}
