import { redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ ref?: string }> };

export default async function PaymentProcessingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { ref } = await searchParams;
  redirect(`/${locale}/payments/result?status=processing${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`);
}
