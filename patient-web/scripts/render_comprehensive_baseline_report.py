from __future__ import annotations
import csv, json
from collections import defaultdict
from pathlib import Path

root = Path('/home/ubuntu/nabdah_impl/repo/audit-artifacts/comprehensive-audit-20260823')
rows = list(csv.DictReader((root/'mobile_web_screen_gap_matrix.tsv').open(encoding='utf-8'), delimiter='\t'))
journeys = list(csv.DictReader((root/'journey_72_gap_matrix.tsv').open(encoding='utf-8'), delimiter='\t'))
by = defaultdict(list)
for r in rows: by[r['domain']].append(r)
lines = [
'# Comprehensive Mobile ↔ Web Baseline Audit', '',
'> This is a conservative source inventory. A filename or route candidate is not functional parity evidence. Each action still requires live contract, server boundary, ownership, error, and end-to-end journey proof.', '',
'## Executive counts', '',
'| Metric | Count |', '|---|---:|',
 f'| Mobile source screen/route files | {len(rows)} |',
 f'| Mobile files with action markers | {sum(int(r["mobile_action_markers"]) > 0 for r in rows)} |',
 f'| Mobile files with non-GET mutation markers | {sum(any(k != "GET" for k in json.loads(r["mobile_methods"]).keys()) for r in rows)} |',
 f'| Web page routes | 56 |',
 f'| Mobile files with name-based Web candidate | {sum(bool(r["web_route_candidates"]) for r in rows)} |',
 f'| Mobile files without name-based Web candidate | {sum(not r["web_route_candidates"] for r in rows)} |',
 f'| Atomic journeys in register | {len(journeys)} |',
 f'| Journeys requiring contract/status recheck | {sum(r["audit_status"] == "CONTRACT_STATUS_REQUIRES_RECHECK" for r in journeys)} |',
 f'| Journeys blocked/deferred | {sum(r["audit_status"] == "BLOCKED_OR_DEFERRED" for r in journeys)} |', '',
'## Domain breakdown', '',
'| Domain | Mobile files | Actions | Mutations | Web name candidates | Missing Web candidates | Journeys | Blocked/deferred journeys |', '|---|---:|---:|---:|---:|---:|---:|---:|']
for domain in sorted(by):
    items=by[domain]; js=[x for x in journeys if x['domain']==domain]
    lines.append(f'| `{domain}` | {len(items)} | {sum(int(x["mobile_action_markers"])>0 for x in items)} | {sum(any(k!="GET" for k in json.loads(x["mobile_methods"]).keys()) for x in items)} | {sum(bool(x["web_route_candidates"]) for x in items)} | {sum(x["status"]=="MISSING_WEB_SURFACE" for x in items)} | {len(js)} | {sum(x["audit_status"]=="BLOCKED_OR_DEFERRED" for x in js)} |')
lines += ['', '## File-level gap rules', '', '| Status | Meaning |', '|---|---|', '| `MISSING_WEB_SURFACE` | No same-name Web page candidate; requires a capability-level mapping, not automatic route creation. |', '| `PARTIAL_MUTATION_CONTRACT_REQUIRED` | Mobile has a non-GET marker; Web candidate does not prove payload, idempotency, ownership, or cleanup. |', '| `PARTIAL_ACTION_PROOF_REQUIRED` | Mobile has actions, but no mutation method marker was found; Web still needs scenario and contract proof. |', '| `READ_CANDIDATE_CONTRACT_PROOF_REQUIRED` | A same-name Web candidate exists, but live contract and SSR/security evidence are still required. |', '', '## Evidence files', '', '- `mobile_web_screen_gap_matrix.tsv`: one row per Mobile source screen/route file.', '- `journey_72_gap_matrix.tsv`: one row per atomic journey from the 72-journey register.', '- `mobile_navigation_actions.tsv`: raw navigation/action markers.', '- `mobile_api_calls.tsv`: raw API markers.', '- `web_routes.txt`: Web route inventory.', '- `web_api_usage.tsv`: Web API usage inventory.', '', '## Production gate', '', '**NO-GO for 100% parity** until every row is capability-mapped and every patient journey has live contract, owner/stranger/unauth, failure/retry, cleanup, and browser/mobile responsive evidence.']
(root/'COMPREHENSIVE_BASELINE_REPORT.md').write_text('\n'.join(lines)+'\n', encoding='utf-8')
print(root/'COMPREHENSIVE_BASELINE_REPORT.md')
