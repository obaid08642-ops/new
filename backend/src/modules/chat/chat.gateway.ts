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
import { ChatService } from './chat.service';
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

  constructor(private readonly chatService: ChatService) {}

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
        }
      } catch {
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

  // ═══ SECURITY (F-C7): every thread-scoped event must re-verify participation.
  // Previously typing/send/seen/call relayed into ANY room id — any authenticated
  // socket could inject messages or presence into threads it does not belong to.
  private async assertThreadMembership(userId: string, threadId: string): Promise<boolean> {
    try {
      await this.chatService.getThread(threadId, userId);
      return true;
    } catch {
      this.logger.warn(`WS membership violation: user=${userId} thread=${threadId}`);
      return false;
    }
  }

  private threadScopeAllowed(socket: Socket, threadId: string): boolean {
    const restrictedThreadId = this.restrictedThreads.get(socket.id);
    return !restrictedThreadId || restrictedThreadId === threadId;
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { threadId: string; isTyping: boolean },
  ) {
    const userId = this.activeUsers.get(socket.id);
    if (!userId) return { error: 'socket_not_authenticated' };
    if (!(await this.assertThreadMembership(userId, data.threadId))) return { error: 'not_participant' };
    if (!this.threadScopeAllowed(socket, data.threadId)) return { error: 'thread_token_scope_mismatch' };
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
    const senderId = this.activeUsers.get(socket.id);
    if (!senderId) return { error: 'socket_not_authenticated' };
    // Enforce CLOSED state
    if (data.state === 'CLOSED') {
      return { error: 'chat_closed_after_24h' };
    }
    if (!(await this.assertThreadMembership(senderId, data.threadId))) return { error: 'not_participant' };
    if (!this.threadScopeAllowed(socket, data.threadId)) return { error: 'thread_token_scope_mismatch' };
    socket.to(`thread_${data.threadId}`).emit('new_message', {
      threadId: data.threadId,
      userId: senderId,
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
    const callerId = this.activeUsers.get(socket.id);
    if (!callerId) return { error: 'socket_not_authenticated' };
    if (!(await this.assertThreadMembership(callerId, data.threadId))) return { error: 'not_participant' };
    if (!this.threadScopeAllowed(socket, data.threadId)) return { error: 'thread_token_scope_mismatch' };
    // Enforce PRE_CONSULTATION state
    if (data.state === 'FOLLOW_UP' || data.state === 'CLOSED') {
      return { error: 'calls_disabled_in_this_state' };
    }
    
    socket.to(`thread_${data.threadId}`).emit('incoming_call', {
      threadId: data.threadId,
      callerId,
    });
    return { status: 'calling' };
  }

  @SubscribeMessage('mark_seen')
  async handleMarkSeen(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { threadId: string; messageIds?: string[] },
  ) {
    // M6/ER-9: realtime read receipts — notify the other party instantly
    const userId = this.activeUsers.get(socket.id);
    if (!userId) return { error: 'socket_not_authenticated' };
    if (!(await this.assertThreadMembership(userId, data.threadId))) return { error: 'not_participant' };
    if (!this.threadScopeAllowed(socket, data.threadId)) return { error: 'thread_token_scope_mismatch' };
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

  // REST-sent messages (web BFF, mobile fallback) fan out to the same room the
  // WS send path uses — one realtime contract for every client origin.
  @OnEvent('chat.message_sent')
  handleRestMessageSent(payload: { thread_id?: string; sender_id?: string; body?: string; actor_account_id?: string }) {
    const threadId = payload?.thread_id;
    if (!threadId) return;
    this.server.to(`thread_${threadId}`).emit('new_message', {
      threadId,
      userId: payload.actor_account_id || payload.sender_id,
      content: payload.body || '',
      timestamp: new Date(),
    });
  }
}
