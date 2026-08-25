# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/_core/sdk.ts`
- **Member SHA-256:** `828ff33d41561c3353065deb46930ee44cb81fdf47b75c03171cb5fbd74a81d7`
- **Line count:** 350
- **Read range:** `1-350`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `93: private deriveLoginMethod(`
- `102: if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";`
- `103: if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";`
- `104: if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";`
- `106: set.has("REGISTERED_PLATFORM_MICROSOFT") ||`
- `107: set.has("REGISTERED_PLATFORM_AZURE")`
- `110: if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";`
- `136: const loginMethod = this.deriveLoginMethod(`
- `142: platform: loginMethod,`
- `143: loginMethod,`
- `247: const loginMethod = this.deriveLoginMethod(`
- `253: platform: loginMethod,`
### backend_consumers_or_contracts
- `1: import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS, decodeOAuthState } from "@shared/const";`
- `3: import axios, { type AxiosInstance } from "axios";`
- `32: constructor(private client: ReturnType<typeof axios.create>) {`
- `78: const createOAuthHttpClient = (): AxiosInstance =>`
- `79: axios.create({`
- `81: timeout: AXIOS_TIMEOUT_MS,`
- `85: private readonly client: AxiosInstance;`
- `88: constructor(client: AxiosInstance = createOAuthHttpClient()) {`
### auth_ownership
- `1: import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS, decodeOAuthState } from "@shared/const";`
- `4: import { parse as parseCookieHeader } from "cookie";`
- `11: ExchangeTokenRequest,`
- `12: ExchangeTokenResponse,`
- `21: export type SessionPayload = {`
- `27: const EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;`
- `45: async getTokenByCode(`
- `48: ): Promise<ExchangeTokenResponse> {`
- `49: const payload: ExchangeTokenRequest = {`
- `51: grantType: "authorization_code",`
- `56: const { data } = await this.client.post<ExchangeTokenResponse>(`
- `57: EXCHANGE_TOKEN_PATH,`
### state_transitions
- `1: import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS, decodeOAuthState } from "@shared/const";`
- `2: import { ForbiddenError } from "@shared/_core/errors";`
- `18: const isNonEmptyString = (value: unknown): value is string =>`
- `35: console.error(`
- `36: "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."`
- `41: private decodeState(state: string): string {`
- `42: return decodeOAuthState(state).redirectUri;`
- `47: state: string`
- `53: redirectUri: this.decodeState(state),`
- `118: * const tokenResponse = await sdk.exchangeCodeForToken(code, state);`
- `122: state: string`
- `124: return this.oauthService.getTokenByCode(code, state);`
### payment_insurance_relevance
- `21: export type SessionPayload = {`
- `49: const payload: ExchangeTokenRequest = {`
- `58: payload`
- `181: payload: SessionPayload,`
- `190: openId: payload.openId,`
- `191: appId: payload.appId,`
- `192: name: payload.name,`
- `209: const { payload } = await jwtVerify(cookieValue, secretKey, {`
- `212: const { openId, appId, name } = payload as Record<string, unknown>;`
- `219: console.warn("[Auth] Session payload missing required fields");`
- `237: const payload: GetUserInfoWithJwtRequest = {`
- `244: payload`
### error_empty_loading_retry_cancel
- `1: import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS, decodeOAuthState } from "@shared/const";`
- `2: import { ForbiddenError } from "@shared/_core/errors";`
- `18: const isNonEmptyString = (value: unknown): value is string =>`
- `35: console.error(`
- `36: "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."`
- `81: timeout: AXIOS_TIMEOUT_MS,`
- `215: !isNonEmptyString(openId) ||`
- `216: !isNonEmptyString(appId) ||`
- `217: !isNonEmptyString(name)`
- `228: } catch (error) {`
- `229: console.warn("[Auth] Session verification failed", String(error));`
- `276: throw ForbiddenError("Invalid session cookie");`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
