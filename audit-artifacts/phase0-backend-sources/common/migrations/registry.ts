import type { Migration } from './migration-runner';

/**
 * Domain migrations are registered here only after their schema and rollback
 * have been reviewed. An empty registry is intentional and safer than a
 * migration that silently guesses production data semantics.
 */
export const migrations: readonly Migration[] = [];
