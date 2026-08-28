import { LiveKitService } from './livekit.service';
export declare class LiveKitController {
    private readonly svc;
    getWaitingRoom(u: any): Promise<{
        id: any;
        name: any;
        time: any;
        checkedIn: boolean;
        waitTime: string;
    }[]>;
    pingPatient(u: any, body: {
        patient_id: string;
    }): Promise<{
        success: boolean;
        delivered_via: string;
    }>;
    markNoShow(u: any, body: {
        appointment_id: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    constructor(svc: LiveKitService);
    webhook(body: any): Promise<{
        received: boolean;
    }>;
    initiateCall(u: any, body: {
        callee_id?: string;
        call_type?: 'voice' | 'video';
        booking_id?: string;
        appointmentId?: string;
    }): Promise<{
        room_name: string;
        token: string;
        call_type: string;
        session_id: string;
    }>;
    joinCall(u: any, sessionId: string): Promise<{
        room_name: any;
        token: string;
    }>;
    endCall(u: any, sessionId: string): Promise<{
        success: boolean;
    }>;
    rejectCall(u: any, sessionId: string): Promise<{
        success: boolean;
    }>;
    saveMetrics(u: any, sessionId: string, body: {
        metrics: Array<{
            packet_loss: number;
            jitter: number;
            rtt: number;
            bitrate: number;
        }>;
    }): Promise<{
        success: boolean;
    }>;
    history(u: any, page?: number, limit?: number): Promise<{
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
    getSession(u: any, sessionId: string): Promise<any>;
    getRooms(): Promise<{
        room_name: any;
        appointment_id: any;
        patient_id: any;
        provider_id: any;
        call_type: any;
        status: any;
        started_at: any;
    }[]>;
    getAnalytics(): Promise<{
        total_calls: any;
        completed: any;
        failed: any;
        total_minutes: any;
        avg_duration_seconds: number;
        calls_today: number;
    }>;
    getParticipants(roomName: string): Promise<any>;
    muteParticipant(roomName: string, pid: string, body: {
        muted: boolean;
    }): Promise<{
        success: boolean;
        reason: string;
    } | {
        success: boolean;
        reason?: undefined;
    }>;
    removeParticipant(roomName: string, pid: string): Promise<{
        success: boolean;
        reason: string;
    } | {
        success: boolean;
        reason?: undefined;
    }>;
}
