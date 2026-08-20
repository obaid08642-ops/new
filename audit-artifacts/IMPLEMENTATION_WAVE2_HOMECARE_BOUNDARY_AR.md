# Wave 2 — Home Care / Nursing Boundary Audit

## ما تم فحصه

راجعت `app/(tabs)/nursing.tsx` في React Native، بما يشمل البحث، الفلاتر، التأمين/النقد، الباقات، الخدمات، الصور، الأسعار، quick booking، وservice details. Web الحالي يقرأ حجوزات Home Care السابقة/القائمة بعقد server-only.

## ما لم يُنفذ

لم أضف catalog أو الأسعار أو booking flow أو payment/insurance أو nurse profile/tracking. هذه الميزات تعتمد على `/home-care/services` و`/home-care/packages` ومسارات الحجز والدفع والملفات، ويجب تثبيت schemas وownership وauthorization وprice integrity وCSRF قبل نقلها للويب.

## قرار الأمان

لا توجد بيانات أو أسعار أو صور fallback جديدة. Web parity لهذه الرحلة **blocked جزئيًا** إلى حين اعتماد عقود catalog/booking، بينما read-only bookings الحالية تبقى كما هي.
