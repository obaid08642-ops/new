# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `audit-artifacts/full-audit-20260823/phase9-prod-deps.txt`
- **Member SHA-256:** `358eb2192e72131ee521ea65d6a3ba9379a217b90370fc502a2a9206738bbca6`
- **Line count:** 8293
- **Read range:** `1-8293`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `283: │ │ ├─┬ @aws-sdk/credential-provider-login 3.972.77`
- `7300: ├─┬ router 2.2.0`
### backend_consumers_or_contracts
- `6574: @trpc/client 11.18.0`
- `6575: ├─┬ @trpc/server 11.18.0 peer`
- `6578: @trpc/react-query 11.18.0`
- `6582: ├─┬ @trpc/client 11.18.0 peer`
- `6583: │ ├─┬ @trpc/server 11.18.0 peer`
- `6586: ├─┬ @trpc/server 11.18.0 peer`
- `6590: @trpc/server 11.18.0`
- `6592: axios 1.19.0`
- `7419: │ │   └─┬ @emnapi/runtime 1.11.3`
- `7449: │ │   └─┬ @emnapi/runtime 1.11.3`
- `7754: │ │ │   └─┬ @emnapi/runtime 1.11.3`
- `7784: │ │ │   └─┬ @emnapi/runtime 1.11.3`
### auth_ownership
- `283: │ │ ├─┬ @aws-sdk/credential-provider-login 3.972.77`
- `522: │ │ │ ├─┬ @aws-sdk/token-providers 3.1116.0`
- `956: │ │ ├─┬ @aws-sdk/token-providers 3.1116.0`
- `6915: cookie 1.0.2`
- `7109: ├── cookie 0.7.2`
- `7110: ├── cookie-signature 1.2.2`
- `7367: input-otp 1.4.2`
- `7462: │ │ ├── js-tokens 4.0.0`
- `7502: │ │ │ │ │ ├── js-tokens 4.0.0`
- `7525: │ │ │ │ │ │ ├── js-tokens 4.0.0`
- `7544: │ │   │ ├── js-tokens 4.0.0`
- `7571: │ │   │ │ ├── js-tokens 4.0.0`
### state_transitions
- `1411: │ ├─┬ @radix-ui/react-use-controllable-state 1.2.2`
- `1522: ├─┬ @radix-ui/react-use-controllable-state 1.2.2`
- `1736: │ ├─┬ @radix-ui/react-use-controllable-state 1.2.2`
- `1951: ├─┬ @radix-ui/react-use-controllable-state 1.2.2`
- `2042: ├─┬ @radix-ui/react-use-controllable-state 1.2.2`
- `2479: │ │ ├─┬ @radix-ui/react-use-controllable-state 1.2.2`
- `2582: ├─┬ @radix-ui/react-use-controllable-state 1.2.2`
- `2786: ├─┬ @radix-ui/react-use-controllable-state 1.2.2`
- `3266: │ │ ├─┬ @radix-ui/react-use-controllable-state 1.2.2`
- `3365: ├─┬ @radix-ui/react-use-controllable-state 1.2.2`
- `3608: ├─┬ @radix-ui/react-use-controllable-state 1.2.2`
- `4129: │ │ ├─┬ @radix-ui/react-use-controllable-state 1.2.2`
### payment_insurance_relevance
- `3390: @radix-ui/react-hover-card 1.1.15`
### error_empty_loading_retry_cancel
- `6599: │ │ ├── es-errors 1.3.0`
- `6602: │ │ │ │ ├── es-errors 1.3.0`
- `6605: │ │ │ ├── es-errors 1.3.0`
- `6607: │ │ │ │ └── es-errors 1.3.0`
- `6612: │ │ │ │ │ │ ├── es-errors 1.3.0`
- `6614: │ │ │ │ │ ├── es-errors 1.3.0`
- `6617: │ │ │ │   └── es-errors 1.3.0`
- `6948: │ ├─┬ http-errors 2.0.1`
- `6961: │ │   ├── es-errors 1.3.0`
- `6964: │ │   │ ├── es-errors 1.3.0`
- `6969: │ │   │ │ │ ├── es-errors 1.3.0`
- `6973: │ │   │ │   │ ├── es-errors 1.3.0`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
