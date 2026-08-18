import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit,
  SubscribeMessage, WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RealtimeService } from './realtime.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Appointment, AppointmentDocument } from '../../schemas/appointment.schema';
import { getWebSocketCorsOptions } from '../../config/websocket-cors';
import { ChatService } from '../chat/chat.service';
import { LiveKitService } from '../livekit/livekit.service';

@WebSocketGateway({ cors: getWebSocketCorsOptions(), namespace: '/', transports: ['websocket', 'polling'] })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger('RealtimeGateway');
  // socketId -> { user, rooms[] }
  private connectedUsers = new Map<string, any>();
  // userId -> Set<socketId>
  private userSockets = new Map<string, Set<string>>();
  // doctor_id -> array of appointmentIds in queue
  private doctorQueues = new Map<string, string[]>();

  constructor(
    private readonly jwt: JwtService,
    private readonly realtime: RealtimeService,
    @InjectModel(Appointment.name) private readonly apptModel: Model<AppointmentDocument>,
    private readonly chat: ChatService,
    private readonly livekit: LiveKitService,
  ) {}

  afterInit(server: Server) {
    this.realtime.setServer(server);
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token as string;
      if (!token) { client.disconnect(); return; }
      const payload = await this.jwt.verifyAsync(token, { secret: process.env.JWT_SECRET });
      client.data.user = payload;
      client.data.connectedAt = Date.now();

      // Join personal and role rooms
      client.join(`user:${payload.id}`);
      client.join(`role:${payload.role}`);

      // Track connections
      if (!this.userSockets.has(payload.id)) this.userSockets.set(payload.id, new Set());
      this.userSockets.get(payload.id)!.add(client.id);
      this.connectedUsers.set(client.id, payload);

      // Mark online via presence (fire-and-forget)
      this.realtime.setUserOnline(payload.id, client.id).catch(() => null);

      // Notify contacts this user is now online
      client.broadcast.emit('user:online', { user_id: payload.id, timestamp: Date.now() });

      // Replay Offline Queue
      this.replayOfflineQueue(client, payload.id);

      this.logger.log(`Connected: ${payload.id} (${payload.role}) socket=${client.id}`);
    } catch (e) {
      this.logger.warn(`Auth failed: ${e.message}`);
      client.disconnect();
    }
  }

  private async replayOfflineQueue(client: Socket, userId: string) {
    try {
      const redis = (this.realtime as any).redis.getClient();
      const key = `offline_events:${userId}`;
      const events = await redis.lrange(key, 0, -1);
      if (events && events.length > 0) {
        // Pop events and emit
        for (const evStr of events.reverse()) {
          const ev = JSON.parse(evStr);
          client.emit(ev.event, ev.data);
        }
        await redis.del(key);
        this.logger.log(`Replayed ${events.length} offline events for user ${userId}`);
      }
    } catch (err) {
      this.logger.error(`Failed to replay offline queue for ${userId}`, err);
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data?.user;
    if (!user) return;

    const sockets = this.userSockets.get(user.id);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) this.userSockets.delete(user.id);
    }
    this.connectedUsers.delete(client.id);

    // Clean up waiting room queue if socket was waiting
    const apptId = client.data?.appointmentId;
    if (apptId) {
      try {
        const appt = await this.apptModel.findOne({ id: apptId }).lean();
        if (appt) {
          this.removeFromQueue(appt.doctor_id, apptId);
        }
      } catch (err) {
        this.logger.warn(`Failed to clean up queue for appointment ${apptId}: ${err.message}`);
      }
    }

    // Mark offline if no more sockets
    this.realtime.setUserOffline(user.id, client.id).catch(() => null);

    if (!this.userSockets.has(user.id)) {
      this.server.emit('user:offline', { user_id: user.id, timestamp: Date.now() });
    }
    this.logger.log(`Disconnected: ${user.id} socket=${client.id}`);
  }

  // ── Presence ────────────────────────────────────────────────

  @SubscribeMessage('presence:get')
  async getPresence(@ConnectedSocket() client: Socket, @MessageBody() data: { user_ids: string[] }) {
    const results = await this.realtime.getBulkPresence(data.user_ids || []);
    return { ok: true, presence: results };
  }

  @SubscribeMessage('presence:heartbeat')
  async heartbeat(@ConnectedSocket() client: Socket) {
    const user = client.data?.user;
    if (user) await this.realtime.heartbeat(user.id, client.id).catch(() => null);
    return { ok: true };
  }

  // ── Chat / Typing ─────────────────────────────────────────

  @SubscribeMessage('chat:join')
  async joinThread(@ConnectedSocket() client: Socket, @MessageBody() data: { thread_id: string }) {
    const user = client.data?.user;
    if (!user || !data?.thread_id) return { ok: false, error: 'invalid_request' };
    try { await this.chat.getThread(data.thread_id, user.id); } catch { return { ok: false, error: 'not_participant' }; }
    client.join(`thread:${data.thread_id}`);
    return { ok: true };
  }

  @SubscribeMessage('chat:leave')
  async leaveThread(@ConnectedSocket() client: Socket, @MessageBody() data: { thread_id: string }) {
    const user = client.data?.user;
    if (!user || !data?.thread_id) return { ok: false, error: 'invalid_request' };
    try { await this.chat.getThread(data.thread_id, user.id); } catch { return { ok: false, error: 'not_participant' }; }
    client.leave(`thread:${data.thread_id}`);
    return { ok: true };
  }

  @SubscribeMessage('chat:typing:start')
  async typingStart(@ConnectedSocket() client: Socket, @MessageBody() data: { thread_id: string }) {
    const user = client.data?.user;
    if (!user || !data?.thread_id) return { ok: false };
    try { await this.chat.getThread(data.thread_id, user.id); } catch { return { ok: false, error: 'not_participant' }; }
    client.to(`thread:${data.thread_id}`).emit('chat:typing:start', {
      thread_id: data.thread_id,
      user_id: user.id,
      name: user.name || user.id,
    });
  }

  @SubscribeMessage('chat:typing:stop')
  async typingStop(@ConnectedSocket() client: Socket, @MessageBody() data: { thread_id: string }) {
    const user = client.data?.user;
    if (!user || !data?.thread_id) return { ok: false };
    try { await this.chat.getThread(data.thread_id, user.id); } catch { return { ok: false, error: 'not_participant' }; }
    client.to(`thread:${data.thread_id}`).emit('chat:typing:stop', {
      thread_id: data.thread_id,
      user_id: user.id,
    });
  }

  @SubscribeMessage('chat:read')
  async chatRead(@ConnectedSocket() client: Socket, @MessageBody() data: { thread_id: string; last_message_id?: string }) {
    const user = client.data?.user;
    if (!user || !data?.thread_id) return { ok: false };
    try { await this.chat.getThread(data.thread_id, user.id); } catch { return { ok: false, error: 'not_participant' }; }
    this.server.to(`thread:${data.thread_id}`).emit('chat:read_receipt', {
      thread_id: data.thread_id,
      user_id: user.id,
      last_message_id: data.last_message_id,
      read_at: Date.now(),
    });
  }

  @SubscribeMessage('chat:delivered')
  async chatDelivered(@ConnectedSocket() client: Socket, @MessageBody() data: { thread_id: string; message_ids: string[] }) {
    const user = client.data?.user;
    if (!user || !data?.thread_id) return { ok: false };
    try { await this.chat.getThread(data.thread_id, user.id); } catch { return { ok: false, error: 'not_participant' }; }
    this.server.to(`thread:${data.thread_id}`).emit('chat:delivery_receipt', {
      thread_id: data.thread_id,
      user_id: user.id,
      message_ids: data.message_ids,
      delivered_at: Date.now(),
    });
  }

  // ── Call Signaling ───────────────────────────────────────

  @SubscribeMessage('call:incoming')
  async callIncoming(@ConnectedSocket() client: Socket, @MessageBody() data: { callee_id: string; session_id: string; call_type: string; caller_name: string }) {
    const user = client.data?.user;
    if (!user) return { ok: false };
    try { await this.livekit.authorizeSignaling(data.session_id, user.id, data.callee_id); } catch { return { ok: false, error: 'unauthorized_call' }; }
    this.server.to(`user:${data.callee_id}`).emit('call:incoming', {
      session_id: data.session_id,
      caller_id: user.id,
      caller_name: data.caller_name || user.name || user.id,
      call_type: data.call_type || 'video',
      timestamp: Date.now(),
    });
    return { ok: true };
  }

  @SubscribeMessage('call:accepted')
  async callAccepted(@ConnectedSocket() client: Socket, @MessageBody() data: { session_id: string; caller_id: string }) {
    const user = client.data?.user;
    if (!user) return { ok: false };
    try { await this.livekit.authorizeSignaling(data.session_id, user.id, data.caller_id); } catch { return { ok: false, error: 'unauthorized_call' }; }
    this.server.to(`user:${data.caller_id}`).emit('call:accepted', {
      session_id: data.session_id,
      callee_id: user.id,
      timestamp: Date.now(),
    });
    return { ok: true };
  }

  @SubscribeMessage('call:rejected')
  async callRejected(@ConnectedSocket() client: Socket, @MessageBody() data: { session_id: string; caller_id: string; reason?: string }) {
    const user = client.data?.user;
    if (!user) return { ok: false };
    try { await this.livekit.authorizeSignaling(data.session_id, user.id, data.caller_id); } catch { return { ok: false, error: 'unauthorized_call' }; }
    this.server.to(`user:${data.caller_id}`).emit('call:rejected', {
      session_id: data.session_id,
      callee_id: user.id,
      reason: data.reason || 'rejected',
      timestamp: Date.now(),
    });
    return { ok: true };
  }

  @SubscribeMessage('call:ended')
  async callEnded(@ConnectedSocket() client: Socket, @MessageBody() data: { session_id: string; other_user_id: string }) {
    const user = client.data?.user;
    if (!user) return { ok: false };
    try { await this.livekit.authorizeSignaling(data.session_id, user.id, data.other_user_id); } catch { return { ok: false, error: 'unauthorized_call' }; }
    this.server.to(`user:${data.other_user_id}`).emit('call:ended', {
      session_id: data.session_id,
      ended_by: user.id,
      timestamp: Date.now(),
    });
    return { ok: true };
  }

  @SubscribeMessage('call:ice_candidate')
  async iceCandidate(@ConnectedSocket() client: Socket, @MessageBody() data: { session_id: string; target_id: string; candidate: any }) {
    const user = client.data?.user;
    if (!user) return { ok: false };
    try { await this.livekit.authorizeSignaling(data.session_id, user.id, data.target_id); } catch { return { ok: false, error: 'unauthorized_call' }; }
    this.server.to(`user:${data.target_id}`).emit('call:ice_candidate', {
      session_id: data.session_id,
      from_id: client.data?.user?.id,
      candidate: data.candidate,
    });
  }

  @SubscribeMessage('call:sdp_offer')
  async sdpOffer(@ConnectedSocket() client: Socket, @MessageBody() data: { session_id: string; target_id: string; sdp: any }) {
    const user = client.data?.user;
    if (!user) return { ok: false };
    try { await this.livekit.authorizeSignaling(data.session_id, user.id, data.target_id); } catch { return { ok: false, error: 'unauthorized_call' }; }
    this.server.to(`user:${data.target_id}`).emit('call:sdp_offer', {
      session_id: data.session_id,
      from_id: client.data?.user?.id,
      sdp: data.sdp,
    });
  }

  @SubscribeMessage('call:sdp_answer')
  async sdpAnswer(@ConnectedSocket() client: Socket, @MessageBody() data: { session_id: string; target_id: string; sdp: any }) {
    const user = client.data?.user;
    if (!user) return { ok: false };
    try { await this.livekit.authorizeSignaling(data.session_id, user.id, data.target_id); } catch { return { ok: false, error: 'unauthorized_call' }; }
    this.server.to(`user:${data.target_id}`).emit('call:sdp_answer', {
      session_id: data.session_id,
      from_id: client.data?.user?.id,
      sdp: data.sdp,
    });
  }

  // ── General channel subscription ──────────────────────────

  @SubscribeMessage('join_channel')
  joinChannel(@ConnectedSocket() client: Socket, @MessageBody() data: { channel: string }) {
    if (data?.channel) client.join(data.channel);
    return { ok: true };
  }

  @SubscribeMessage('leave_channel')
  leaveChannel(@ConnectedSocket() client: Socket, @MessageBody() data: { channel: string }) {
    if (data?.channel) client.leave(data.channel);
    return { ok: true };
  }

  // ── Waiting Room ──────────────────────────────────────────

  @SubscribeMessage('waiting_room:join')
  async handleWaitingRoomJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { appointmentId: string },
  ) {
    if (!data?.appointmentId) return { ok: false, error: 'appointmentId required' };

    client.join(`appointment:${data.appointmentId}`);
    client.data.appointmentId = data.appointmentId;

    try {
      const appt = await this.apptModel.findOne({ id: data.appointmentId }).lean();
      if (!appt) return { ok: false, error: 'appointment not found' };

      const doctorId = appt.doctor_id;
      if (!this.doctorQueues.has(doctorId)) {
        this.doctorQueues.set(doctorId, []);
      }

      const queue = this.doctorQueues.get(doctorId)!;
      if (!queue.includes(data.appointmentId)) {
        queue.push(data.appointmentId);
      }

      await this.broadcastQueueUpdates(doctorId);
      return { ok: true };
    } catch (err) {
      this.logger.error(`Error joining waiting room: ${err.message}`);
      return { ok: false, error: 'internal_error' };
    }
  }

  @SubscribeMessage('waiting_room:leave')
  async handleWaitingRoomLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { appointmentId: string },
  ) {
    if (!data?.appointmentId) return { ok: false };

    client.leave(`appointment:${data.appointmentId}`);
    delete client.data.appointmentId;

    try {
      const appt = await this.apptModel.findOne({ id: data.appointmentId }).lean();
      if (appt) {
        this.removeFromQueue(appt.doctor_id, data.appointmentId);
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: 'internal_error' };
    }
  }

  private async broadcastQueueUpdates(doctorId: string) {
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

  private removeFromQueue(doctorId: string, appointmentId: string) {
    const queue = this.doctorQueues.get(doctorId);
    if (queue) {
      const idx = queue.indexOf(appointmentId);
      if (idx !== -1) {
        queue.splice(idx, 1);
        this.broadcastQueueUpdates(doctorId);
      }
    }
  }

  // ── Event Fanout from internal events ───────────────────────

  @OnEvent('order.*')
  onOrder(payload: any) {
    if (!payload) return;
    if (payload.patient_id) this.realtime.emitToUser(payload.patient_id, 'order_event', payload);
    if (payload.pharmacy_id) this.realtime.emitToUser(payload.pharmacy_id, 'order_event', payload);
    this.realtime.emitToRole('admin', 'order_event', payload);
  }

  @OnEvent('chat.*')
  onChat(payload: any) {
    if (!payload) return;
    // The chat service emits { meta: { thread_id, participant_ids, ... } } while
    // legacy producers use top-level fields — accept both shapes.
    const meta = payload.meta || payload;
    const threadId = meta.thread_id || payload.thread_id;
    const participantIds = meta.participant_ids || payload.participant_ids;
    const senderId = meta.sender_id || payload.sender_id || payload.actor_account_id;
    // Emit to thread room for real-time delivery
    if (threadId) this.realtime.emitToChannel(`thread:${threadId}`, 'chat:message', { ...meta, thread_id: threadId });
    // Also emit to individual users for unread badge updates
    if (participantIds) {
      for (const uid of participantIds) {
        if (uid !== senderId) this.realtime.emitToUser(uid, 'chat:new_message', { ...meta, thread_id: threadId });
      }
    }
  }

  @OnEvent('appointment.*')
  async onAppointment(payload: any) {
    if (!payload) return;

    let fullAppt = null;
    if (payload.id) {
      try {
        fullAppt = await this.apptModel.findOne({ id: payload.id }).lean();
      } catch {}
    }

    const patientId = payload.patient_id || fullAppt?.patient_id;
    const doctorUserId = payload.doctor_user_id || fullAppt?.doctor_user_id;

    if (patientId) this.realtime.emitToUser(patientId, 'appointment_event', payload);
    if (doctorUserId) this.realtime.emitToUser(doctorUserId, 'appointment_event', payload);
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

  @OnEvent('payment.*')
  onPayment(payload: any) {
    if (!payload) return;
    if (payload.patient_id) this.realtime.emitToUser(payload.patient_id, 'payment_event', payload);
  }

  @OnEvent('notification.created')
  onNotif(payload: any) {
    if (payload?.user_id) this.realtime.emitToUser(payload.user_id, 'notification', payload);
    if (payload?.role) this.realtime.emitToRole(payload.role, 'notification', payload);
  }

  @OnEvent('call.*')
  onCall(payload: any) {
    if (!payload) return;
    if (payload.callee_id) this.realtime.emitToUser(payload.callee_id, 'call_event', payload);
    if (payload.caller_id) this.realtime.emitToUser(payload.caller_id, 'call_event', payload);
  }

  // Admin stats
  getStats() {
    return {
      connected_sockets: this.connectedUsers.size,
      connected_users: this.userSockets.size,
    };
  }
}
