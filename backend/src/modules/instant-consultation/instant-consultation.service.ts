import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Connection } from 'mongoose';
import { recordAudit } from '../../common/audit-record';
import { InstantRequestDto } from './instant-consultation.dto';

// M8 — instant consultation (docs/product/ORDERING_MODEL_2026-10-16.md phase M8). A patient broadcasts a request for a
// specialty to the online doctors of that specialty. The first doctor to accept gets the visit (an atomic claim), the others
// are told it is taken. Nothing is charged before a doctor accepts. If nobody accepts before the timeout the request expires
// and the patient is offered the earliest slot or a refund.

type Mode = 'video' | 'audio';
type Status = 'broadcasting' | 'accepted' | 'expired' | 'cancelled';
interface InstantRequest {
  id: string;
  patient_id: string;
  family_member_id: string | null;
  specialty: string;
  mode: Mode;
  status: Status;
  expires_at: Date;
  created_at: Date;
  notified_doctor_ids: string[];
  declined_by: string[];
  accepted_by?: string;
  appointment_id?: string;
}
interface ProfileRow { id: string; specialty?: string; status?: string; price_video?: number; price_audio?: number }

const MODES: Mode[] = ['video', 'audio'];
const DEFAULT_TIMEOUT_SECONDS = 180;
const bad = (code: string) => new BadRequestException(code);

