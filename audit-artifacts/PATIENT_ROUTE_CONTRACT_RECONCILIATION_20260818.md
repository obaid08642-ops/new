# Patient route/contract reconciliation

الـreadonly probe الأولي استخدم أسماء عامة مثل `/profile` و`/family` و`/appointments/mine` و`/hospitals` و`/services`. ظهرت 404/403 في بعضها، لكن هذا لا يكفي لتصنيف عيب؛ يجب مطابقة كل شاشة مع `apiFetch` الفعلي في Patient App ومع controller/backend route المقابل.

أظهر الفحص أن backend يضم وحدات مستقلة للمستخدمين/الملف، family، booking-flow/unified-bookings، hospital، service-catalog، providers، labs، radiology، pharmacy، home-care، notifications، wallet، insurance، articles، وSEO. لذلك سيُعاد probe من المسارات التي تستعملها الشاشات فعلياً، مع حفظ endpoint exact وscreen source وrole ونتيجة live. أي route موجود في التطبيق ولا يجد controller مقابلاً يصنف `NOT_IMPLEMENTED`، وأي controller موجود لكن التطبيق لا يستعمله يصنف `UNWIRED_UI` حتى تتم مراجعته.

لا تُنفذ mutations من أسماء routes التخمنية. يبدأ الاختبار الحقيقي بقراءة catalog/slots/profile/availability من consumers الصحيحة، ثم يُنشأ sandbox booking فقط عندما يكون payload والعقد واضحين، مع before/after وcleanup.
