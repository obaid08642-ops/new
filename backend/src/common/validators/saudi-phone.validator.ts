import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsSaudiPhoneConstraint implements ValidatorConstraintInterface {
  validate(phone: string) {
    if (!phone) return false;
    const regex = /^(009665|9665|\+9665|05|5)(5|0|3|6|4|9|1|8|7)([0-9]{7})$/;
    return regex.test(phone);
  }

  defaultMessage() {
    return 'Phone number must be a valid Saudi mobile number (e.g. +9665... or 05...)';
  }
}

export function IsSaudiPhone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSaudiPhoneConstraint,
    });
  };
}
