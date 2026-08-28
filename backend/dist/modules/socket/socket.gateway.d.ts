import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class AppSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private logger;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleMessage(client: Socket, payload: any): void;
    handleJoinProviderRoom(client: Socket, providerId: string): void;
    handleJoinPatientRoom(client: Socket, patientId: string): void;
    emitUrgentRequest(providerId: string, requestPayload: any): void;
    emitCopayRequired(patientId: string, copayPayload: any): void;
}
