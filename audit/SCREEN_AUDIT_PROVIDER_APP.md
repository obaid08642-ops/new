# Provider App — Screen Audit Report
**Total Screens:** 46  
**Provider Roles:** 8 (Doctor, Facility, Pharmacy, Lab, Radiology, Nursing, Ambulance, Home Care)  
**Audit Date:** 2026-09-14  
**Branch:** nabdah-plus/full-completion

---

## Screen Inventory by Role

### Shared / Base (12)
| Screen | File | Purpose |
|--------|------|---------|
| Auth Screens | `auth/AuthScreens.tsx` | Login, OTP, registration |
| Pending Dashboard | `auth/PendingDashboard.tsx` | Awaiting approval |
| Provider Home | `shared/ProviderHome.tsx` | Role-based landing |
| Blueprint Screens | `shared/BlueprintScreens.tsx` | Layout templates |
| Real Screens | `shared/RealScreens.tsx` | Production screens |
| Real Screens Extended | `shared/RealScreensExtended.tsx` | Extended production |
| Shared Screens | `shared/SharedScreens.tsx` | Common components |
| Fleet Screen | `shared/FleetScreen.tsx` | Ambulance/fleet tracking |
| Insurance Requests | `shared/InsuranceRequestsScreen.tsx` | Manual insurance approval |
| LiveKit Room Provider | `shared/LiveKitRoomProvider.tsx` | Video call context |
| Video Call Room | `shared/VideoCallRoom.tsx` | Call UI |
| Pharmacy Chat Responder | `shared/PharmacyChatResponder.tsx` | Chat with patients |
| Registration Success | `shared/RegistrationSuccess.tsx` | Post-registration |

### Doctor (7)
| Screen | File | Purpose |
|--------|------|---------|
| Doctor Dashboard | `doctor/DoctorDashboard.tsx` | Main dashboard |
| Doctor Registration | `doctor/DoctorRegistration.tsx` | Onboarding |
| Doctor Ops Screens | `doctor/DoctorOpsScreens.tsx` | Operations |
| Facility Invitations | `doctor/FacilityInvitationsScreen.tsx` | Facility join requests |
| Doctor Header | `doctor/components/DoctorHeader.tsx` | Header component |
| Doctor Queue List | `doctor/components/DoctorQueueList.tsx` | Patient queue |
| Doctor Stats Row | `doctor/components/DoctorStatsRow.tsx` | Stats component |
| Doctor Urgent Requests | `doctor/components/DoctorUrgentRequests.tsx` | Urgent consultations |

### Facility / Hospital (10)
| Screen | File | Purpose |
|--------|------|---------|
| Facility Dashboard | `facility/FacilityDashboard.tsx` | Main dashboard |
| Facility Registration | `facility/FacilityRegistration.tsx` | Onboarding |
| Facility Announcements | `facility/FacilityAnnouncementsScreen.tsx` | Internal notices |
| Facility Audit Log | `facility/FacilityAuditLogScreen.tsx` | Compliance log |
| Facility Internal Chat | `facility/FacilityInternalChatScreen.tsx` | Staff chat |
| Facility Invitation | `facility/FacilityInvitationScreen.tsx` | Doctor invitations |
| Facility Leave Requests | `facility/FacilityLeaveRequestsScreen.tsx` | Staff leave |
| Facility Patient Tracker | `facility/FacilityPatientTrackerScreen.tsx` | Patient tracking |
| Facility Profile Config | `facility/FacilityProfileConfigScreen.tsx` | Settings |
| Facility Resources | `facility/FacilityResourcesScreen.tsx` | Resource mgmt |
| Facility Unified Calendar | `facility/FacilityUnifiedCalendarScreen.tsx` | Scheduling |
| Discharge Summary | `facility/DischargeSummaryScreen.tsx` | Patient discharge |

