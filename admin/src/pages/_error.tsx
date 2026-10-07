import type { NextPageContext } from 'next';
import { ErrorFallback } from '@/components/ErrorFallback';
import { reportError } from '@/lib/observability/error-reporter';

interface ErrorPageProps {
  statusCode: number;
  errorId: string;
}

/**
 * 15.5 — the Pages Router root error page.
 *
 * Next.js renders this for server-side failures (500) and, in production, for a
 * client-side crash that reached the top of the tree. The dev overlay still
 * shows the real stack, which is the documented behaviour
 * (`node_modules/next/dist/docs/02-pages/03-building-your-application/
 * 06-configuring/12-error-handling.md`).
 *
 * Both required actions are present: "try again" reloads the current URL,
 * "contact support" opens a pre-filled mail carrying the error id.
 */
function AdminErrorPage({ statusCode, errorId }: ErrorPageProps) {
  const title =
    statusCode === 404
      ? 'الصفحة غير موجودة'
      : statusCode
        ? `تعذّر عرض الصفحة (خطأ ${statusCode})`
        : 'تعذّر عرض الصفحة';

  return (
    <ErrorFallback
      title={title}
      errorId={errorId}
      segment={typeof window !== 'undefined' ? window.location.pathname : undefined}
      onRetry={() => {
        if (typeof window !== 'undefined') window.location.reload();
      }}
    />
  );
}

AdminErrorPage.getInitialProps = async (context: NextPageContext) => {
  const { res, err, asPath } = context;
  const statusCode = res ? res.statusCode : err?.statusCode ?? 0;

  // A 404 is a routing mistake, not a crash: nothing to report.
  const reported =
    statusCode && statusCode !== 404
      ? await reportError(err ?? new Error(`admin page error ${statusCode}`), {
          boundary: 'pages/_error',
          path: asPath || null,
        })
      : null;

  return { statusCode, errorId: reported?.errorId ?? '' };
};

export default AdminErrorPage;