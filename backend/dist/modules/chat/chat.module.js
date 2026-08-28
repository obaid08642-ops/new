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
exports.ChatModule = exports.ChatController = void 0;
const chat_gateway_1 = require("./chat.gateway");
const chat_service_1 = require("./chat.service");
const chat_schemas_1 = require("./chat.schemas");
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const idempotency_interceptor_1 = require("../../common/idempotency.interceptor");
const events_module_1 = require("../events/events.module");
let ChatController = class ChatController {
    constructor(svc) {
        this.svc = svc;
    }
    async getThreadPermissions(u, threadId) {
        const thread = await this.svc.threads.findOne({ id: threadId });
        if (!thread)
            throw new common_1.NotFoundException('thread_not_found');
        const isFamily = await this.svc.checkIfFamily(thread.participant_ids);
        if (isFamily || thread.type !== 'booking' || thread.booking_kind !== 'consultation') {
            return {
                status_code: 'active',
                status_text_ar: 'استشارة نشطة',
                status_text_en: 'Active Consultation',
                can_chat: true,
                can_call: true,
                can_upload: true,
                message_ar: 'الاستشارة نشطة الآن. يمكنك التحدث وإرسال الملفات وإجراء المكالمات.',
                message_en: 'Consultation is active. Chat, call, and uploads are enabled.',
            };
        }
        const AppointmentModel = this.svc.getModel('Appointment');
        const appt = await AppointmentModel.findOne({ id: thread.booking_id });
        if (!appt) {
            return {
                status_code: 'closed',
                status_text_ar: 'الاستشارة مغلقة',
                status_text_en: 'Consultation Closed',
                can_chat: false,
                can_call: false,
                can_upload: false,
                message_ar: 'لم يتم العثور على استشارة مرتبطة بهذه المحادثة.',
                message_en: 'No consultation associated with this conversation.',
            };
        }
        if (appt.status === 'PENDING') {
            return {
                status_code: 'upcoming',
                status_text_ar: 'حجز قادم',
                status_text_en: 'Upcoming Consultation',
                can_chat: false,
                can_call: false,
                can_upload: false,
                message_ar: 'لم تبدأ الاستشارة بعد. ستتمكن من التواصل مع الطبيب بمجرد تأكيد الحجز وبدء الموعد.',
                message_en: 'Consultation has not started yet. You can communicate once the booking is confirmed.',
                booking_id: thread.booking_id,
            };
        }
        if (appt.status === 'CANCELLED' || appt.status === 'NO_SHOW') {
            return {
                status_code: 'closed',
                status_text_ar: 'الاستشارة مغلقة',
                status_text_en: 'Consultation Closed',
                can_chat: false,
                can_call: false,
                can_upload: false,
                message_ar: appt.status === 'CANCELLED' ? 'تم إلغاء هذه الاستشارة.' : 'تم تسجيل عدم حضور للاستشارة.',
                message_en: appt.status === 'CANCELLED' ? 'This consultation was cancelled.' : 'No-show was recorded for this consultation.',
                booking_id: thread.booking_id,
            };
        }
        if (appt.status === 'COMPLETED') {
            const SystemConfigModel = this.svc.getModel('SystemConfig');
            const sysConfig = await SystemConfigModel.findOne({ key: 'system_config' });
            const followupHours = sysConfig?.value?.consultation_followup_hours ?? 24;
            const endedAt = appt.completed_at || appt.updatedAt || new Date();
            const elapsedHours = (Date.now() - new Date(endedAt).getTime()) / (1000 * 60 * 60);
            const remainingHours = Math.max(0, followupHours - elapsedHours);
            if (remainingHours > 0) {
                return {
                    status_code: 'follow_up',
                    status_text_ar: 'فترة المتابعة',
                    status_text_en: 'Follow-up Period',
                    can_chat: true,
                    can_call: false,
                    can_upload: true,
                    message_ar: 'فترة المتابعة نشطة. يمكنك إرسال الرسائل والملفات فقط. المكالمات غير متاحة.',
                    message_en: 'Follow-up period is active. Chat and uploads are enabled. Voice/video calls are disabled.',
                    remaining_hours: remainingHours,
                    booking_id: thread.booking_id,
                };
            }
            else {
                return {
                    status_code: 'closed',
                    status_text_ar: 'الاستشارة مغلقة',
                    status_text_en: 'Consultation Closed',
                    can_chat: false,
                    can_call: false,
                    can_upload: false,
                    message_ar: 'انتهت فترة المتابعة الخاصة بالاستشارة.',
                    message_en: 'Consultation follow-up period has ended.',
                    remaining_hours: 0,
                    booking_id: thread.booking_id,
                };
            }
        }
        return {
            status_code: 'active',
            status_text_ar: 'استشارة نشطة',
            status_text_en: 'Active Consultation',
            can_chat: true,
            can_call: true,
            can_upload: true,
            message_ar: 'الاستشارة نشطة الآن. يمكنك التحدث وإرسال الملفات وإجراء المكالمات.',
            message_en: 'Consultation is active. Chat, call, and uploads are enabled.',
            booking_id: thread.booking_id,
        };
    }
    myThreads(u, page = 1, limit = 30) {
        return this.svc.myThreads(u.id, +page, +limit);
    }
    createDirect(u, body) {
        return this.svc.getOrCreateDirectThread(u.id, body.other_user_id);
    }
    createGroup(u, body) {
        return this.svc.createGroupThread(u.id, body.name, body.participant_ids);
    }
    createBooking(u, body) {
        return this.svc.getOrCreateBookingThread(body.booking_kind, body.booking_id, u.id, body.provider_id);
    }
    getThread(u, threadId) {
        return this.svc.getThread(threadId, u.id);
    }
    getMessages(u, threadId, before, limit = 50, search) {
        return this.svc.getMessages(threadId, u.id, { before, limit: +limit, search });
    }
    sendMessage(u, threadId, body) {
        return this.svc.sendMessage(threadId, u.id, u.role || 'patient', body);
    }
    markRead(u, threadId, body) {
        return this.svc.markRead(threadId, u.id, body?.up_to_message_id);
    }
    rtToken(u, threadId) {
        return this.svc.issueRealtimeToken(threadId, u);
    }
    markDelivered(u, threadId) {
        return this.svc.markDelivered(threadId, u.id);
    }
    editMessage(u, msgId, body) {
        return this.svc.editMessage(msgId, u.id, body.body);
    }
    deleteMessage(u, msgId) {
        return this.svc.deleteMessage(msgId, u.id);
    }
    addReaction(u, msgId, body) {
        return this.svc.addReaction(msgId, u.id, body.emoji);
    }
    removeReaction(u, msgId, emoji) {
        return this.svc.removeReaction(msgId, u.id, emoji);
    }
    pinMessage(u, msgId) {
        return this.svc.pinMessage(msgId, u.id);
    }
    addParticipant(u, threadId, body) {
        return this.svc.addParticipant(threadId, u.id, body.user_id);
    }
    removeParticipant(u, threadId, userId) {
        return this.svc.removeParticipant(threadId, u.id, userId);
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Get)('threads/:threadId/permissions'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('threadId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getThreadPermissions", null);
__decorate([
    (0, common_1.Get)('threads'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "myThreads", null);
__decorate([
    (0, common_1.Post)('threads/direct'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "createDirect", null);
__decorate([
    (0, common_1.Post)('threads/group'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "createGroup", null);
__decorate([
    (0, common_1.Post)('threads/booking'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "createBooking", null);
__decorate([
    (0, common_1.Get)('threads/:threadId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('threadId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "getThread", null);
__decorate([
    (0, common_1.Get)('threads/:threadId/messages'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('threadId')),
    __param(2, (0, common_1.Query)('before')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object, String]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)('threads/:threadId/messages'),
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('threadId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)('threads/:threadId/read'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('threadId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "markRead", null);
__decorate([
    (0, common_1.Get)('threads/:threadId/rt-token'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('threadId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "rtToken", null);
__decorate([
    (0, common_1.Post)('threads/:threadId/delivered'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('threadId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "markDelivered", null);
__decorate([
    (0, common_1.Patch)('messages/:msgId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('msgId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "editMessage", null);
__decorate([
    (0, common_1.Delete)('messages/:msgId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('msgId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "deleteMessage", null);
__decorate([
    (0, common_1.Post)('messages/:msgId/reactions'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('msgId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "addReaction", null);
__decorate([
    (0, common_1.Delete)('messages/:msgId/reactions/:emoji'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('msgId')),
    __param(2, (0, common_1.Param)('emoji')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "removeReaction", null);
__decorate([
    (0, common_1.Post)('messages/:msgId/pin'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('msgId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "pinMessage", null);
__decorate([
    (0, common_1.Post)('threads/:threadId/participants'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('threadId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "addParticipant", null);
__decorate([
    (0, common_1.Delete)('threads/:threadId/participants/:userId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('threadId')),
    __param(2, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "removeParticipant", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.Controller)(['chat', 'chats']),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            events_module_1.EventsModule,
            mongoose_1.MongooseModule.forFeature([
                { name: 'ChatThread', schema: chat_schemas_1.ChatThreadSchema },
                { name: 'ChatMessage', schema: chat_schemas_1.ChatMessageSchema },
            ]),
        ],
        controllers: [ChatController],
        providers: [chat_service_1.ChatService, chat_gateway_1.ChatGateway],
        exports: [chat_service_1.ChatService],
    })
], ChatModule);
//# sourceMappingURL=chat.module.js.map