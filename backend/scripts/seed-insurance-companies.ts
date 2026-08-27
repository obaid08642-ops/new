/**
 * DEPRECATED — do not seed a second insurance catalogue from this script.
 *
 * The only candidate source is assets/insurance-logos/manifest.json and the
 * only supported reconciliation entry point is:
 *   npx ts-node scripts/reconcile-insurance-catalog.ts
 *
 * It is dry-run by default. The --apply mode is non-destructive: it adds only
 * genuinely missing pending-review records and never deletes, disables, or
 * reactivates historical insurer records.
 */
throw new Error(
  'seed-insurance-companies.ts is deprecated. Use scripts/reconcile-insurance-catalog.ts (dry-run first).',
);
