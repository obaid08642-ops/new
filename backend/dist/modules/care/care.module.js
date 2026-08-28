"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const care_controller_1 = require("./care.controller");
const appointments_controller_1 = require("./appointments.controller");
const care_service_1 = require("./care.service");
const appointments_service_1 = require("./appointments.service");
const doctor_referrals_controller_1 = require("./doctor-referrals.controller");
const encounter_referrals_schema_1 = require("./schemas/encounter-referrals.schema");
const doctor_profile_extended_schema_1 = require("./schemas/doctor-profile-extended.schema");
const slot_service_1 = require("./slot.service");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
const user_schema_1 = require("../../schemas/user.schema");
const appointment_schema_1 = require("../../schemas/appointment.schema");
const facility_schema_1 = require("../../schemas/facility.schema");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
const appointment_repository_1 = require("./repositories/appointment.repository");
const facility_repository_1 = require("./repositories/facility.repository");
const providerprofile_repository_1 = require("./repositories/providerprofile.repository");
const user_repository_1 = require("./repositories/user.repository");
let CareModule = class CareModule {
};
exports.CareModule = CareModule;
exports.CareModule = CareModule = __decorate([
    (0, common_1.Module)({
        imports: [
            workflow_engine_module_1.WorkflowEngineModule,
            mongoose_1.MongooseModule.forFeature([
                { name: provider_profile_schema_1.ProviderProfile.name, schema: provider_profile_schema_1.ProviderProfileSchema },
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: appointment_schema_1.Appointment.name, schema: appointment_schema_1.AppointmentSchema },
                { name: facility_schema_1.Facility.name, schema: facility_schema_1.FacilitySchema },
                { name: encounter_referrals_schema_1.EncounterReferral.name, schema: encounter_referrals_schema_1.EncounterReferralSchema },
                { name: doctor_profile_extended_schema_1.DoctorProfileExtended.name, schema: doctor_profile_extended_schema_1.DoctorProfileExtendedSchema },
            ]),
        ],
        controllers: [care_controller_1.CareController, care_controller_1.PublicSpecialtiesController, appointments_controller_1.AppointmentsController, doctor_referrals_controller_1.DoctorReferralsController],
        providers: [care_service_1.CareService, appointments_service_1.AppointmentsService, slot_service_1.SlotService, { provide: 'AppointmentRepository', useClass: appointment_repository_1.AppointmentRepository }, { provide: 'FacilityRepository', useClass: facility_repository_1.FacilityRepository }, { provide: 'ProviderProfileRepository', useClass: providerprofile_repository_1.ProviderProfileRepository }, { provide: 'UserRepository', useClass: user_repository_1.UserRepository }],
        exports: [care_service_1.CareService, appointments_service_1.AppointmentsService, slot_service_1.SlotService],
    })
], CareModule);
//# sourceMappingURL=care.module.js.map