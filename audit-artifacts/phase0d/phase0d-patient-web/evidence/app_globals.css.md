# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/globals.css`
- **Member SHA-256:** `5e440d8353d689e70c31cf64aa46efd4cf26101d4fa4d5f037e9a31418233eb2`
- **Line count:** 208
- **Read range:** `1-208`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `68: .route-state-actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1.25rem; }`
- `91: .topbar { min-height:5.15rem; }.nav-actions { gap:.5rem; }.header-login { min-height:2.6rem; padding:.5rem .78rem; font-size:.8rem; white-space:nowrap; }.locale-selector { gap:.24rem; }.locale-option { min-height:2.2rem; font-size:.76rem; f`
- `92: @media (prefers-reduced-motion:no-preference) { .main:not(.premium-landing) { animation:page-enter var(--motion-enter) var(--ease-premium) both; }.brand-mark { transition:transform var(--motion-standard) var(--ease-premium), box-shadow var(`
- `93: @keyframes page-enter { from { opacity:0; transform:translateY(7px); } to { opacity:1; transform:translateY(0); } }`
- `94: @media (max-width:540px) { .topbar { min-height:auto; padding-block:.75rem; }.brand-wordmark { font-size:1.05rem; }.brand-mark { width:2.25rem; height:2.25rem; }.nav-actions { gap:.4rem; }.header-login { min-height:2.65rem; border-radius:.9`
- `96: /* Keep every supported locale discoverable without horizontal scrolling on phone screens. */`
- `97: @media (max-width:540px) { .nav-actions { grid-template-columns:minmax(0,1fr); }.locale-selector { flex-wrap:wrap; overflow:visible; padding-bottom:0; justify-content:flex-start; }.nav-actions > .header-login { width:100%; } }`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `73: .session-actions { display: inline-flex; align-items: center; gap: .45rem; }.header-account, .header-signout { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; min-height: 2.45rem; padding: .5rem .65rem; borde`
- `74: @media (max-width: 540px) { .session-actions { min-width: 0; }.header-account span, .header-signout span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }.header-account, .header-si`
- `91: .topbar { min-height:5.15rem; }.nav-actions { gap:.5rem; }.header-login { min-height:2.6rem; padding:.5rem .78rem; font-size:.8rem; white-space:nowrap; }.locale-selector { gap:.24rem; }.locale-option { min-height:2.2rem; font-size:.76rem; f`
- `92: @media (prefers-reduced-motion:no-preference) { .main:not(.premium-landing) { animation:page-enter var(--motion-enter) var(--ease-premium) both; }.brand-mark { transition:transform var(--motion-standard) var(--ease-premium), box-shadow var(`
- `94: @media (max-width:540px) { .topbar { min-height:auto; padding-block:.75rem; }.brand-wordmark { font-size:1.05rem; }.brand-mark { width:2.25rem; height:2.25rem; }.nav-actions { gap:.4rem; }.header-login { min-height:2.65rem; border-radius:.9`
- `97: @media (max-width:540px) { .nav-actions { grid-template-columns:minmax(0,1fr); }.locale-selector { flex-wrap:wrap; overflow:visible; padding-bottom:0; justify-content:flex-start; }.nav-actions > .header-login { width:100%; } }`
- `100: /* Phase 5: cross-platform semantic layer sourced from mobile design tokens. */`
### state_transitions
- `1: :root { color-scheme: light; --ink: #102334; --muted: #526473; --line: #d9e4ea; --surface: #ffffff; --canvas: #f5fafb; --brand: #0b98ae; --brand-deep: #087486; --mint: #dff7f2; --danger: #b4232c; } * { box-sizing: border-box; } html, body {`
- `4: .profile-grid .status-card { margin-top: 0; min-width: 0; }`
- `5: .profile-grid .status-card h2 { margin: 0; font-size: 1.05rem; }`
- `31: .diagnostic-grid .status-card { margin-top: 0; min-width: 0; }`
- `68: .route-state-actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1.25rem; }`
- `119: --color-success: #117a55;`
- `120: --color-success-surface: #ecfdf3;`
- `160: :where(.status-card, .appointment-card, .medicine-card, .homecare-card, .family-card, .notification-card, .vital-card, .prescription-card, .chat-card, .reminder-card) {`
- `168: :where(.status-card, .appointment-card, .medicine-card, .homecare-card, .family-card, .notification-card, .vital-card, .prescription-card, .chat-card, .reminder-card):hover {`
- `176: :where(.status-card, .appointment-card, .medicine-card, .homecare-card, .family-card, .notification-card, .vital-card, .prescription-card, .chat-card, .reminder-card):hover {`
### payment_insurance_relevance
- `1: :root { color-scheme: light; --ink: #102334; --muted: #526473; --line: #d9e4ea; --surface: #ffffff; --canvas: #f5fafb; --brand: #0b98ae; --brand-deep: #087486; --mint: #dff7f2; --danger: #b4232c; } * { box-sizing: border-box; } html, body {`
- `4: .profile-grid .status-card { margin-top: 0; min-width: 0; }`
- `5: .profile-grid .status-card h2 { margin: 0; font-size: 1.05rem; }`
- `13: .appointment-card { display: grid; gap: .65rem; min-width: 0; padding: 1.15rem; border: 1px solid var(--line); border-radius: 1rem; background: var(--surface); box-shadow: 0 14px 32px rgba(22,71,84,.06); transition: transform 160ms var(--ea`
- `14: .appointment-card:hover { transform: translateY(-2px); border-color: var(--brand); }`
- `15: .appointment-card:focus-visible { outline: 3px solid rgba(11,152,174,.25); outline-offset: 3px; }`
- `17: .appointment-card > strong { overflow-wrap: anywhere; }`
- `18: .appointment-card > span:not(.appointment-service):not(.appointment-open) { color: var(--muted); font-size: .92rem; line-height: 1.45; }`
- `23: .medicine-card { display: grid; gap: .6rem; min-width: 0; padding: 1.15rem; border: 1px solid var(--line); border-radius: 1rem; background: var(--surface); box-shadow: 0 14px 32px rgba(22,71,84,.06); transition: transform 160ms var(--ease-o`
- `24: .medicine-card:hover { transform: translateY(-2px); border-color: var(--brand); }`
- `25: .medicine-card:focus-visible { outline: 3px solid rgba(11,152,174,.25); outline-offset: 3px; }`
- `26: .medicine-card > strong { overflow-wrap: anywhere; }`
### error_empty_loading_retry_cancel
- `1: :root { color-scheme: light; --ink: #102334; --muted: #526473; --line: #d9e4ea; --surface: #ffffff; --canvas: #f5fafb; --brand: #0b98ae; --brand-deep: #087486; --mint: #dff7f2; --danger: #b4232c; } * { box-sizing: border-box; } html, body {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
