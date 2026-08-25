# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/theme/ThemeEngine.ts`
- **Member SHA-256:** `beb14a9bb669a62294b8359040bcb93b284988d08816bacac6b93e121400e86c`
- **Line count:** 127
- **Read range:** `1-127`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `29: /** Banner URL for home screen */`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `2: * Theme Engine — Runtime theme management with Admin override support.`
- `14: import { getOverrides } from '../design-system/tokens';`
- `35: const THEME_CONFIG_KEY = '@nabdah_admin_theme_config';`
- `38: export async function loadAdminThemeConfig(): Promise<void> {`
- `45: console.warn('Failed to load admin theme config', e);`
- `49: export async function applyAdminThemeConfig(config: Partial<ThemeConfig>): Promise<void> {`
- `54: console.warn('Failed to save admin theme config', e);`
- `58: export function getAdminThemeConfig(): Readonly<ThemeConfig> {`
- `62: export async function resetAdminThemeConfig(): Promise<void> {`
- `67: console.warn('Failed to reset admin theme config', e);`
- `77: const adminConfig = _themeConfig;`
- `79: // Resolve a color key with Admin override fallback`
### state_transitions
- `45: console.warn('Failed to load admin theme config', e);`
- `54: console.warn('Failed to save admin theme config', e);`
- `67: console.warn('Failed to reset admin theme config', e);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `44: } catch (e) {`
- `45: console.warn('Failed to load admin theme config', e);`
- `53: } catch (e) {`
- `54: console.warn('Failed to save admin theme config', e);`
- `66: } catch (e) {`
- `67: console.warn('Failed to reset admin theme config', e);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
