import { logger } from '../../../services/Logger';

export type AuthState = 'Unauthenticated' | 'Authenticating' | 'Authenticated' | 'Locked' | 'Expired';

export class AuthStateMachine {
  private log = logger.scope('AuthStateMachine');
  private currentState: AuthState = 'Unauthenticated';

  public getState(): AuthState {
    return this.currentState;
  }

  public transition(newState: AuthState): void {
    const validTransitions: Record<AuthState, AuthState[]> = {
      'Unauthenticated': ['Authenticating'],
      'Authenticating': ['Authenticated', 'Unauthenticated', 'Locked'],
      'Authenticated': ['Unauthenticated', 'Expired', 'Locked'],
      'Locked': ['Unauthenticated'],
      'Expired': ['Authenticating', 'Unauthenticated'],
    };

    if (validTransitions[this.currentState].includes(newState)) {
      this.log.info(`Auth State Transition: ${this.currentState} -> ${newState}`);
      this.currentState = newState;
    } else {
      this.log.error(`Invalid Auth State Transition: ${this.currentState} -> ${newState}`);
      throw new Error(`Cannot transition auth state from ${this.currentState} to ${newState}`);
    }
  }
}
