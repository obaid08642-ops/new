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
import { Logger, ForbiddenException } from '@nestjs/common';
import { Optional } from '@nestjs/common';
import { ChatService } from './chat.service';
import { isAccessTokenPayload, authenticateSocketToken, JwtAuthGuard } from '../../common/auth.guard';
import { OnEvent } from '@nestjs/event-emitter';
import { getWebSocketCorsOptions } from '../../config/websocket-cors';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken');

@WebSocketGateway({
  cors: getWebSocketCorsOptions(),
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // In a real app, use Redis adapter for multi-instance deployments
  private activeUsers = new Map<string, string>(); // socketId -> userId
  private restrictedThreads = new Map<string, string>(); // socketId -> thread id for chat_rt tokens

  constructor(private readonly chatService: ChatService, @Optional() private readonly authGuard?: JwtAuthGuard) {}

  async handleConnection(socket: Socket) {
    // M6/ER-11: identity must come from a verified JWT — previously any client
    // could claim any userId via handshake auth (spoofing hole).
    let userId: string | null = null;
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
    if (token) {
      try {
        const secret = process.env.JWT_SECRET;
        if (!secret) { this.logger.error('Socket rejected: JWT_SECRET not configured'); socket.disconnect(); return; }
        const payload: any = jwt.verify(token, secret);
        userId = payload?.sub || payload?.id || payload?.user_id || null;
        if (payload?.purpose === 'chat_rt') {
          if (payload?.aud !== 'chat-rt' || !payload?.thread_id || !userId) throw new Error('invalid_chat_rt_token');
          this.restrictedThreads.set(socket.id, payload.thread_id);
        } else if (!isAccessTokenPayload(payload)) {
          // R11 §5: refresh / QR / other non-access tokens never open a socket.
          throw new Error('not_an_access_token');
        } else if (this.authGuard) {
          // R11: an access token goes through the same JwtAuthGuard as REST
          // (token_version, staff gate and device lock, impersonation session).
          const user = await authenticateSocketToken(this.authGuard, token, socket.handshake.headers as Record<string, unknown>, String(socket.handshake.address || ''));
          if (!user) throw new Error('auth_guard_refused');
          userId = user.id || user.sub || userId;
        }
      } catch {
        userId = null;
        this.restrictedThreads.delete(socket.id);
        this.logger.warn('Socket rejected: invalid JWT');
      }
    }
    if (userId) {
      this.activeUsers.set(socket.id, userId);
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
      this.restrictedThreads.delete(socket.id);
      this.logger.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('join_thread')
  async handleJoinThread(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { threadId: string },
  ) {
    const userId = this.activeUsers.get(socket.id);
    if (!userId) return { error: 'socket_not_authenticated' };
    const restrictedThreadId = this.restrictedThreads.get(socket.id);
    if (restrictedThreadId && restrictedThreadId !== data.threadId) return { error: 'thread_token_scope_mismatch' };
    try {
      await this.chatService.getThread(data.threadId, userId);
    } catch {
      return { error: 'not_participant' };
    }
    socket.join(`thread_${data.threadId}`);
    return { status: 'joined' };
  }

  /** R11 §5: relays go only into a thread room this socket joined (membership checked on join). */
  private joined(socket: Socket, threadId: string): boolean {
    return !!threadId && !!socket?.rooms?.has?.(`thread_${threadId}`);
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { threadId: string; isTyping: boolean },
  ) {
    if (!this.joined(socket, data?.threadId)) return { error: 'not_joined' };
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
    if (!this.joined(socket, data?.threadId)) return { error: 'not_joined' };
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
    if (!this.joined(socket, data?.threadId)) return { error: 'not_joined' };
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

  @SubscribeMessage('mark_seen')
  async handleMarkSeen(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { threadId: string; messageIds?: string[] },
  ) {
    if (!this.joined(socket, data?.threadId)) return { error: 'not_joined' };
    // M6/ER-9: realtime read receipts — notify the other party instantly
    const userId = this.activeUsers.get(socket.id);
    socket.to(`thread_${data.threadId}`).emit('message_seen', {
      threadId: data.threadId,
      seenBy: userId,
      messageIds: data.messageIds || [],
      at: new Date(),
    });
    return { status: 'seen' };
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
