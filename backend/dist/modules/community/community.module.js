"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const community_service_1 = require("./community.service");
const community_controller_1 = require("./community.controller");
const community_schemas_1 = require("../../schemas/community.schemas");
const livesession_repository_1 = require("./repositories/livesession.repository");
const post_repository_1 = require("./repositories/post.repository");
const postcomment_repository_1 = require("./repositories/postcomment.repository");
let CommunityModule = class CommunityModule {
};
exports.CommunityModule = CommunityModule;
exports.CommunityModule = CommunityModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'Post', schema: community_schemas_1.PostSchema },
                { name: 'PostComment', schema: community_schemas_1.PostCommentSchema },
                { name: 'LiveSession', schema: community_schemas_1.LiveSessionSchema },
            ]),
        ],
        controllers: [community_controller_1.CommunityController],
        providers: [community_service_1.CommunityService, { provide: 'LiveSessionRepository', useClass: livesession_repository_1.LiveSessionRepository }, { provide: 'PostRepository', useClass: post_repository_1.PostRepository }, { provide: 'PostCommentRepository', useClass: postcomment_repository_1.PostCommentRepository }],
        exports: [community_service_1.CommunityService],
    })
], CommunityModule);
//# sourceMappingURL=community.module.js.map