import "@/styles/globals.css";
import NextApp, { type AppContext, type AppProps } from "next/app";
import { AdminGuard } from "@/components/AdminGuard";

export default function App({ Component, pageProps, router }: AppProps) {
  // If the route is under /admin, wrap it with the AdminGuard
  if (router.pathname.startsWith('/admin')) {
    return (
      <AdminGuard>
        <Component {...pageProps} />
      </AdminGuard>
    );
  }

  // Otherwise, render normally
  return <Component {...pageProps} />;
}

// F68: every admin page renders per request so _document can stamp that request's CSP nonce (a page prerendered
// at build time would carry no nonce and the policy would refuse its scripts).
App.getInitialProps = async (context: AppContext) => NextApp.getInitialProps(context);
