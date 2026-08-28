"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LiveKitService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveKitService = void 0;
const common_1 = require("@nestjs/common");
const livekit_server_sdk_1 = require("livekit-server-sdk");
const crypto_1 = require("crypto");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const appointment_schema_1 = require("../../schemas/appointment.schema");
let LiveKitService = LiveKitService_1 = class LiveKitService {
    constructor(appointments, conn, events) {
        this.appointments = appointments;
        this.conn = conn;
        this.events = events;
        this.logger = new common_1.Logger(LiveKitService_1.name);
    }
    get callSessions() { return this.conn.collection('callsessions'); }
    async createToken(roomName, participantName) {
        this.logger.log(`Creating LiveKit token for ${participantName} in ${roomName}`);
        if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
            throw new Error('LIVEKIT_NOT_CONFIGURED');
        }
        const at = new livekit_server_sdk_1.AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
            identity: participantName,
            ttl: '2h',
        });
        at.addGrant({ roomJoin: true, room: roomName });
        return at.toJwt();
    }
    async createBookingToken(roomName, participantName) {
        if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
            throw new Error('LIVEKIT_NOT_CONFIGURED');
        }
        const at = new livekit_server_sdk_1.AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
            identity: participantName,
            ttl: '10m',
        });
        at.addGrant({ roomJoin: true, room: roomName });
        return at.toJwt();
    }
    async issueBookingCallToken(bookingId, user) {
        const appt = await this.appointments.findOne({ id: bookingId }).lean();
        const isParticipant = appt && [String(appt.patient_id), String(appt.doctor_user_id)].includes(String(user?.id));
        if (!isParticipant)
            throw new common_1.NotFoundException('booking_not_found');
        if (appt.service_type !== 'video')
            throw new common_1.BadRequestException('call_token_only_available_for_video_booking');
        if ([appointment_schema_1.APPT_STATES.CANCELLED, appointment_schema_1.APPT_STATES.COMPLETED, appointment_schema_1.APPT_STATES.RESCHEDULED].includes(appt.status)) {
            throw new common_1.BadRequestException('call_token_not_available_for_booking_state');
        }
        const slotStart = new Date(appt.slot_start).getTime();
        if (!Number.isFinite(slotStart) || Math.abs(Date.now() - slotStart) > 15 * 60_000) {
            throw new common_1.BadRequestException('call_token_outside_appointment_window');
        }
        const room = `booking-${appt.id}`;
        const token = await this.createBookingToken(room, user?.name || user?.full_name || user?.id);
        return { provider: 'livekit', token, room };
    }
    async getProviderWaitingRoom(providerId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const appointments = await this.appointments.find({
            provider_id: providerId,
            status: { $in: ['SCHEDULED', 'IN_PROGRESS', 'CHECKED_IN'] },
            scheduled_time: { $gte: today, $lt: tomorrow }
        }).lean();
        return appointments.map((a) => ({
            id: a.id || a._id?.toString(),
            name: a.patient_name || 'مريض',
            time: a.scheduled_time,
            checkedIn: a.status === 'CHECKED_IN',
            waitTime: a.status === 'CHECKED_IN' ? 'جاهز' : 'ينتظر'
        }));
    }
    async pingPatient(providerId, patientId) {
        this.logger.log(`Provider ${providerId} is pinging patient ${patientId}`);
        const relationshipFilter = {
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
        const appointment = await this.appointments.findOne(relationshipFilter).lean();
        if (!appointment)
            throw new common_1.ForbiddenException('No active appointment between provider and patient');
        this.events.emit('call.incoming', {
            callee_id: patientId,
            caller_id: providerId,
            caller_name: 'طبيبك',
            call_type: 'video',
            session_id: `appointment_${appointment.id || appointment._id}`,
        });
        return { success: true, delivered_via: 'push:call.incoming' };
    }
    async markNoShow(providerId, appointmentId) {
        const appointmentFilter = { id: appointmentId, provider_id: providerId };
        if (mongoose_2.Types.ObjectId.isValid(appointmentId)) {
            appointmentFilter.$or = [
                { id: appointmentId, provider_id: providerId },
                { _id: new mongoose_2.Types.ObjectId(appointmentId), provider_id: providerId },
            ];
            delete appointmentFilter.id;
            delete appointmentFilter.provider_id;
        }
        const appt = await this.appointments.findOne(appointmentFilter);
        if (!appt)
            throw new common_1.NotFoundException('Appointment not found');
        appt.status = 'NO_SHOW';
        await appt.save();
        return { success: true, message: 'Marked as no-show' };
    }
    async findOwnedSession(sessionId, userId) {
        const session = await this.callSessions.findOne({
            $and: [
                { $or: [{ id: sessionId }, { room_name: sessionId }] },
                { $or: [{ patient_id: userId }, { provider_id: userId }] },
            ],
        }, { projection: { _id: 0 } });
        if (!session)
            throw new common_1.NotFoundException('Call session not found');
        return session;
    }
    async authorizeSignaling(sessionId, userId, targetId) {
        const session = await this.findOwnedSession(sessionId, userId);
        if (targetId && ![session.patient_id, session.provider_id].includes(String(targetId))) {
            throw new common_1.ForbiddenException('Target is not a call participant');
        }
        return session;
    }
    async initiateCall(callerId, callerName, calleeId, callType, bookingId) {
        if (!bookingId)
            throw new common_1.BadRequestException('appointmentId is required');
        const appointmentFilter = { id: bookingId };
        if (mongoose_2.Types.ObjectId.isValid(bookingId))
            appointmentFilter.$or = [{ id: bookingId }, { _id: new mongoose_2.Types.ObjectId(bookingId) }];
        const appt = await this.appointments.findOne(appointmentFilter).lean();
        if (!appt)
            throw new common_1.NotFoundException('Appointment not found');
        const patientId = String(appt.patient_id || appt.user_id || '');
        const providerId = String(appt.provider_id || appt.doctor_id || appt.provider_account_id || '');
        if (!patientId || !providerId || ![patientId, providerId].includes(String(callerId))) {
            throw new common_1.ForbiddenException('Caller is not an appointment participant');
        }
        const resolvedCallee = calleeId || ([patientId, providerId].find(id => id !== String(callerId)) || '');
        if (!resolvedCallee || ![patientId, providerId].includes(String(resolvedCallee)) || String(resolvedCallee) === String(callerId)) {
            throw new common_1.ForbiddenException('Callee is not an appointment participant');
        }
        const roomName = `room-${(0, crypto_1.randomUUID)()}`;
        const token = await this.createToken(roomName, callerName);
        const sessionId = `call_${(0, crypto_1.randomUUID)()}`;
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
    async joinCall(sessionId, userId, userName) {
        const session = await this.findOwnedSession(sessionId, userId);
        const token = await this.createToken(session.room_name, userName);
        await this.callSessions.updateOne({ id: session.id, status: 'INITIATED' }, { $set: { status: 'ACTIVE', started_at: new Date(), updatedAt: new Date() } });
        return { room_name: session.room_name, token };
    }
    async endCall(sessionId, userId) {
        const session = await this.findOwnedSession(sessionId, userId);
        this.logger.log(`User ${userId} ended call ${sessionId}`);
        const started = session.started_at ? new Date(session.started_at).getTime() : null;
        const duration = started ? Math.max(0, Math.round((Date.now() - started) / 1000)) : 0;
        await this.callSessions.updateOne({ id: session.id, status: { $in: ['INITIATED', 'ACTIVE'] } }, { $set: { status: 'ENDED', ended_at: new Date(), duration_seconds: duration, ended_by: userId, updatedAt: new Date() } });
        return { success: true };
    }
    async rejectCall(sessionId, userId) {
        const session = await this.findOwnedSession(sessionId, userId);
        await this.callSessions.updateOne({ id: session.id, status: 'INITIATED' }, { $set: { status: 'FAILED', end_reason: 'rejected', ended_at: new Date(), ended_by: userId, updatedAt: new Date() } });
        return { success: true };
    }
    async saveMetrics(sessionId, userId, metrics) {
        const session = await this.findOwnedSession(sessionId, userId);
        this.logger.log(`Saving metrics for ${sessionId}`);
        await this.callSessions.updateOne({ id: session.id }, { $set: { metrics, metrics_saved_at: new Date(), updatedAt: new Date() } });
        return { success: true };
    }
    async getCallHistory(userId, page = 1, limit = 20) {
        const safeLimit = Math.min(Math.max(limit || 20, 1), 100);
        const safePage = Math.max(page || 1, 1);
        const filter = { $or: [{ patient_id: userId }, { provider_id: userId }] };
        const [rows, total] = await Promise.all([
            this.callSessions.find(filter, { projection: { _id: 0 } })
                .sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).toArray(),
            this.callSessions.countDocuments(filter),
        ]);
        return {
            data: rows.map((s) => ({
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
    async getSessionById(sessionId, userId) {
        return this.findOwnedSession(sessionId, userId);
    }
    async getActiveRooms() {
        const rows = await this.callSessions
            .find({ status: { $in: ['INITIATED', 'ACTIVE'] } }, { projection: { _id: 0 } })
            .sort({ createdAt: -1 }).limit(100).toArray();
        return rows.map((s) => ({
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
    roomService() {
        if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET)
            return null;
        try {
            const { RoomServiceClient } = require('livekit-server-sdk');
            return new RoomServiceClient(process.env.LIVEKIT_URL, process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
        }
        catch {
            return null;
        }
    }
    async getRoomParticipants(roomName) {
        const svc = this.roomService();
        if (!svc)
            return [];
        const list = await svc.listParticipants(roomName).catch(() => []);
        return (list || []).map((p) => ({
            identity: p.identity,
            name: p.name,
            state: p.state,
            is_publisher: p.isPublisher,
            tracks: (p.tracks || []).map((t) => ({ type: t.type, source: t.source, muted: t.muted })),
        }));
    }
    async muteParticipant(roomName, participantId, muted) {
        const svc = this.roomService();
        if (!svc)
            return { success: false, reason: 'livekit_not_configured' };
        const p = await svc.getParticipant(roomName, participantId).catch(() => null);
        if (!p)
            return { success: false, reason: 'participant_not_found' };
        for (const track of p.tracks || []) {
            await svc.mutePublishedTrack(roomName, participantId, track.sid, muted).catch(() => null);
        }
        return { success: true };
    }
    async removeParticipant(roomName, participantId) {
        const svc = this.roomService();
        if (!svc)
            return { success: false, reason: 'livekit_not_configured' };
        await svc.removeParticipant(roomName, participantId).catch(() => null);
        return { success: true };
    }
};
exports.LiveKitService = LiveKitService;
exports.LiveKitService = LiveKitService = LiveKitService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Appointment')),
    __param(1, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Connection,
        event_emitter_1.EventEmitter2])
], LiveKitService);
//# sourceMappingURL=livekit.service.js.map