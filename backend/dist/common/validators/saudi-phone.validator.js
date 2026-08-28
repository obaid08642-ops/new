"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsSaudiPhoneConstraint = void 0;
exports.IsSaudiPhone = IsSaudiPhone;
const class_validator_1 = require("class-validator");
let IsSaudiPhoneConstraint = class IsSaudiPhoneConstraint {
    validate(phone) {
        if (!phone)
            return false;
        const regex = /^(009665|9665|\+9665|05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;
        return regex.test(phone);
    }
    defaultMessage() {
        return 'Phone number must be a valid Saudi mobile number (e.g. +9665... or 05...)';
    }
};
exports.IsSaudiPhoneConstraint = IsSaudiPhoneConstraint;
exports.IsSaudiPhoneConstraint = IsSaudiPhoneConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ async: false })
], IsSaudiPhoneConstraint);
function IsSaudiPhone(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsSaudiPhoneConstraint,
        });
    };
}
//# sourceMappingURL=saudi-phone.validator.js.map