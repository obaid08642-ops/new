# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/user/RoleManager.ts`
- **Member SHA-256:** `d39b417812be8433fc53befbd0a56433e9920124202fc5ba8895431d831bc30f`
- **Line count:** 54
- **Read range:** `1-54`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `2: import { UserRole } from '../../domain/entities';`
- `4: export type PermissionKey =`
- `10: | 'access_admin_dashboard'`
- `12: | 'manage_roles';`
- `14: export class RoleManager {`
- `15: private log = logger.scope('RoleManager');`
- `18: private rolePermissions: Record<UserRole, PermissionKey[]> = {`
- `26: admin: [`
- `28: 'access_admin_dashboard', 'manage_users'`
- `33: * Check if a role has a specific permission`
- `35: public hasPermission(role: UserRole, permission: PermissionKey): boolean {`
- `36: const permissions = this.rolePermissions[role] || [];`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `25: insurance: ['view_medical_records'],`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
