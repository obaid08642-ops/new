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
exports.UsersAddressesController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const auth_guard_1 = require("../../common/auth.guard");
const uuid_1 = require("uuid");
let UsersAddressesController = class UsersAddressesController {
    constructor(users) {
        this.users = users;
    }
    async getAddresses(id) {
        const profile = await this.users.getPatientProfile(id);
        return profile.addresses || [];
    }
    async addAddress(id, body) {
        const profile = await this.users.getPatientProfile(id);
        const newAddress = { id: (0, uuid_1.v4)(), ...body };
        const addresses = profile.addresses || [];
        if (addresses.length === 0 || body.is_default) {
            addresses.forEach(a => (a.is_default = false));
            newAddress.is_default = true;
        }
        addresses.push(newAddress);
        await this.users.updatePatientProfile(id, { addresses });
        return newAddress;
    }
    async updateAddress(id, addressId, body) {
        const profile = await this.users.getPatientProfile(id);
        const addresses = profile.addresses || [];
        if (body.is_default) {
            addresses.forEach(a => (a.is_default = false));
        }
        const idx = addresses.findIndex(a => a.id === addressId);
        if (idx !== -1) {
            addresses[idx] = { ...addresses[idx], ...body };
            await this.users.updatePatientProfile(id, { addresses });
            return addresses[idx];
        }
        return null;
    }
    async removeAddress(id, addressId) {
        const profile = await this.users.getPatientProfile(id);
        const addresses = (profile.addresses || []).filter(a => a.id !== addressId);
        await this.users.updatePatientProfile(id, { addresses });
        return { ok: true };
    }
};
exports.UsersAddressesController = UsersAddressesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersAddressesController.prototype, "getAddresses", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersAddressesController.prototype, "addAddress", null);
__decorate([
    (0, common_1.Patch)(':addressId'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('addressId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UsersAddressesController.prototype, "updateAddress", null);
__decorate([
    (0, common_1.Delete)(':addressId'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('addressId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsersAddressesController.prototype, "removeAddress", null);
exports.UsersAddressesController = UsersAddressesController = __decorate([
    (0, common_1.Controller)('users/me/addresses'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersAddressesController);
//# sourceMappingURL=users.addresses.controller.js.map