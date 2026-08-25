# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `server/_core/voiceTranscription.ts`
- **Member SHA-256:** `c53b328b12e54adfacbc632e668c2b58b9954547ce9d3313907096c8b2db330c`
- **Line count:** 284
- **Read range:** `1-284`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `6: * 2. Upload audio to storage (e.g., S3) to get URL`
- `20: * // After uploading audio to storage`
- `22: *   audioUrl: uploadedAudioUrl,`
- `63: code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "UPLOAD_FAILED" | "SERVICE_ERROR";`
- `93: // Step 2: Download audio from URL`
- `100: error: "Failed to download audio file",`
- `126: // Step 3: Create FormData for multipart upload to Whisper API`
- `248: * // In server/routers.ts`
- `251: * export const voiceRouter = router({`
### backend_consumers_or_contracts
- `12: * const transcribeMutation = trpc.voice.transcribe.useMutation({`
- `97: const response = await fetch(options.audioUrl);`
- `155: const response = await fetch(fullUrl, {`
- `245: * Example tRPC procedure implementation:`
- `263: *         throw new TRPCError({`
### auth_ownership
- `43: tokens: number[];`
- `158: authorization: `Bearer ${ENV.forgeApiKey}`,`
### state_transitions
- `13: *   onSuccess: (data) => {`
- `20: * // After uploading audio to storage`
- `61: export type TranscriptionError = {`
- `62: error: string;`
- `63: code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "UPLOAD_FAILED" | "SERVICE_ERROR";`
- `71: * @returns Transcription result or error`
- `75: ): Promise<TranscriptionResponse | TranscriptionError> {`
- `80: error: "Voice transcription service is not configured",`
- `81: code: "SERVICE_ERROR",`
- `87: error: "Voice transcription service authentication is missing",`
- `88: code: "SERVICE_ERROR",`
- `100: error: "Failed to download audio file",`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `20: * // After uploading audio to storage`
- `61: export type TranscriptionError = {`
- `62: error: string;`
- `63: code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "UPLOAD_FAILED" | "SERVICE_ERROR";`
- `71: * @returns Transcription result or error`
- `75: ): Promise<TranscriptionResponse | TranscriptionError> {`
- `80: error: "Voice transcription service is not configured",`
- `81: code: "SERVICE_ERROR",`
- `87: error: "Voice transcription service authentication is missing",`
- `88: code: "SERVICE_ERROR",`
- `100: error: "Failed to download audio file",`
- `113: error: "Audio file exceeds maximum size limit",`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
