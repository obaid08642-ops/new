import { redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ ref?: string; id?: string; orderId?: string }> };

/**
 * An old address of the payment result. It goes to /payments/result with the references only: the word this address
 * stands for ("failed", "success", "processing") is not carried over, because the result is whatever the backend says.
 */
export default async function PaymentStatusRedirectPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { ref, id, orderId } = await searchParams;
  const query = new URLSearchParams();
  if (ref) query.set("ref", ref);
  if (id) query.set("id", id);
  if (orderId) query.set("orderId", orderId);
  const suffix = query.toString();
  redirect(`/${locale}/payments/result${suffix ? `?${suffix}` : ""}`);
}
