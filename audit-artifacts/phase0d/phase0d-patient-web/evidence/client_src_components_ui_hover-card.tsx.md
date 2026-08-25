# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/ui/hover-card.tsx`
- **Member SHA-256:** `bdfe831708e7de6b9fbb14d8fe5af5a0985f67cff3c2b5755b4b570c3b4e7ad5`
- **Line count:** 42
- **Read range:** `1-42`
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
- `33: "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slid`
### payment_insurance_relevance
- `2: import * as HoverCardPrimitive from "@radix-ui/react-hover-card";`
- `6: function HoverCard({`
- `8: }: React.ComponentProps<typeof HoverCardPrimitive.Root>) {`
- `9: return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />;`
- `12: function HoverCardTrigger({`
- `14: }: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {`
- `16: <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />`
- `20: function HoverCardContent({`
- `25: }: React.ComponentProps<typeof HoverCardPrimitive.Content>) {`
- `27: <HoverCardPrimitive.Portal data-slot="hover-card-portal">`
- `28: <HoverCardPrimitive.Content`
- `29: data-slot="hover-card-content"`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
