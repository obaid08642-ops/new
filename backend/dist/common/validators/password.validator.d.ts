import { ValidationOptions, ValidatorConstraintInterface } from 'class-validator';
export declare class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
    validate(password: string): boolean;
    defaultMessage(): string;
}
export declare function IsStrongPassword(validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
