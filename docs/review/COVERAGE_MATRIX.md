# Coverage matrix (generated)

Generated 2026-10-02 from `docs/review/inventory/screens.json` (commit 214c1c5) and `docs/review/evidence/`.
PASSED = rendered cleanly **and** every exposed control had a verified effect. Rendering alone is never PASSED.

| App | PASSED | PARTIAL | FAILED | NOT_TESTED | BLOCKED | STALE | Total |
|---|---|---|---|---|---|---|---|
| provider-app | 72 | 109 | 18 | 0 | 3 | 0 | 202 |
| patient-app | 10 | 186 | 39 | 5 | 3 | 1 | 244 |
| patient-web | 102 | 139 | 17 | 6 | 6 | 0 | 270 |
| admin | 13 | 41 | 9 | 2 | 0 | 0 | 65 |

| App | Group | Screen / route | Status | Detail | Evidence |
|---|---|---|---|---|---|
| provider-app | doctor | `MainTabs` | FAILED | 7 state(s); 1 failing control(s): الموقع ونطاق التغط=JS_ERROR | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `appointment_detail` | PARTIAL | 4 state(s); 7/30 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `consultation` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `prescription` | PARTIAL | 1 state(s); 4/8 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `sick_leave` | PARTIAL | 1 state(s); 13/14 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `medical_report` | PARTIAL | 1 state(s); 8/9 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `referral` | PARTIAL | 2 state(s); 16/20 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `request_test` | PARTIAL | 4 state(s); 3/100 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `patient_file` | PARTIAL | 2 state(s); 8/21 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `withdrawal_workflow` | PARTIAL | 1 state(s); 16/17 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `revenue_insights` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `availability_engine` | PARTIAL | 3 state(s); 10/75 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `service_management` | PARTIAL | 2 state(s); 5/11 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `promotions` | PARTIAL | 2 state(s); 6/11 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `create_promo` | PARTIAL | 1 state(s); 5/7 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `web_config` | PARTIAL | 1 state(s); 3/6 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `subscriptions_ads` | PARTIAL | 1 state(s); 2/5 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `affiliate` | PASSED | 1 state(s); 2 controls verified | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `reputation` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `crm` | PASSED | 1 state(s); 2 controls verified | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `ai_copilot` | PASSED | 1 state(s); 3 controls verified | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `outbound_referral` | PARTIAL | 1 state(s); 24/25 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `sos_dispatch` | FAILED | 1 state(s); render: 403 GET /emergency/active | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `gps_router` | PASSED | 1 state(s); 2 controls verified | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `profile_edit` | FAILED | 2 state(s); render: 404 GET /provider/profile/image/status; 404 GET /provider/profile/image/status | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `insurance_config` | PASSED | 1 state(s); 2 controls verified | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `insurance_requests` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `certificates_config` | PARTIAL | 1 state(s); 9/10 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `media_config` | PARTIAL | 1 state(s); 1/2 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `virtual_waiting_room` | PARTIAL | 1 state(s); 1/2 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `pre_visit_chat` | PARTIAL | 1 state(s); 1/2 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `medical_jobs` | PARTIAL | 4 state(s); 16/30 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `drug_index` | PARTIAL | 9 state(s); 6/69 control(s) without verified effect | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `facility_invitations` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `location_config` | BLOCKED | needs a real record id (crashes when opened without one) | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `inbound_reports` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | doctor | `video_call` | PARTIAL | 1 state(s); no controls exercised | rn_nav2_provider-app_doctor_2026-10-02.json |
| provider-app | hospital | `MainTabs` | PARTIAL | 6 state(s); 25/115 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `subaccounts` | PARTIAL | 1 state(s); 5/12 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `add_subaccount` | PARTIAL | 1 state(s); 11/13 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `departments` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `shifts` | PARTIAL | 2 state(s); 13/19 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `resources` | PARTIAL | 2 state(s); 9/15 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `leave_requests` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `unified_sched` | PARTIAL | 2 state(s); 2/3 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `beds` | FAILED | 4 state(s); 2 failing control(s): إدارة الأسرّة=WRITE, تأكيد الحجز وتسكين=WRITE | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `qr_checkin` | PARTIAL | 3 state(s); 5/15 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `insurance_hub` | PARTIAL | 2 state(s); 10/11 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `financial` | PARTIAL | 1 state(s); 3/4 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `internal_chat` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `audit_logs` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `announcements` | PARTIAL | 1 state(s); 1/2 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `patient_tracker` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `prescription` | PARTIAL | 1 state(s); 4/8 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `discharge_summary` | PARTIAL | 1 state(s); 3/4 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `attendance` | PASSED | 2 state(s); 2 controls verified | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `surgery_sched` | PARTIAL | 2 state(s); 7/12 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `credentialing` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `hospital_dispatch` | FAILED | 1 state(s); render: 403 GET /home-care/bookings/nursing/all | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `facility_info` | PARTIAL | 1 state(s); 24/25 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `auto_reports` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `notifications` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `support` | PARTIAL | 1 state(s); 2/4 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `security` | PARTIAL | 1 state(s); 4/6 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `order_detail` | PARTIAL | 1 state(s); 1/3 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `wallet` | PARTIAL | 1 state(s); 1/2 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `promotions` | PASSED | 1 state(s); 3 controls verified | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `create_promo` | PARTIAL | 1 state(s); 5/7 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `web_config` | PARTIAL | 1 state(s); 3/6 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `subscriptions_ads` | PARTIAL | 1 state(s); 2/5 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `affiliate` | PASSED | 1 state(s); 2 controls verified | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `reputation` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `crm` | PASSED | 1 state(s); 2 controls verified | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `revenue_insights` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `sos_dispatch` | FAILED | 1 state(s); render: 403 GET /emergency/active | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `ambulance_fleet` | PARTIAL | 2 state(s); 7/12 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `gps_router` | PASSED | 1 state(s); 2 controls verified | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `medical_jobs` | PARTIAL | 5 state(s); 68/99 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `drug_index` | PARTIAL | 9 state(s); 7/102 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `insurance_requests` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `insurance_config` | PARTIAL | 7 state(s); 48/175 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `certificates_config` | PARTIAL | 1 state(s); 2/3 control(s) without verified effect | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | hospital | `media_config` | FAILED | 1 state(s); render: 404 GET /storage/%D9%82%D9%8A%D9%85%D8%A9/signed-url | rn_nav2_provider-app_hospital_2026-10-02.json |
| provider-app | lab | `MainTabs` | PARTIAL | 9 state(s); 19/88 control(s) without verified effect | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `order_detail` | FAILED | 2 state(s); 1 failing control(s): Confirm Direct Ord=WRITE | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `sample_tracking` | PARTIAL | 1 state(s); 5/6 control(s) without verified effect | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `result_review` | PARTIAL | 1 state(s); 7/10 control(s) without verified effect | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `bundles` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `add_test` | PARTIAL | 1 state(s); 9/10 control(s) without verified effect | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `home_collection` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `qr_label` | PASSED | 1 state(s); 2 controls verified | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `wallet` | PARTIAL | 1 state(s); 1/2 control(s) without verified effect | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `chat` | PARTIAL | 1 state(s); 1/2 control(s) without verified effect | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `tat_tracker` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `insurance` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `promotions` | PASSED | 1 state(s); 3 controls verified | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `create_promo` | PARTIAL | 1 state(s); 5/7 control(s) without verified effect | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `web_config` | PARTIAL | 1 state(s); 3/6 control(s) without verified effect | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `reputation` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `crm` | FAILED | 3 state(s); render: 404 GET /provider/crm/cdb5917d-5c7b-40ce-a004-79f3c42790d1 | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `revenue_insights` | PARTIAL | 2 state(s); 6/7 control(s) without verified effect | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `lab_scanner` | PARTIAL | 1 state(s); 1/2 control(s) without verified effect | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `medical_jobs` | PARTIAL | 5 state(s); 66/99 control(s) without verified effect | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `drug_index` | PARTIAL | 9 state(s); 7/102 control(s) without verified effect | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `insurance_config` | PARTIAL | 7 state(s); 50/175 control(s) without verified effect | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `certificates_config` | PARTIAL | 1 state(s); 2/3 control(s) without verified effect | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `media_config` | PARTIAL | 1 state(s); 1/2 control(s) without verified effect | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `test_menu` | PASSED | 1 state(s); 3 controls verified | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `home_service` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `insurance_requests` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `working_hours` | PARTIAL | 1 state(s); 6/11 control(s) without verified effect | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `password` | PARTIAL | 3 state(s); 28/31 control(s) without verified effect | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `2fa` | PARTIAL | 1 state(s); 4/6 control(s) without verified effect | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | lab | `devices` | PARTIAL | 1 state(s); 4/6 control(s) without verified effect | rn_nav2_provider-app_lab_2026-10-02.json |
| provider-app | home_care | `MainTabs` | PARTIAL | 9 state(s); 16/82 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `order_detail` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `checklist` | PASSED | 2 state(s); 14 controls verified | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `checkin` | PARTIAL | 1 state(s); 1/2 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `care_plan` | PARTIAL | 1 state(s); 2/4 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `progress` | PARTIAL | 1 state(s); 6/8 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `visit_report` | PARTIAL | 2 state(s); 6/8 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `supplies` | FAILED | SLOW: 1 loading indicator(s) visible | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `nursing_services` | PARTIAL | 2 state(s); 27/33 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `nursing_pricing` | PARTIAL | 8 state(s); 14/62 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `nursing_coverage` | FAILED | 1 state(s); 1 failing control(s): Verify Current GPS=WRITE | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `promotions` | PASSED | 1 state(s); 3 controls verified | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `create_promo` | PARTIAL | 1 state(s); 5/7 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `web_config` | PARTIAL | 1 state(s); 3/6 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `subscriptions_ads` | PARTIAL | 1 state(s); 2/5 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `affiliate` | PASSED | 1 state(s); 2 controls verified | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `reputation` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `crm` | PASSED | 1 state(s); 2 controls verified | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `revenue_insights` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `sos_dispatch` | FAILED | 1 state(s); render: 403 GET /emergency/active | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `gps_router` | PASSED | 1 state(s); 2 controls verified | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `nurse_visit` | PASSED | 1 state(s); 2 controls verified | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `nurse_checklist` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `profile_edit` | FAILED | 2 state(s); render: 404 GET /provider/profile/image/status; 404 GET /provider/profile/image/status | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `medical_jobs` | PARTIAL | 5 state(s); 66/99 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `drug_index` | PARTIAL | 9 state(s); 8/102 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `insurance_config` | PARTIAL | 7 state(s); 48/175 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `certificates_config` | PARTIAL | 1 state(s); 2/3 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `media_config` | PARTIAL | 1 state(s); 1/2 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `wallet` | PARTIAL | 1 state(s); 1/2 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `chat` | PARTIAL | 2 state(s); 20/21 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `insurance_requests` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `working_hours` | PARTIAL | 1 state(s); 5/7 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `notifications` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `password` | PARTIAL | 1 state(s); 4/6 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `2fa` | PARTIAL | 1 state(s); 4/6 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | home_care | `devices` | PARTIAL | 1 state(s); 4/6 control(s) without verified effect | rn_nav2_provider-app_home_care_2026-10-02.json |
| provider-app | pharmacy | `MainTabs` | FAILED | 9 state(s); 1 failing control(s): إرسال الطلب=WRITE | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `shortage` | PARTIAL | 1 state(s); 2/4 control(s) without verified effect | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `b2b_supply` | FAILED | 5 state(s); 1 failing control(s): Submit Order=WRITE | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `scanner` | PARTIAL | 1 state(s); 1/2 control(s) without verified effect | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `wallet` | PASSED | 1 state(s); 2 controls verified | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `withdrawal_workflow` | PARTIAL | 1 state(s); 16/17 control(s) without verified effect | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `order_history` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `returns_rma` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `delivery_track` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `pharmacy_chat` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `qr_menu` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `reviews` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `chronic` | FAILED | 1 state(s); render: 503 GET /pharmacy/orders/refills | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `promotions` | PASSED | 1 state(s); 3 controls verified | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `create_promo` | PARTIAL | 1 state(s); 5/7 control(s) without verified effect | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `web_config` | PARTIAL | 1 state(s); 3/6 control(s) without verified effect | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `subscriptions_ads` | PARTIAL | 1 state(s); 2/5 control(s) without verified effect | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `affiliate` | PASSED | 1 state(s); 2 controls verified | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `reputation` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `crm` | PASSED | 1 state(s); 2 controls verified | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `revenue_insights` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `pharmacy_broadcast` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `expiry_monitor` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `medical_jobs` | PARTIAL | 5 state(s); 66/99 control(s) without verified effect | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `drug_index` | PARTIAL | 9 state(s); 7/94 control(s) without verified effect | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `insurance_config` | PARTIAL | 7 state(s); 42/150 control(s) without verified effect | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `certificates_config` | PARTIAL | 1 state(s); 2/3 control(s) without verified effect | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `media_config` | PARTIAL | 1 state(s); 1/2 control(s) without verified effect | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `pharmacy_info` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `insurance_requests` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `insurance_decisions` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `product_catalog` | PARTIAL | 1 state(s); 3/4 control(s) without verified effect | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `working_hours` | PARTIAL | 2 state(s); 6/20 control(s) without verified effect | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `notifications` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | pharmacy | `support` | PARTIAL | 1 state(s); 2/4 control(s) without verified effect | rn_nav2_provider-app_pharmacy_2026-10-02.json |
| provider-app | radiology | `MainTabs` | FAILED | 6 state(s); 1 failing control(s): حفظ وإرسال للمراجع=WRITE | rn_nav2_provider-app_radiology_2026-10-02.json |
| provider-app | radiology | `order_detail` | BLOCKED | needs a real record id (crashes when opened without one) | rn_nav2_provider-app_radiology_2026-10-02.json |
| provider-app | radiology | `reporting` | BLOCKED | needs a real record id (crashes when opened without one) | rn_nav2_provider-app_radiology_2026-10-02.json |
| provider-app | radiology | `insurance_requests` | PARTIAL | 2 state(s); 19/20 control(s) without verified effect | rn_nav2_provider-app_radiology_2026-10-02.json |
| provider-app | radiology | `home_visit` | PASSED | 1 state(s); 2 controls verified | rn_nav2_provider-app_radiology_2026-10-02.json |
| provider-app | radiology | `wallet` | PARTIAL | 1 state(s); 1/2 control(s) without verified effect | rn_nav2_provider-app_radiology_2026-10-02.json |
| provider-app | radiology | `drug_index` | PARTIAL | 9 state(s); 7/90 control(s) without verified effect | rn_nav2_provider-app_radiology_2026-10-02.json |
| provider-app | ambulance | `home` | PASSED | 1 state(s); 5 controls verified | rn_nav2_provider-app_ambulance_2026-10-02.json |
| provider-app | ambulance | `mission` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_ambulance_2026-10-02.json |
| provider-app | ambulance | `handover` | PARTIAL | 1 state(s); 2/4 control(s) without verified effect | rn_nav2_provider-app_ambulance_2026-10-02.json |
| provider-app | ambulance | `complete` | PARTIAL | 1 state(s); 8/10 control(s) without verified effect | rn_nav2_provider-app_ambulance_2026-10-02.json |
| provider-app | ambulance | `history` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_ambulance_2026-10-02.json |
| provider-app | ambulance | `fleet` | PARTIAL | 2 state(s); 7/12 control(s) without verified effect | rn_nav2_provider-app_ambulance_2026-10-02.json |
| provider-app | ambulance | `insurance_requests` | PASSED | 1 state(s); 1 controls verified | rn_nav2_provider-app_ambulance_2026-10-02.json |
| provider-app | ambulance | `profile` | FAILED | 1 state(s); 1 failing control(s): حفظ الملف=WRITE | rn_nav2_provider-app_ambulance_2026-10-02.json |
| provider-app | ambulance | `availability` | PARTIAL | 1 state(s); 1/4 control(s) without verified effect | rn_nav2_provider-app_ambulance_2026-10-02.json |
| patient-app |  | `/ai-assistant` | PARTIAL | 4/5 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/` | PARTIAL | no controls exercised | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/room/[id]` | NOT_TESTED | dynamic route: needs a real record id | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/shared/location-picker` | PARTIAL | 3/5 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/community/post-detail` | PARTIAL | 5/5 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/community/hub` | PARTIAL | 6/7 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/ai/symptom-checker` | PARTIAL | 1/10 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/ai/triage` | PARTIAL | 1/10 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/ai/symptom-timeline` | PARTIAL | 1/10 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/ai/chat-doctor` | PARTIAL | 1/10 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/ai/monthly-report` | PARTIAL | 1/4 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/ai/prescription-translator` | PARTIAL | 3/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/ai/skin-analysis` | PARTIAL | 6/14 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/programs/active` | PARTIAL | 2/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/mental-health/therapist-match` | PARTIAL | 15/15 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/mental-health/self-assessment` | PARTIAL | 4/4 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/mental-health/breathing` | PARTIAL | 1/4 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/mental-health/meditation` | PARTIAL | 4/4 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/mental-health/hub` | PARTIAL | 4/4 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/mental-health/crisis-support` | PARTIAL | 4/4 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/mental-health` | PARTIAL | 4/4 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/mental-health/mood-journal` | PARTIAL | 18/18 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/doctor/[slug]` | PARTIAL | 12/18 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/wearables/hub` | PARTIAL | no controls exercised | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/maternity/baby-development` | PARTIAL | 1/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/maternity/baby-growth` | PARTIAL | 1/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/maternity/pregnancy-tracker` | PARTIAL | 1/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/maternity/maternity-setup` | FAILED | 3 failing control(s): الدورة منتظمة=TAP_FAILED, الدورة غير منتظمة=TAP_FAILED, 󰗠=WRITE | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/maternity/ovulation-tracker` | PARTIAL | 1/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/maternity/hub` | PARTIAL | 1/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/appointments` | FAILED | 1 failing control(s): Mag-book ng appoin=TAP_FAILED | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/specialty-select` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/doctor-search` | PARTIAL | 4/4 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/prescription-from-doctor` | PARTIAL | 3/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/incoming-call` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/home-visit-tracking` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/booking-confirm` | FAILED | 2 failing control(s): 󰄖=TAP_FAILED, 󰗠=TAP_FAILED | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/summary` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/clinic-confirm` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/waiting-room` | PARTIAL | no controls exercised | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/booking-status` | FAILED | 2 failing control(s): 󰄖=TAP_FAILED, 󰗠=TAP_FAILED | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/call-history` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/virtual-waiting-room` | PARTIAL | no controls exercised | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/doctor-profile` | PARTIAL | 4/4 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/chat-with-doctor` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/clinic-location` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/share-report` | PARTIAL | 1/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/appointment-detail` | PARTIAL | no controls exercised | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/booking-success` | FAILED | 2 failing control(s): 󰄖=TAP_FAILED, 󰗠=TAP_FAILED | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/cancel-reschedule` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/video-call` | PASSED | 1 controls verified | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/booking-pending` | FAILED | 2 failing control(s): 󰄖=TAP_FAILED, 󰗠=TAP_FAILED | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/follow-up` | PARTIAL | 3/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/post-call-rating` | PARTIAL | 6/8 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/doctor/[id]` | PARTIAL | 12/18 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/book/[id]` | PARTIAL | 9/12 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/clinic/[id]` | BLOCKED | no facility in the QA DB passes the public filter (public_eligibility) — 404 GET /care/facilities/king-faisal-specialist | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations/offer/[id]` | NOT_TESTED | dynamic route: needs a real record id | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/services` | PARTIAL | 1/23 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/permissions` | PASSED | 6 controls verified | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/language` | PARTIAL | 1/7 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/` | PARTIAL | no controls exercised | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/delivery/address-select` | PARTIAL | 2/4 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/orders` | PARTIAL | 12/13 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/medicine/[slug]` | NOT_TESTED | dynamic route: needs a real record id | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/facility/[slug]` | BLOCKED | no facility in the QA DB passes the public filter (public_eligibility) — 404 GET /care/facilities/king-faisal-specialist | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/voice` | PARTIAL | 1/6 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/articles/[slug]` | PARTIAL | 2/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/articles/bookmarks` | PARTIAL | 1/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/articles` | PARTIAL | 1/6 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/profile/addresses` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/profile/insurance` | PARTIAL | 1/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/profile` | PARTIAL | 1/13 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/insurance/payment-split` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/insurance/policy-detail` | PARTIAL | 1/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/insurance/coverage-check` | PARTIAL | 5/5 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/insurance/submit-claim` | PARTIAL | 3/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/insurance/benefits-summary` | FAILED | render: 404 GET /insurance/benefits-summary | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/insurance/approval-pending` | PASSED | 1 controls verified | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/insurance/hub` | PARTIAL | 2/12 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/insurance/add-policy` | PARTIAL | 42/42 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/insurance/copay` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/insurance/network-providers` | PARTIAL | 6/7 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/insurance` | PARTIAL | 2/12 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/offers/[id]` | NOT_TESTED | dynamic route: needs a real record id | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/offers` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/emergency/sos-active` | PARTIAL | 4/4 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/emergency/tracking` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/emergency/sos` | PARTIAL | 7/7 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/emergency` | PARTIAL | 7/7 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/reviews` | PARTIAL | 1/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/search` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/loyalty/leaderboard` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/loyalty/rewards` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/loyalty/challenges` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/loyalty/hub` | PARTIAL | 2/6 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/loyalty/referrals` | FAILED | 1 failing control(s): 󰗠=WRITE | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/forgot-password` | PARTIAL | 2/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/register` | PARTIAL | 4/8 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/welcome` | FAILED | 2 failing control(s): تسجيل دخول=TAP_FAILED, المتابعة كضيف (بدو=TAP_FAILED | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/otp` | FAILED | 1 failing control(s): تأكيد الرمز=WRITE | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/login` | PARTIAL | 3/9 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/reset-password` | PARTIAL | 2/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/terms` | PARTIAL | 1/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/provider-info` | PASSED | 2 controls verified | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/privacy` | PARTIAL | 1/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/notifications` | PARTIAL | 5/5 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/settings/support-chat` | PARTIAL | 3/8 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/settings/language` | FAILED | 1 failing control(s): اردو=TAP_FAILED | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/settings/notifications-settings` | PASSED | 1 controls verified | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/settings/help` | FAILED | 1 failing control(s): 󰋼=TAP_FAILED | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/settings/terms` | PASSED | 1 controls verified | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/settings/data` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/settings/feedback` | FAILED | 1 failing control(s): 󰕒=WRITE | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/settings/security` | PARTIAL | 2/5 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/settings/about` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/settings/privacy` | PARTIAL | 2/8 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/settings` | PARTIAL | 3/6 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/settings/notifications` | FAILED | 8 failing control(s): (icon #1)=WRITE, (icon #2)=WRITE, (icon #3)=WRITE | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/p/[slug]` | NOT_TESTED | dynamic route: needs a real record id | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/returns/detail` | PARTIAL | no controls exercised | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/returns/new-request` | PARTIAL | 1/6 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/returns/hub` | PARTIAL | 6/7 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/add-family-member` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/reports` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/chronic-medications` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/prescriptions` | PARTIAL | 3/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/health-id` | PARTIAL | 4/4 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/trends` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/conditions-allergies` | PARTIAL | 3/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/medications` | PARTIAL | 7/7 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/family-chat` | FAILED | render: 403 GET /family/chat/messages | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/edit-profile` | PARTIAL | 18/18 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/family-hub` | FAILED | render: 404 GET /family/my-group | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/actionable-order` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/family-member-detail` | FAILED | render: 404 GET /family/member-records/ | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/sleep-score` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/wearables` | PARTIAL | no controls exercised | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/smart-reminders` | PARTIAL | 1/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/family-calendar` | FAILED | render: 404 GET /family/calendar | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/medication-reminder-list` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/vitals-log` | PARTIAL | 8/9 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/chronic-disease` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/reminders` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/sleep-tracker` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/refills` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/emergency-contacts` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/medication-reminder-add` | PARTIAL | 16/16 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health/vitals` | PARTIAL | 1/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/drug-scanner` | PARTIAL | 8/10 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/map` | PARTIAL | no controls exercised | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/support/ticket` | PARTIAL | 1/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/support/chat` | PARTIAL | 3/8 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/s/[type]/[slug]` | PARTIAL | 12/18 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/family/permissions` | FAILED | render: 404 GET /family/my-group | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/family/permission-request` | FAILED | render: No group found | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/family/scan` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/family/member-health` | FAILED | render: 404 GET /family/member-records/ | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/family/calendar` | FAILED | render: 404 GET /family/calendar | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/family/shared-calendar` | FAILED | render: 404 GET /family/calendar | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/family/join` | PARTIAL | 9/9 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/family/chat` | FAILED | render: 403 GET /family/chat/messages | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/family/emergency-contacts` | PARTIAL | 3/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/family/invite` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/family` | FAILED | render: 404 GET /family/my-group | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/payments/failed` | PARTIAL | 1/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/payments/result` | PARTIAL | no controls exercised | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/payments/success` | PARTIAL | 1/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/payments/processing` | PARTIAL | no controls exercised | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nursing/insurance-status` | PARTIAL | 3/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nursing/live-tracking` | PARTIAL | no controls exercised | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nursing/visits` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nursing/service-details` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nursing/service-info` | FAILED | render: 404 GET /home-care/services/undefined | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nursing/nurse-profile` | FAILED | render: 404 GET /home-care/providers/undefined | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/reports/timeline` | PARTIAL | 6/7 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/reports/ai-analysis` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/reports/passport` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/reports/hub` | PARTIAL | 5/5 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/reports/view-report` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/insurance-decision` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/checkout` | PARTIAL | 4/5 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/order-history` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/cart` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/waiting-for-pharmacy` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/filters` | PARTIAL | 6/10 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/manual-order` | FAILED | 1 failing control(s): بث الطلب وطلب عروض=TAP_FAILED | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/order-confirm` | PARTIAL | no controls exercised | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/order-tracking` | PARTIAL | 1/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/payment` | PARTIAL | 1/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/barcode-scanner` | PARTIAL | 2/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/medicine-compare` | STALE | screen file changed after the crawl | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/custom-item` | FAILED | 1 failing control(s): بث الطلب وطلب عروض=TAP_FAILED | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/wishlist` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/scan-prescription` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/pharmacist-chat` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/rx-order` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/drug-not-found` | FAILED | 1 failing control(s): بث الطلب وطلب عروض=TAP_FAILED | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/product-search` | PASSED | 1 controls verified | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/reorder` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/broadcast-status` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/request` | FAILED | 1 failing control(s): بث الطلب وطلب عروض=TAP_FAILED | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/product-detail` | FAILED | render: 404 GET /medicines/undefined/details | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy/final-quote` | PARTIAL | 1/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/orders` | PARTIAL | 3/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/checkout` | PASSED | 1 controls verified | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/insurance-approval` | PARTIAL | no controls exercised | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/sample-tracking` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/cart` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/booking-confirm` | FAILED | 2 failing control(s): 󰅙=TAP_FAILED, اختيار=TAP_FAILED | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/package-detail` | FAILED | render: 404 GET /labs/packages/undefined | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/lab-comparison` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/search` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/insurance-upload` | PARTIAL | 1/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/my-results` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/upload-rx` | PARTIAL | 2/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/booking-success` | PARTIAL | 3/3 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/results-history` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/book-sample` | PARTIAL | 1/2 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/technician-tracking` | PARTIAL | 1/1 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/test-detail` | FAILED | render: 404 GET /labs/services/undefined | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/packages` | FAILED | 1 failing control(s): =TAP_FAILED | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/lab/[id]` | PARTIAL | 2/4 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics/order/[id]` | BLOCKED | the app test account has no lab/radiology booking; another patient's booking correctly answers 404 (ownership) — 404 GET /labs/bookings/5d0415d1-e596-4f22-829c-88ab660363e0 | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/diagnostics` | FAILED | 2 failing control(s): 󰅙=TAP_FAILED, Piliin=TAP_FAILED | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/health` | PASSED | 17 controls verified | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nursing` | PARTIAL | 2/9 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/services` | PARTIAL | 1/23 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/pharmacy` | PASSED | 5 controls verified | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/` | PARTIAL | no controls exercised | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/consultations` | PARTIAL | 14/15 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nutrition/body-composition` | FAILED | 1 failing control(s): 󰗠=WRITE | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nutrition/ai-plan-builder` | PARTIAL | 1/5 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nutrition/exercise-plan` | PARTIAL | 1/5 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nutrition/daily-tracker` | PARTIAL | 1/5 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nutrition/log-meal` | PARTIAL | 5/6 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nutrition/nutrition-plan` | PARTIAL | 1/5 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nutrition/ai-meal-planner` | PARTIAL | 1/5 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nutrition/hub` | PARTIAL | 1/5 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nutrition/calorie-analyzer` | PARTIAL | 5/6 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nutrition/body-target` | FAILED | 1 failing control(s): 󰗠=WRITE | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nutrition` | PARTIAL | 1/5 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nutrition/water-tracker` | PARTIAL | 1/5 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-app |  | `/nutrition/food-scanner` | PARTIAL | 5/6 control(s) without verified effect | rn_web_patient-app_2026-10-02_dyn.json |
| patient-web |  | `/[locale]` | PASSED | 14 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/room/[id]` | NOT_TESTED | dynamic route: needs a real record id |  |
| patient-web |  | `/[locale]/provider-info` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/community` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/community/[postId]` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/ai` | PARTIAL | 4/8 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/ai/chat-doctor` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/ai/skin-analysis` | FAILED | 1 failing control(s): تحليل=WRITE | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/ai/symptom-checker` | PARTIAL | 4/8 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/ai/report` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/ai/prescription-translator` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/ai/symptom-timeline` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/ai/monthly-report` | PASSED | 3 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/ai/triage` | PARTIAL | 4/8 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/home-care` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/home-care/providers` | PARTIAL | no controls exercised | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/home-care/services` | PASSED | 25 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/home-care/services/[serviceId]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/programs` | PARTIAL | no controls exercised | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/programs/active` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/mental-health` | PASSED | 4 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/mental-health/breathing` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/mental-health/mood` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/mental-health/self-assessment` | PASSED | 4 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/mental-health/therapist-match` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/mental-health/meditation` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/mental-health/crisis-contacts` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/doctor` | PASSED | 6 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/doctor/[slug]` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/doctor/[slug]/[city]` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/reminders` | PARTIAL | 1/4 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/reminders/add` | FAILED | 1 failing control(s): حفظ التذكير=WRITE | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/forgot-password` | FAILED | 1 failing control(s): إرسال التعليمات=WRITE | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/prescriptions` | PARTIAL | no controls exercised | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/prescriptions/[prescriptionId]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/maternity` | PASSED | 5 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/maternity/ovulation` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/maternity/tracker` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/maternity/baby-development` | PASSED | 5 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/maternity/maternity-setup` | FAILED | 1 failing control(s): حفظ الملف=WRITE | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/maternity/baby-growth` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/radiology` | PARTIAL | 3/30 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/radiology/[serviceSlug]/[citySlug]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/doctors` | PASSED | 6 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/doctors/[specialty]/[city]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/doctors/[specialty]/[city]/[neighborhood]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations` | PASSED | 6 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/video-call` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/book/[doctorId]` | PARTIAL | 9/15 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/doctors` | PASSED | 6 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/doctors/[doctorId]` | PASSED | 4 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/waiting-room` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/follow-up` | PASSED | 4 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/specialties` | PASSED | 27 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/offers/[offerId]` | NOT_TESTED | dynamic route: needs a real record id |  |
| patient-web |  | `/[locale]/consultations/prescription` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/chat` | PARTIAL | no controls exercised | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/home-visit-tracking` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/clinics/[clinicId]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/share-report` | PARTIAL | no controls exercised | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/clinic-location` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/booking-status` | BLOCKED | harvested appointment id no longer resolves; re-run with an own appointment (/ar/consultations/booking-status?appointmentId=8839f097-fef9) | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/cancel-reschedule` | PASSED | 3 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/virtual-waiting-room` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/doctor-profile` | PASSED | 6 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/post-call-rating` | FAILED | 1 failing control(s): إرسال التقييم=WRITE | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/clinic-confirm` | PASSED | 3 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/appointments` | PASSED | 6 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/consultations/call-history` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/services` | PASSED | 6 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/services/[serviceSlug]/[citySlug]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/delivery/address-select` | PASSED | 3 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/orders` | PASSED | 5 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/orders/[orderId]` | FAILED | 1 failing control(s): إعادة الطلب=WRITE | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/orders/[orderId]/offers` | PASSED | 3 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/orders/[orderId]/offers/negotiation` | PARTIAL | 1/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/orders/[orderId]/offers/negotiation/[threadId]` | NOT_TESTED | dynamic route: needs a real record id |  |
| patient-web |  | `/[locale]/orders/[orderId]/tracking` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/medicine` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/medicine/[slug]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/facility/[slug]` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/voice` | PASSED | 8 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/articles` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/articles/[slug]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/articles/bookmarks` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/profile` | PASSED | 12 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/profile/edit` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/profile/insurance` | FAILED | F2 cascade (insurance endpoints removed) (/ar/profile/insurance) | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/profile/addresses` | PASSED | 3 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/insurance` | FAILED | F2: my-policy / benefits-summary 404 → notFound() (/ar/insurance) | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/insurance/coverage-check` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/insurance/policy-detail` | FAILED | F2 cascade: insurance section 404/unavailable without the removed endpoints (/ar/insurance/policy-detail) | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/insurance/network-providers` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/insurance/copay` | FAILED | F2 cascade: insurance section 404/unavailable without the removed endpoints (/ar/insurance/copay) | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/insurance/benefits` | FAILED | F2 cascade: insurance section 404/unavailable without the removed endpoints (/ar/insurance/benefits) | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/insurance/refunds` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/insurance/claims` | FAILED | F2 cascade: insurance section 404/unavailable without the removed endpoints (/ar/insurance/claims) | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/insurance/approval-pending` | FAILED | F2 cascade: insurance section 404/unavailable without the removed endpoints (/ar/insurance/approval-pending) | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/insurance/requests/[requestId]` | NOT_TESTED | dynamic route: needs a real record id |  |
| patient-web |  | `/[locale]/insurance/payment-split` | FAILED | F2 cascade: insurance section 404/unavailable without the removed endpoints (/ar/insurance/payment-split) | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/insurance/add-policy` | PARTIAL | 1/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/insurance/submit-claim` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/offers` | PARTIAL | no controls exercised | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/offers/[offerId]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/emergency` | PARTIAL | 2/3 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/emergency/sos-active` | PARTIAL | 3/3 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/emergency/sos` | PARTIAL | 8/8 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/emergency/tracking` | PARTIAL | 3/3 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/reviews` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/search` | PARTIAL | no controls exercised | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/register` | PARTIAL | 6/6 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/loyalty` | PARTIAL | no controls exercised | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/loyalty/referrals` | PARTIAL | 4/4 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/loyalty/rewards` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/loyalty/challenges` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/loyalty/leaderboard` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/chat` | PARTIAL | no controls exercised | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/chat/[threadId]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/notifications` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/notifications/settings` | PARTIAL | no controls exercised | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/condition/[slug]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/settings` | PARTIAL | 6/6 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/settings/feedback` | PARTIAL | 9/9 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/settings/notifications` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/settings/data` | PARTIAL | 3/3 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/settings/help` | PARTIAL | 7/7 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/settings/privacy` | PARTIAL | 4/5 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/settings/about` | PARTIAL | 3/3 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/settings/language` | PARTIAL | 1/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/settings/security` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacies` | PARTIAL | 10/10 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacies/[citySlug]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/p` | PARTIAL | 10/10 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/p/[slug]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/c/[[...category]]` | PARTIAL | 2/10 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/otp` | PASSED | 3 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/returns` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/returns/[returnId]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/returns/new-request` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/cart` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/cart/prescription` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/cart/checkout` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/health` | PARTIAL | 12/12 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/health/add-family-member` | PARTIAL | 3/3 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/health/wearables` | BLOCKED | feature flag NEXT_PUBLIC_WEARABLES_ENABLED off (by design) (/ar/health/wearables) | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/health/conditions-allergies` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/health/health-id` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/health/chronic-diseases` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/health/trends` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/health/vitals` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/health/vitals/log` | PARTIAL | 8/8 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/health/chronic-medications` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/health/timeline` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/health/refills` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/health/sleep` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/health/emergency-contacts` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/health/smart-reminders` | PARTIAL | 4/4 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/health/reports` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/health/medications` | PARTIAL | 4/4 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/health/actionable-order` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/health/score` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/drug-scanner` | PARTIAL | 2/3 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/map` | PARTIAL | 6/6 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/terms` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/support` | PARTIAL | 3/3 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/support/chat` | PARTIAL | 7/8 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/support/ticket` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/s` | PARTIAL | no controls exercised | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/login` | PARTIAL | 6/6 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/family` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/family/permissions` | BLOCKED | the QA patient has no family group (API 404 No family group found) (/ar/family/permissions) | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/family/permission-requests` | BLOCKED | the QA patient has no family group (/ar/family/permission-requests) | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/family/chat` | FAILED | render: 403 GET /api/patient/family/chat/messages | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/family/emergency-contacts` | PARTIAL | 3/3 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/family/[memberRef]` | NOT_TESTED | dynamic route: needs a real record id |  |
| patient-web |  | `/[locale]/family/scan` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/family/invite` | PARTIAL | 3/3 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/family/calendar` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/family/join` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/home-nursing` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/home-nursing/[citySlug]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/payments` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/payments/processing` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/payments/failed` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/payments/success` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/payments/result` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/labs` | PARTIAL | 30/30 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/labs/[testSlug]/[citySlug]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nursing` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nursing/catalog` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nursing/service-info` | PARTIAL | 30/30 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nursing/booking` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nursing/insurance-status` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nursing/nurses/[nurseId]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nursing/visits` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nursing/visits/[visitId]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/welcome` | PARTIAL | 9/9 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/onboarding` | PARTIAL | 5/6 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/onboarding/permissions` | PARTIAL | 3/3 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/onboarding/language` | PARTIAL | 1/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/reports` | PARTIAL | no controls exercised | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/reports/timeline` | PARTIAL | 6/6 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/reports/ai-analysis` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/reports/[reportId]` | NOT_TESTED | dynamic route: needs a real record id |  |
| patient-web |  | `/[locale]/reports/passport` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/privacy` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/appointments` | PARTIAL | 6/6 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/appointments/[appointmentId]` | PASSED | 5 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/appointments/[appointmentId]/summary` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/password-reset` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacy` | PARTIAL | 10/10 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacy/[slug]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacy/reorder` | FAILED | 1 failing control(s): إنشاء طلب جديد وطل=WRITE | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacy/request` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacy/manual-order` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacy/scan-prescription` | PARTIAL | no controls exercised | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacy/insurance-decision` | PARTIAL | renders; capabilities answer 400 copay_acceptance_required before the copay decision (correct gating) — 400 GET /api/patient/payments/pharmacy/6f7a5a65-3c01-4f86-a2 | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacy/order-confirm` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacy/chat` | PASSED | 3 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacy/payment` | PARTIAL | renders; capabilities answer 400 final_quote_acceptance_required for the only payable-state order in the QA data (correct gating) — 400 GET /api/payments/pharmacy/6e317348-1c49-4828-ae70-f3a08 | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacy/barcode` | PARTIAL | 3/3 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacy/filters` | PARTIAL | 14/15 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacy/rx-order` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacy/custom-item` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacy/interactions` | PARTIAL | 2/3 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacy/waiting-for-pharmacy` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacy/drug-not-found` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacy/final-quote` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/pharmacy/broadcast-status` | BLOCKED | crawled with a broadcast id; the page expects the order id in requestId (test input) — 404 GET /api/patient/patient/pharmacy/orders/6a108fa3-258f-4 | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/medicine-catalog` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/dashboard` | PARTIAL | 26/26 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/wishlist` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/medicines` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/medicines/compare` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/medicines/[medicineId]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics` | PARTIAL | 23/23 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/technician-tracking` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/packages` | PARTIAL | 16/16 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/packages/[packageId]` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/radiology` | PARTIAL | 30/30 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/radiology/[serviceId]` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/booking-success` | PASSED | 3 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/insurance-upload` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/test-detail` | FAILED | renders its not-found state (/ar/diagnostics/test-detail) | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/lab-comparison` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/upload-rx` | PARTIAL | no controls exercised | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/search` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/checkout` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/results` | PARTIAL | 8/8 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/cart` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/book-sample` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/[domain]/[bookingId]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/labs` | PARTIAL | 30/30 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/labs/book` | PASSED | 2 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/labs/[labId]` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/bookings` | PARTIAL | 3/3 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/sample-tracking` | PASSED | 1 controls verified | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/diagnostics/insurance-approval` | BLOCKED | crawled with a pharmacy order id; the page expects a lab booking id (test input) — 404 GET /api/patient/labs/bookings/6f7a5a65-3c01-4f86-a2b6-4 | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nutrition` | PARTIAL | 4/4 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nutrition/ai-plan-builder` | PARTIAL | 4/4 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nutrition/exercise-plan` | PARTIAL | 3/3 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nutrition/food-scanner` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nutrition/calorie-analyzer` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nutrition/body-composition` | PARTIAL | 11/11 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nutrition/body-target` | PARTIAL | 11/11 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nutrition/plan` | PARTIAL | 1/1 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nutrition/log-meal` | PARTIAL | 2/2 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nutrition/daily-tracker` | PARTIAL | 3/3 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nutrition/water-tracker` | PARTIAL | 3/3 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| patient-web |  | `/[locale]/nutrition/ai-meal-planner` | PARTIAL | 3/3 control(s) without verified effect | web_crawl_2026-10-02_flow2.json |
| admin |  | `/login` | PARTIAL | 1/2 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/index` | PARTIAL | no controls exercised | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/nursing-portal` | PARTIAL | 1/2 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/search-intelligence` | PARTIAL | 1/2 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/crm` | PARTIAL | 1/3 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/catalog-manager` | PARTIAL | 2/5 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/analytics` | PARTIAL | 1/5 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/command-center` | PASSED | 16 controls verified | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/shortage-reports` | PARTIAL | 1/4 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/gdpr` | FAILED | 1 failing control(s): إنشاء الطلب=WRITE | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/reports` | PARTIAL | 3/18 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/rbac` | PARTIAL | 30/30 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/financial-ledger` | FAILED | render: 400 GET /api/admin/admin/finance/commissions | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/payouts` | PARTIAL | 1/1 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/theme-control` | FAILED | 1 failing control(s): حفظ وتطبيق على كل =WRITE | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/insurance-queue` | PARTIAL | 2/8 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/support-tickets` | PARTIAL | 3/10 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/sos-monitor` | PARTIAL | 2/5 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/price-override-audit` | PARTIAL | no controls exercised | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/search` | PASSED | 1 controls verified | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/loyalty-config` | FAILED | 3 failing control(s): حفظ الإعدادات=WRITE, إضافة=WRITE, إضافة تحدٍ=WRITE | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/live-chat-console` | PARTIAL | no controls exercised | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/pharmacy-procurement` | PARTIAL | 1/1 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/system-ops` | PARTIAL | 3/6 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/locations` | FAILED | 1 failing control(s): إضافة=WRITE | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/users-management` | FAILED | 1 failing control(s): عرض الملف=TAP_FAILED | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/content-growth` | PARTIAL | 2/6 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/audit-logs` | PARTIAL | 1/4 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/medicines-catalog` | FAILED | 1 failing control(s): اعتماد=TAP_FAILED | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/scheduled-reports` | FAILED | 1 failing control(s): إضافة الجدولة=WRITE | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/order-detail` | PASSED | 1 controls verified | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/appointments-oversight` | PARTIAL | 2/2 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/ambulance-fleet` | PARTIAL | 2/3 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/provider-audits` | PARTIAL | no controls exercised | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/catalog-governance` | PASSED | 2 controls verified | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/dashboard` | PASSED | 2 controls verified | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/config-portal` | PARTIAL | 2/6 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/fraud-monitoring` | PASSED | 2 controls verified | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/impersonation` | PARTIAL | no controls exercised | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/finance-suite` | PARTIAL | 1/3 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/provider-moderation` | PARTIAL | 1/2 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/commissions` | PARTIAL | 1/2 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/legal-policies` | PASSED | 1 controls verified | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/security` | PARTIAL | 1/2 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/notification-center` | PARTIAL | 5/8 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/analytics-suite` | PASSED | 1 controls verified | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/community-moderation` | PARTIAL | 1/1 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/broadcast-monitor` | PASSED | 1 controls verified | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/ai-control` | PASSED | 2 controls verified | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/insurance-companies` | PASSED | 4 controls verified | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/disputes` | PARTIAL | 1/3 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/health-dashboard` | PARTIAL | no controls exercised | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/image-suggestions` | PARTIAL | 1/4 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/segments` | FAILED | 2 failing control(s): معاينة الجمهور=WRITE, حفظ وتدقيق=WRITE | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/home-curation` | PASSED | 2 controls verified | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/returns` | PARTIAL | 2/3 control(s) without verified effect | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/orders` | PASSED | 3 controls verified | admin_crawl_2026-10-02_v2.json |
| admin |  | `/admin/orders/[kind]/[id]` | NOT_TESTED | dynamic route: needs a real record id |  |
| admin |  | `/doctors` | PARTIAL | no controls exercised | admin_crawl_2026-10-02_v2.json |
| admin |  | `/articles` | PARTIAL | no controls exercised | admin_crawl_2026-10-02_v2.json |
| admin |  | `/lab-services` | PARTIAL | no controls exercised | admin_crawl_2026-10-02_v2.json |
| admin |  | `/home-care-services` | PARTIAL | no controls exercised | admin_crawl_2026-10-02_v2.json |
| admin |  | `/facilities` | PARTIAL | no controls exercised | admin_crawl_2026-10-02_v2.json |
| admin |  | `/s/[type]/[slug]` | NOT_TESTED | dynamic route: needs a real record id |  |
| admin |  | `/medicines` | PARTIAL | no controls exercised | admin_crawl_2026-10-02_v2.json |
