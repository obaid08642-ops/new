# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/auth/BiometricService.ts`
- **Member SHA-256:** `dc91a24d38207bc3302feb5541fd8fee32c6b1fb25ede3fbe99d5901260a41d8`
- **Line count:** 71
- **Read range:** `1-71`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `47: this.log.warn(`Biometric authentication failed or cancelled: ${result.error}`);`
- `65: * Invalidate biometric trust (called on logout)`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `65: * Invalidate biometric trust (called on logout)`
- `68: this.log.info('Invalidating biometric session');`
### state_transitions
- `43: if (result.success) {`
- `44: this.log.info('Biometric authentication successful');`
- `47: this.log.warn(`Biometric authentication failed or cancelled: ${result.error}`);`
- `50: } catch (error) {`
- `51: this.log.error('Error during biometric authentication', error);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `47: this.log.warn(`Biometric authentication failed or cancelled: ${result.error}`);`
- `50: } catch (error) {`
- `51: this.log.error('Error during biometric authentication', error);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
