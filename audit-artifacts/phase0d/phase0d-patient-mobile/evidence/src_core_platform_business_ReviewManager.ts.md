# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/business/ReviewManager.ts`
- **Member SHA-256:** `99255eda9dfe9f6feb53e8a3fc1841e684362f71d6cc5a8b3e7ef3884de2da73`
- **Line count:** 33
- **Read range:** `1-33`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `14: public async submitReview(params: CreateReviewParams): Promise<Review> {`
- `15: this.log.info(`Submitting ${params.rating}-star review by ${params.authorId} for ${params.targetId}`);`
- `25: public async getTargetReviews(targetId: string, page = 1): Promise<Review[]> {`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `19: status: 'pending',`
### payment_insurance_relevance
- `30: public async calculateAverageRating(targetId: string): Promise<{ average: number; totalCount: number }> {`
- `31: return { average: 0, totalCount: 0 };`
### error_empty_loading_retry_cancel
- `19: status: 'pending',`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
