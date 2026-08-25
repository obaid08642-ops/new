# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/ui/chart.tsx`
- **Member SHA-256:** `47c4de202fe1dc229af94d2c86197251d279bee131d2a6fb75ab9e58cec71aab`
- **Line count:** 355
- **Read range:** `1-355`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `29: throw new Error("useChart must be used within a <ChartContainer />");`
### payment_insurance_relevance
- `107: payload,`
- `130: if (hideLabel || !payload?.length) {`
- `134: const [item] = payload;`
- `136: const itemConfig = getPayloadConfigFromPayload(config, item, key);`
- `145: {labelFormatter(value, payload)}`
- `158: payload,`
- `165: if (!active || !payload?.length) {`
- `169: const nestLabel = payload.length === 1 && indicator !== "dot";`
- `180: {payload`
- `184: const itemConfig = getPayloadConfigFromPayload(config, item, key);`
- `185: const indicatorColor = color || item.payload.fill || item.color;`
- `196: formatter(item.value, item.name, item, index, item.payload)`
### error_empty_loading_retry_cancel
- `29: throw new Error("useChart must be used within a <ChartContainer />");`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
