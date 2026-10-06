import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ForgotPasswordForm } from "@/components-next/forgot-password-form";
import { isLocale } from "@/lib/i18n";
import styles from "../login/login.module.css";

type Props={params:Promise<{locale:string}>};
export const metadata:Metadata={title:"Password recovery | Nabd Plus",robots:{index:false,follow:false}};
export default async function ForgotPasswordPage({params}:Props){const {locale}=await params;if(!isLocale(locale))notFound();setRequestLocale(locale);return <main className={`main ${styles.page}`}><section className={styles.card}><ForgotPasswordForm locale={locale}/></section></main>}
