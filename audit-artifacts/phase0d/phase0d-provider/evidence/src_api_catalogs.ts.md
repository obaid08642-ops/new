# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/api/catalogs.ts`
- **Member SHA-256:** `7fa8eca5e18dee98bb50e4e9e8fb49d1b34b4729d3e270a9f1090b90e5701987`
- **Line count:** 147
- **Read range:** `1-147`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: * managed from the admin dashboard). Every app screen — provider onboarding,`
### backend_consumers_or_contracts
- `30: const res = await client.get('/insurance/companies');`
- `94: lab: '/labs/services',`
- `95: radiology: '/radiology/services',`
- `96: nursing: '/nursing/catalog',`
### auth_ownership
- `8: * managed from the admin dashboard). Every app screen — provider onboarding,`
- `27: // 5-minute in-memory cache — the catalog is admin-managed and rarely changes`
- `53: /** Clear the in-memory catalog cache (e.g. after the admin edits companies). */`
- `72: // homecareservices — managed from the admin dashboard) are the single source.`
### state_transitions
- `1: import { useState, useEffect } from 'react';`
- `61: const [list, setList] = useState<CatalogCompany[]>([]);`
- `140: const [list, setList] = useState<CatalogService[]>([]);`
### payment_insurance_relevance
- `6: * Insurance companies (with their plan tiers) and medical service catalogs are`
- `7: * served by the backend (insurance_companies / insurance_networks collections,`
- `23: let insuranceCache: CatalogCompany[] | null = null;`
- `24: let insuranceCacheAt = 0;`
- `26: export async function getInsuranceCatalog(force = false): Promise<CatalogCompany[]> {`
- `28: if (!force && insuranceCache && Date.now() - insuranceCacheAt < 5 * 60 * 1000) return insuranceCache;`
- `30: const res = await client.get('/insurance/companies');`
- `40: insuranceCache = list;`
- `41: insuranceCacheAt = Date.now();`
- `48: const { INSURANCE } = await import('../constants');`
- `49: const fallback = INSURANCE as readonly { id: string; ar: string; en: string; plans: readonly string[] }[];`
- `55: insuranceCache = null;`
### error_empty_loading_retry_cancel
- `10: * hardcoded second list. The legacy constants are kept ONLY as an offline`
- `44: } catch {`
- `45: // fall through to the offline constant`
- `47: // Offline fallback only — the authoritative catalog is the backend.`
- `73: // The local constants remain only as an offline fallback.`
- `127: } catch {`
- `128: // offline → constant fallback below`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
