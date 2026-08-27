import { BadRequestException } from '@nestjs/common';
import {
  assertTransition,
  PharmacyOrderState as GovernedPharmacyOrderState,
  PHARMACY_TRANSITIONS,
  ServiceBookingState,
  SERVICE_TRANSITIONS,
  type PharmacyActor,
  type ServiceActor,
  type TransitionCtx,
} from '@nabd/shared-contracts';

function requireAllowed(result: { ok: true } | { ok: false; reason: string }): void {
  if (!result.ok) throw new BadRequestException(`governed_transition_rejected:${result.reason}`);
}

export function assertGovernedPharmacyTransition(
  from: GovernedPharmacyOrderState,
  to: GovernedPharmacyOrderState,
  actor: PharmacyActor,
  context: TransitionCtx = {},
): void {
  requireAllowed(assertTransition(PHARMACY_TRANSITIONS, from, to, actor, context));
}

export function assertGovernedServiceTransition(
  from: ServiceBookingState,
  to: ServiceBookingState,
  actor: ServiceActor,
  context: TransitionCtx,
): void {
  requireAllowed(assertTransition(SERVICE_TRANSITIONS, from, to, actor, context));
}
