import "@/styles/globals.css";
import Head from "next/head";
import NextApp, { type AppContext, type AppProps } from "next/app";
import { AdminGuard } from "@/components/AdminGuard";

const viewport = <Head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" /></Head>;

export default function App({ Component, pageProps, router }: AppProps) {
  // If the route is under /admin, wrap it with the AdminGuard
  if (router.pathname.startsWith('/admin')) {
    return (
      <>
        {viewport}
        <AdminGuard>
          <Component {...pageProps} />
        </AdminGuard>
      </>
    );
  }

  // Otherwise, render normally
  return <>{viewport}<Component {...pageProps} /></>;
}

// F68: every admin page renders per request so _document can stamp that request's CSP nonce (a page prerendered
// at build time would carry no nonce and the policy would refuse its scripts).
App.getInitialProps = async (context: AppContext) => NextApp.getInitialProps(context);
