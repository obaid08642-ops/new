import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';


@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // In a real app, use Redis adapter for multi-instance deployments
  private activeUsers = new Map<string, string>(); // socketId -> userId

  // constructor(private readonly chatService: any) {} // Removed to avoid Object DI issue

  async handleConnection(socket: Socket) {
    const userId = socket.handshake.auth.userId || socket.handshake.query.userId;
    if (userId) {
      this.activeUsers.set(socket.id, userId as string);
      socket.join(userId);
      this.logger.log(`User ${userId} connected (Socket: ${socket.id})`);
    } else {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const userId = this.activeUsers.get(socket.id);
    if (userId) {
      this.activeUsers.delete(socket.id);
      this.logger.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('join_thread')
  async handleJoinThread(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { threadId: string },
  ) {
    socket.join(`thread_${data.threadId}`);
    return { status: 'joined' };
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { threadId: string; isTyping: boolean },
  ) {
    const userId = this.activeUsers.get(socket.id);
    socket.to(`thread_${data.threadId}`).emit('typing', {
      threadId: data.threadId,
      userId,
      isTyping: data.isTyping,
    });
  }

  // --- V3.0 DOCTOR PLATFORM ENFORCEMENT ---

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { threadId: string; content: string; state: string },
  ) {
    // Enforce CLOSED state
    if (data.state === 'CLOSED') {
      return { error: 'chat_closed_after_24h' };
    }
    
    const userId = this.activeUsers.get(socket.id);
    socket.to(`thread_${data.threadId}`).emit('new_message', {
      threadId: data.threadId,
      userId,
      content: data.content,
      timestamp: new Date()
    });
    return { status: 'sent' };
  }

  @SubscribeMessage('initiate_call')
  async handleInitiateCall(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { threadId: string; state: string },
  ) {
    // Enforce PRE_CONSULTATION state
    if (data.state === 'FOLLOW_UP' || data.state === 'CLOSED') {
      return { error: 'calls_disabled_in_this_state' };
    }
    
    socket.to(`thread_${data.threadId}`).emit('incoming_call', {
      threadId: data.threadId,
      callerId: this.activeUsers.get(socket.id)
    });
    return { status: 'calling' };
  }

  @OnEvent('medical_orders.emitted')
  handleMedicalOrders(payload: { threadId: string, prescriptions: any[], labs: any[] }) {
    this.logger.log(`Emitting medical_orders_received to thread_${payload.threadId}`);
    this.server.to(`thread_${payload.threadId}`).emit('medical_orders_received', {
      prescriptions: payload.prescriptions,
      labs: payload.labs
    });
  }
}
