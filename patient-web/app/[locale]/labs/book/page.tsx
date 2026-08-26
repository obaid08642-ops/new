import ServiceBookingForm from "@/components-next/service-booking-form";

type Props = {
  kind?: string; serviceId?: string; serviceName?: string; price?: string;
};

/** PH-SERVICE web booking (labs | radiology) — shared form in components-next. */
export default async function ServiceBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Props>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const kind = sp.kind === "radiology" ? "radiology" : sp.kind === "nursing" ? "nursing" : "lab";
  return (
    <ServiceBookingForm
      locale={locale}
      kind={kind}
      serviceId={sp.serviceId}
      serviceName={sp.serviceName}
      price={sp.price}
    />
  );
}
