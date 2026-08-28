import { Server } from 'socket.io';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PresenceService } from '../presence/presence.service';
import { RedisService } from '../redis/redis.service';
export declare class RealtimeService {
    private readonly em;
    private readonly presenceService;
    private readonly redis;
    private readonly logger;
    private server;
    constructor(em: EventEmitter2, presenceService: PresenceService, redis: RedisService);
    setServer(s: Server): void;
    emitToUser(userId: string, event: string, data: any): Promise<void>;
    emitToRole(role: string, event: string, data: any): void;
    emitToChannel(channel: string, event: string, data: any): void;
    emitGlobal(event: string, data: any): void;
    emitToBooking(kind: string, id: string, event: string, data: any): void;
    setUserOnline(userId: string, socketId: string): Promise<void>;
    setUserOffline(userId: string, socketId: string): Promise<void>;
    heartbeat(userId: string, socketId: string): Promise<void>;
    getPresence(userId: string): Promise<any>;
    getBulkPresence(userIds: string[]): Promise<any[]>;
}
