import { Body, Controller, Delete, ForbiddenException, Get, Injectable, Module, NotFoundException, OnModuleInit, Param, Patch, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard, CurrentUser, Roles, Public } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { Doctor, DoctorSchema, DoctorAppointment, DoctorAppointmentSchema, DoctorChatMessage, DoctorChatMessageSchema, ConsultationNote, ConsultationNoteSchema, NotificationItem, NotificationItemSchema, AppointmentState } from './doctors.schemas';
import { EventBusService } from '../events/event-bus.service';

const SEED_DOCTORS = [
  { name_ar: 'د. أحمد السالم', name_en: 'Dr. Ahmed Al-Salem', specialty: 'general_medicine', specialty_ar: 'طب عام', gender: 'male', languages: ['ar', 'en'], consultation_fee: 80, home_visit_fee: 180, video_consultation_fee: 60, home_visit_enabled: true, video_enabled: true, voice_enabled: true, rating: 4.7, reviews_count: 128, insurance_supported: ['بوبا', 'التعاونية'], biography: 'استشاري طب أسرة بخبرة 15 سنة في الأمراض الشائعة والمزمنة.', tags: ['family', 'general'], clinic_location: { city: 'الرياض', name: 'مجمع نبض الطبي', lat: 24.7136, lng: 46.6753 } },
  { name_ar: 'د. سارة المطيري', specialty: 'pediatrics', specialty_ar: 'أطفال', gender: 'female', languages: ['ar', 'en'], consultation_fee: 120, video_consultation_fee: 90, home_visit_enabled: false, video_enabled: true, voice_enabled: true, rating: 4.9, reviews_count: 256, insurance_supported: ['بوبا', 'ميدغلف', 'التعاونية'], biography: 'استشارية أطفال وحديثي الولادة.', tags: ['kids', 'newborn'], clinic_location: { city: 'الرياض', name: 'مستشفى الأطفال' } },
  { name_ar: 'د. خالد الزهراني', specialty: 'cardiology', specialty_ar: 'قلب', gender: 'male', languages: ['ar'], consultation_fee: 200, home_visit_fee: 350, home_visit_enabled: true, video_enabled: false, voice_enabled: false, rating: 4.8, reviews_count: 89, insurance_supported: ['التعاونية'], biography: 'استشاري قلب وقسطرة.', tags: ['heart'], clinic_location: { city: 'جدة', name: 'مركز القلب' } },
  { name_ar: 'د. ليلى السبيعي', specialty: 'dermatology', specialty_ar: 'جلدية', gender: 'female', languages: ['ar', 'en'], consultation_fee: 150, video_consultation_fee: 100, home_visit_enabled: false, video_enabled: true, voice_enabled: false, rating: 4.6, reviews_count: 312, insurance_supported: ['بوبا', 'ميدغلف'], biography: 'استشارية جلدية وتجميل غير جراحي.', tags: ['skin', 'cosmetics'], clinic_location: { city: 'الرياض' } },
  { name_ar: 'د. عبدالعزيز الفهد', specialty: 'orthopedics', specialty_ar: 'عظام', gender: 'male', languages: ['ar'], consultation_fee: 180, home_visit_enabled: false, video_enabled: false, voice_enabled: true, rating: 4.5, reviews_count: 76, insurance_supported: ['التعاونية', 'سند'], biography: 'استشاري عظام ومفاصل.', tags: ['ortho'], clinic_location: { city: 'الدمام' } },
  { name_ar: 'د. نور القحطاني', specialty: 'gynecology', specialty_ar: 'نسائية وتوليد', gender: 'female', languages: ['ar', 'en'], consultation_fee: 160, video_consultation_fee: 110, home_visit_enabled: false, video_enabled: true, voice_enabled: true, rating: 4.9, reviews_count: 421, insurance_supported: ['بوبا', 'ميدغلف', 'التعاونية'], biography: 'استشارية نسائية وتوليد.', tags: ['women'], clinic_location: { city: 'الرياض' } },
];

