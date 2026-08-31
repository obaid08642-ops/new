import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Wallet, ReceiptText, ShieldCheck, ChevronLeft } from "lucide-react";
import { isLocale } from "@/lib/i18n";
import { requirePatientAccess } from "@/lib/auth/session";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string }> };
type Tx = { id?: string; type?: string; amount?: number; currency?: string; created_at?: string; description?: string };

async function fetchWallet(token: string) {
  try {
    const [bal, txs] = await Promise.all([
      callPatientApi("/wallet/balance", { method: "GET" }, token),
      callPatientApi("/wallet/transactions", { method: "GET" }, token),
    ]);
    const balance = bal.ok ? await bal.json().catch(() => null) : null;
    const list = txs.ok ? await txs.json().catch(() => []) : [];
    return { balance: balance?.balance ?? balance?.amount ?? null, currency: balance?.currency ?? "SAR", transactions: Array.isArray(list) ? list : (list?.transactions ?? list?.data ?? []) };
  } catch { return { balance: null, currency: "SAR", transactions: [] as Tx[] }; }
}

export default async function WalletPage({ params }: Props) {
  const { locale } = await params; if (!isLocale(locale)) return null; setRequestLocale(locale);
  const t = await getTranslations("Shared");
  const token = await requirePatientAccess(locale); if (!token) redirect(`/${locale}/login`);
  const { balance, currency, transactions } = await fetchWallet(token);
  const AR = locale === "ar" || locale === "ur";
  return <main className="main"><Link href={`/${locale}/dashboard`}><ChevronLeft size={16} aria-hidden="true" />{AR ? "لوحة التحكم" : "Dashboard"}</Link>
    <section className="hero premium-hero"><div className="premium-hero-copy"><div className="eyebrow"><ShieldCheck size={14} aria-hidden="true" />{AR ? "المحفظة" : "Wallet"}</div><h1>{AR ? "محفظتك ومدفوعاتك" : "Your wallet & payments"}</h1><p>{AR ? "رصيد حقيقي من الخادم وحركات مؤكدة — لا بيانات تجريبية." : "Real server-backed balance and confirmed transactions."}</p></div><aside className="trust-card premium-trust-card"><Wallet size={28} aria-hidden="true" /><h2>{AR ? "الرصيد الحالي" : "Current balance"}</h2><p style={{ fontSize: "2rem", fontWeight: 700 }}>{balance !== null ? `${balance} ${currency}` : (AR ? "غير متاح" : "Unavailable")}</p></aside></section>
    <section><h2><ReceiptText size={17} aria-hidden="true" /> {AR ? "آخر الحركات" : "Recent transactions"}</h2>
      {transactions.length === 0 ? <p className="notice">{AR ? "لا توجد حركات بعد." : "No transactions yet."}</p> : <ul>{transactions.slice(0, 25).map((x: Tx, i: number) => <li key={x.id ?? i}><strong>{x.type ?? (AR ? "حركة" : "Transaction")}</strong> — {x.amount ?? "—"} {x.currency ?? currency} {x.created_at ? `· ${new Date(x.created_at).toLocaleDateString(locale)}` : ""}{x.description ? ` · ${x.description}` : ""}</li>)}</ul>}
    </section></main>;
}
