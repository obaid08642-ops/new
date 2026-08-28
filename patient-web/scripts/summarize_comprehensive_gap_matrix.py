from __future__ import annotations
import csv, json
from collections import Counter, defaultdict
from pathlib import Path

root = Path('/home/ubuntu/nabdah_impl/repo/audit-artifacts/comprehensive-audit-20260823')
rows = list(csv.DictReader((root/'mobile_web_screen_gap_matrix.tsv').open(encoding='utf-8'), delimiter='\t'))
journeys = list(csv.DictReader((root/'journey_72_gap_matrix.tsv').open(encoding='utf-8'), delimiter='\t'))
by_domain = defaultdict(list)
for row in rows: by_domain[row['domain']].append(row)
summary = {}
for domain, items in sorted(by_domain.items()):
    summary[domain] = {
        'mobile_files': len(items),
        'files_with_actions': sum(int(x['mobile_action_markers']) > 0 for x in items),
        'files_with_navigation': sum(int(x['mobile_navigation_markers']) > 0 for x in items),
        'files_with_mutation_methods': sum(any(k != 'GET' for k in json.loads(x['mobile_methods']).keys()) for x in items),
        'web_name_candidates': sum(bool(x['web_route_candidates']) for x in items),
        'missing_web_surface_candidates': sum(x['status'] == 'MISSING_WEB_SURFACE' for x in items),
        'partial_mutation_contract': sum(x['status'] == 'PARTIAL_MUTATION_CONTRACT_REQUIRED' for x in items),
        'partial_action_proof': sum(x['status'] == 'PARTIAL_ACTION_PROOF_REQUIRED' for x in items),
        'read_contract_proof': sum(x['status'] == 'READ_CANDIDATE_CONTRACT_PROOF_REQUIRED' for x in items),
        'files': [x['mobile_file'] for x in items if x['status'] == 'MISSING_WEB_SURFACE'],
    }
journey_by_domain = defaultdict(list)
for row in journeys: journey_by_domain[row['domain']].append(row)
for domain, items in sorted(journey_by_domain.items()):
    summary.setdefault(domain, {})['journeys'] = len(items)
    summary[domain]['journey_statuses'] = dict(Counter(x['audit_status'] for x in items))
(root/'domain_gap_summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2)+'\n')
with (root/'domain_gap_summary.tsv').open('w', encoding='utf-8', newline='') as f:
    fields=['domain','mobile_files','files_with_actions','files_with_navigation','files_with_mutation_methods','web_name_candidates','missing_web_surface_candidates','partial_mutation_contract','partial_action_proof','read_contract_proof','journeys','blocked_or_deferred_journeys']
    w=csv.DictWriter(f, fieldnames=fields, delimiter='\t'); w.writeheader()
    for domain, data in sorted(summary.items()):
        statuses=data.get('journey_statuses', {})
        w.writerow({'domain':domain, **{k:data.get(k,0) for k in fields[1:10]}, 'journeys':data.get('journeys',0), 'blocked_or_deferred_journeys':statuses.get('BLOCKED_OR_DEFERRED',0)})
print(json.dumps({'domains':len(summary),'totals':{'mobile_files':len(rows),'journeys':len(journeys),'missing_web_surface':sum(x['status']=='MISSING_WEB_SURFACE' for x in rows),'blocked_or_deferred_journeys':sum(x['audit_status']=='BLOCKED_OR_DEFERRED' for x in journeys)}}, ensure_ascii=False))
