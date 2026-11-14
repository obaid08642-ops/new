import type { GetServerSideProps } from 'next';

/**
 * The old command-center order page. There is one order detail page now, /admin/orders/:kind/:id (timeline plus the cancel, refund,
 * compensate, reassign, SLA and note actions); this keeps old links and bookmarks working.
 */
export function orderDetailTarget(query: Record<string, string | string[] | undefined>): string {
  const kind = typeof query.kind === 'string' ? query.kind : '';
  const id = typeof query.id === 'string' ? query.id : '';
  return kind && id ? `/admin/orders/${encodeURIComponent(kind)}/${encodeURIComponent(id)}` : '/admin/orders';
}

export const getServerSideProps: GetServerSideProps = async ({ query }) => ({
  redirect: { destination: orderDetailTarget(query), permanent: false },
});

export default function OrderDetailRedirect() {
  return null;
}
