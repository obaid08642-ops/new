# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `scripts/compare_mobile_web.py`
- **Member SHA-256:** `bbdb2302fda385b9d9662887e82a01d5101506ec9104a026313a07e6e8a6c7b7`
- **Line count:** 34
- **Read range:** `1-34`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: webpages=[p for p in W.rglob('page.tsx')]`
- `8: webpaths=['/'+str(p.parent.relative_to(W)).replace('[locale]','[locale]') for p in webpages]`
- `25: nav=len(re.findall(r'navigation\.(navigate|push|replace|goBack|pop|reset)|router\.(push|replace)',s))`
- `26: acts=len(re.findall(r'onPress\s*=|onSubmit|Alert\.alert|dispatch\(',s))`
- `28: rows.append({'mobile_screen':str(rel),'domain':domain(p),'web_candidates':candidates,'nav_markers':nav,'action_markers':acts,'methods':dict(methods),'status':'candidate' if candidates else 'missing_web_candidate'})`
- `29: (O/'mobile_to_web_screen_map.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')`
- `30: summary={'mobile_app_source_screens':len(mobile),'mobile_domains':dict(Counter(x['domain'] for x in rows)),'with_web_filename_candidate':sum(bool(x['web_candidates']) for x in rows),'without_web_filename_candidate':sum(not x['web_candidates`
- `31: (O/'screen_map_summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')`
- `33: print(f"{r['status']}\t{r['domain']}\t{r['mobile_screen']}\t{','.join(r['web_candidates'])}")`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `24: s=p.read_text(errors='ignore')`
- `28: rows.append({'mobile_screen':str(rel),'domain':domain(p),'web_candidates':candidates,'nav_markers':nav,'action_markers':acts,'methods':dict(methods),'status':'candidate' if candidates else 'missing_web_candidate'})`
- `33: print(f"{r['status']}\t{r['domain']}\t{r['mobile_screen']}\t{','.join(r['web_candidates'])}")`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `24: s=p.read_text(errors='ignore')`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
