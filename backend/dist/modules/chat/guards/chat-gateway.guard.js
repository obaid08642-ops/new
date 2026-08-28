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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGatewayGuard = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const chat_session_schema_1 = require("../../../schemas/chat-session.schema");
const user_schema_1 = require("../../../schemas/user.schema");
const enums_1 = require("../../../common/enums");
let ChatGatewayGuard = class ChatGatewayGuard {
    constructor(chatSessionModel, userModel) {
        this.chatSessionModel = chatSessionModel;
        this.userModel = userModel;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const { chatSessionId, senderId, actionType } = request.body;
        const session = await this.chatSessionModel.findById(chatSessionId);
        if (!session)
            throw new common_1.ForbiddenException('Chat session record not registered.');
        if (session.type === 'FAMILY')
            return true;
        if (session.status === 'WAITING_FOR_DOCTOR') {
            const sender = await this.userModel.findById(senderId);
            if (!sender || sender.role !== enums_1.UserRole.DOCTOR) {
                throw new common_1.ForbiddenException('المريض في غرفة الانتظار الافتراضية. يجب على الطبيب فتح وبدء الاستشارة أولاً.');
            }
            session.status = 'LIVE';
            await session.save();
        }
        if (session.status === 'FOLLOW_UP') {
            if (actionType === 'MEDIA_STREAM') {
                throw new common_1.ForbiddenException('انتهت مدة الاستشارة الطبية الحية. قنوات الصوت والفيديو مغلقة، متاح الشات الكتابي فقط للمتابعة.');
            }
        }
        if (session.status === 'CLOSED') {
            throw new common_1.ForbiddenException('تم إغلاق الجلسة الطبية والمتابعة نهائياً. يمكنك فقط الاطلاع على سجل المحادثة كأرشيف طبي.');
        }
        return true;
    }
};
exports.ChatGatewayGuard = ChatGatewayGuard;
exports.ChatGatewayGuard = ChatGatewayGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(chat_session_schema_1.ChatSession.name)),
    __param(1, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], ChatGatewayGuard);
//# sourceMappingURL=chat-gateway.guard.js.map