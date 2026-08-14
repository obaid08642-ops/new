import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } })
export class AppSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger(AppSocketGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  handleMessage(client: Socket, payload: any): void {
    this.logger.log(`Message received: ${JSON.stringify(payload)}`);
    this.server.emit('newMessage', payload);
  }

  // --- V3.0 DOCTOR PLATFORM SOCKETS ---
  
  @SubscribeMessage('joinProviderRoom')
  handleJoinProviderRoom(client: Socket, providerId: string): void {
    client.join(`provider_${providerId}`);
    this.logger.log(`Client ${client.id} joined provider room: provider_${providerId}`);
  }

  @SubscribeMessage('joinPatientRoom')
  handleJoinPatientRoom(client: Socket, patientId: string): void {
    client.join(`patient_${patientId}`);
    this.logger.log(`Client ${client.id} joined patient room: patient_${patientId}`);
  }

  emitUrgentRequest(providerId: string, requestPayload: any) {
    this.server.to(`provider_${providerId}`).emit('incoming_urgent_request', requestPayload);
  }

  emitCopayRequired(patientId: string, copayPayload: any) {
    this.server.to(`patient_${patientId}`).emit('copay_required', copayPayload);
  }
}
