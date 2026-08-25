# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/ui/command.tsx`
- **Member SHA-256:** `47910540789d4de9e890de63bfc0046f9cf6bfaa86d496a98c79622900f8520c`
- **Line count:** 184
- **Read range:** `1-184`
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
- `101: function CommandEmpty({`
- `103: }: React.ComponentProps<typeof CommandPrimitive.Empty>) {`
- `105: <CommandPrimitive.Empty`
- `106: data-slot="command-empty"`
- `179: CommandEmpty,`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `101: function CommandEmpty({`
- `103: }: React.ComponentProps<typeof CommandPrimitive.Empty>) {`
- `105: <CommandPrimitive.Empty`
- `106: data-slot="command-empty"`
- `179: CommandEmpty,`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
