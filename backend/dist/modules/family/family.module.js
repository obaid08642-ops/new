"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FamilyModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const family_service_1 = require("./family.service");
const family_controller_1 = require("./family.controller");
const family_schemas_1 = require("../../schemas/family.schemas");
const familygroup_repository_1 = require("./repositories/familygroup.repository");
const familypermissionrequest_repository_1 = require("./repositories/familypermissionrequest.repository");
const sharedcalendarevent_repository_1 = require("./repositories/sharedcalendarevent.repository");
let FamilyModule = class FamilyModule {
};
exports.FamilyModule = FamilyModule;
exports.FamilyModule = FamilyModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'FamilyGroup', schema: family_schemas_1.FamilyGroupSchema },
                { name: 'SharedCalendarEvent', schema: family_schemas_1.SharedCalendarEventSchema },
                { name: 'FamilyPermissionRequest', schema: family_schemas_1.FamilyPermissionRequestSchema },
            ]),
        ],
        controllers: [family_controller_1.FamilyController],
        providers: [family_service_1.FamilyService, { provide: 'FamilyGroupRepository', useClass: familygroup_repository_1.FamilyGroupRepository }, { provide: 'FamilyPermissionRequestRepository', useClass: familypermissionrequest_repository_1.FamilyPermissionRequestRepository }, { provide: 'SharedCalendarEventRepository', useClass: sharedcalendarevent_repository_1.SharedCalendarEventRepository }],
        exports: [family_service_1.FamilyService],
    })
], FamilyModule);
//# sourceMappingURL=family.module.js.map