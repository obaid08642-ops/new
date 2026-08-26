from pathlib import Path

root = Path('/tmp/nabd-main-audit/audit-artifacts/gap-closure-audit')
path = root / 'PROVIDER_SCREEN_ACTION_SCENARIO_INVENTORY_2026-08-26.tsv'
reviewed = {
    'src/screens/ambulance/AmbulanceDashboard.tsx',
    'src/screens/ambulance/AmbulanceRegistration.tsx',
    'src/screens/facility/DischargeSummaryScreen.tsx',
    'src/screens/shared/FleetScreen.tsx',
    'src/screens/shared/RegistrationSuccess.tsx',
    'src/screens/facility/FacilityAnnouncementsScreen.tsx',
    'src/screens/facility/FacilityRegistration.tsx',
    'src/screens/facility/FacilityInvitationScreen.tsx',
    'src/screens/facility/FacilityResourcesScreen.tsx',
    'src/screens/facility/FacilityInternalChatScreen.tsx',
    'src/screens/facility/FacilityLeaveRequestsScreen.tsx',
    'src/screens/facility/FacilityProfileConfigScreen.tsx',
    'src/screens/facility/FacilityAuditLogScreen.tsx',
    'src/screens/facility/FacilityPatientTrackerScreen.tsx',
    'src/screens/facility/FacilityUnifiedCalendarScreen.tsx',
    'src/screens/doctor/DoctorOpsScreens.tsx',
    'src/screens/doctor/DoctorRegistration.tsx',
    'src/screens/doctor/FacilityInvitationsScreen.tsx',
    'src/screens/doctor/components/DoctorHeader.tsx',
    'src/screens/doctor/components/DoctorStatsRow.tsx',
    'src/screens/doctor/components/DoctorUrgentRequests.tsx',
    'src/screens/doctor/components/DoctorQueueList.tsx',
    'src/screens/auth/PendingDashboard.tsx',
    'src/screens/lab/LabQcActions.tsx',
    'src/screens/nursing/NursingFieldOps.tsx',
    'src/screens/pharmacy/PharmacyDashboard.tsx',
    'src/screens/shared/BlueprintScreens.tsx',
    'src/screens/shared/InsuranceRequestsScreen.tsx',
    'src/screens/shared/LiveKitRoomProvider.tsx',
    'src/screens/shared/PharmacyChatResponder.tsx',
    'src/screens/shared/ProviderHome.tsx',
    'src/screens/shared/RealScreens.tsx',
    'src/screens/shared/VideoCallRoom.tsx',
}

lines = path.read_text(encoding='utf-8').splitlines()
header = lines[0].split('\t')
columns = {name: index for index, name in enumerate(header)}
assert columns['source_path'] >= 0
out = [lines[0]]
for raw in lines[1:]:
    row = raw.split('\t')
    if row[columns['source_path']] in reviewed:
        row[columns['role_matrix_status']] = 'MANUALLY_REVIEWED__BACKEND_ROLE_PROOF_PENDING'
        row[columns['cta_inventory_status']] = 'MANUALLY_REVIEWED__CTA_EVIDENCE_SEPARATE'
        row[columns['scenario_matrix_status']] = 'MANUALLY_REVIEWED__FINDINGS_RECORDED'
        row[columns['contract_status']] = 'MANUAL_STATIC_REVIEW__BACKEND_RECONCILIATION_REQUIRED'
        row[columns['data_source_status']] = 'MANUALLY_REVIEWED__SEE_EVIDENCE'
        row[columns['security_review_status']] = 'MANUALLY_REVIEWED__SEE_EVIDENCE'
        row[columns['gap_disposition']] = 'MANUAL_REVIEW_COMPLETE__FINDINGS_OR_CONTRACT_GAPS_RECORDED'
    out.append('\t'.join(row))
path.write_text('\n'.join(out) + '\n', encoding='utf-8')
print(f'updated {sum(1 for raw in lines[1:] if raw.split(chr(9))[columns["source_path"]] in reviewed)} rows')
