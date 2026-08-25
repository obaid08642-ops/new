# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `docs/REPOSITORY_GUIDE.md`
- **Member SHA-256:** `40423f7d284fb01664064df1bdca66af6e59affb2ca850fabc7b4fc1394a4f0c`
- **Line count:** 71
- **Read range:** `1-71`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `19: 2. **Register the Repository (Usually during App Initialization):**`
- `24: RepositoryCoordinator.registerFeatureRepository<IConsultation>(`
### backend_consumers_or_contracts
- `26: '/api/v1/consultations', // API Endpoint`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `14: status: string;`
- `39: const spec = QuerySpecification.create().where('status', 'PENDING').orderBy('scheduled_at', 'DESC');`
- `40: const pendingConsultations = await repo.match(spec);`
- `46: status: 'PENDING',`
- `58: await consultationRepo.update(id, { status: 'COMPLETED' }, context);`
### payment_insurance_relevance
- `59: await paymentRepo.create({ amount: 100, consultation_id: id }, context);`
### error_empty_loading_retry_cancel
- `39: const spec = QuerySpecification.create().where('status', 'PENDING').orderBy('scheduled_at', 'DESC');`
- `40: const pendingConsultations = await repo.match(spec);`
- `42: // Creating (Offline First)`
- `46: status: 'PENDING',`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
