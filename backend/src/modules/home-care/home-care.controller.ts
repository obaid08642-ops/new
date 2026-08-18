import { Controller, Get, Param, Post, Put, Delete, Query, UseGuards, Body, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { JwtAuthGuard, Public, CurrentUser } from '../../common/auth.guard';
import { ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuid } from 'uuid';
import { HomeCareBooking, NursingBookingState, HomeCareService, NurseProvider } from '../../schemas/home-care.schema';

@UseGuards(JwtAuthGuard)
@Controller('nursing')
export class NursingController {
  constructor(
    @InjectModel('HomeCareBooking') private readonly bkgModel: Model<HomeCareBooking>,
    @InjectModel('HomeCareService') private readonly serviceModel: Model<HomeCareService>,
    @InjectModel('NurseProvider') private readonly nurseModel: Model<NurseProvider>,
    @InjectConnection() private readonly conn: Connection,
    private readonly events: EventEmitter2,
  ) {}

  private isAdmin(user: any): boolean {
    return user?.role === 'admin' || user?.role === 'super_admin';
  }

  private isNursingProvider(user: any): boolean {
    return ['nurse', 'nursing', 'home_care', 'hospital', 'provider'].includes(String(user?.role || '').toLowerCase())
      || ['nurse', 'nursing', 'home_care', 'hospital'].includes(String(user?.provider_type || user?.providerType || '').toLowerCase());
  }

  private async findVisit(id: string): Promise<any> {
    const b = await this.bkgModel.findOne({ id });
    if (!b) throw new NotFoundException('Visit not found');
    return b;
  }

  private assertReadAccess(b: any, user: any): void {
    if (this.isAdmin(user)) return;
    if (b.patient_id === user?.id) return;
    if (this.isNursingProvider(user) && b.provider_id === user?.id) return;
    throw new ForbiddenException('visit access denied');
  }

  private assertProviderMutation(b: any, user: any, allowUnassigned = false): void {
    if (this.isAdmin(user)) return;
    if (!this.isNursingProvider(user)) throw new ForbiddenException('nursing provider role required');
    if (b.provider_id !== user?.id && !(allowUnassigned && !b.provider_id)) {
      throw new ForbiddenException('visit is not assigned to this provider');
    }
  }

  // ---- Nursing progress notes (vitals + clinical note per patient) ----
  @Post('notes')
  async createNote(@CurrentUser() u: any, @Body() body: any) {
    const patientId = String(body?.patient_id || '').trim();
    const bookingId = String(body?.booking_id || '').trim();
    if (!patientId || !bookingId) throw new BadRequestException('patient_id and booking_id are required');
    const booking: any = await this.findVisit(bookingId);
    if (booking.patient_id !== patientId) throw new BadRequestException('patient/booking mismatch');
    this.assertProviderMutation(booking, u);
    const note = String(body?.note || '').trim().slice(0, 4000);
    if (!note) throw new BadRequestException('note is required');
    const vitals: any = {};
    for (const k of ['bp', 'pulse', 'temp', 'spo2', 'glucose']) {
      if (body?.vitals?.[k]) vitals[k] = String(body.vitals[k]).slice(0, 20);
    }
    const doc = {
      id: uuid(),
      patient_id: patientId,
      nurse_id: u.id,
      booking_id: bookingId,
      note,
      vitals,
      createdAt: new Date(),
    };
    await this.conn.db.collection('nursing_notes').insertOne(doc as any);
    const { _id, ...rest } = doc as any;
    return rest;
  }

  @Get('notes/:patientId')
  async listNotes(@CurrentUser() u: any, @Param('patientId') patientId: string): Promise<any[]> {
    if (!this.isAdmin(u) && u?.id !== patientId) {
      if (!this.isNursingProvider(u)) throw new ForbiddenException('notes access denied');
      const assigned = await this.bkgModel.findOne({ patient_id: patientId, provider_id: u.id });
      if (!assigned) throw new ForbiddenException('notes access denied');
    }
    return this.conn.db.collection('nursing_notes')
      .find({ patient_id: patientId }, { projection: { _id: 0 } } as any)
      .sort({ createdAt: -1 }).limit(100).toArray();
  }

  // 1. SERVICES CATALOG (Pillar 2)
  @Public() @Get('catalog')
  async getCatalog() {
    return this.serviceModel.find({ active: true, is_deleted: { $ne: true } }).lean();
  }

  // --- Admin Catalog CRUD (nursing/home-care services) ---
  @Post('admin/catalog')
  async createCatalog(@CurrentUser() u: any, @Body() b: any) {
    if (u.role !== 'admin' && u.role !== 'super_admin') throw new NotFoundException();
    // Whitelist mass-assignable fields — never trust the raw body.
    const allowed = ['name_ar','name_en','description_ar','description_en','category','price','duration','duration_value','icon','image_url','active','requires_companion','requires_patient_medication','cash_availability','insurance_availability'];
    const doc: any = { id: uuid() };
    for (const k of allowed) if (k in (b || {})) doc[k] = b[k];
    return this.serviceModel.create(doc);
  }

  @Put('admin/catalog/:id')
  async updateCatalog(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    if (u.role !== 'admin' && u.role !== 'super_admin') throw new NotFoundException();
    const allowed = ['name_ar','name_en','description_ar','description_en','category','price','duration','duration_value','icon','image_url','active','requires_companion','requires_patient_medication','cash_availability','insurance_availability'];
    const set: any = {};
    for (const k of allowed) if (k in (b || {})) set[k] = b[k];
    const updated = await this.serviceModel.findOneAndUpdate({ id }, { $set: set }, { new: true });
    if (!updated) throw new NotFoundException();
    return updated;
  }

  @Delete('admin/catalog/:id')
  async deleteCatalog(@CurrentUser() u: any, @Param('id') id: string) {
    if (u.role !== 'admin' && u.role !== 'super_admin') throw new NotFoundException();
    // Soft delete — bookings may reference this service historically.
    const updated = await this.serviceModel.findOneAndUpdate({ id }, { $set: { is_deleted: true, active: false } }, { new: true });
    if (!updated) throw new NotFoundException();
    return { ok: true };
  }

  // 2. FETCH ACTIVE VISITS (Pillar 3)
  @Get('visits')
  async getVisits(@Query('provider_id') provider_id: string, @CurrentUser() user: any) {
    if (!this.isAdmin(user) && !this.isNursingProvider(user)) throw new ForbiddenException('nursing provider role required');
    const pId = this.isAdmin(user) ? (provider_id || undefined) : user.id;
    return this.bkgModel.find(pId ? { provider_id: pId } : {}).sort({ scheduled_at: 1 }).lean();
  }
  
  @Get('visits/:id')
  async getVisitById(@Param('id') id: string, @CurrentUser() user: any) {
    const v: any = await this.findVisit(id);
    this.assertReadAccess(v, user);
    return v.toObject ? v.toObject() : v;
  }

  // 3. FIELD-OPS STATE MACHINE (Pillar 4 & 5)
  
  @Get('visits/:id/tracking')
  async getVisitTracking(@Param('id') id: string, @CurrentUser() user: any) {
    const b: any = await this.findVisit(id);
    this.assertReadAccess(b, user);

    const destLat = b.patient_location?.lat ?? null;
    const destLng = b.patient_location?.lng ?? null;
    const curLat = b.gps_tracking?.current_lat ?? null;
    const curLng = b.gps_tracking?.current_lng ?? null;

    // ETA only computable when both nurse position and destination are known.
    // Straight-line distance at 30 km/h average urban speed — honest estimate, null otherwise.
    let eta: number | null = null;
    if (curLat != null && curLng != null && destLat != null && destLng != null) {
      const km = this.haversineKm(curLat, curLng, destLat, destLng);
      eta = Math.max(1, Math.round((km / 30) * 60));
    }

    return {
      booking_id: b.id,
      nurse_phone: b.provider_phone || null,
      hospital_lat: destLat,
      hospital_lng: destLng,
      current_lat: curLat,
      current_lng: curLng,
      eta_minutes: eta,
      status: b.state,
      // Clinical report — present only after the visit report was submitted
      vitals: (b as any).vitals && Object.keys((b as any).vitals).length ? (b as any).vitals : null,
      notes: (b as any).clinical_notes || null,
    };
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  @Post('visits/:id/respond')
  async respondToVisit(@Param('id') id: string, @Body() body: { accept: boolean }, @CurrentUser() user: any) {
    const b: any = await this.findVisit(id);
    if (typeof body?.accept !== 'boolean') throw new BadRequestException('accept (boolean) is required');
    this.assertProviderMutation(b, user, true);
    const from = b.state;
    if (body.accept) {
      b.provider_id = user.id;
      b.state = NursingBookingState.CONFIRMED;
    } else {
      b.state = NursingBookingState.NEW_REQUEST;
      b.provider_id = undefined;
    }
    b.state_history.push({ from, to: b.state, by_user_id: user.id, note: body.accept ? undefined : 'Rejected by provider', at: new Date() });
    await b.save();
    return { success: true, state: b.state };
  }

  @Post('visits/:id/transit')
  async startTransit(@Param('id') id: string, @CurrentUser() user: any) {
    const b: any = await this.findVisit(id);
    this.assertProviderMutation(b, user);
    if (b.state !== NursingBookingState.CONFIRMED) throw new BadRequestException('Invalid state transition');
    
    b.state = NursingBookingState.IN_TRANSIT;
    b.timers.transit_started_at = new Date();
    b.markModified('timers'); // Mixed Object: nested writes are untracked without this
    b.state_history.push({ from: NursingBookingState.CONFIRMED, to: b.state, at: new Date() });
    await b.save();

    // Emitting live GPS sync event for Patient App (Pillar 7.1)
    this.events.emit('patient.notify', { patientId: b.patient_id, type: 'nursing_transit', message: 'الممرض في الطريق إليك', metadata: { bookingId: b.id } });
    
    return { success: true, state: b.state };
  }

  @Post('visits/:id/arrive')
  async arriveAtPatient(@Param('id') id: string, @Body() body: { lat: number, lng: number }, @CurrentUser() user: any) {
    const b: any = await this.findVisit(id);
    this.assertProviderMutation(b, user);
    
    if (!Number.isFinite(body?.lat) || !Number.isFinite(body?.lng) || body.lat < -90 || body.lat > 90 || body.lng < -180 || body.lng > 180) {
      throw new BadRequestException('valid lat/lng required');
    }
    // Strict Geofencing check (< 500m logic in actual implementation)
    const patientLat = b.address?.lat;
    const patientLng = b.address?.lng;
    
    if (Number.isFinite(patientLat) && Number.isFinite(patientLng)) {
      // Simplified distance check (using 500m logic roughly)
      const dist = Math.sqrt(Math.pow(patientLat - body.lat, 2) + Math.pow(patientLng - body.lng, 2));
      if (dist > 0.005) { // Roughly 500m in degrees
        throw new BadRequestException('You are not close enough to the patient location (< 500m)');
      }
    }

    b.state = NursingBookingState.ARRIVED;
    b.timers.arrived_at = new Date();
    b.timers.no_show_timer_started_at = new Date(); // Start 10 min timer
    b.markModified('timers');
    b.gps_tracking.current_lat = body.lat;
    b.gps_tracking.current_lng = body.lng;
    b.markModified('gps_tracking');
    b.state_history.push({ from: NursingBookingState.IN_TRANSIT, to: b.state, at: new Date() });
    await b.save();

    this.events.emit('patient.notify', { patientId: b.patient_id, type: 'nursing_arrived', message: 'الممرض بالباب', metadata: { bookingId: b.id } });

    return { success: true, state: b.state };
  }

  @Post('visits/:id/start-care')
  async startCare(@Param('id') id: string, @CurrentUser() user: any) {
    const b: any = await this.findVisit(id);
    this.assertProviderMutation(b, user);
    
    if (b.state !== NursingBookingState.ARRIVED) throw new BadRequestException('Invalid state transition');
    const from = b.state;
    b.state = NursingBookingState.CARE_IN_PROGRESS;
    b.timers.care_started_at = new Date();
    b.markModified('timers');
    b.state_history.push({ from, to: b.state, at: new Date() });
    await b.save();

    return { success: true, state: b.state };
  }

  @Post('visits/:id/no-show')
  async triggerNoShow(@Param('id') id: string, @CurrentUser() user: any) {
    const b: any = await this.findVisit(id);
    this.assertProviderMutation(b, user);
    if (b.state !== NursingBookingState.ARRIVED) throw new BadRequestException('Must be arrived to trigger no-show');
    
    // Check 10-minute rule
    const startedAt = b.timers?.no_show_timer_started_at ? new Date(b.timers.no_show_timer_started_at).getTime() : 0;
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs < 10 * 60 * 1000) {
      throw new BadRequestException('Cannot trigger No-Show until 10 minutes have elapsed since arrival');
    }

    b.state = NursingBookingState.NO_SHOW;
    b.state_history.push({ from: NursingBookingState.ARRIVED, to: b.state, at: new Date() });
    await b.save();

    return { success: true, state: b.state };
  }

  @Post('visits/:id/emergency-abort')
  async triggerEmergency(@Param('id') id: string, @Body() body: { reason: string }, @CurrentUser() user: any) {
    const b: any = await this.findVisit(id);
    this.assertProviderMutation(b, user);
    if (!String(body?.reason || '').trim()) throw new BadRequestException('reason is required');
    if (![NursingBookingState.IN_TRANSIT, NursingBookingState.ARRIVED, NursingBookingState.CARE_IN_PROGRESS].includes(b.state)) throw new BadRequestException('Invalid state transition');
    const from = b.state;
    b.state = NursingBookingState.ESCALATED_EMERGENCY;
    b.emergency_escalation = { reason: String(body.reason).trim().slice(0, 1000), refunded_amount: 0, refund_status: 'pending_finance_review', at: new Date() };
    b.state_history.push({ from, to: NursingBookingState.ESCALATED_EMERGENCY, at: new Date() });
    await b.save();

    this.events.emit('patient.notify', { patientId: b.patient_id, type: 'nursing_emergency', message: 'تم إيقاف الخدمة لدواعٍ طبية - ستتم مراجعة الاسترداد مالياً', metadata: { bookingId: b.id, refund_status: 'pending_finance_review' } });

    return { success: true, state: b.state };
  }

  @Post('visits/:id/complete')
  async completeVisit(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    const b: any = await this.findVisit(id);
    this.assertProviderMutation(b, user);
    if (b.state !== NursingBookingState.CARE_IN_PROGRESS) throw new BadRequestException('Invalid state transition');
    const from = b.state;
    const { vitals, clinical_notes, recommendations, signature_base64 } = body;
    
    b.state = NursingBookingState.COMPLETED;
    b.timers.completed_at = new Date();
    b.markModified('timers');
    b.vitals = vitals || b.vitals;
    b.clinical_notes = clinical_notes || b.clinical_notes;
    b.recommendations = recommendations || b.recommendations;
    b.patient_signature_base64 = signature_base64;
    b.state_history.push({ from, to: b.state, at: new Date() });
    await b.save();

    this.events.emit('patient.notify', { patientId: b.patient_id, type: 'nursing_completed', message: 'اكتملت الخدمة - فضلاً قيم الممرض', metadata: { bookingId: b.id } });
    
    if (b.referring_doctor_id) {
       this.events.emit('doctor.notify', { doctorId: b.referring_doctor_id, type: 'nursing_report', message: 'اكتملت خطة التمريض المنزلي', metadata: { bookingId: b.id }});
    }

    return { success: true, state: b.state };
  }

  // 15. Wallet Accounting Ledger (محفظة الممرض)
  @Get('wallet')
  async getWalletData(@CurrentUser() user: any, @Query('provider_id') providerId?: string) {
    // Ownership enforced: providers see only their own wallet; only admin/super_admin
    // may inspect another provider's ledger. No fabricated default provider.
    const isStaff = user?.role === 'admin' || user?.role === 'super_admin';
    if (!isStaff && !this.isNursingProvider(user)) throw new ForbiddenException('nursing provider role required');
    const pId = isStaff && providerId ? providerId : user?.id;
    if (!pId) throw new BadRequestException('provider context required');
    
    // Dynamically calculate from real bookings (Zero Placeholder validation)
    const bookings = await this.bkgModel.find({ provider_id: pId }).lean();
    
    let balance = 0;
    let pendingEscrow = 0;
    const transactions: any[] = [];
    const realAmount = (b: any) => {
      const n = Number(b?.service_fee ?? b?.total_price ?? b?.total ?? b?.price ?? 0);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };

    for (const b of bookings) {
      const amount = realAmount(b);
      if (b.state === NursingBookingState.COMPLETED) {
        balance += amount;
        transactions.push({
          id: b.id + '-service',
          date: b.scheduled_at ? new Date(b.scheduled_at).toISOString().slice(0, 16).replace('T', ' ') : new Date((b as any).createdAt || Date.now()).toISOString().slice(0, 16).replace('T', ' '),
          amount,
          type: 'EARNING',
          title: `زيارة منزلية (طلب ${b.id})`
        });

        if (b.transportation_fee && b.transportation_fee > 0) {
          balance += b.transportation_fee;
          transactions.push({
            id: b.id + '-transport',
            date: b.scheduled_at ? new Date(b.scheduled_at).toISOString().slice(0, 16).replace('T', ' ') : new Date((b as any).createdAt || Date.now()).toISOString().slice(0, 16).replace('T', ' '),
            amount: b.transportation_fee,
            type: 'ALLOWANCE',
            title: `بدل مواصلات (طلب ${b.id})`
          });
        }
      } else {
        // Pending state bookings go to escrow; no synthetic amount is invented.
        pendingEscrow += amount;
      }
    }

    return {
      balance,
      pendingEscrow,
      transactions: transactions.reverse(),
    };
  }
}
