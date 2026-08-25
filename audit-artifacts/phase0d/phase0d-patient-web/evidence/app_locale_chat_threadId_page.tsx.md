# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/chat/[threadId]/page.tsx`
- **Member SHA-256:** `8b6b3c67d20fd8beb81ad2393b26fc5807087bdab39c54deb403b04a44cdedac`
- **Line count:** 12
- **Read range:** `1-12`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function ChatThreadPage({params}:Props){const {locale,threadId}=await params;if(!isLocale(locale)||!/^[0-9a-f-]{36}$/i.test(threadId))notFound();setRequestLocale(locale);const t=await getTranslations("ChatDetail");const`
### backend_consumers_or_contracts
- `5: import { extractChatMessageSummaries, extractChatThreadSummaries } from "@/lib/api/chat";`
- `6: import { getPatientChatMessages, getPatientChatThread } from "@/lib/api/chat-server";`
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `7: import { requirePatientAccess } from "@/lib/auth/session";`
- `12: export default async function ChatThreadPage({params}:Props){const {locale,threadId}=await params;if(!isLocale(locale)||!/^[0-9a-f-]{36}$/i.test(threadId))notFound();setRequestLocale(locale);const t=await getTranslations("ChatDetail");const`
### state_transitions
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function ChatThreadPage({params}:Props){const {locale,threadId}=await params;if(!isLocale(locale)||!/^[0-9a-f-]{36}$/i.test(threadId))notFound();setRequestLocale(locale);const t=await getTranslations("ChatDetail");const`
### payment_insurance_relevance
- `12: export default async function ChatThreadPage({params}:Props){const {locale,threadId}=await params;if(!isLocale(locale)||!/^[0-9a-f-]{36}$/i.test(threadId))notFound();setRequestLocale(locale);const t=await getTranslations("ChatDetail");const`
### error_empty_loading_retry_cancel
- `9: import { RetryButton } from "@/components-next/retry-button";`
- `12: export default async function ChatThreadPage({params}:Props){const {locale,threadId}=await params;if(!isLocale(locale)||!/^[0-9a-f-]{36}$/i.test(threadId))notFound();setRequestLocale(locale);const t=await getTranslations("ChatDetail");const`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
