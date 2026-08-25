# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/ui/card.tsx`
- **Member SHA-256:** `1397e7d264d90162220ea7473b311e434651886267c71e7f58d4488be9d8ff39`
- **Line count:** 92
- **Read range:** `1-92`
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
- No matching static signal found in this member.
### payment_insurance_relevance
- `5: function Card({ className, ...props }: React.ComponentProps<"div">) {`
- `8: data-slot="card"`
- `10: "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",`
- `18: function CardHeader({ className, ...props }: React.ComponentProps<"div">) {`
- `21: data-slot="card-header"`
- `23: "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",`
- `31: function CardTitle({ className, ...props }: React.ComponentProps<"div">) {`
- `34: data-slot="card-title"`
- `41: function CardDescription({ className, ...props }: React.ComponentProps<"div">) {`
- `44: data-slot="card-description"`
- `51: function CardAction({ className, ...props }: React.ComponentProps<"div">) {`
- `54: data-slot="card-action"`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
