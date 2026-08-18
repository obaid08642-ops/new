import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { AdminGuard } from "@/components/AdminGuard";

export default function App({ Component, pageProps, router }: AppProps) {
  // If the route is under /admin, wrap it with the AdminGuard
  if (router.pathname.startsWith('/admin')) {
    return (
      <AdminGuard pathname={router.pathname}>
        <Component {...pageProps} />
      </AdminGuard>
    );
  }

  // Otherwise, render normally
  return <Component {...pageProps} />;
}
