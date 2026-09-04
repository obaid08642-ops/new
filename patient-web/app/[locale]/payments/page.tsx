import { redirect } from "next/navigation";

export default async function paymentsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/cart/checkout`);
}
