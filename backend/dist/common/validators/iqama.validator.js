"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsIqamaConstraint = void 0;
exports.IsIqama = IsIqama;
const class_validator_1 = require("class-validator");
let IsIqamaConstraint = class IsIqamaConstraint {
    validate(iqama) {
        if (!iqama)
            return false;
        if (!/^[12]\d{9}$/.test(iqama))
            return false;
        let sum = 0;
        for (let i = 0; i < 10; i++) {
            let digit = parseInt(iqama[i], 10);
            if (i % 2 === 0) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            sum += digit;
        }
        return sum % 10 === 0;
    }
    defaultMessage() {
        return 'Invalid Saudi National ID or Iqama number. Must be 10 digits starting with 1 or 2 and pass checksum.';
    }
};
exports.IsIqamaConstraint = IsIqamaConstraint;
exports.IsIqamaConstraint = IsIqamaConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ async: false })
], IsIqamaConstraint);
function IsIqama(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsIqamaConstraint,
        });
    };
}
//# sourceMappingURL=iqama.validator.js.map