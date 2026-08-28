import { GetServerSideProps } from 'next';
import { PublicDirectory, fetchDirectory } from '../../components/PublicDirectory';

export default function LabServicesPage({ items }: { items: any[] }) {
  return (
    <PublicDirectory
      config={{
        type: 'lab-service', icon: '',
        title: 'التحاليل المخبرية',
        description: 'احجز تحاليلك من المنزل أو المختبر — نتائج رقمية موثقة ومتابعة كاملة.',
        itemLine: (e) => [e.category, e.turnaround_hours ? `النتيجة خلال ${e.turnaround_hours} ساعة` : null].filter(Boolean).join(' · '),
        itemBadge: (e) => (e.price ? `${e.price} ر.س` : null),
      }}
      items={items}
    />
  );
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const items = await fetchDirectory('/labs/services');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return { props: { items } };
};