@Injectable()
export class InstantConsultationService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private requests() { return this.conn.collection('instant_consultations'); }
  private availability() { return this.conn.collection('doctor_instant_availability'); }
  private profiles() { return this.conn.collection('provider_profiles'); }

  private async timeoutSeconds(): Promise<number> {
    const doc = await this.conn.collection('system_configs').findOne({ key: 'instant_consultation_timeout_seconds' }) as { value?: unknown } | null;
    const v = doc?.value;
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : DEFAULT_TIMEOUT_SECONDS;
  }

  private async isOnline(doctorId: string): Promise<boolean> {
    const row = await this.availability().findOne({ doctor_id: doctorId }) as { online?: boolean } | null;
    return row?.online === true;
  }

  private async profileOf(doctorId: string): Promise<ProfileRow | null> {
    return this.profiles().findOne({ id: doctorId }) as unknown as Promise<ProfileRow | null>;
  }

  // ---------- doctor availability ----------

  async setAvailability(user: { id: string }, available: boolean) {
    const profile = await this.profileOf(user.id);
    if (!profile) throw new ForbiddenException('doctor_profile_required');
    await this.availability().updateOne(
      { doctor_id: user.id },
      { $set: { online: available, updated_at: new Date() }, $setOnInsert: { doctor_id: user.id } },
      { upsert: true },
    );
    return { available };
  }

  // ---------- patient ----------

  /** Specialty and mode checked first; the broadcast happens only when an online doctor of the specialty exists. */
  async create(user: { id: string }, body: InstantRequestDto) {
    const specialty = typeof body.specialty === 'string' ? body.specialty.trim() : '';
    if (!specialty) throw bad('instant_specialty_required');
    if (!MODES.includes(body.mode as Mode)) throw bad('instant_mode_invalid');
    const mode = body.mode as Mode;

    let familyMemberId: string | null = null;
    if (body.family_member_id) {
      const member = await this.conn.collection('family_members').findOne({
        id: body.family_member_id, $or: [{ user_id: user.id }, { patient_id: user.id }],
      }, { projection: { _id: 1 } });
      if (!member) throw new NotFoundException('family_member_not_found');
      familyMemberId = body.family_member_id;
    }

    const now = new Date();
    const open = await this.requests().findOne({ patient_id: user.id, status: 'broadcasting', expires_at: { $gt: now } }, { projection: { _id: 1 } });
    if (open) throw new ConflictException('instant_request_open');

    const online = await this.availability().find({ online: true }).toArray() as unknown as Array<{ doctor_id: string }>;
    const candidates = await this.profiles().find({
      id: { $in: online.map((o) => o.doctor_id) }, specialty, status: 'active',
    }, { projection: { id: 1 } }).toArray() as unknown as Array<{ id: string }>;
    const notified = candidates.map((c) => c.id);
    if (notified.length === 0) {
      // Nothing is created. The patient is offered the earliest slot (none is computed here yet) or other doctors.
      throw new ConflictException({ message: 'instant_no_online_doctors', earliest_slot: null, alternatives: [] });
    }

    const expiresAt = new Date(now.getTime() + (await this.timeoutSeconds()) * 1000);
    const doc: InstantRequest = {
      id: randomUUID(), patient_id: user.id, family_member_id: familyMemberId, specialty, mode, status: 'broadcasting',
      expires_at: expiresAt, created_at: now, notified_doctor_ids: notified, declined_by: [],
    };
    await this.requests().insertOne(doc as unknown as Record<string, unknown>);
    await recordAudit(this.conn, { action: 'instant_consultation.broadcast', user_id: user.id, role: 'patient', resource_kind: 'instant_consultation', resource_id: doc.id, details: { specialty, mode, doctors_notified: notified.length } });
    return { id: doc.id, status: 'broadcasting', expires_at: expiresAt, doctors_notified: notified.length, payment_status: 'not_charged' };
  }

  /** Reads the request; a broadcast past its timeout is recorded as expired (nothing was charged). */
  private async current(id: string): Promise<InstantRequest> {
    const doc = await this.requests().findOne({ id }) as unknown as InstantRequest | null;
    if (!doc) throw new NotFoundException('instant_request_not_found');
    if (doc.status === 'broadcasting' && new Date(doc.expires_at).getTime() <= Date.now()) {
      await this.requests().updateOne({ id, status: 'broadcasting' }, { $set: { status: 'expired' } });
      return { ...doc, status: 'expired' };
    }
    return doc;
  }

  private view(doc: InstantRequest) {
    const left = Math.max(0, Math.ceil((new Date(doc.expires_at).getTime() - Date.now()) / 1000));
    return {
      id: doc.id,
      status: doc.status,
      specialty: doc.specialty,
      mode: doc.mode,
      expires_at: doc.expires_at,
      seconds_left: doc.status === 'broadcasting' ? left : 0,
      payment_status: 'not_charged',
      ...(doc.accepted_by ? { accepted_by: doc.accepted_by } : {}),
      ...(doc.appointment_id ? { appointment_id: doc.appointment_id } : {}),
      ...(doc.status === 'expired' ? { fallback: { options: ['earliest_slot', 'refund'], earliest_slot: null } } : {}),
    };
  }

  async get(user: { id: string }, id: string) {
    const doc = await this.current(id);
    if (doc.patient_id !== user.id) throw new NotFoundException('instant_request_not_found');
    return this.view(doc);
  }

  async cancel(user: { id: string }, id: string) {
    const doc = await this.current(id);
    if (doc.patient_id !== user.id) throw new NotFoundException('instant_request_not_found');
    if (doc.status === 'accepted') throw new ConflictException('instant_already_accepted');
    if (doc.status === 'broadcasting') {
      await this.requests().updateOne({ id, status: 'broadcasting' }, { $set: { status: 'cancelled' } });
      return this.view({ ...doc, status: 'cancelled' });
    }
    return this.view(doc);
  }

  // ---------- doctor ----------

  /** Open requests of the doctor's specialty that the doctor was told about, while the doctor is online. */
  async openForDoctor(user: { id: string }) {
    if (!(await this.isOnline(user.id))) return [];
    const profile = await this.profileOf(user.id);
    if (!profile?.specialty) return [];
    const rows = await this.requests().find({
      specialty: profile.specialty, status: 'broadcasting', expires_at: { $gt: new Date() },
      notified_doctor_ids: user.id, declined_by: { $ne: user.id },
    }).sort({ created_at: 1 }).toArray() as unknown as InstantRequest[];
    return rows.map((r) => this.view(r));
  }

  private async assertCanAct(user: { id: string }, doc: InstantRequest) {
    if (!(await this.isOnline(user.id))) throw new ForbiddenException('doctor_offline');
    const profile = await this.profileOf(user.id);
    if (!profile?.specialty || profile.specialty !== doc.specialty || !doc.notified_doctor_ids.includes(user.id)) {
      throw new ForbiddenException('not_your_specialty');
    }
    return profile;
  }

  /** The first accept claims the request in one conditional update; a later accept finds it taken. */
  async accept(user: { id: string }, id: string) {
    const doc = await this.current(id);
    const profile = await this.assertCanAct(user, doc);
    if (doc.status === 'accepted') throw new ConflictException('instant_already_taken');
    if (doc.status !== 'broadcasting') throw new ConflictException('instant_request_closed');

    const appointmentId = randomUUID();
    const now = new Date();
    const claim = await this.requests().updateOne(
      { id, status: 'broadcasting', expires_at: { $gt: now } },
      { $set: { status: 'accepted', accepted_by: user.id, appointment_id: appointmentId, accepted_at: now } },
    );
    if (claim.matchedCount === 0) {
      const latest = await this.requests().findOne({ id }, { projection: { status: 1 } }) as { status?: string } | null;
      throw new ConflictException(latest?.status === 'accepted' ? 'instant_already_taken' : 'instant_request_closed');
    }

    const price = doc.mode === 'video' ? profile.price_video : profile.price_audio;
    await this.conn.collection('appointments').insertOne({
      id: appointmentId,
      patient_id: doc.patient_id,
      family_member_id: doc.family_member_id,
      doctor_user_id: user.id,
      provider_id: user.id,
      service_type: 'consultation',
      mode: doc.mode,
      specialty: doc.specialty,
      instant: true,
      instant_request_id: doc.id,
      status: 'scheduled',
      payment_status: 'not_charged',
      price: typeof price === 'number' ? price : 0,
      createdAt: now,
      updatedAt: now,
    });
    await recordAudit(this.conn, { action: 'instant_consultation.accepted', user_id: user.id, role: 'doctor', resource_kind: 'instant_consultation', resource_id: id, details: { appointment_id: appointmentId } });
    return { appointment_id: appointmentId };
  }

  async decline(user: { id: string }, id: string) {
    const doc = await this.current(id);
    await this.assertCanAct(user, doc);
    await this.requests().updateOne({ id }, { $addToSet: { declined_by: user.id } });
    return { declined: true };
  }
}
