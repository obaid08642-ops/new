# مصفوفة ربط المزود سيناريو-بسيناريو (ساكنة) — 2026-08-31

| الشاشة | #عقود | العقود/الأساليب | علامات بيانات ثابتة |
|---|---|---|---|
| ambulance/AmbulanceDashboard.tsx | 7 | /emergency/${id}/claim, /emergency/${mission.id}/track, /emergency/driver/missions, /provider/ops/ambulance/${mission.id}/complete, /provider/ops/ambulance/${mission.id}/eta | 0 |
| ambulance/AmbulanceRegistration.tsx | 5 | login, start, step2, step3, submit | 0 |
| auth/AuthScreens.tsx | 0 | — (عرضية/تتغذى من الأب) | 1 |
| auth/PendingDashboard.tsx | 2 | /auth/send-otp, /auth/verify-otp | 0 |
| doctor/DoctorDashboard.tsx | 30 | /chats/${activeChat.id}/messages, /chats/${chat.id}/messages, /chats/provider, /hospital/invitations/inbox, /hospital/leave-facility | 6 |
| doctor/DoctorOpsScreens.tsx | 7 | /provider/ops/doctor/blacklist, /provider/ops/doctor/blacklist/${patientId}, /provider/ops/doctor/diagnoses, /provider/ops/doctor/leave, /provider/ops/doctor/leave/${id} | 1 |
| doctor/DoctorRegistration.tsx | 7 | login, start, step2, step3, submit | 2 |
| doctor/FacilityInvitationsScreen.tsx | 2 | /hospital/invitations/${id}/respond, /hospital/invitations/inbox | 0 |
| doctor/components/DoctorHeader.tsx | 0 | — (عرضية/تتغذى من الأب) | 0 |
| doctor/components/DoctorQueueList.tsx | 0 | — (عرضية/تتغذى من الأب) | 0 |
| doctor/components/DoctorStatsRow.tsx | 0 | — (عرضية/تتغذى من الأب) | 0 |
| doctor/components/DoctorUrgentRequests.tsx | 0 | — (عرضية/تتغذى من الأب) | 0 |
| facility/DischargeSummaryScreen.tsx | 2 | /facility/beds/admissions, /facility/beds/discharge/${selected.id} | 0 |
| facility/FacilityAnnouncementsScreen.tsx | 1 | /facility/announcements | 0 |
| facility/FacilityAuditLogScreen.tsx | 1 | /provider/facility/audit-logs | 0 |
| facility/FacilityDashboard.tsx | 24 | /care/appointments/${encodeURIComponent(apptId)}/check-in, /facility/beds/admission, /facility/beds/discharge/${admissionId}, /facility/beds/wards, /facility/beds/wards/${ward.id}/beds | 2 |
| facility/FacilityInternalChatScreen.tsx | 2 | /chat/threads, /chat/threads/${activeChat}/messages | 0 |
| facility/FacilityInvitationScreen.tsx | 1 | /hospital/invitations | 1 |
| facility/FacilityLeaveRequestsScreen.tsx | 2 | /provider/leave-requests, /provider/leave-requests/action | 0 |
| facility/FacilityPatientTrackerScreen.tsx | 1 | /provider/facility/patients/active | 0 |
| facility/FacilityProfileConfigScreen.tsx | 1 | /provider/profile | 0 |
| facility/FacilityRegistration.tsx | 7 | login, start, step2, step3, submit | 1 |
| facility/FacilityResourcesScreen.tsx | 2 | /facility/resources, /facility/resources/${res.id} | 1 |
| facility/FacilityUnifiedCalendarScreen.tsx | 1 | /provider/facility/calendar | 0 |
| lab/LabDashboard.tsx | 17 | /approval-workflow/requests, /labs/bookings/${order.id}/assign-technician, /labs/bookings/${order.id}/coverage-decision, /labs/bookings/${order.id}/gps, /labs/bookings/${order.id}/reschedule | 4 |
| lab/LabQcActions.tsx | 1 | /provider/ops/lab/bookings/${booking.id}/qc/${action} | 0 |
| lab/LabRegistration.tsx | 7 | login, start, step2, step3, submit | 3 |
| nursing/NursingDashboard.tsx | 24 | /chats/threads/${threadId}/messages, /chats/threads/booking, /home-care/bookings/${order.id}/check-in, /home-care/bookings/${order.id}/gps, /home-care/bookings/${order.id}/visit-report | 1 |
| nursing/NursingFieldOps.tsx | 0 | — (عرضية/تتغذى من الأب) | 0 |
| nursing/NursingRegistration.tsx | 7 | login, start, step2, step3, submit | 4 |
| pharmacy/PharmacyDashboard.tsx | 18 | /pharmacy/chat/threads, /pharmacy/chat/threads/${active.id}/messages, /pharmacy/chat/threads/${t.id}/messages, /pharmacy/procurement/analyze-file, /pharmacy/procurement/my-requests | 2 |
| pharmacy/PharmacyRegistration.tsx | 7 | login, start, step2, step3, submit | 2 |
| radiology/RadiologyDashboard.tsx | 12 | /provider/capabilities/radiology, /radiology/bookings/${currentOrder.id}/${action}, /radiology/bookings/${currentOrder.id}/abort, /radiology/bookings/${currentOrder.id}/coverage-decision, /radiology/bookings/${currentOrder.id}/reschedule | 5 |
| radiology/RadiologyRegistration.tsx | 7 | login, start, step2, step3, submit | 3 |
| shared/BlueprintScreens.tsx | 23 | /ai/copilot/suggest, /emergency/${emergencyId}/track, /emergency/${id}/claim, /emergency/active, /emergency/trigger | 0 |
| shared/FleetScreen.tsx | 2 | /provider/ambulance/fleet, /provider/ambulance/fleet/${v.id} | 0 |
| shared/InsuranceRequestsScreen.tsx | 2 | /insurance/requests/${target.id}/decide, /insurance/requests/provider/queue | 0 |
| shared/LiveKitRoomProvider.tsx | 0 | — (عرضية/تتغذى من الأب) | 0 |
| shared/PharmacyChatResponder.tsx | 0 | — (عرضية/تتغذى من الأب) | 0 |
| shared/ProviderHome.tsx | 0 | — (عرضية/تتغذى من الأب) | 0 |
| shared/RealScreens.tsx | 6 | /provider/notifications, /provider/reviews, /provider/reviews/${id}/reply, /provider/working-hours, /support/tickets | 1 |
| shared/RealScreensExtended.tsx | 7 | /approval-workflow/requests, /pharmacy/inventory/expiry, /pharmacy/orders/refills, /provider/capabilities/lab, /provider/pharmacy/allocations | 0 |
| shared/RegistrationSuccess.tsx | 1 | /provider-onboarding/contract | 0 |
| shared/SharedScreens.tsx | 26 | /chats/${conv.id}/messages, /chats/threads, /medicines/${selectedDrug.id}/suggest-change, /medicines/${selectedDrug.id}/suggest-image, /provider-onboarding/my-profile | 8 |
| shared/VideoCallRoom.tsx | 3 | /calls/${encodeURIComponent(sessionId)}/join, /calls/${encodeURIComponent(sid)}/end, /calls/initiate | 2 |