# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `scripts/build_parity_matrix.py`
- **Member SHA-256:** `de15e4d6444a95b5519bfc5376d725e23f145c0c0e7be94c85f6369b97794a52`
- **Line count:** 90
- **Read range:** `1-90`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: # Route candidates are intentionally conservative: a filename/domain match means only that`
- `12: # a page may exist, never that the Mobile capability is complete.`
- `13: web_pages=[p for p in (ROOT/'app').rglob('page.tsx')]`
- `14: web_routes=['/'+str(p.parent.relative_to(ROOT/'app')).replace('[locale]','[locale]') for p in web_pages]`
- `22: # Explicit known route families whose route names do not match Mobile file names.`
- `28: 'consultations/cancel-reschedule':'/appointments/[appointmentId]',`
- `42: 'pharmacy/checkout':'/cart/checkout',`
- `61: for r in web_routes:`
- `68: nav=len(re.findall(r'navigation\.(navigate|push|replace|goBack|pop|reset)|router\.(push|replace)',s))`
- `69: actions=len(re.findall(r'onPress\s*=|onSubmit|Alert\.alert|dispatch\(',s))`
- `78: if c and actions and methods: status='partial-route-contract-review'`
- `79: elif c: status='partial-route-only'`
### backend_consumers_or_contracts
- `27: 'consultations/appointment-detail':'/appointments/[appointmentId]',`
- `28: 'consultations/cancel-reschedule':'/appointments/[appointmentId]',`
- `37: 'tabs/pharmacy':'/medicines',`
- `38: 'nursing/service-info':'/home-care/services/[serviceId]',`
- `39: 'nursing/service-details':'/home-care/services',`
- `43: 'pharmacy/payment':'/orders/[orderId]',`
- `44: 'pharmacy/order-tracking':'/orders/[orderId]/tracking',`
- `45: 'pharmacy/order-confirm':'/orders/[orderId]',`
- `46: 'pharmacy/order-history':'/orders',`
- `49: 'notifications/index':'/notifications',`
- `52: 'insurance/hub':'/insurance',`
- `71: endpoints=sorted(set(re.findall(r'/(?:api/)?[A-Za-z0-9_${}\[\]/?=.&:-]+',s)))`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `28: 'consultations/cancel-reschedule':'/appointments/[appointmentId]',`
- `67: s=p.read_text(errors='ignore')`
- `78: if c and actions and methods: status='partial-route-contract-review'`
- `79: elif c: status='partial-route-only'`
- `80: else: status='missing-or-merged-route-review'`
- `81: rows.append({'mobile_file':str(rel),'domain':rel.parts[0] if rel.parts else 'root','web_route_candidates':c,'nav_markers':nav,'action_markers':actions,'http_methods':methods,'status':status,'endpoint_markers':endpoints[:40]})`
- `84: fields=['mobile_file','domain','web_route_candidates','nav_markers','action_markers','http_methods','status','endpoint_markers']`
- `88: summary={'rows':len(rows),'statuses':dict(Counter(r['status'] for r in rows)),'domains':dict(Counter(r['domain'] for r in rows)),'routes':len(web_routes)}`
### payment_insurance_relevance
- `43: 'pharmacy/payment':'/orders/[orderId]',`
- `52: 'insurance/hub':'/insurance',`
### error_empty_loading_retry_cancel
- `28: 'consultations/cancel-reschedule':'/appointments/[appointmentId]',`
- `67: s=p.read_text(errors='ignore')`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