const DEFAULT_SCHEDULE = {
  sun: [{ start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] }],
  mon: [{ start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] }],
  tue: [{ start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] }],
  wed: [{ start: '09:00', end: '17:00', breaks: [{ start: '12:00', end: '13:00' }] }],
  thu: [{ start: '09:00', end: '14:00' }],
};

function dayKey(d: Date) { return ['sun','mon','tue','wed','thu','fri','sat'][d.getDay()]; }
function toHM(d: Date) { return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function fromHM(date: Date, hm: string) { const [h, m] = hm.split(':').map(Number); const r = new Date(date); r.setHours(h, m, 0, 0); return r; }

@Injectable()
export class DoctorsService implements OnModuleInit {
  constructor(
    @InjectModel('Doctor') private doctors: Model<Doctor>,
    @InjectModel('DoctorAppointment') private appts: Model<DoctorAppointment>,
    @InjectModel('DoctorChatMessage') private msgs: Model<DoctorChatMessage>,
    @InjectModel('ConsultationNote') private notes: Model<ConsultationNote>,
    @InjectModel('NotificationItem') private notifs: Model<NotificationItem>,
    private bus: EventBusService,
  ) {}

  async onModuleInit() {
    const count = await this.doctors.countDocuments();
    if (count === 0) {
      for (const d of SEED_DOCTORS) await this.doctors.create({ ...d, weekly_schedule: DEFAULT_SCHEDULE });
    }
  }

  async pushNotification(recipient_account_id: string, recipient_role: string, type: string, title: string, body?: string, entity_type?: string, entity_id?: string, deep_link?: string) {
    try { await this.notifs.create({ recipient_account_id, recipient_role, type, title, body, entity_type, entity_id, deep_link }); } catch {}
  }

  async listDoctors(filter: any) {
    const q: any = { is_accepting: true, is_deleted: { $ne: true }, status: 'published' };
    if (filter.specialty) q.specialty = filter.specialty;
    if (filter.gender) q.gender = filter.gender;
    if (filter.home === '1') q.home_visit_enabled = true;
    if (filter.video === '1') q.video_enabled = true;
    if (filter.insurance) q.insurance_supported = filter.insurance;
    if (filter.insurance_company) q.insurance_supported = { $regex: new RegExp(filter.insurance_company, 'i') };
    if (filter.search) q.$or = [{ name_ar: { $regex: filter.search, $options: 'i' } }, { name_en: { $regex: filter.search, $options: 'i' } }, { specialty_ar: { $regex: filter.search, $options: 'i' } }];
    return this.doctors.find(q, { _id: 0, __v: 0 }).sort({ rating: -1, reviews_count: -1 }).limit(100).lean();
  }

  async doctorDetail(id: string) {
    const d = await this.doctors.findOne({ id, is_deleted: { $ne: true }, status: 'published' }, { _id: 0, __v: 0 }).lean();
    if (!d) throw new NotFoundException();
    return d;
  }

  async specialties() {
    const list = await this.doctors.distinct('specialty');
    const out: any[] = [];
    for (const sp of list) {
      const sample: any = await this.doctors.findOne({ specialty: sp }, { specialty_ar: 1 }).lean();
      const count = await this.doctors.countDocuments({ specialty: sp });
      out.push({ key: sp, label_ar: sample?.specialty_ar || sp, count });
    }
    return out;
  }

  async availableSlots(doctorId: string, date: string) {
    const doctor: any = await this.doctors.findOne({ id: doctorId }).lean();
    if (!doctor) throw new NotFoundException();
    const day = new Date(date);
    if (doctor.blocked_dates?.includes(date)) return [];
    const schedule = (doctor.weekly_schedule || DEFAULT_SCHEDULE)[dayKey(day)] || [];
    const dur = doctor.default_slot_minutes || 30;
    const slots: { time: string; available: boolean }[] = [];
    for (const block of schedule) {
      let cursor = fromHM(day, block.start);
      const end = fromHM(day, block.end);
      while (cursor < end) {
        const next = new Date(cursor.getTime() + dur * 60_000);
        if (next > end) break;
        const hm = toHM(cursor);
        const inBreak = (block.breaks || []).some((br: any) => hm >= br.start && hm < br.end);
        if (!inBreak && cursor.getTime() > Date.now()) slots.push({ time: cursor.toISOString(), available: true });
        cursor = next;
      }
    }
    // Mark booked
    const existing = await this.appts.find({ doctor_id: doctorId, scheduled_at: { $gte: new Date(day.setHours(0,0,0,0)), $lt: new Date(day.setHours(23,59,59,999)) }, state: { $nin: ['cancelled', 'no_show'] } }).lean();
    const bookedMap: Record<string, number> = {};
    for (const a of existing) bookedMap[a.scheduled_at.toISOString()] = (bookedMap[a.scheduled_at.toISOString()] || 0) + 1;
    return slots.map(s => ({ ...s, available: (bookedMap[s.time] || 0) < (doctor.max_bookings_per_slot || 1) }));
  }

  /** Atomic-ish booking via dup index check (best effort under no transactions). */
  async book(user: any, data: any) {
    if (!data.doctor_id || !data.scheduled_at || !data.type) throw new BadRequestException('missing_fields');
    const doctor: any = await this.doctors.findOne({ id: data.doctor_id }).lean();
    if (!doctor) throw new NotFoundException('doctor_not_found');
    if (!doctor.is_accepting) throw new BadRequestException('doctor_not_accepting');
    const scheduledAt = new Date(data.scheduled_at);
    // Slot validity
    const sameSlot = await this.appts.countDocuments({ doctor_id: data.doctor_id, scheduled_at: scheduledAt, state: { $nin: ['cancelled', 'no_show'] } });
    if (sameSlot >= (doctor.max_bookings_per_slot || 1)) throw new BadRequestException('slot_full');
    const feeMap: Record<string, number> = { clinic: doctor.consultation_fee, home: doctor.home_visit_fee, video: doctor.video_consultation_fee || doctor.consultation_fee, voice: doctor.video_consultation_fee || doctor.consultation_fee };
    const fee = feeMap[data.type] || doctor.consultation_fee;
    const appt = await this.appts.create({
      doctor_id: data.doctor_id,
      patient_id: user.id,
      patient_name: data.contact?.name || user.full_name,
      patient_phone: data.contact?.phone || user.phone,
      type: data.type,
      scheduled_at: scheduledAt,
      duration_minutes: doctor.default_slot_minutes || 30,
      fee,
      payment_method: data.payment_method || 'cash',
      insurance_provider: data.insurance_provider,
      insurance_status: data.payment_method === 'insurance' ? 'pending' : 'none',
      documents: Array.isArray(data.documents) ? data.documents : [],
      reason: data.reason,
      address: data.address,
      state: 'scheduled',
      state_history: [{ from: '', to: 'scheduled', by: user.id, at: new Date() }],
    });
    this.bus.emit({ type: 'doctor_appointment.created', entity_type: 'doctor_appointment', entity_id: appt.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: user.id, pharmacy_account_id: doctor.provider_account_id, meta: { doctor_id: doctor.id, type: data.type, fee } }).catch(() => null);
    await this.pushNotification(doctor.provider_account_id || doctor.id, 'provider', 'doctor.new_appointment', 'موعد جديد', `${appt.patient_name} · ${data.type}`, 'doctor_appointment', appt.id, `/(provider)/control/doctor-inbox`);
    await this.pushNotification(user.id, 'patient', 'doctor.booking_confirmed', 'تم تأكيد طلب الموعد', doctor.name_ar, 'doctor_appointment', appt.id, `/doctors/appointment/${appt.id}`);
    return appt.toObject();
  }

  async myAppointments(user: any) {
    return this.appts.find({ patient_id: user.id }, { _id: 0, __v: 0 }).sort({ scheduled_at: -1 }).limit(100).lean();
  }

  async doctorInbox(user: any, status?: string) {
    if (!['provider', 'doctor', 'admin'].includes(user.role)) throw new ForbiddenException();
    const doctorIds = (await this.doctors.find({ account_id: user.id }, { id: 1 }).lean()).map((d: any) => d.id);
    const q: any = user.role === 'admin' ? {} : { doctor_id: { $in: doctorIds } };
    if (status) q.state = status;
    return this.appts.find(q, { _id: 0, __v: 0 }).sort({ scheduled_at: 1 }).limit(200).lean();
  }

  async transition(user: any, id: string, to: AppointmentState) {
    const a = await this.appts.findOne({ id });
    if (!a) throw new NotFoundException();
    if (user.role === 'patient' && a.patient_id !== user.id) throw new ForbiddenException();
    a.state_history.push({ from: a.state, to, by: user.id, at: new Date() });
    a.state = to;
    await a.save();
    this.bus.emit({ type: `doctor_appointment.${to}`, entity_type: 'doctor_appointment', entity_id: a.id, actor_account_id: user.id, actor_role: user.role, patient_account_id: a.patient_id, meta: { doctor_id: a.doctor_id } }).catch(() => null);
    if (to === 'cancelled') await this.pushNotification(a.patient_id, 'patient', 'doctor.cancelled', 'تم إلغاء الموعد', a.patient_name);
    if (to === 'confirmed') await this.pushNotification(a.patient_id, 'patient', 'doctor.confirmed', 'تم تأكيد الموعد', a.patient_name);
    return a.toObject();
  }

  async appointmentDetail(user: any, id: string) {
    const a: any = await this.appts.findOne({ id }, { _id: 0, __v: 0 }).lean();
    if (!a) throw new NotFoundException();
    if (user.role === 'patient' && a.patient_id !== user.id) throw new ForbiddenException();
    const doctor = await this.doctors.findOne({ id: a.doctor_id }, { _id: 0, __v: 0 }).lean();
    const note = await this.notes.findOne({ appointment_id: id }, { _id: 0, __v: 0 }).lean();
    return { ...a, doctor, consultation_note: note };
  }

  // ===== CHAT =====
  async listMessages(user: any, appointment_id: string) {
    const a: any = await this.appts.findOne({ id: appointment_id }).lean();
    if (!a) throw new NotFoundException();
    if (user.role === 'patient' && a.patient_id !== user.id) throw new ForbiddenException();
    return this.msgs.find({ appointment_id }, { _id: 0, __v: 0 }).sort({ createdAt: 1 }).lean();
  }

  async postMessage(user: any, appointment_id: string, text: string) {
    if (!text?.trim()) throw new BadRequestException('empty');
    if (/\b\d{8,}\b/.test(text) || /https?:\/\//i.test(text) || /(whatsapp|telegram|واتساب|تيلي)/i.test(text)) throw new BadRequestException('content_blocked');
    const a: any = await this.appts.findOne({ id: appointment_id }).lean();
    if (!a) throw new NotFoundException();
    return this.msgs.create({ appointment_id, sender_account_id: user.id, sender_role: user.role, text });
  }

  // ===== CONSULTATION NOTE =====
  async upsertNote(user: any, appointment_id: string, body: any) {
    if (!['provider', 'doctor', 'admin'].includes(user.role)) throw new ForbiddenException();
    const a: any = await this.appts.findOne({ id: appointment_id });
    if (!a) throw new NotFoundException();
    const exists = await this.notes.findOne({ appointment_id });
    if (exists) {
      Object.assign(exists, body);
      await exists.save();
    } else {
      await this.notes.create({ appointment_id, doctor_id: a.doctor_id, patient_id: a.patient_id, ...body });
    }
    await this.pushNotification(a.patient_id, 'patient', 'doctor.prescription_ready', 'تم إصدار التقرير والوصفة', '', 'doctor_appointment', a.id, `/doctors/appointment/${a.id}`);
    return this.notes.findOne({ appointment_id }).lean();
  }

  // ===== NOTIFICATIONS =====
  async listNotifications(user: any) {
    return this.notifs.find({ recipient_account_id: user.id }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean();
  }

  async unreadCount(user: any) {
    const c = await this.notifs.countDocuments({ recipient_account_id: user.id, read: false });
    return { count: c };
  }

  async markRead(user: any, id: string) {
    await this.notifs.findOneAndUpdate({ id, recipient_account_id: user.id }, { $set: { read: true } });
    return { ok: true };
  }

  async markAllRead(user: any) {
    await this.notifs.updateMany({ recipient_account_id: user.id, read: false }, { $set: { read: true } });
    return { ok: true };
  }

  // ===== PROVIDER AVAILABILITY =====
  async setAvailability(user: any, data: { is_online?: boolean; is_accepting?: boolean }) {
    if (!['provider', 'doctor'].includes(user.role)) throw new ForbiddenException();
    const $set: any = {};
    if (typeof data.is_online === 'boolean') $set.is_online = data.is_online;
    if (typeof data.is_accepting === 'boolean') $set.is_accepting = data.is_accepting;
    const r = await this.doctors.updateMany({ account_id: user.id }, { $set });
    this.bus.emit({ type: 'provider.availability_changed', entity_type: 'provider', entity_id: user.id, actor_account_id: user.id, actor_role: user.role, meta: $set }).catch(() => null);
    return { ok: true, updated: r.modifiedCount };
  }
}

@Controller('doctors')
@UseGuards(JwtAuthGuard)
export class DoctorsController {
  constructor(private svc: DoctorsService) {}

  @Public() @Get('') list(@Query() q: any) { return this.svc.listDoctors(q); }
  @Public() @Get('specialties') specs() { return this.svc.specialties(); }
  @Public() @Get(':id') detail(@Param('id') id: string) { return this.svc.doctorDetail(id); }
  @Public() @Get(':id/slots') slots(@Param('id') id: string, @Query('date') date: string) { return this.svc.availableSlots(id, date); }

  @Post('appointments') book(@Body() body: any, @CurrentUser() user: any) { return this.svc.book(user, body); }
  @Get('appointments/mine') mine(@CurrentUser() user: any) { return this.svc.myAppointments(user); }
  @Get('appointments/inbox') inbox(@Query('status') s: string | undefined, @CurrentUser() user: any) { return this.svc.doctorInbox(user, s); }
  @Get('appointments/:id') ap(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.appointmentDetail(user, id); }
  @Patch('appointments/:id/state') tr(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) { return this.svc.transition(user, id, body.state); }

  @Get('appointments/:id/messages') msgs(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.listMessages(user, id); }
  @Post('appointments/:id/messages') postMsg(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) { return this.svc.postMessage(user, id, body.text); }
  @Post('appointments/:id/note') note(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) { return this.svc.upsertNote(user, id, body); }

  @Patch('availability') avail(@Body() body: any, @CurrentUser() user: any) { return this.svc.setAvailability(user, body); }
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private svc: DoctorsService) {}
  @Get('') list(@CurrentUser() user: any) { return this.svc.listNotifications(user); }
  @Get('unread-count') unread(@CurrentUser() user: any) { return this.svc.unreadCount(user); }
  @Patch(':id/read') mr(@Param('id') id: string, @CurrentUser() user: any) { return this.svc.markRead(user, id); }
  @Post('mark-all-read') mar(@CurrentUser() user: any) { return this.svc.markAllRead(user); }
}

@Module({
  imports: [MongooseModule.forFeature([
    { name: 'Doctor', schema: DoctorSchema },
    { name: 'DoctorAppointment', schema: DoctorAppointmentSchema },
    { name: 'DoctorChatMessage', schema: DoctorChatMessageSchema },
    { name: 'ConsultationNote', schema: ConsultationNoteSchema },
    { name: 'NotificationItem', schema: NotificationItemSchema },
  ])],
  controllers: [DoctorsController, NotificationsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
