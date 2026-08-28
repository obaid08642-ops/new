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
exports.DriverShiftRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const mongo_repository_1 = require("../../../common/database/mongo.repository");
const driver_shift_schema_1 = require("../../../schemas/driver-shift.schema");
let DriverShiftRepository = class DriverShiftRepository extends mongo_repository_1.MongoRepository {
    constructor(model) {
        super(model);
    }
};
exports.DriverShiftRepository = DriverShiftRepository;
exports.DriverShiftRepository = DriverShiftRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(driver_shift_schema_1.DriverShift.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], DriverShiftRepository);
//# sourceMappingURL=drivershift.repository.js.map