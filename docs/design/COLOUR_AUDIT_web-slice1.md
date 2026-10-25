# Colour audit, patient-web slice 1 (hubs, home, nav, chips, empty states, buttons)

Runtime: `next dev` on the branch, against a TEST-DATA stand-in backend that answers every read with an empty 200 (the real backend could not be started), Playwright at 390 and 1280, light and dark. Public pages only; signed-in pages (health hub, profile, orders) redirect to login, so they are "static, not runtime-verified" (code vs board source `docs/design/canvas/*.dc.html`). Boards were read as source, not rendered.

| screen | board colour | live colour | fixed | file:line |
|---|---|---|---|---|
| Home 390 + 1280, light + dark (service tiles) | 9 tones per `SERVICE_ICONS` | same | n/a, already right (runtime) | patient-web/components-next/home/home-parts.tsx:161 |
| Home nav active pill / sign-in pill | ink (HomeApp tabActive, WebHome sign-in) | ink | n/a, board shows ink (runtime) | patient-web/components-next/home/home.module.css:22,39 |
| Home AI card | violet solid + mint/violet/teal tools | same | n/a (runtime) | patient-web/components-next/home/home-parts.tsx:132 |
| Services / labs / radiology hub kind tiles + empty state | mint / violet, selected = 2px ink border | same | n/a (static + runtime empty state mint) | patient-web/components-next/diagnostics/diag.module.css:27 |
| Pharmacy hub (Rx banner coral, favourites coral, reminders violet) | coral / coral / violet | same | n/a (runtime) | patient-web/components-next/pharmacy/pharmacy.module.css |
| Consultations hub (blue chips, map button amber icon) | blue | same | n/a (runtime) | patient-web/app/[locale]/consultations/doctors/doctors-view.tsx:131 |
| Nursing / home-care hub | teal | teal | n/a (static) | patient-web/app/[locale]/home-care/page.tsx:91 |
| Health hub tiles | blue / coral / violet / teal / amber / mint | same | n/a (static) | patient-web/lib/health/view.ts:18 |
| Insurance hub shortcut "network" | teal (hospital, Insurance board) | coral | y | patient-web/app/[locale]/insurance/page.tsx:179 |
| Insurance hub shortcut "coverage check" | blue (insurance tone, shield-check) | mint | y | patient-web/app/[locale]/insurance/page.tsx:180 |
| `.button-secondary` (RetryButton on error states) | secondary = white + ink text (token `action.secondary`) | solid ink | y | patient-web/app/globals.css:109 |
| StatusChip, EmptyState, FIcon, ListItem (shared) | tone classes | tone classes wired (tones.css loaded) | n/a | patient-web/components-next/ui-generated/components/Controls.tsx:183 |

## Needs review
| area | note | file:line |
|---|---|---|
| [client] order status chip for cancelled/draft is "ink" (neutral); board Orders may want a tone, unchecked | patient-web/components-next/orders/status-tone.ts:21 |
| [client] call-history rejected/missed chips "ink" | patient-web/app/[locale]/consultations/call-history/page.tsx:22 |
| [client] return statuses rejected/other "ink" | patient-web/components-next/returns/return-kit.tsx:18 |
| [client] security/ticket status chips "ink" (settings, outside slice) | patient-web/app/[locale]/settings/security/page.tsx:44 |
| [client] profile/settings/about rows with gear/info/file-text in "ink" (board Settings not compared) | patient-web/app/[locale]/profile/page.tsx:147 |
| [client] consultations hub segmented/filter chips wrap letters at 390 (layout, not colour) | patient-web/app/[locale]/consultations/doctors/doctors-view.tsx:131 |
