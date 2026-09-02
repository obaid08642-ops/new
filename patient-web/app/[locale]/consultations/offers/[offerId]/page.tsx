import { redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string; offerId: string }> };

export default async function ConsultationOfferRedirect({ params }: Props) {
  const { locale, offerId } = await params;
  redirect(`/${locale}/offers`);
}
