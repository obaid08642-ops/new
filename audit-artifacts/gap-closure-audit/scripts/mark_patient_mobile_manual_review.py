from pathlib import Path

root = Path('/tmp/nabd-main-audit/audit-artifacts/gap-closure-audit')
path = root / 'PATIENT_MOBILE_SCREEN_ACTION_SCENARIO_INVENTORY_2026-08-26.tsv'
reviewed = {
    'app/consultations/book/[id].tsx',
    'app/consultations/booking-confirm.tsx',
    'app/consultations/booking-pending.tsx',
    'app/consultations/booking-success.tsx',
    'app/consultations/appointment-detail.tsx',
    'app/consultations/cancel-reschedule.tsx',
    'app/consultations/virtual-waiting-room.tsx',
    'app/consultations/video-call.tsx',
    'app/consultations/post-call-rating.tsx',
    'app/consultations/call-history.tsx',
    'app/consultations/clinic-confirm.tsx',
    'app/consultations/home-visit-tracking.tsx',
    'app/consultations/appointments.tsx',
    'app/consultations/doctor/[id].tsx',
    'app/consultations/incoming-call.tsx',
    'app/consultations/summary.tsx',
    'app/consultations/prescription-from-doctor.tsx',
}

lines = path.read_text(encoding='utf-8').splitlines()
header = lines[0].split('\t')
columns = {name: index for index, name in enumerate(header)}
out = [lines[0]]
for raw in lines[1:]:
    row = raw.split('\t')
    if row[columns['source_path']] in reviewed:
        row[columns['screen_review_status']] = 'MANUALLY_REVIEWED__FINDINGS_RECORDED'
        row[columns['cta_inventory_status']] = 'MANUALLY_REVIEWED__CTA_EVIDENCE_SEE_DOMAIN_REVIEW'
        row[columns['scenario_matrix_status']] = 'MANUALLY_REVIEWED__STATE_AND_FINANCIAL_GAPS_RECORDED'
        row[columns['web_equivalent_status']] = 'NOT_YET_RECONCILED__MOBILE_REFERENCE_UNTRUSTED'
        row[columns['contract_status']] = 'MANUAL_STATIC_REVIEW__BACKEND_RECONCILIATION_REQUIRED'
        row[columns['data_source_status']] = 'MANUALLY_REVIEWED__MIXED_SERVER_AND_CLIENT_DERIVATION'
        row[columns['mock_placeholder_disposition']] = 'MANUALLY_REVIEWED__STATIC_OR_PARAM_DRIVEN_RESULTS_RECORDED'
        row[columns['gap_disposition']] = 'MANUAL_REVIEW_COMPLETE__FINDINGS_OR_CONTRACT_GAPS_RECORDED'
    out.append('\t'.join(row))
path.write_text('\n'.join(out) + '\n', encoding='utf-8')
print(f'updated {sum(1 for raw in lines[1:] if raw.split(chr(9))[columns["source_path"]] in reviewed)} rows')
