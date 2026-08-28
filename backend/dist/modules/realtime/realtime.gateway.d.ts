import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RealtimeService } from './realtime.service';
import { Model } from 'mongoose';
import { AppointmentDocument } from '../../schemas/appointment.schema';
import { ChatService } from '../chat/chat.service';
import { LiveKitService } from '../livekit/livekit.service';
export declare class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwt;
    private readonly realtime;
    private readonly apptModel;
    private readonly chat;
    private readonly livekit;
    server: Server;
    private readonly logger;
    private connectedUsers;
    private userSockets;
    private doctorQueues;
    constructor(jwt: JwtService, realtime: RealtimeService, apptModel: Model<AppointmentDocument>, chat: ChatService, livekit: LiveKitService);
    afterInit(server: Server): void;
    handleConnection(client: Socket): Promise<void>;
    private replayOfflineQueue;
    handleDisconnect(client: Socket): Promise<void>;
    getPresence(client: Socket, data: {
        user_ids: string[];
    }): Promise<{
        ok: boolean;
        presence: any[];
    }>;
    heartbeat(client: Socket): Promise<{
        ok: boolean;
    }>;
    joinThread(client: Socket, data: {
        thread_id: string;
    }): Promise<{
        ok: boolean;
        error: string;
    } | {
        ok: boolean;
        error?: undefined;
    }>;
    leaveThread(client: Socket, data: {
        thread_id: string;
    }): Promise<{
        ok: boolean;
        error: string;
    } | {
        ok: boolean;
        error?: undefined;
    }>;
    typingStart(client: Socket, data: {
        thread_id: string;
    }): Promise<{
        ok: boolean;
        error?: undefined;
    } | {
        ok: boolean;
        error: string;
    }>;
    typingStop(client: Socket, data: {
        thread_id: string;
    }): Promise<{
        ok: boolean;
        error?: undefined;
    } | {
        ok: boolean;
        error: string;
    }>;
    chatRead(client: Socket, data: {
        thread_id: string;
        last_message_id?: string;
    }): Promise<{
        ok: boolean;
        error?: undefined;
    } | {
        ok: boolean;
        error: string;
    }>;
    chatDelivered(client: Socket, data: {
        thread_id: string;
        message_ids: string[];
    }): Promise<{
        ok: boolean;
        error?: undefined;
    } | {
        ok: boolean;
        error: string;
    }>;
    callIncoming(client: Socket, data: {
        callee_id: string;
        session_id: string;
        call_type: string;
        caller_name: string;
    }): Promise<{
        ok: boolean;
        error?: undefined;
    } | {
        ok: boolean;
        error: string;
    }>;
    callAccepted(client: Socket, data: {
        session_id: string;
        caller_id: string;
    }): Promise<{
        ok: boolean;
        error?: undefined;
    } | {
        ok: boolean;
        error: string;
    }>;
    callRejected(client: Socket, data: {
        session_id: string;
        caller_id: string;
        reason?: string;
    }): Promise<{
        ok: boolean;
        error?: undefined;
    } | {
        ok: boolean;
        error: string;
    }>;
    callEnded(client: Socket, data: {
        session_id: string;
        other_user_id: string;
    }): Promise<{
        ok: boolean;
        error?: undefined;
    } | {
        ok: boolean;
        error: string;
    }>;
    iceCandidate(client: Socket, data: {
        session_id: string;
        target_id: string;
        candidate: any;
    }): Promise<{
        ok: boolean;
        error?: undefined;
    } | {
        ok: boolean;
        error: string;
    }>;
    sdpOffer(client: Socket, data: {
        session_id: string;
        target_id: string;
        sdp: any;
    }): Promise<{
        ok: boolean;
        error?: undefined;
    } | {
        ok: boolean;
        error: string;
    }>;
    sdpAnswer(client: Socket, data: {
        session_id: string;
        target_id: string;
        sdp: any;
    }): Promise<{
        ok: boolean;
        error?: undefined;
    } | {
        ok: boolean;
        error: string;
    }>;
    joinChannel(client: Socket, data: {
        channel: string;
    }): {
        ok: boolean;
        error: string;
    };
    leaveChannel(client: Socket, data: {
        channel: string;
    }): {
        ok: boolean;
        error: string;
    };
    handleWaitingRoomJoin(client: Socket, data: {
        appointmentId: string;
    }): Promise<{
        ok: boolean;
        error: string;
    } | {
        ok: boolean;
        error?: undefined;
    }>;
    handleWaitingRoomLeave(client: Socket, data: {
        appointmentId: string;
    }): Promise<{
        ok: boolean;
        error?: undefined;
    } | {
        ok: boolean;
        error: string;
    }>;
    private isWaitingRoomParticipant;
    private isWaitingRoomOpen;
    private broadcastQueueUpdates;
    private removeFromQueue;
    onOrder(payload: any): void;
    onChat(payload: any): void;
    onAppointment(payload: any): Promise<void>;
    onPayment(payload: any): void;
    onNotif(payload: any): void;
    onCall(payload: any): void;
    getStats(): {
        connected_sockets: number;
        connected_users: number;
    };
}
