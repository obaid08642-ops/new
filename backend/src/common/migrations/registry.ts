import type { Migration } from './migration-runner';

/**
 * Add a migration here only after its forward and rollback semantics have
 * been reviewed against a temporary MongoDB instance. An empty registry is
 * intentional: it makes `status` safe and makes `up` a no-op until a domain
 * migration is explicitly approved.
 */
export const migrations: readonly Migration[] = [];
