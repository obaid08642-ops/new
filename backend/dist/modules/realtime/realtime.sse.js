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
exports.RealtimeSseModule = exports.RealtimeSseController = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const event_emitter_1 = require("@nestjs/event-emitter");
const auth_guard_1 = require("../../common/auth.guard");
let RealtimeSseController = class RealtimeSseController {
    constructor(em) {
        this.em = em;
    }
    stream(user) {
        const heartbeat = (0, rxjs_1.interval)(25_000).pipe((0, rxjs_1.mapTo)({ data: { type: 'heartbeat', t: Date.now() } }));
        const events = (0, rxjs_1.fromEvent)(this.em, 'realtime.user').pipe((0, rxjs_1.filter)((e) => e?.user_id === user.id), (0, rxjs_1.map)((e) => ({ data: e.payload, type: e.event })));
        return (0, rxjs_1.merge)(events, heartbeat).pipe((0, rxjs_1.startWith)({ data: { type: 'connected', t: Date.now() } }));
    }
    bookingStream(type, id) {
        const heartbeat = (0, rxjs_1.interval)(25_000).pipe((0, rxjs_1.mapTo)({ data: { type: 'heartbeat', t: Date.now() } }));
        const events = (0, rxjs_1.fromEvent)(this.em, 'realtime.booking').pipe((0, rxjs_1.filter)((e) => e?.kind === type && e?.id === id), (0, rxjs_1.map)((e) => ({ data: e.payload, type: e.event })));
        return (0, rxjs_1.merge)(events, heartbeat).pipe((0, rxjs_1.startWith)({ data: { type: 'connected', t: Date.now() } }));
    }
};
exports.RealtimeSseController = RealtimeSseController;
__decorate([
    (0, common_1.Sse)('stream'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", rxjs_1.Observable)
], RealtimeSseController.prototype, "stream", null);
__decorate([
    (0, common_1.Sse)('booking/:type/:id'),
    (0, auth_guard_1.Public)(),
    __param(0, (0, common_1.Param)('type')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", rxjs_1.Observable)
], RealtimeSseController.prototype, "bookingStream", null);
exports.RealtimeSseController = RealtimeSseController = __decorate([
    (0, common_1.Controller)('realtime'),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2])
], RealtimeSseController);
let RealtimeSseModule = class RealtimeSseModule {
};
exports.RealtimeSseModule = RealtimeSseModule;
exports.RealtimeSseModule = RealtimeSseModule = __decorate([
    (0, common_1.Module)({ controllers: [RealtimeSseController] })
], RealtimeSseModule);
//# sourceMappingURL=realtime.sse.js.map