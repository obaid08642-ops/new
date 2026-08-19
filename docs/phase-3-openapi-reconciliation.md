# مطابقة OpenAPI مع تطبيق المريض — المرحلة 3

**المواصفة:** Nabdah Plus Enterprise API 2.0.0  
**النتيجة:** 1234 path و1373 operation في OpenAPI، مقابل 121 مسار ثابت استخرج من تطبيق المريض.

## بيئة وعقود الأمان

* Servers: غير محددة في المواصفة.
* Security schemes: `bearer:http/bearer`.
* Security global: [].

## توزيع العمليات بحسب tag

| Tag | Operations |
|---|---:|
| Medicines | 44 |
| Chat | 34 |
| Radiology | 32 |
| Labs | 30 |
| Orders | 29 |
| HealthModule | 28 |
| NabdExtensions | 25 |
| PharmacyOps | 24 |
| ProviderOps | 23 |
| Ai | 20 |
| Admin | 19 |
| Auth | 18 |
| Family | 18 |
| Users | 17 |
| LiveKit | 16 |
| ProviderPharmacy | 16 |
| Nursing | 16 |
| AdminAuthority | 16 |
| InsuranceFlow | 16 |
| HomeCareCompat | 16 |
| LegalEnterprise | 15 |
| ProviderCapabilities | 15 |
| ProviderProfile | 14 |
| Drivers | 13 |
| Doctors | 13 |
| ProviderRequests | 13 |
| Insurance | 13 |
| Hospital | 12 |
| SeoSearch | 12 |
| Providers | 12 |
| Emergency | 12 |
| Appointments | 12 |
| Support | 12 |
| MedicalProfile | 12 |
| Community | 12 |
| Mental Health – الصحة النفسية | 12 |
| Prescriptions | 11 |
| SimulatedFeatures | 11 |
| ProviderAdmin | 11 |
| ProviderCompat | 11 |
| AdminFinanceEngine | 10 |
| ProviderAuth | 10 |
| Recruitment | 10 |
| Wallet | 10 |
| Nutrition | التغذية | 10 |
| AdminSystem | 10 |
| AdminNotificationCenter | 9 |
| Push | 9 |
| AdminAnalytics | 9 |
| Notifications | 9 |
| Care | 9 |
| RadiologyProvider | 9 |
| AdminProcurement | 9 |
| ServiceCatalog | 9 |
| ProviderOnboarding | 9 |
| Loyalty | 9 |
| ProviderDashboard | 8 |
| AdminBroadcast | 8 |
| Legal | 7 |
| LabsEngine | 7 |
| ProviderOperators | 7 |
| AdminMatching | 7 |
| AdminShortage | 7 |
| Cart | 7 |
| UnifiedBookings | 7 |
| AdminGovernance | 7 |
| ProviderJobs | 7 |
| Moyasar | 7 |
| Maternity | 7 |
| AdminDelivery | 7 |
| HospitalStaff | 6 |
| Seo | 6 |
| PatientPharmacy | 6 |
| PharmacyChat | 6 |
| Payments | 6 |
| AdminLoyalty | 6 |
| FacilityBeds | 6 |
| FacilityShifts | 6 |
| Returns | 6 |
| ChatAlias | 6 |
| ArticlesAdmin | 6 |
| AdminPromotions | 6 |
| AdminNotifications | 6 |
| Passkey | 5 |
| CustomServices | 5 |
| MedicalReports | 5 |
| Storage | 5 |
| ProviderBroadcast | 5 |
| OperationsSafety | 5 |
| BookingOps | 5 |
| AdminRefunds | 5 |
| Export | 5 |
| ApprovalWorkflow | 5 |
| FacilityComms | 5 |
| Billing | 5 |
| ProviderFacility | 5 |
| DeviceTrust | 4 |
| Finance | 4 |
| UsersAddresses | 4 |
| Workflow | 4 |
| ProviderAmbulanceFleet | 4 |
| LabResults | 4 |
| NursingCompat | 4 |
| ProviderInventoryExt | 4 |
| AdminPharmacy | 4 |
| Procurement | 4 |
| BookingFlow | 4 |
| SlotLocks | 4 |
| Audit | 4 |
| PatientUx | 4 |
| Webhooks | 4 |
| Wearables | 4 |
| SupportChat | 4 |
| Health | 3 |
| ProviderPayouts | 3 |
| Home | 3 |
| Ratings | 3 |
| Ops | 3 |
| Media | 3 |
| HospitalEnterprise | 3 |
| FinanceEngine | 3 |
| AdminAmbulanceFleet | 3 |
| DoctorReferrals | 3 |
| LeaveRequests | 3 |
| ProviderNotifications | 3 |
| ProviderZones | 3 |
| ProviderScheduleSlots | 3 |
| B2B | 3 |
| BusinessRules | 3 |
| Consistency | 3 |
| EventReliability | 3 |
| AdminOverride | 3 |
| Bans | 3 |
| ArticlesPublic | 3 |
| ArticleBookmarks | 3 |
| Refund | 3 |
| AdminFinanceCore | 3 |
| ProviderModeration | 3 |
| ProviderDrugIndex | 3 |
| ConsultationsCompat | 3 |
| AdminDashboard | 3 |
| AdminCoupons | 3 |
| Coturn | 2 |
| ApiSecurity | 2 |
| FeatureFlags | 2 |
| I18n | 2 |
| UsersInsurance | 2 |
| AdminEvents | 2 |
| HomeCareTracking | 2 |
| SystemHealth | 2 |
| Timeline | 2 |
| ProviderScore | 2 |
| ProviderShortage | 2 |
| KillSwitches | 2 |
| AdminCommissions | 2 |
| SystemConfig | 2 |
| AdminCommandCenter | 2 |
| Legacy | 2 |
| RealtimeSse | 2 |
| Referral | 2 |
| FacilitySurgeries | 2 |
| NursingOps | 2 |
| InsuranceAlias | 2 |
| FinanceCore | 2 |
| AdminInsurance | 2 |
| AdminConfig | 2 |
| AdminExtendedOperations | 2 |
| FamilyChat | 2 |
| HealthMeds | 2 |
| MaternityVaccines | 2 |
| ReportsTimeline | 2 |
| AuditIngest | 2 |
| FacilityInbox | 2 |
| PharmacyCompat | 2 |
| CapabilitiesCatalog | 2 |
| AdminNursingPortal | 2 |
| AdminShifts | 2 |
| AdminTasks | 2 |
| AdminSpecialties | 2 |
| AdminBanners | 2 |
| AdminInsuranceClaims | 2 |
| HealthDashboard | 1 |
| PublicFeatureFlags | 1 |
| ProviderWallet | 1 |
| ProviderSchedule | 1 |
| AdminPharmacyChat | 1 |
| PatientShortage | 1 |
| UnifiedSearch | 1 |
| PaymentsWebhook | 1 |
| Config | 1 |
| Quote | 1 |
| Analytics | 1 |
| HomeCarePackages | 1 |
| NutritionFoods | 1 |
| OffersDetail | 1 |
| PromotionsOffers | 1 |
| AiInteractions | 1 |
| ProviderDeltasMine | 1 |
| B2BVoice | 1 |
| MentalHealthCompat | 1 |
| AdminEmergency | 1 |
| AdminContracts | 1 |
| AdminScorecard | 1 |
| AdminCompliance | 1 |
| AdminTransport | 1 |
| AdminFamilyCards | 1 |
| AdminBlacklist | 1 |
| AdminFraud | 1 |
| AdminAdmins | 1 |
| AdminWaitlist | 1 |
| AdminReferrals | 1 |
| AdminServices | 1 |
| AdminComplaints | 1 |
| AdminCms | 1 |
| AdminOrders | 1 |
| AdminFinancial | 1 |
| DeliveryCheck | 1 |
| PromotionsApplicable | 1 |
| AdminNursingServices | 1 |
| AdminProviderSubAccounts | 1 |
| AdminMedicines | 1 |
| AdminBulkUpload | 1 |
| AdminNursingMy | 1 |

## استدعاءات المريض غير الموجودة كمسار حرفي في OpenAPI

هذه ليست حكماً قاطعاً على غياب العقد؛ قد يكون المسار dynamic أو alias أو موروثاً من client آخر. لكنها تمنع البناء التخمينـي إلى أن يثبت المسار أو يعدل التطبيق.

| Static mobile path |
|---|
| `/care/appointments/mine` |
| `/user/insurance` |

## مسارات حاسمة مطلوبة في الدليل لكنها غير موجودة حرفياً في OpenAPI

| Required path |
|---|
| لا يوجد |

## قرار المرحلة

تُبنى واجهات الويب فقط على operation مثبت في المواصفة أو على controller/اختبار موثق مع توثيق gap. لا تعني هذه المطابقة تشغيل API أو اعتماد حساب Sandbox؛ ذلك يأتي في بوابة التكامل بعد إعداد السر وبيئة الاختبار المناسبة.