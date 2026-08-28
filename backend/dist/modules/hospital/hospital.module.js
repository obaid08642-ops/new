"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HospitalModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const hospital_branch_schema_1 = require("./schemas/hospital-branch.schema");
const hospital_department_schema_1 = require("./schemas/hospital-department.schema");
const hospital_staff_schema_1 = require("./schemas/hospital-staff.schema");
const hospital_invitation_schema_1 = require("./schemas/hospital-invitation.schema");
const doctor_profile_extended_schema_1 = require("../care/schemas/doctor-profile-extended.schema");
const hospital_controller_1 = require("./controllers/hospital.controller");
const hospital_service_1 = require("./services/hospital.service");
const user_schema_1 = require("../../schemas/user.schema");
const appointment_schema_1 = require("../../schemas/appointment.schema");
let HospitalModule = class HospitalModule {
};
exports.HospitalModule = HospitalModule;
exports.HospitalModule = HospitalModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: hospital_branch_schema_1.HospitalBranch.name, schema: hospital_branch_schema_1.HospitalBranchSchema },
                { name: hospital_department_schema_1.HospitalDepartment.name, schema: hospital_department_schema_1.HospitalDepartmentSchema },
                { name: hospital_staff_schema_1.HospitalStaff.name, schema: hospital_staff_schema_1.HospitalStaffSchema },
                { name: hospital_invitation_schema_1.HospitalInvitation.name, schema: hospital_invitation_schema_1.HospitalInvitationSchema },
                { name: doctor_profile_extended_schema_1.DoctorProfileExtended.name, schema: doctor_profile_extended_schema_1.DoctorProfileExtendedSchema },
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: appointment_schema_1.Appointment.name, schema: appointment_schema_1.AppointmentSchema },
            ]),
        ],
        controllers: [hospital_controller_1.HospitalController],
        providers: [hospital_service_1.HospitalService],
        exports: [hospital_service_1.HospitalService],
    })
], HospitalModule);
//# sourceMappingURL=hospital.module.js.map