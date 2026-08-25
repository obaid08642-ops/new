# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/ui/field.tsx`
- **Member SHA-256:** `f093424ca5eadf43d46b020ed780aee7aa5f6d90d0b48fb50c031e3d7b0528c7`
- **Line count:** 242
- **Read range:** `1-242`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `64: "has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",`
- `69: "@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",`
- `86: role="group"`
- `221: role="alert"`
### state_transitions
- `118: "has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary dark:has-data-[state=checked]:bg-primary/10",`
- `184: function FieldError({`
- `187: errors,`
- `190: errors?: Array<{ message?: string } | undefined>;`
- `197: if (!errors) {`
- `201: if (errors?.length === 1 && errors[0]?.message) {`
- `202: return errors[0].message;`
- `207: {errors.map(`
- `208: (error, index) =>`
- `209: error?.message && <li key={index}>{error.message}</li>`
- `213: }, [children, errors]);`
- `222: data-slot="field-error"`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `184: function FieldError({`
- `187: errors,`
- `190: errors?: Array<{ message?: string } | undefined>;`
- `197: if (!errors) {`
- `201: if (errors?.length === 1 && errors[0]?.message) {`
- `202: return errors[0].message;`
- `207: {errors.map(`
- `208: (error, index) =>`
- `209: error?.message && <li key={index}>{error.message}</li>`
- `213: }, [children, errors]);`
- `222: data-slot="field-error"`
- `235: FieldError,`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
