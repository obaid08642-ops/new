import { ValidationOptions, ValidatorConstraintInterface } from 'class-validator';
export declare class IsIqamaConstraint implements ValidatorConstraintInterface {
    validate(iqama: string): boolean;
    defaultMessage(): string;
}
export declare function IsIqama(validationOptions?: ValidationOptions): (object: Object, propertyName: string) => void;
