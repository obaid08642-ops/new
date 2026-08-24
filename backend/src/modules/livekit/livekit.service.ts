import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';
import { randomUUID } from 'crypto';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { APPT_STATES } from '../../schemas/appointment.schema';

@Injectable()
export class LiveKitService {
  private readonly logger = new Logger(LiveKitService.name);

  constructor(
    @InjectModel('Appointment') private readonly appointments: Model<any>,
    @InjectConnection() private readonly conn: Connection,
    private readonly events: EventEmitter2,
  ) {}

  private get callSessions() { return this.conn.collection('callsessions'); }

  async createToken(roomName: string, participantName: string): Promise<string> {
    this.logger.log(`Creating LiveKit token for ${participantName} in ${roomName}`);
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      throw new Error('LIVEKIT_NOT_CONFIGURED');
    }
    const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
      identity: participantName,
      ttl: '2h', // legacy call-session token policy
    });
    at.addGrant({ roomJoin: true, room: roomName });
    return at.toJwt();
  }

  /** Patient-web booking token: narrower than legacy sessions and valid 10 minutes only. */
  async createBookingToken(roomName: string, participantName: string): Promise<string> {
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      throw new Error('LIVEKIT_NOT_CONFIGURED');
    }
    const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
      identity: participantName,
      ttl: '10m',
    });
    at.addGrant({ roomJoin: true, room: roomName });
    return at.toJwt();
  }

  /**
   * Issues a deterministic consultation room token only for the booked patient
   * or the assigned doctor during the appointment window. Foreign identities
   * receive 404 to avoid confirming that a booking exists.
   */
  async issueBookingCallToken(bookingId: string, user: any) {
    const appt: any = await this.appointments.findOne({ id: bookingId }).lean();
    const isParticipant = appt && [String(appt.patient_id), String(appt.doctor_user_id)].includes(String(user?.id));
    if (!isParticipant) throw new NotFoundException('booking_not_found');
    if (appt.service_type !== 'video') throw new BadRequestException('call_token_only_available_for_video_booking');
    if ([APPT_STATES.CANCELLED, APPT_STATES.COMPLETED, APPT_STATES.RESCHEDULED].includes(appt.status)) {
      throw new BadRequestException('call_token_not_available_for_booking_state');
    }
    const slotStart = new Date(appt.slot_start).getTime();
    if (!Number.isFinite(slotStart) || Math.abs(Date.now() - slotStart) > 15 * 60_000) {
      throw new BadRequestException('call_token_outside_appointment_window');
    }
    const room = `booking-${appt.id}`;
    const token = await this.createBookingToken(room, user?.name || user?.full_name || user?.id);
    return { provider: 'livekit', token, room };
  }

  async getProviderWaitingRoom(providerId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await this.appointments.find({
      provider_id: providerId,
      status: { $in: ['SCHEDULED', 'IN_PROGRESS', 'CHECKED_IN'] },
      scheduled_time: { $gte: today, $lt: tomorrow }
    }).lean();

    return appointments.map((a: any) => ({
      id: a.id || a._id?.toString(),
      name: a.patient_name || 'مريض',
      time: a.scheduled_time,
      checkedIn: a.status === 'CHECKED_IN',
      waitTime: a.status === 'CHECKED_IN' ? 'جاهز' : 'ينتظر'
    }));
  }

  async pingPatient(providerId: string, patientId: string) {
    this.logger.log(`Provider ${providerId} is pinging patient ${patientId}`);
    const relationshipFilter: any = {
      $or: [
        { provider_id: providerId },
        { doctor_id: providerId },
        { provider_account_id: providerId },
      ],
      $and: [{
        $or: [
          { patient_id: patientId },
          { user_id: patientId },
          { patient_user_id: patientId },
        ],
      }],
      status: { $nin: ['CANCELLED', 'NO_SHOW', 'COMPLETED'] },
    };
    const appointment: any = await this.appointments.findOne(relationshipFilter).lean();
    if (!appointment) throw new ForbiddenException('No active appointment between provider and patient');

    // Real delivery — the push module's @OnEvent('call.incoming') listener
    // fans this out to every registered device of the patient.
    this.events.emit('call.incoming', {
      callee_id: patientId,
      caller_id: providerId,
      caller_name: 'طبيبك',
      call_type: 'video',
      session_id: `appointment_${appointment.id || appointment._id}`,
    });
    return { success: true, delivered_via: 'push:call.incoming' };
  }

  async markNoShow(providerId: string, appointmentId: string) {
    const idFilter = Types.ObjectId.isValid(appointmentId)
      ? { $or: [{ id: appointmentId }, { _id: new Types.ObjectId(appointmentId) }] }
      : { id: appointmentId };
    const ownershipFilter = {
      $or: [
        { doctor_user_id: providerId },
        { doctor_id: providerId },
        // Compatibility for historical appointment documents created before the
        // doctor_user_id contract was standardized.
        { provider_id: providerId },
      ],
    };
    const appointmentFilter: any = { $and: [idFilter, ownershipFilter] };
    const appt: any = await this.appointments.findOne(appointmentFilter).lean();
    if (!appt) throw new NotFoundException('Appointment not found');
    if (![APPT_STATES.PENDING, APPT_STATES.CONFIRMED, APPT_STATES.CHECKED_IN].includes(appt.status)) {
      throw new BadRequestException('appointment_not_no_show_eligible');
    }

    // Do not call document.save(): a legacy record may contain the obsolete
    // service_type='consultation', which Mongoose rejects while validating every
    // field on save. A video call is authoritative evidence of the real service
    // type, so normalize only that historical value as part of the atomic state
    // transition. New records are already restricted by the appointment schema.
    const set: any = { status: APPT_STATES.NO_SHOW, updatedAt: new Date() };
    if (appt.service_type === 'consultation') set.service_type = 'video';
    const result: any = await this.appointments.updateOne(
      { $and: [idFilter, ownershipFilter, { status: appt.status }] },
      {
        $set: set,
        $push: { state_history: { state: APPT_STATES.NO_SHOW, at: new Date(), by_user_id: providerId, by_role: 'doctor', note: 'provider_no_show' } },
      },
      { runValidators: true },
    );
    if (!result?.modifiedCount) throw new BadRequestException('appointment_state_changed_retry');
    return { success: true, message: 'Marked as no-show' };
  }

  private async findOwnedSession(sessionId: string, userId: string): Promise<any> {
    const session: any = await this.callSessions.findOne({
      $and: [
        { $or: [{ id: sessionId }, { room_name: sessionId }] },
        { $or: [{ patient_id: userId }, { provider_id: userId }] },
      ],
    }, { projection: { _id: 0 } });
    if (!session) throw new NotFoundException('Call session not found');
    return session;
  }

  async authorizeSignaling(sessionId: string, userId: string, targetId?: string): Promise<any> {
    const session = await this.findOwnedSession(sessionId, userId);
    if (targetId && ![session.patient_id, session.provider_id].includes(String(targetId))) {
      throw new ForbiddenException('Target is not a call participant');
    }
    return session;
  }

  async initiateCall(callerId: string, callerName: string, calleeId: string, callType: string, bookingId?: string) {
    if (!bookingId) throw new BadRequestException('appointmentId is required');
    const appointmentFilter: any = { id: bookingId };
    if (Types.ObjectId.isValid(bookingId)) appointmentFilter.$or = [{ id: bookingId }, { _id: new Types.ObjectId(bookingId) }];
    const appt: any = await this.appointments.findOne(appointmentFilter).lean();
    if (!appt) throw new NotFoundException('Appointment not found');
    const patientId = String(appt.patient_id || appt.user_id || '');
    const providerId = String(appt.provider_id || appt.doctor_id || appt.provider_account_id || '');
    if (!patientId || !providerId || ![patientId, providerId].includes(String(callerId))) {
      throw new ForbiddenException('Caller is not an appointment participant');
    }
    const resolvedCallee = calleeId || ([patientId, providerId].find(id => id !== String(callerId)) || '');
    if (!resolvedCallee || ![patientId, providerId].includes(String(resolvedCallee)) || String(resolvedCallee) === String(callerId)) {
      throw new ForbiddenException('Callee is not an appointment participant');
    }
    const roomName = `room-${randomUUID()}`;
    const token = await this.createToken(roomName, callerName);
    const sessionId = `call_${randomUUID()}`;
    await this.callSessions.insertOne({
      id: sessionId, appointment_id: bookingId, patient_id: patientId, provider_id: providerId,
      room_name: roomName, call_type: callType || 'video', status: 'INITIATED',
      createdAt: new Date(), updatedAt: new Date(),
    });
    this.events.emit('call.incoming', {
      callee_id: resolvedCallee, caller_id: callerId, caller_name: callerName, call_type: callType || 'video', session_id: sessionId, room_name: roomName,
    });
    return { room_name: roomName, token, call_type: callType || 'video', session_id: sessionId };
  }

  async joinCall(sessionId: string, userId: string, userName: string) {
    const session = await this.findOwnedSession(sessionId, userId);
    const token = await this.createToken(session.room_name, userName);
    await this.callSessions.updateOne(
      { id: session.id, status: 'INITIATED' },
      { $set: { status: 'ACTIVE', started_at: new Date(), updatedAt: new Date() } },
    );
    return { room_name: session.room_name, token };
  }

  async endCall(sessionId: string, userId: string) {
    const session = await this.findOwnedSession(sessionId, userId);
    this.logger.log(`User ${userId} ended call ${sessionId}`);
    const started = session.started_at ? new Date(session.started_at).getTime() : null;
    const duration = started ? Math.max(0, Math.round((Date.now() - started) / 1000)) : 0;
    await this.callSessions.updateOne(
      { id: session.id, status: { $in: ['INITIATED', 'ACTIVE'] } },
      { $set: { status: 'ENDED', ended_at: new Date(), duration_seconds: duration, ended_by: userId, updatedAt: new Date() } },
    );
    return { success: true };
  }

  async rejectCall(sessionId: string, userId: string) {
    const session = await this.findOwnedSession(sessionId, userId);
    await this.callSessions.updateOne(
      { id: session.id, status: 'INITIATED' },
      { $set: { status: 'FAILED', end_reason: 'rejected', ended_at: new Date(), ended_by: userId, updatedAt: new Date() } },
    );
    return { success: true };
  }

  async saveMetrics(sessionId: string, userId: string, metrics: any) {
    const session = await this.findOwnedSession(sessionId, userId);
    this.logger.log(`Saving metrics for ${sessionId}`);
    await this.callSessions.updateOne(
      { id: session.id }, { $set: { metrics, metrics_saved_at: new Date(), updatedAt: new Date() } },
    );
    return { success: true };
  }

  async getCallHistory(userId: string, page = 1, limit = 20) {
    const safeLimit = Math.min(Math.max(limit || 20, 1), 100);
    const safePage = Math.max(page || 1, 1);
    const filter = { $or: [{ patient_id: userId }, { provider_id: userId }] };
    const [rows, total] = await Promise.all([
      this.callSessions.find(filter as any, { projection: { _id: 0 } })
        .sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).toArray(),
      this.callSessions.countDocuments(filter as any),
    ]);
    return {
      data: rows.map((s: any) => ({
        id: s.id,
        appointment_id: s.appointment_id,
        room_name: s.room_name,
        call_type: s.call_type,
        status: s.status,
        started_at: s.started_at || null,
        ended_at: s.ended_at || null,
        duration_seconds: s.duration_seconds || 0,
        end_reason: s.end_reason || null,
      })),
      total,
      page: safePage,
      total_pages: Math.ceil(total / safeLimit),
    };
  }

  async getSessionById(sessionId: string, userId: string) {
    return this.findOwnedSession(sessionId, userId);
  }

  async getActiveRooms() {
    const rows = await this.callSessions
      .find({ status: { $in: ['INITIATED', 'ACTIVE'] } }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 }).limit(100).toArray();
    return rows.map((s: any) => ({
      room_name: s.room_name,
      appointment_id: s.appointment_id,
      patient_id: s.patient_id,
      provider_id: s.provider_id,
      call_type: s.call_type,
      status: s.status,
      started_at: s.started_at || null,
    }));
  }

  async getCallAnalytics() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [agg] = await this.callSessions.aggregate([
      {
        $group: {
          _id: null,
          total_calls: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'ENDED'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } },
          total_minutes: { $sum: { $round: [{ $divide: [{ $ifNull: ['$duration_seconds', 0] }, 60] }, 1] } },
          avg_duration_seconds: { $avg: { $ifNull: ['$duration_seconds', 0] } },
        },
      },
    ]).toArray();
    const calls_today = await this.callSessions.countDocuments({ createdAt: { $gte: todayStart } });
    return {
      total_calls: agg?.total_calls || 0,
      completed: agg?.completed || 0,
      failed: agg?.failed || 0,
      total_minutes: agg?.total_minutes || 0,
      avg_duration_seconds: Math.round(agg?.avg_duration_seconds || 0),
      calls_today,
    };
  }

  /** LiveKit server RoomService — available when LIVEKIT_URL is configured. */
  private roomService(): any | null {
    if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) return null;
    try {
      const { RoomServiceClient } = require('livekit-server-sdk');
      return new RoomServiceClient(process.env.LIVEKIT_URL, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
    } catch {
      return null;
    }
  }

  async getRoomParticipants(roomName: string) {
    const svc = this.roomService();
    if (!svc) return [];
    const list = await svc.listParticipants(roomName).catch(() => []);
    return (list || []).map((p: any) => ({
      identity: p.identity,
      name: p.name,
      state: p.state,
      is_publisher: p.isPublisher,
      tracks: (p.tracks || []).map((t: any) => ({ type: t.type, source: t.source, muted: t.muted })),
    }));
  }

  async muteParticipant(roomName: string, participantId: string, muted: boolean) {
    const svc = this.roomService();
    if (!svc) return { success: false, reason: 'livekit_not_configured' };
    const p = await svc.getParticipant(roomName, participantId).catch(() => null);
    if (!p) return { success: false, reason: 'participant_not_found' };
    for (const track of p.tracks || []) {
      await svc.mutePublishedTrack(roomName, participantId, track.sid, muted).catch(() => null);
    }
    return { success: true };
  }

  async removeParticipant(roomName: string, participantId: string) {
    const svc = this.roomService();
    if (!svc) return { success: false, reason: 'livekit_not_configured' };
    await svc.removeParticipant(roomName, participantId).catch(() => null);
    return { success: true };
  }
}
