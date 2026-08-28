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
exports.CommunityController = void 0;
const auth_guard_1 = require("../../common/auth.guard");
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const community_service_1 = require("./community.service");
let CommunityController = class CommunityController {
    constructor(communityService) {
        this.communityService = communityService;
    }
    listPosts(page, limit, tag, category) {
        return this.communityService.listPosts(+page || 1, +limit || 20, tag, category);
    }
    createPost(req, body) {
        return this.communityService.createPost(req.user?.id ?? 'guest', body);
    }
    getPost(id) {
        return this.communityService.getPostDetail(id);
    }
    addComment(req, postId, body) {
        return this.communityService.addComment(req.user?.id ?? 'guest', postId, body.body, body.is_anonymous);
    }
    votePost(req, postId, body) {
        return this.communityService.votePost(req.user?.id ?? 'guest', postId, body.vote);
    }
    deletePost(req, postId) {
        return this.communityService.deletePost(req.user?.id ?? 'guest', postId);
    }
    pendingPosts(page) {
        return this.communityService.getPendingPosts(+page || 1);
    }
    moderatePost(postId, body) {
        return this.communityService.moderatePost(postId, body.decision);
    }
    listSessions(status) {
        return this.communityService.listSessions(status);
    }
    createSession(req, body) {
        return this.communityService.createSession(req.user?.id ?? 'guest', body);
    }
    joinSession(req, sessionId) {
        return this.communityService.joinSession(req.user?.id ?? 'guest', sessionId);
    }
    updateSessionStatus(sessionId, body) {
        return this.communityService.updateSessionStatus(sessionId, body.status, body.stream_url);
    }
};
exports.CommunityController = CommunityController;
__decorate([
    (0, common_2.Get)('posts'),
    __param(0, (0, common_2.Query)('page')),
    __param(1, (0, common_2.Query)('limit')),
    __param(2, (0, common_2.Query)('tag')),
    __param(3, (0, common_2.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "listPosts", null);
__decorate([
    (0, common_2.Post)('posts'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "createPost", null);
__decorate([
    (0, common_2.Get)('posts/:id'),
    __param(0, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "getPost", null);
__decorate([
    (0, common_2.Post)('posts/:id/comment'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_2.Param)('id')),
    __param(2, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "addComment", null);
__decorate([
    (0, common_2.Put)('posts/:id/vote'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_2.Param)('id')),
    __param(2, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "votePost", null);
__decorate([
    (0, common_2.Delete)('posts/:id'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "deletePost", null);
__decorate([
    (0, common_2.Get)('admin/pending'),
    __param(0, (0, common_2.Query)('page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "pendingPosts", null);
__decorate([
    (0, common_2.Put)('admin/:id/moderate'),
    __param(0, (0, common_2.Param)('id')),
    __param(1, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "moderatePost", null);
__decorate([
    (0, common_2.Get)('live-sessions'),
    __param(0, (0, common_2.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "listSessions", null);
__decorate([
    (0, common_2.Post)('live-sessions'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "createSession", null);
__decorate([
    (0, common_2.Put)('live-sessions/:id/join'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "joinSession", null);
__decorate([
    (0, common_2.Put)('live-sessions/:id/status'),
    __param(0, (0, common_2.Param)('id')),
    __param(1, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CommunityController.prototype, "updateSessionStatus", null);
exports.CommunityController = CommunityController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_2.Controller)('community'),
    __metadata("design:paramtypes", [community_service_1.CommunityService])
], CommunityController);
//# sourceMappingURL=community.controller.js.map