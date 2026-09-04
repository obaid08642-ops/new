import type { Metadata, Viewport } from "next";
import "./globals.css";
import AgentWebMcp from "@/components-next/agent-webmcp";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#0b98ae",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body><AgentWebMcp />{children}</body></html>;
}
