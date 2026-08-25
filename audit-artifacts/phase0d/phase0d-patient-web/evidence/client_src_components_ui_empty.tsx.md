# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/ui/empty.tsx`
- **Member SHA-256:** `c0b612929b15fd498b984d8d98d1b082a3eb294be5aa8eb9cb53b67cf152f465`
- **Line count:** 104
- **Read range:** `1-104`
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
- `5: function Empty({ className, ...props }: React.ComponentProps<"div">) {`
- `8: data-slot="empty"`
- `18: function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {`
- `21: data-slot="empty-header"`
- `31: const emptyMediaVariants = cva(`
- `46: function EmptyMedia({`
- `50: }: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {`
- `53: data-slot="empty-icon"`
- `55: className={cn(emptyMediaVariants({ variant, className }))}`
- `61: function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {`
- `64: data-slot="empty-title"`
- `71: function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `5: function Empty({ className, ...props }: React.ComponentProps<"div">) {`
- `8: data-slot="empty"`
- `18: function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {`
- `21: data-slot="empty-header"`
- `31: const emptyMediaVariants = cva(`
- `46: function EmptyMedia({`
- `50: }: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {`
- `53: data-slot="empty-icon"`
- `55: className={cn(emptyMediaVariants({ variant, className }))}`
- `61: function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {`
- `64: data-slot="empty-title"`
- `71: function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
