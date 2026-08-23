import type { Metadata } from "next";
import "./globals.css";
import AgentWebMcp from "@/components-next/agent-webmcp";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body><AgentWebMcp />{children}</body></html>;
}