### Pharmacy (4)
| Screen | File | Purpose |
|--------|------|---------|
| Pharmacy Dashboard | `pharmacy/PharmacyDashboard.tsx` | Main dashboard |
| Pharmacy Registration | `pharmacy/PharmacyRegistration.tsx` | Onboarding |
| Pharmacy Insurance Decision | `pharmacy/PharmacyInsuranceDecision.tsx` | Manual approval entry |
| Pharmacy Chat Responder | `shared/PharmacyChatResponder.tsx` | Patient chat |

### Lab (3)
| Screen | File | Purpose |
|--------|------|---------|
| Lab Dashboard | `lab/LabDashboard.tsx` | Main dashboard |
| Lab Registration | `lab/LabRegistration.tsx` | Onboarding |
| Lab QC Actions | `lab/LabQcActions.tsx` | Quality control |

### Radiology (2)
| Screen | File | Purpose |
|--------|------|---------|
| Radiology Dashboard | `radiology/RadiologyDashboard.tsx` | Main dashboard |
| Radiology Registration | `radiology/RadiologyRegistration.tsx` | Onboarding |

### Nursing (3)
| Screen | File | Purpose |
|--------|------|---------|
| Nursing Dashboard | `nursing/NursingDashboard.tsx` | Main dashboard |
| Nursing Registration | `nursing/NursingRegistration.tsx` | Onboarding |
| Nursing Field Ops | `nursing/NursingFieldOps.tsx` | Field operations |

### Ambulance (2)
| Screen | File | Purpose |
|--------|------|---------|
| Ambulance Dashboard | `ambulance/AmbulanceDashboard.tsx` | Main dashboard |
| Ambulance Registration | `ambulance/AmbulanceRegistration.tsx` | Onboarding |

---

## Role-to-Screen Mapping

| Role | Dashboard | Registration | Operations | Notes |
|------|-----------|--------------|------------|-------|
| Doctor | ✅ | ✅ | ✅ (Ops, Queue, Urgent) | Facility invitations |
| Facility | ✅ | ✅ | ✅ (Announcements, Audit, Chat, Leave, Patient Tracker, Resources, Calendar, Discharge) | Most comprehensive |
| Pharmacy | ✅ | ✅ | ✅ (Insurance Decision, Chat) | Manual approval UI |
| Lab | ✅ | ✅ | ✅ (QC Actions) | Quality control |
| Radiology | ✅ | ✅ | — | Basic |
| Nursing | ✅ | ✅ | ✅ (Field Ops) | Home care |
| Ambulance | ✅ | ✅ | — (Fleet in shared) | Fleet tracking |
| Home Care | — | — | — | Uses Nursing/Shared |

---

## Issues Found

### 🔴 MISSING ROLE: Home Care Provider
- No dedicated `home-care/` screens
- Home care providers should use Nursing dashboard or need own

### 🟡 INCOMPLETE OPERATIONS
| Role | Missing |
|------|---------|
| Radiology | No operations screens (scheduling, QC, reports) |
| Ambulance | No dispatch/tracking screens (only dashboard) |
| Lab | Limited QC (no sample tracking, results entry) |

### 🟡 SHARED SCREENS NAMING
| File | Issue |
|------|-------|
| `shared/BlueprintScreens.tsx` | Unclear purpose |
| `shared/RealScreens.tsx` | Unclear purpose |
| `shared/RealScreensExtended.tsx` | Unclear purpose |
| `shared/SharedScreens.tsx` | Unclear purpose |

### 🟢 WELL IMPLEMENTED
- Auth flow complete
- Doctor operations comprehensive (queue, urgent, stats)
- Facility operations very comprehensive
- Pharmacy insurance decision manual entry (correct per owner decision)
- Video call room shared component
- LiveKit integration ready

---

## Recommendations

1. **Add Home Care provider screens** or document they use Nursing
2. **Add Radiology operations** (scheduling, QC, report upload)
3. **Add Ambulance dispatch/tracking** screens
4. **Add Lab sample tracking & results entry** screens
5. **Rename/consolidate shared screens** for clarity
6. **Verify all roles have insurance approval UI** (Pharmacy has, others need check)
