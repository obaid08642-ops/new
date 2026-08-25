# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/ui/alert-dialog.tsx`
- **Member SHA-256:** `aeecd7967eb0be3bad2753b6633d9a43cc4c08cb35de872ffdc0b9f2b6a9b26c`
- **Line count:** 155
- **Read range:** `1-155`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `131: function AlertDialogCancel({`
- `134: }: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {`
- `136: <AlertDialogPrimitive.Cancel`
- `154: AlertDialogCancel,`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `37: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",`
- `55: "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full `
- `131: function AlertDialogCancel({`
- `134: }: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {`
- `136: <AlertDialogPrimitive.Cancel`
- `154: AlertDialogCancel,`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `131: function AlertDialogCancel({`
- `134: }: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {`
- `136: <AlertDialogPrimitive.Cancel`
- `154: AlertDialogCancel,`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
