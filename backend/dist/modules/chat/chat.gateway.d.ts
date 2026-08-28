import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly chatService;
    server: Server;
    private readonly logger;
    private activeUsers;
    private restrictedThreads;
    constructor(chatService: ChatService);
    handleConnection(socket: Socket): Promise<void>;
    handleDisconnect(socket: Socket): void;
    handleJoinThread(socket: Socket, data: {
        threadId: string;
    }): Promise<{
        error: string;
        status?: undefined;
    } | {
        status: string;
        error?: undefined;
    }>;
    handleTyping(socket: Socket, data: {
        threadId: string;
        isTyping: boolean;
    }): Promise<void>;
    handleSendMessage(socket: Socket, data: {
        threadId: string;
        content: string;
        state: string;
    }): Promise<{
        error: string;
        status?: undefined;
    } | {
        status: string;
        error?: undefined;
    }>;
    handleInitiateCall(socket: Socket, data: {
        threadId: string;
        state: string;
    }): Promise<{
        error: string;
        status?: undefined;
    } | {
        status: string;
        error?: undefined;
    }>;
    handleMarkSeen(socket: Socket, data: {
        threadId: string;
        messageIds?: string[];
    }): Promise<{
        status: string;
    }>;
    handleMedicalOrders(payload: {
        threadId: string;
        prescriptions: any[];
        labs: any[];
    }): void;
}
