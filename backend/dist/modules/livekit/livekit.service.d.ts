import { Model, Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class LiveKitService {
    private readonly appointments;
    private readonly conn;
    private readonly events;
    private readonly logger;
    constructor(appointments: Model<any>, conn: Connection, events: EventEmitter2);
    private get callSessions();
    createToken(roomName: string, participantName: string): Promise<string>;
    createBookingToken(roomName: string, participantName: string): Promise<string>;
    issueBookingCallToken(bookingId: string, user: any): Promise<{
        provider: string;
        token: string;
        room: string;
    }>;
    getProviderWaitingRoom(providerId: string): Promise<{
        id: any;
        name: any;
        time: any;
        checkedIn: boolean;
        waitTime: string;
    }[]>;
    pingPatient(providerId: string, patientId: string): Promise<{
        success: boolean;
        delivered_via: string;
    }>;
    markNoShow(providerId: string, appointmentId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    private findOwnedSession;
    authorizeSignaling(sessionId: string, userId: string, targetId?: string): Promise<any>;
    initiateCall(callerId: string, callerName: string, calleeId: string, callType: string, bookingId?: string): Promise<{
        room_name: string;
        token: string;
        call_type: string;
        session_id: string;
    }>;
    joinCall(sessionId: string, userId: string, userName: string): Promise<{
        room_name: any;
        token: string;
    }>;
    endCall(sessionId: string, userId: string): Promise<{
        success: boolean;
    }>;
    rejectCall(sessionId: string, userId: string): Promise<{
        success: boolean;
    }>;
    saveMetrics(sessionId: string, userId: string, metrics: any): Promise<{
        success: boolean;
    }>;
    getCallHistory(userId: string, page?: number, limit?: number): Promise<{
        data: {
            id: any;
            appointment_id: any;
            room_name: any;
            call_type: any;
            status: any;
            started_at: any;
            ended_at: any;
            duration_seconds: any;
            end_reason: any;
        }[];
        total: number;
        page: number;
        total_pages: number;
    }>;
    getSessionById(sessionId: string, userId: string): Promise<any>;
    getActiveRooms(): Promise<{
        room_name: any;
        appointment_id: any;
        patient_id: any;
        provider_id: any;
        call_type: any;
        status: any;
        started_at: any;
    }[]>;
    getCallAnalytics(): Promise<{
        total_calls: any;
        completed: any;
        failed: any;
        total_minutes: any;
        avg_duration_seconds: number;
        calls_today: number;
    }>;
    private roomService;
    getRoomParticipants(roomName: string): Promise<any>;
    muteParticipant(roomName: string, participantId: string, muted: boolean): Promise<{
        success: boolean;
        reason: string;
    } | {
        success: boolean;
        reason?: undefined;
    }>;
    removeParticipant(roomName: string, participantId: string): Promise<{
        success: boolean;
        reason: string;
    } | {
        success: boolean;
        reason?: undefined;
    }>;
}
