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
exports.PublicSpecialtiesController = exports.CareController = void 0;
const common_1 = require("@nestjs/common");
const care_service_1 = require("./care.service");
const auth_guard_1 = require("../../common/auth.guard");
let CareController = class CareController {
    constructor(svc) {
        this.svc = svc;
    }
    specialties() {
        return this.svc.specialties();
    }
    insuranceCompanies() {
        return this.svc.insuranceCompanies();
    }
    degrees() {
        return this.svc.academicDegrees();
    }
    doctors(specialty, service_type, available_today, q, city, facility_id, degree, insurance, accepts_insurance, lat, lng, sort, page, limit) {
        return this.svc.listDoctors({
            specialty, service_type,
            available_today: available_today === 'true' || available_today === '1',
            q, city, facility_id, degree, insurance,
            accepts_insurance: accepts_insurance === 'true' ? true : accepts_insurance === 'false' ? false : undefined,
            lat: lat ? parseFloat(lat) : undefined,
            lng: lng ? parseFloat(lng) : undefined,
            sort,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
    }
    doctor(id) {
        return this.svc.doctorById(id);
    }
    slots(id, date, service_type) {
        return this.svc.doctorSlots(id, date, service_type);
    }
    search(q) {
        return this.svc.smartSearch(q || '');
    }
    facilities(city, type, specialty, q, limit) {
        return this.svc.listFacilities({ city, type, specialty, q, limit: limit ? parseInt(limit, 10) : 50 });
    }
    facility(id) {
        return this.svc.facilityById(id);
    }
};
exports.CareController = CareController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('specialties'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CareController.prototype, "specialties", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('insurance'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CareController.prototype, "insuranceCompanies", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('degrees'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CareController.prototype, "degrees", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('doctors'),
    __param(0, (0, common_1.Query)('specialty')),
    __param(1, (0, common_1.Query)('service_type')),
    __param(2, (0, common_1.Query)('available_today')),
    __param(3, (0, common_1.Query)('q')),
    __param(4, (0, common_1.Query)('city')),
    __param(5, (0, common_1.Query)('facility_id')),
    __param(6, (0, common_1.Query)('degree')),
    __param(7, (0, common_1.Query)('insurance')),
    __param(8, (0, common_1.Query)('accepts_insurance')),
    __param(9, (0, common_1.Query)('lat')),
    __param(10, (0, common_1.Query)('lng')),
    __param(11, (0, common_1.Query)('sort')),
    __param(12, (0, common_1.Query)('page')),
    __param(13, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], CareController.prototype, "doctors", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('doctors/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CareController.prototype, "doctor", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('doctors/:id/slots'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('date')),
    __param(2, (0, common_1.Query)('service_type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], CareController.prototype, "slots", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CareController.prototype, "search", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('facilities'),
    __param(0, (0, common_1.Query)('city')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('specialty')),
    __param(3, (0, common_1.Query)('q')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], CareController.prototype, "facilities", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('facilities/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CareController.prototype, "facility", null);
exports.CareController = CareController = __decorate([
    (0, common_1.Controller)('care'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [care_service_1.CareService])
], CareController);
let PublicSpecialtiesController = class PublicSpecialtiesController {
    constructor(svc) {
        this.svc = svc;
    }
    specialties() {
        return this.svc.specialties();
    }
};
exports.PublicSpecialtiesController = PublicSpecialtiesController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('specialties'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicSpecialtiesController.prototype, "specialties", null);
exports.PublicSpecialtiesController = PublicSpecialtiesController = __decorate([
    (0, common_1.Controller)('public'),
    __metadata("design:paramtypes", [care_service_1.CareService])
], PublicSpecialtiesController);
//# sourceMappingURL=care.controller.js.map