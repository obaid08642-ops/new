import ServiceBookingForm from "@/components-next/service-booking-form";

/** PH-SERVICE nursing web booking — same funnel as labs/book (BFF /api/bookings/nursing). */
export default async function HomeCareBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ serviceId?: string; serviceName?: string; price?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  return (
    <ServiceBookingForm
      locale={locale}
      kind="nursing"
      serviceId={sp.serviceId}
      serviceName={sp.serviceName}
      price={sp.price}
    />
  );
}
