# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `components-next/session-actions.tsx`
- **Member SHA-256:** `5e12a5999040154bb62f6db05a019483a21cef0b83a7d28000b3fdd12e724822`
- **Line count:** 24
- **Read range:** `1-24`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { LogOut, UserRound } from "lucide-react";`
- `5: import { useRouter } from "next/navigation";`
- `10: const router = useRouter();`
- `16: try { await fetch("/api/auth/logout", { method: "POST" }); }`
- `17: finally { router.replace(`/${locale}`); router.refresh(); }`
- `21: <Link className="header-account" href={`/${locale}/profile`}><UserRound size={17} aria-hidden="true" /><span>{accountLabel}</span></Link>`
- `22: <button className="header-signout" type="button" onClick={signOut} disabled={isSigningOut} aria-label={signOutLabel}><LogOut size={17} aria-hidden="true" /><span>{signOutLabel}</span></button>`
### backend_consumers_or_contracts
- `16: try { await fetch("/api/auth/logout", { method: "POST" }); }`
### auth_ownership
- `4: import { LogOut, UserRound } from "lucide-react";`
- `9: export function SessionActions({ locale, accountLabel, signOutLabel }: { locale: Locale; accountLabel: string; signOutLabel: string }) {`
- `16: try { await fetch("/api/auth/logout", { method: "POST" }); }`
- `17: finally { router.replace(`/${locale}`); router.refresh(); }`
- `20: return <div className="session-actions">`
- `22: <button className="header-signout" type="button" onClick={signOut} disabled={isSigningOut} aria-label={signOutLabel}><LogOut size={17} aria-hidden="true" /><span>{signOutLabel}</span></button>`
### state_transitions
- `6: import { useState } from "react";`
- `11: const [isSigningOut, setIsSigningOut] = useState(false);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
