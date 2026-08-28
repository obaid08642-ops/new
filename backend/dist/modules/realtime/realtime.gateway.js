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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeGateway = void 0;
const event_emitter_1 = require("@nestjs/event-emitter");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const realtime_service_1 = require("./realtime.service");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const appointment_schema_1 = require("../../schemas/appointment.schema");
const websocket_cors_1 = require("../../config/websocket-cors");
const chat_service_1 = require("../chat/chat.service");
const livekit_service_1 = require("../livekit/livekit.service");
let RealtimeGateway = class RealtimeGateway {
    constructor(jwt, realtime, apptModel, chat, livekit) {
        this.jwt = jwt;
        this.realtime = realtime;
        this.apptModel = apptModel;
        this.chat = chat;
        this.livekit = livekit;
        this.logger = new common_1.Logger('RealtimeGateway');
        this.connectedUsers = new Map();
        this.userSockets = new Map();
        this.doctorQueues = new Map();
    }
    afterInit(server) {
        this.realtime.setServer(server);
        this.logger.log('WebSocket Gateway initialized');
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token || client.handshake.query?.token;
            if (!token) {
                client.disconnect();
                return;
            }
            const payload = await this.jwt.verifyAsync(token, { secret: process.env.JWT_SECRET });
            client.data.user = payload;
            client.data.connectedAt = Date.now();
            client.join(`user:${payload.id}`);
            client.join(`role:${payload.role}`);
            if (!this.userSockets.has(payload.id))
                this.userSockets.set(payload.id, new Set());
            this.userSockets.get(payload.id).add(client.id);
            this.connectedUsers.set(client.id, payload);
            this.realtime.setUserOnline(payload.id, client.id).catch(() => null);
            client.broadcast.emit('user:online', { user_id: payload.id, timestamp: Date.now() });
            this.replayOfflineQueue(client, payload.id);
            this.logger.log(`Connected: ${payload.id} (${payload.role}) socket=${client.id}`);
        }
        catch (e) {
            this.logger.warn(`Auth failed: ${e.message}`);
            client.disconnect();
        }
    }
    async replayOfflineQueue(client, userId) {
        try {
            const redis = this.realtime.redis.getClient();
            const key = `offline_events:${userId}`;
            const events = await redis.lrange(key, 0, -1);
            if (events && events.length > 0) {
                for (const evStr of events.reverse()) {
                    const ev = JSON.parse(evStr);
                    client.emit(ev.event, ev.data);
                }
                await redis.del(key);
                this.logger.log(`Replayed ${events.length} offline events for user ${userId}`);
            }
        }
        catch (err) {
            this.logger.error(`Failed to replay offline queue for ${userId}`, err);
        }
    }
    async handleDisconnect(client) {
        const user = client.data?.user;
        if (!user)
            return;
        const sockets = this.userSockets.get(user.id);
        if (sockets) {
            sockets.delete(client.id);
            if (sockets.size === 0)
                this.userSockets.delete(user.id);
        }
        this.connectedUsers.delete(client.id);
        const apptId = client.data?.appointmentId;
        if (apptId) {
            try {
                const appt = await this.apptModel.findOne({ id: apptId }).lean();
                if (appt) {
                    this.removeFromQueue(appt.doctor_id, apptId);
                }
            }
            catch (err) {
                this.logger.warn(`Failed to clean up queue for appointment ${apptId}: ${err.message}`);
            }
        }
        this.realtime.setUserOffline(user.id, client.id).catch(() => null);
        if (!this.userSockets.has(user.id)) {
            this.server.emit('user:offline', { user_id: user.id, timestamp: Date.now() });
        }
        this.logger.log(`Disconnected: ${user.id} socket=${client.id}`);
    }
    async getPresence(client, data) {
        const results = await this.realtime.getBulkPresence(data.user_ids || []);
        return { ok: true, presence: results };
    }
    async heartbeat(client) {
        const user = client.data?.user;
        if (user)
            await this.realtime.heartbeat(user.id, client.id).catch(() => null);
        return { ok: true };
    }
    async joinThread(client, data) {
        const user = client.data?.user;
        if (!user || !data?.thread_id)
            return { ok: false, error: 'invalid_request' };
        try {
            await this.chat.getThread(data.thread_id, user.id);
        }
        catch {
            return { ok: false, error: 'not_participant' };
        }
        client.join(`thread:${data.thread_id}`);
        return { ok: true };
    }
    async leaveThread(client, data) {
        const user = client.data?.user;
        if (!user || !data?.thread_id)
            return { ok: false, error: 'invalid_request' };
        try {
            await this.chat.getThread(data.thread_id, user.id);
        }
        catch {
            return { ok: false, error: 'not_participant' };
        }
        client.leave(`thread:${data.thread_id}`);
        return { ok: true };
    }
    async typingStart(client, data) {
        const user = client.data?.user;
        if (!user || !data?.thread_id)
            return { ok: false };
        try {
            await this.chat.getThread(data.thread_id, user.id);
        }
        catch {
            return { ok: false, error: 'not_participant' };
        }
        client.to(`thread:${data.thread_id}`).emit('chat:typing:start', {
            thread_id: data.thread_id,
            user_id: user.id,
            name: user.name || user.id,
        });
    }
    async typingStop(client, data) {
        const user = client.data?.user;
        if (!user || !data?.thread_id)
            return { ok: false };
        try {
            await this.chat.getThread(data.thread_id, user.id);
        }
        catch {
            return { ok: false, error: 'not_participant' };
        }
        client.to(`thread:${data.thread_id}`).emit('chat:typing:stop', {
            thread_id: data.thread_id,
            user_id: user.id,
        });
    }
    async chatRead(client, data) {
        const user = client.data?.user;
        if (!user || !data?.thread_id)
            return { ok: false };
        try {
            await this.chat.getThread(data.thread_id, user.id);
        }
        catch {
            return { ok: false, error: 'not_participant' };
        }
        this.server.to(`thread:${data.thread_id}`).emit('chat:read_receipt', {
            thread_id: data.thread_id,
            user_id: user.id,
            last_message_id: data.last_message_id,
            read_at: Date.now(),
        });
    }
    async chatDelivered(client, data) {
        const user = client.data?.user;
        if (!user || !data?.thread_id)
            return { ok: false };
        try {
            await this.chat.getThread(data.thread_id, user.id);
        }
        catch {
            return { ok: false, error: 'not_participant' };
        }
        this.server.to(`thread:${data.thread_id}`).emit('chat:delivery_receipt', {
            thread_id: data.thread_id,
            user_id: user.id,
            message_ids: data.message_ids,
            delivered_at: Date.now(),
        });
    }
    async callIncoming(client, data) {
        const user = client.data?.user;
        if (!user)
            return { ok: false };
        try {
            await this.livekit.authorizeSignaling(data.session_id, user.id, data.callee_id);
        }
        catch {
            return { ok: false, error: 'unauthorized_call' };
        }
        this.server.to(`user:${data.callee_id}`).emit('call:incoming', {
            session_id: data.session_id,
            caller_id: user.id,
            caller_name: data.caller_name || user.name || user.id,
            call_type: data.call_type || 'video',
            timestamp: Date.now(),
        });
        return { ok: true };
    }
    async callAccepted(client, data) {
        const user = client.data?.user;
        if (!user)
            return { ok: false };
        try {
            await this.livekit.authorizeSignaling(data.session_id, user.id, data.caller_id);
        }
        catch {
            return { ok: false, error: 'unauthorized_call' };
        }
        this.server.to(`user:${data.caller_id}`).emit('call:accepted', {
            session_id: data.session_id,
            callee_id: user.id,
            timestamp: Date.now(),
        });
        return { ok: true };
    }
    async callRejected(client, data) {
        const user = client.data?.user;
        if (!user)
            return { ok: false };
        try {
            await this.livekit.authorizeSignaling(data.session_id, user.id, data.caller_id);
        }
        catch {
            return { ok: false, error: 'unauthorized_call' };
        }
        this.server.to(`user:${data.caller_id}`).emit('call:rejected', {
            session_id: data.session_id,
            callee_id: user.id,
            reason: data.reason || 'rejected',
            timestamp: Date.now(),
        });
        return { ok: true };
    }
    async callEnded(client, data) {
        const user = client.data?.user;
        if (!user)
            return { ok: false };
        try {
            await this.livekit.authorizeSignaling(data.session_id, user.id, data.other_user_id);
        }
        catch {
            return { ok: false, error: 'unauthorized_call' };
        }
        this.server.to(`user:${data.other_user_id}`).emit('call:ended', {
            session_id: data.session_id,
            ended_by: user.id,
            timestamp: Date.now(),
        });
        return { ok: true };
    }
    async iceCandidate(client, data) {
        const user = client.data?.user;
        if (!user)
            return { ok: false };
        try {
            await this.livekit.authorizeSignaling(data.session_id, user.id, data.target_id);
        }
        catch {
            return { ok: false, error: 'unauthorized_call' };
        }
        this.server.to(`user:${data.target_id}`).emit('call:ice_candidate', {
            session_id: data.session_id,
            from_id: client.data?.user?.id,
            candidate: data.candidate,
        });
    }
    async sdpOffer(client, data) {
        const user = client.data?.user;
        if (!user)
            return { ok: false };
        try {
            await this.livekit.authorizeSignaling(data.session_id, user.id, data.target_id);
        }
        catch {
            return { ok: false, error: 'unauthorized_call' };
        }
        this.server.to(`user:${data.target_id}`).emit('call:sdp_offer', {
            session_id: data.session_id,
            from_id: client.data?.user?.id,
            sdp: data.sdp,
        });
    }
    async sdpAnswer(client, data) {
        const user = client.data?.user;
        if (!user)
            return { ok: false };
        try {
            await this.livekit.authorizeSignaling(data.session_id, user.id, data.target_id);
        }
        catch {
            return { ok: false, error: 'unauthorized_call' };
        }
        this.server.to(`user:${data.target_id}`).emit('call:sdp_answer', {
            session_id: data.session_id,
            from_id: client.data?.user?.id,
            sdp: data.sdp,
        });
    }
    joinChannel(client, data) {
        return { ok: false, error: 'unsupported_channel' };
    }
    leaveChannel(client, data) {
        return { ok: false, error: 'unsupported_channel' };
    }
    async handleWaitingRoomJoin(client, data) {
        if (!data?.appointmentId)
            return { ok: false, error: 'appointmentId required' };
        const user = client.data?.user;
        if (!user?.id)
            return { ok: false, error: 'unauthenticated' };
        try {
            const appt = await this.apptModel.findOne({ id: data.appointmentId }).lean();
            if (!appt)
                return { ok: false, error: 'appointment not found' };
            if (!this.isWaitingRoomParticipant(appt, user))
                return { ok: false, error: 'not_participant' };
            if (!this.isWaitingRoomOpen(appt.status))
                return { ok: false, error: 'appointment_not_open' };
            client.join(`appointment:${data.appointmentId}`);
            client.data.appointmentId = data.appointmentId;
            const doctorId = appt.doctor_id;
            if (!this.doctorQueues.has(doctorId)) {
                this.doctorQueues.set(doctorId, []);
            }
            const queue = this.doctorQueues.get(doctorId);
            if (!queue.includes(data.appointmentId)) {
                queue.push(data.appointmentId);
            }
            await this.broadcastQueueUpdates(doctorId);
            return { ok: true };
        }
        catch (err) {
            this.logger.error(`Error joining waiting room: ${err.message}`);
            return { ok: false, error: 'internal_error' };
        }
    }
    async handleWaitingRoomLeave(client, data) {
        if (!data?.appointmentId)
            return { ok: false };
        const user = client.data?.user;
        if (!user?.id)
            return { ok: false, error: 'unauthenticated' };
        try {
            const appt = await this.apptModel.findOne({ id: data.appointmentId }).lean();
            if (!appt)
                return { ok: false, error: 'appointment not found' };
            if (!this.isWaitingRoomParticipant(appt, user))
                return { ok: false, error: 'not_participant' };
            client.leave(`appointment:${data.appointmentId}`);
            if (client.data?.appointmentId === data.appointmentId)
                delete client.data.appointmentId;
            this.removeFromQueue(appt.doctor_id, data.appointmentId);
            return { ok: true };
        }
        catch (err) {
            return { ok: false, error: 'internal_error' };
        }
    }
    isWaitingRoomParticipant(appt, user) {
        return [appt.patient_id, appt.booked_by_user_id, appt.doctor_user_id]
            .filter(Boolean)
            .includes(user.id);
    }
    isWaitingRoomOpen(status) {
        return ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(String(status || '').toUpperCase());
    }
    async broadcastQueueUpdates(doctorId) {
        const queue = this.doctorQueues.get(doctorId) || [];
        const totalInQueue = queue.length;
        for (let i = 0; i < queue.length; i++) {
            const apptId = queue[i];
            const position = i + 1;
            const eta = position * 15;
            this.server.to(`appointment:${apptId}`).emit('waiting_room:update', {
                position,
                eta,
                totalInQueue,
            });
            if (position === 1) {
                this.server.to(`appointment:${apptId}`).emit('waiting_room:ready', {
                    appointmentId: apptId,
                });
            }
        }
    }
    removeFromQueue(doctorId, appointmentId) {
        const queue = this.doctorQueues.get(doctorId);
        if (queue) {
            const idx = queue.indexOf(appointmentId);
            if (idx !== -1) {
                queue.splice(idx, 1);
                this.broadcastQueueUpdates(doctorId);
            }
        }
    }
    onOrder(payload) {
        if (!payload)
            return;
        if (payload.patient_id)
            this.realtime.emitToUser(payload.patient_id, 'order_event', payload);
        if (payload.pharmacy_id)
            this.realtime.emitToUser(payload.pharmacy_id, 'order_event', payload);
        this.realtime.emitToRole('admin', 'order_event', payload);
    }
    onChat(payload) {
        if (!payload)
            return;
        const meta = payload.meta || payload;
        const threadId = meta.thread_id || payload.thread_id;
        const participantIds = meta.participant_ids || payload.participant_ids;
        const senderId = meta.sender_id || payload.sender_id || payload.actor_account_id;
        if (threadId)
            this.realtime.emitToChannel(`thread:${threadId}`, 'chat:message', { ...meta, thread_id: threadId });
        if (participantIds) {
            for (const uid of participantIds) {
                if (uid !== senderId)
                    this.realtime.emitToUser(uid, 'chat:new_message', { ...meta, thread_id: threadId });
            }
        }
    }
    async onAppointment(payload) {
        if (!payload)
            return;
        let fullAppt = null;
        if (payload.id) {
            try {
                fullAppt = await this.apptModel.findOne({ id: payload.id }).lean();
            }
            catch { }
        }
        const patientId = payload.patient_id || fullAppt?.patient_id;
        const doctorUserId = payload.doctor_user_id || fullAppt?.doctor_user_id;
        if (patientId)
            this.realtime.emitToUser(patientId, 'appointment_event', payload);
        if (doctorUserId)
            this.realtime.emitToUser(doctorUserId, 'appointment_event', payload);
        this.realtime.emitToRole('admin', 'appointment_event', payload);
        const status = payload.status || fullAppt?.status;
        if (status === 'IN_PROGRESS' && payload.id) {
            this.server.to(`appointment:${payload.id}`).emit('consultation:started', {
                appointmentId: payload.id,
            });
            if (fullAppt) {
                this.removeFromQueue(fullAppt.doctor_id, payload.id);
            }
        }
    }
    onPayment(payload) {
        if (!payload)
            return;
        if (payload.patient_id)
            this.realtime.emitToUser(payload.patient_id, 'payment_event', payload);
    }
    onNotif(payload) {
        if (payload?.user_id)
            this.realtime.emitToUser(payload.user_id, 'notification', payload);
        if (payload?.role)
            this.realtime.emitToRole(payload.role, 'notification', payload);
    }
    onCall(payload) {
        if (!payload)
            return;
        if (payload.callee_id)
            this.realtime.emitToUser(payload.callee_id, 'call_event', payload);
        if (payload.caller_id)
            this.realtime.emitToUser(payload.caller_id, 'call_event', payload);
    }
    getStats() {
        return {
            connected_sockets: this.connectedUsers.size,
            connected_users: this.userSockets.size,
        };
    }
};
exports.RealtimeGateway = RealtimeGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], RealtimeGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('presence:get'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "getPresence", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('presence:heartbeat'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "heartbeat", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "joinThread", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:leave'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "leaveThread", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:typing:start'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "typingStart", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:typing:stop'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "typingStop", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:read'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "chatRead", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('chat:delivered'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "chatDelivered", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('call:incoming'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "callIncoming", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('call:accepted'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "callAccepted", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('call:rejected'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "callRejected", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('call:ended'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "callEnded", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('call:ice_candidate'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "iceCandidate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('call:sdp_offer'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "sdpOffer", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('call:sdp_answer'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "sdpAnswer", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_channel'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "joinChannel", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave_channel'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "leaveChannel", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('waiting_room:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "handleWaitingRoomJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('waiting_room:leave'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "handleWaitingRoomLeave", null);
__decorate([
    (0, event_emitter_1.OnEvent)('order.*'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "onOrder", null);
__decorate([
    (0, event_emitter_1.OnEvent)('chat.*'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "onChat", null);
__decorate([
    (0, event_emitter_1.OnEvent)('appointment.*'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RealtimeGateway.prototype, "onAppointment", null);
__decorate([
    (0, event_emitter_1.OnEvent)('payment.*'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "onPayment", null);
__decorate([
    (0, event_emitter_1.OnEvent)('notification.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "onNotif", null);
__decorate([
    (0, event_emitter_1.OnEvent)('call.*'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RealtimeGateway.prototype, "onCall", null);
exports.RealtimeGateway = RealtimeGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: (0, websocket_cors_1.getWebSocketCorsOptions)(), namespace: '/', transports: ['websocket', 'polling'] }),
    __param(2, (0, mongoose_1.InjectModel)(appointment_schema_1.Appointment.name)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        realtime_service_1.RealtimeService,
        mongoose_2.Model,
        chat_service_1.ChatService,
        livekit_service_1.LiveKitService])
], RealtimeGateway);
//# sourceMappingURL=realtime.gateway.js.map