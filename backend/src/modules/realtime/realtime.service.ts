import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PresenceService } from '../presence/presence.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger('RealtimeService');
  private server: Server | null = null;

  constructor(
    private readonly em: EventEmitter2,
    private readonly presenceService: PresenceService,
    private readonly redis: RedisService,
  ) {}

  setServer(s: Server) { this.server = s; }

  async emitToUser(userId: string, event: string, data: any) {
    if (this.server) {
      const presence = await this.presenceService.getPresence(userId);
      if (presence.online) {
        this.server.to(`user:${userId}`).emit(event, data);
      } else {
        // Queue for offline replay
        await this.redis.getClient().lpush(`offline_events:${userId}`, JSON.stringify({ event, data, ts: Date.now() }));
      }
    }
    this.em.emit('realtime.user', { user_id: userId, event, payload: data });
  }

  emitToRole(role: string, event: string, data: any) {
    if (this.server) this.server.to(`role:${role}`).emit(event, data);
  }

  emitToChannel(channel: string, event: string, data: any) {
    if (this.server) this.server.to(channel).emit(event, data);
  }

  emitGlobal(event: string, data: any) {
    if (this.server) this.server.emit(event, data);
  }

  emitToBooking(kind: string, id: string, event: string, data: any) {
    if (this.server) this.server.to(`booking:${kind}:${id}`).emit(event, data);
    this.em.emit('realtime.booking', { kind, id, event, payload: data });
  }

  async setUserOnline(userId: string, socketId: string): Promise<void> {
    if (this.presenceService) await this.presenceService.setOnline(userId, socketId);
  }

  async setUserOffline(userId: string, socketId: string): Promise<void> {
    if (this.presenceService) await this.presenceService.setOffline(userId, socketId);
  }

  async heartbeat(userId: string, socketId: string): Promise<void> {
    if (this.presenceService) await this.presenceService.heartbeat(userId, socketId);
  }

  async getPresence(userId: string): Promise<any> {
    if (this.presenceService) return this.presenceService.getPresence(userId);
    return { user_id: userId, online: false };
  }

  async getBulkPresence(userIds: string[]): Promise<any[]> {
    if (this.presenceService) return this.presenceService.getBulkPresence(userIds);
    return userIds.map(id => ({ user_id: id, online: false }));
  }
}
