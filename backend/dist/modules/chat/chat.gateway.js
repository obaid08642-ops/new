"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const chat_service_1 = require("./chat.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const websocket_cors_1 = require("../../config/websocket-cors");
const jwt = require('jsonwebtoken');
let ChatGateway = ChatGateway_1 = class ChatGateway {
    constructor(chatService) {
        this.chatService = chatService;
        this.logger = new common_1.Logger(ChatGateway_1.name);
        this.activeUsers = new Map();
        this.restrictedThreads = new Map();
    }
    async handleConnection(socket) {
        let userId = null;
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
        if (token) {
            try {
                const secret = process.env.JWT_SECRET;
                if (!secret) {
                    this.logger.error('Socket rejected: JWT_SECRET not configured');
                    socket.disconnect();
                    return;
                }
                const payload = jwt.verify(token, secret);
                userId = payload?.sub || payload?.id || payload?.user_id || null;
                if (payload?.purpose === 'chat_rt') {
                    if (payload?.aud !== 'chat-rt' || !payload?.thread_id || !userId)
                        throw new Error('invalid_chat_rt_token');
                    this.restrictedThreads.set(socket.id, payload.thread_id);
                }
            }
            catch {
                this.logger.warn('Socket rejected: invalid JWT');
            }
        }
        if (userId) {
            this.activeUsers.set(socket.id, userId);
            socket.join(userId);
            this.logger.log(`User ${userId} connected (Socket: ${socket.id})`);
        }
        else {
            socket.disconnect();
        }
    }
    handleDisconnect(socket) {
        const userId = this.activeUsers.get(socket.id);
        if (userId) {
            this.activeUsers.delete(socket.id);
            this.restrictedThreads.delete(socket.id);
            this.logger.log(`User ${userId} disconnected`);
        }
    }
    async handleJoinThread(socket, data) {
        const userId = this.activeUsers.get(socket.id);
        if (!userId)
            return { error: 'socket_not_authenticated' };
        const restrictedThreadId = this.restrictedThreads.get(socket.id);
        if (restrictedThreadId && restrictedThreadId !== data.threadId)
            return { error: 'thread_token_scope_mismatch' };
        try {
            await this.chatService.getThread(data.threadId, userId);
        }
        catch {
            return { error: 'not_participant' };
        }
        socket.join(`thread_${data.threadId}`);
        return { status: 'joined' };
    }
    async handleTyping(socket, data) {
        const userId = this.activeUsers.get(socket.id);
        socket.to(`thread_${data.threadId}`).emit('typing', {
            threadId: data.threadId,
            userId,
            isTyping: data.isTyping,
        });
    }
    async handleSendMessage(socket, data) {
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
    async handleInitiateCall(socket, data) {
        if (data.state === 'FOLLOW_UP' || data.state === 'CLOSED') {
            return { error: 'calls_disabled_in_this_state' };
        }
        socket.to(`thread_${data.threadId}`).emit('incoming_call', {
            threadId: data.threadId,
            callerId: this.activeUsers.get(socket.id)
        });
        return { status: 'calling' };
    }
    async handleMarkSeen(socket, data) {
        const userId = this.activeUsers.get(socket.id);
        socket.to(`thread_${data.threadId}`).emit('message_seen', {
            threadId: data.threadId,
            seenBy: userId,
            messageIds: data.messageIds || [],
            at: new Date(),
        });
        return { status: 'seen' };
    }
    handleMedicalOrders(payload) {
        this.logger.log(`Emitting medical_orders_received to thread_${payload.threadId}`);
        this.server.to(`thread_${payload.threadId}`).emit('medical_orders_received', {
            prescriptions: payload.prescriptions,
            labs: payload.labs
        });
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_thread'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleJoinThread", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('send_message'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('initiate_call'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleInitiateCall", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('mark_seen'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMarkSeen", null);
__decorate([
    (0, event_emitter_1.OnEvent)('medical_orders.emitted'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleMedicalOrders", null);
exports.ChatGateway = ChatGateway = ChatGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: (0, websocket_cors_1.getWebSocketCorsOptions)(),
    }),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map