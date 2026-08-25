# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/_core/hooks/useAuth.ts`
- **Member SHA-256:** `2d87f1597ab79277ab1755353fc21d362aa05c4e20b79c320001ead15923cca7`
- **Line count:** 98
- **Read range:** `1-98`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `1: import { startLogin } from "@/const";`
- `12: // Login is started via startLogin() in the effect below, only when we actually`
- `13: // navigate — never during render. startLogin() mints a one-time nonce + writes`
- `15: // desync it from an in-flight login's `state`.`
- `20: retry: false,`
- `24: const logoutMutation = trpc.auth.logout.useMutation({`
- `30: const logout = useCallback(async () => {`
- `32: await logoutMutation.mutateAsync();`
- `42: // Clear the Preview auto-login token mirrored into sessionStorage, so`
- `44: // backend cookie is cleared by the logout mutation.`
- `51: }, [logoutMutation, utils]);`
- `60: loading: meQuery.isLoading || logoutMutation.isPending,`
### backend_consumers_or_contracts
- `2: import { trpc } from "@/lib/trpc";`
- `3: import { TRPCClientError } from "@trpc/client";`
- `17: const utils = trpc.useUtils();`
- `19: const meQuery = trpc.auth.me.useQuery(undefined, {`
- `24: const logoutMutation = trpc.auth.logout.useMutation({`
- `35: error instanceof TRPCClientError &&`
- `95: refresh: () => meQuery.refetch(),`
### auth_ownership
- `1: import { startLogin } from "@/const";`
- `12: // Login is started via startLogin() in the effect below, only when we actually`
- `13: // navigate — never during render. startLogin() mints a one-time nonce + writes`
- `14: // the state cookie, so calling it per render would overwrite the cookie and`
- `15: // desync it from an in-flight login's `state`.`
- `24: const logoutMutation = trpc.auth.logout.useMutation({`
- `30: const logout = useCallback(async () => {`
- `32: await logoutMutation.mutateAsync();`
- `42: // Clear the Preview auto-login token mirrored into sessionStorage, so`
- `43: // header-based sessions (Safari ITP / WebView) are logged out too. The`
- `44: // backend cookie is cleared by the logout mutation.`
- `46: sessionStorage.removeItem("manus-cookie");`
### state_transitions
- `3: import { TRPCClientError } from "@trpc/client";`
- `14: // the state cookie, so calling it per render would overwrite the cookie and`
- `15: // desync it from an in-flight login's `state`.`
- `20: retry: false,`
- `25: onSuccess: () => {`
- `33: } catch (error: unknown) {`
- `35: error instanceof TRPCClientError &&`
- `36: error.data?.code === "UNAUTHORIZED"`
- `40: throw error;`
- `53: const state = useMemo(() => {`
- `60: loading: meQuery.isLoading || logoutMutation.isPending,`
- `61: error: meQuery.error ?? logoutMutation.error ?? null,`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `3: import { TRPCClientError } from "@trpc/client";`
- `20: retry: false,`
- `33: } catch (error: unknown) {`
- `35: error instanceof TRPCClientError &&`
- `36: error.data?.code === "UNAUTHORIZED"`
- `40: throw error;`
- `47: } catch {}`
- `60: loading: meQuery.isLoading || logoutMutation.isPending,`
- `61: error: meQuery.error ?? logoutMutation.error ?? null,`
- `66: meQuery.error,`
- `67: meQuery.isLoading,`
- `68: logoutMutation.error,`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
