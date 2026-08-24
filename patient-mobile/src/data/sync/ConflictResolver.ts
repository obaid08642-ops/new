export type ConflictStrategy = 'LWW' | 'SERVER_WINS' | 'CLIENT_WINS' | 'MERGE' | 'MANUAL';

export interface ConflictResolutionContext {
  entityType: string;
  entityId: string;
  localState: any;
  serverState: any;
  localVersion: number;
  serverVersion: number;
}

export type ManualResolutionHook = (context: ConflictResolutionContext) => Promise<any>;

/**
 * Handles conflicts that arise during synchronization when both local and server
 * entities have been modified independently.
 */
export class ConflictResolver {
  private defaultStrategy: ConflictStrategy;
  private manualHook?: ManualResolutionHook;

  constructor(defaultStrategy: ConflictStrategy = 'SERVER_WINS', manualHook?: ManualResolutionHook) {
    this.defaultStrategy = defaultStrategy;
    this.manualHook = manualHook;
  }

  /**
   * Resolves a conflict based on the defined strategy.
   * Returns the "winning" state that should be persisted.
   */
  async resolve(context: ConflictResolutionContext, strategyOverride?: ConflictStrategy): Promise<any> {
    const strategy = strategyOverride || this.defaultStrategy;

    console.warn(`[ConflictResolver] Conflict detected on ${context.entityType} (ID: ${context.entityId}). Strategy: ${strategy}`);

    switch (strategy) {
      case 'SERVER_WINS':
        return context.serverState;

      case 'CLIENT_WINS':
        return context.localState;

      case 'LWW': // Last Write Wins
        // Assumes entities have updated_at timestamps
        const localTime = context.localState.updated_at || 0;
        const serverTime = context.serverState.updated_at || 0;
        return localTime > serverTime ? context.localState : context.serverState;

      case 'MERGE':
        // Extremely simplistic merge: Server base with local overwrites
        return { ...context.serverState, ...context.localState };

      case 'MANUAL':
        if (!this.manualHook) {
          console.error('[ConflictResolver] MANUAL strategy requested but no hook provided. Falling back to SERVER_WINS.');
          return context.serverState;
        }
        return await this.manualHook(context);

      default:
        return context.serverState;
    }
  }

  /**
   * Helper to check if a conflict actually exists before calling resolve.
   */
  detectConflict(localVersion: number, serverVersion: number): boolean {
    return localVersion > 0 && serverVersion > 0 && localVersion !== serverVersion;
  }
}
