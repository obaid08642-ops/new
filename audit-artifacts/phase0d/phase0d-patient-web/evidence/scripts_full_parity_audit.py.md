# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `scripts/full_parity_audit.py`
- **Member SHA-256:** `eef6d77d7d41e9c3cfd45ba206214ed338919197f86a158183bfa1ae99bd0d6a`
- **Line count:** 49
- **Read range:** `1-49`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `20: if re.search(r'navigation\.(navigate|push|replace|goBack|pop|reset)|<Stack\.Screen|<Tab\.Screen|<Drawer\.Screen|router\.(push|replace)',line): nav.append(f'{p.relative_to(MOBILE)}\t{i}\t{line.strip()}')`
- `21: if re.search(r'onPress\s*=|onSubmit|Alert\.alert|Linking\.openURL|dispatch\(',line): actions.append(f'{p.relative_to(MOBILE)}\t{i}\t{line.strip()}')`
- `26: web_routes=[]`
- `28: if p.name=='page.tsx': web_routes.append('/'+str(p.parent.relative_to(WEB/'app')).replace('[locale]','[locale]').replace('/','/'))`
- `29: if p.name=='route.ts': web_routes.append('API /'+str(p.parent.relative_to(WEB/'app')).replace('/','/'))`
- `30: write('web_routes.txt','\n'.join(web_routes))`
- `38: # Count non-empty route directories and source breadth.`
- `45: 'web_routes':len(web_routes),`
### backend_consumers_or_contracts
- `22: if re.search(r'fetch\(|axios\.|API_BASE|/api/v1/|/api/',line): api.append(f'{p.relative_to(MOBILE)}\t{i}\t{line.strip()}')`
- `35: if re.search(r'getPublic|callPatientApi|fetch\(.*api/|patientApiUrl|/api/',line): web_api.append(f'{p.relative_to(WEB)}\t{i}\t{line.strip()}')`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `18: s=p.read_text(errors='ignore')`
- `33: s=p.read_text(errors='ignore')`
- `38: # Count non-empty route directories and source breadth.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `18: s=p.read_text(errors='ignore')`
- `33: s=p.read_text(errors='ignore')`
- `38: # Count non-empty route directories and source breadth.`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
