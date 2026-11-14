import { BadRequestException } from '@nestjs/common';

/** Which payment methods a booking may use, by the kind of visit. One table for consultation, lab, radiology, nursing and the rules engine. */
export type PaymentContext = 'online_consultation' | 'home_visit' | 'in_clinic' | 'pharmacy_delivery';
export type PaymentMethod = 'cash' | 'card' | 'insurance';

export const PAYMENT_METHODS_BY_CONTEXT: Record<PaymentContext, readonly PaymentMethod[]> = {
  online_consultation: ['card'],
  home_visit: ['card', 'insurance'],
  in_clinic: ['cash', 'card', 'insurance'],
  pharmacy_delivery: ['cash', 'card', 'insurance'],
};

export function paymentMethodAllowed(method: string, context: PaymentContext): boolean {
  return (PAYMENT_METHODS_BY_CONTEXT[context] as readonly string[]).includes(method);
}

/** Refuses a method the visit does not take, with the code the clients already map: `payment_method_<method>_not_allowed_for_<context>`. */
export function assertPaymentMethod(method: string, context: PaymentContext): void {
  if (!paymentMethodAllowed(method, context)) throw new BadRequestException(`payment_method_${method}_not_allowed_for_${context}`);
}
