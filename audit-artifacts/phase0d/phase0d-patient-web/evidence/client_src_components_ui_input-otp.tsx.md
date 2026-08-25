# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `client/src/components/ui/input-otp.tsx`
- **Member SHA-256:** `45fc7fed882aa5024d8eea52d9b392d13b1d80f2b7f846365bc2586e3d16253d`
- **Line count:** 75
- **Read range:** `1-75`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `2: import { OTPInput, OTPInputContext } from "input-otp";`
- `7: function InputOTP({`
- `11: }: React.ComponentProps<typeof OTPInput> & {`
- `15: <OTPInput`
- `16: data-slot="input-otp"`
- `27: function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {`
- `30: data-slot="input-otp-group"`
- `37: function InputOTPSlot({`
- `44: const inputOTPContext = React.useContext(OTPInputContext);`
- `45: const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};`
- `49: data-slot="input-otp-slot"`
- `67: function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {`
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
