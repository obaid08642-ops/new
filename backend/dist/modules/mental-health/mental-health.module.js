"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MentalHealthModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mental_health_service_1 = require("./mental-health.service");
const mental_health_controller_1 = require("./mental-health.controller");
const mental_health_schema_1 = require("../../schemas/mental-health.schema");
const breathingsession_repository_1 = require("./repositories/breathingsession.repository");
const crisiscontact_repository_1 = require("./repositories/crisiscontact.repository");
const meditationsession_repository_1 = require("./repositories/meditationsession.repository");
const moodentry_repository_1 = require("./repositories/moodentry.repository");
let MentalHealthModule = class MentalHealthModule {
};
exports.MentalHealthModule = MentalHealthModule;
exports.MentalHealthModule = MentalHealthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'MoodEntry', schema: mental_health_schema_1.MoodEntrySchema },
                { name: 'MeditationSession', schema: mental_health_schema_1.MeditationSessionSchema },
                { name: 'BreathingSession', schema: mental_health_schema_1.BreathingSessionSchema },
                { name: 'CrisisContact', schema: mental_health_schema_1.CrisisContactSchema },
            ]),
        ],
        controllers: [mental_health_controller_1.MentalHealthController],
        providers: [
            mental_health_service_1.MentalHealthService,
            { provide: 'BreathingSessionRepository', useClass: breathingsession_repository_1.BreathingSessionRepository },
            { provide: 'CrisisContactRepository', useClass: crisiscontact_repository_1.CrisisContactRepository },
            { provide: 'MeditationSessionRepository', useClass: meditationsession_repository_1.MeditationSessionRepository },
            { provide: 'MoodEntryRepository', useClass: moodentry_repository_1.MoodEntryRepository },
        ],
        exports: [mental_health_service_1.MentalHealthService],
    })
], MentalHealthModule);
//# sourceMappingURL=mental-health.module.js.map