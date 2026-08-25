# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/ui/breadcrumb.tsx`
- **Member SHA-256:** `dd84657e30691ea7f14a785c13b660d6cd626c08ba1df8439c3eca858ee3cd7e`
- **Line count:** 109
- **Read range:** `1-109`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `52: function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {`
- `55: data-slot="breadcrumb-page"`
- `58: aria-current="page"`
- `106: BreadcrumbPage,`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `56: role="link"`
- `73: role="presentation"`
- `90: role="presentation"`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
