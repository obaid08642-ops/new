# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/security/Security.ts`
- **Member SHA-256:** `2576de645b881d82931a48b78bba3b18c5699cea94447955c9e04fc0c5788d8b`
- **Line count:** 327
- **Read range:** `1-327`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `179: cancelLabel: 'إلغاء',`
- `315: type AuditAction = 'login'|'logout'|'login_fail'|'biometric'|'pass_change'|`
- `316: 'toggle_online'|'withdraw_request'|'doc_upload'|'settings_change'|'biometric_login'|'biometric_enabled';`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `12: ACCESS: 'np_access_token',`
- `13: REFRESH: 'np_refresh_token',`
- `14: SESSION_ID: 'np_session_id',`
- `57: // ─── Token Management ─────────────────────────────────────────────────────────`
- `58: export const Tokens = {`
- `59: async save(access: string, refresh: string, session_id: string, provider_id: string, provider_type: string) {`
- `62: Vault.set(SK.REFRESH, refresh),`
- `63: Vault.set(SK.SESSION_ID, session_id),`
- `69: async getRefresh() { return Vault.get(SK.REFRESH); },`
- `70: async getSessionId() { return Vault.get(SK.SESSION_ID); },`
- `75: Vault.del(SK.REFRESH),`
- `76: Vault.del(SK.SESSION_ID),`
### state_transitions
- `167: async authenticate(reason = 'تحقق من هويتك'): Promise<{ success: boolean; error?: string }> {`
- `173: return { success: false, error: 'البصمة غير متاحة على هذا الجهاز' };`
- `179: cancelLabel: 'إلغاء',`
- `183: return { success: r.success, error: 'error' in r ? (r as any).error : undefined };`
- `185: return { success: false, error: e?.message || 'Unknown error' };`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `33: } catch (e) {`
- `42: } catch (e) {`
- `49: try { await SecureStore.deleteItemAsync(key); } catch {}`
- `97: } catch (e) { return null; }`
- `153: } catch {`
- `163: } catch {}`
- `167: async authenticate(reason = 'تحقق من هويتك'): Promise<{ success: boolean; error?: string }> {`
- `173: return { success: false, error: 'البصمة غير متاحة على هذا الجهاز' };`
- `179: cancelLabel: 'إلغاء',`
- `183: return { success: r.success, error: 'error' in r ? (r as any).error : undefined };`
- `184: } catch (e: any) {`
- `185: return { success: false, error: e?.message || 'Unknown error' };`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
