import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsIqamaConstraint implements ValidatorConstraintInterface {
  validate(iqama: string) {
    if (!iqama) return false;
    
    // 10 digits starting with 1 (National ID) or 2 (Iqama)
    if (!/^[12]\d{9}$/.test(iqama)) return false;

    // Modulo 10 checksum algorithm for Saudi ID/Iqama
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
}

export function IsIqama(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsIqamaConstraint,
    });
  };
}
