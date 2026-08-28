import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string) {
    if (!password) return false;
    // Min 8 chars, 1 uppercase, 1 number, 1 special char
    const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+={}\[\]:;<>,.?/~\\-]).{8,}$/;
    return regex.test(password);
  }

  defaultMessage() {
    return 'Password must be at least 8 characters long, contain 1 uppercase letter, 1 number, and 1 special character.';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
