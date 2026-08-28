import { ValidationOptions, ValidatorConstraintInterface } from 'class-validator';
export declare class IsSaudiPhoneConstraint implements ValidatorConstraintInterface {
    validate(phone: string): boolean;
    defaultMessage(): string;
}
export declare function IsSaudiPhone(validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
