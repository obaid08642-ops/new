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
var AppSocketGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSocketGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const websocket_cors_1 = require("../../config/websocket-cors");
let AppSocketGateway = AppSocketGateway_1 = class AppSocketGateway {
    constructor() {
        this.logger = new common_1.Logger(AppSocketGateway_1.name);
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    handleMessage(client, payload) {
        this.logger.log(`Message received: ${JSON.stringify(payload)}`);
        this.server.emit('newMessage', payload);
    }
    handleJoinProviderRoom(client, providerId) {
        client.join(`provider_${providerId}`);
        this.logger.log(`Client ${client.id} joined provider room: provider_${providerId}`);
    }
    handleJoinPatientRoom(client, patientId) {
        client.join(`patient_${patientId}`);
        this.logger.log(`Client ${client.id} joined patient room: patient_${patientId}`);
    }
    emitUrgentRequest(providerId, requestPayload) {
        this.server.to(`provider_${providerId}`).emit('incoming_urgent_request', requestPayload);
    }
    emitCopayRequired(patientId, copayPayload) {
        this.server.to(`patient_${patientId}`).emit('copay_required', copayPayload);
    }
};
exports.AppSocketGateway = AppSocketGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], AppSocketGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('sendMessage'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], AppSocketGateway.prototype, "handleMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinProviderRoom'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], AppSocketGateway.prototype, "handleJoinProviderRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinPatientRoom'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], AppSocketGateway.prototype, "handleJoinPatientRoom", null);
exports.AppSocketGateway = AppSocketGateway = AppSocketGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: (0, websocket_cors_1.getWebSocketCorsOptions)() })
], AppSocketGateway);
//# sourceMappingURL=socket.gateway.js.map