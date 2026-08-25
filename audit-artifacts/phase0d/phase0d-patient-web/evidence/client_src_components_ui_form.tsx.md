# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/ui/form.tsx`
- **Member SHA-256:** `0157362d572713567d989b726277879e75c60c24684ade4aef854867dc2fac48`
- **Line count:** 168
- **Read range:** `1-168`
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
- `10: useFormState,`
- `48: const { getFieldState } = useFormContext();`
- `49: const formState = useFormState({ name: fieldContext.name });`
- `50: const fieldState = getFieldState(fieldContext.name, formState);`
- `53: throw new Error("useFormField should be used within <FormField>");`
- `64: ...fieldState,`
- `94: const { error, formItemId } = useFormField();`
- `99: data-error={!!error}`
- `100: className={cn("data-[error=true]:text-destructive", className)}`
- `108: const { error, formItemId, formDescriptionId, formMessageId } =`
- `116: !error`
- `120: aria-invalid={!!error}`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `53: throw new Error("useFormField should be used within <FormField>");`
- `94: const { error, formItemId } = useFormField();`
- `99: data-error={!!error}`
- `100: className={cn("data-[error=true]:text-destructive", className)}`
- `108: const { error, formItemId, formDescriptionId, formMessageId } =`
- `116: !error`
- `120: aria-invalid={!!error}`
- `140: const { error, formMessageId } = useFormField();`
- `141: const body = error ? String(error?.message ?? "") : props.children;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
